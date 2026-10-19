import { expect, test, type Page } from "@playwright/test";
import {
  collectErrors,
  emptyPage,
  homeFeedOf,
  mockBackend,
} from "./mockBackend";

async function openEditor(page: Page, branch = false, fail = false) {
  await page.addInitScript(() => {
    localStorage.setItem(
      "relay-novel.tokens",
      JSON.stringify({
        accessToken: "test-access",
        refreshToken: "test-refresh",
      }),
    );
  });
  const calls = await mockBackend(
    page,
    async ({ path, method, body }, route) => {
      if (path.endsWith("/writing-assist") || path.endsWith("/story-assist")) {
        if (fail) {
          await route.fulfill({
            status: 429,
            json: {
              code: "AI_DAILY_LIMIT",
              message: "문장 다듬기는 24시간에 10번까지 사용할 수 있어요.",
            },
            headers: { "Access-Control-Allow-Origin": "*" },
          });
          return undefined;
        }
        if (path.endsWith("/story-assist")) {
          if (body.mode === "PLOT")
            return {
              suggestions: [
                { title: "낯선 편지", text: "문밖에서 낯선 편지가 도착한다." },
                {
                  title: "숲속의 발자국",
                  text: "뒤를 돌아보니 작은 발자국이 이어진다.",
                },
                { title: "오래된 약속", text: "한때 잊었던 약속을 떠올린다." },
              ],
            };
          return {
            suggestions: [
              {
                title: body.mode === "OPENING" ? "비 오는 밤" : "낯선 문",
                text:
                  body.mode === "OPENING"
                    ? "빗소리 사이로 편지 한 장이 도착했다."
                    : "나뭇잎 사이로 작은 문이 모습을 드러냈다.",
              },
            ],
          };
        }
        return { text: "그가 숲으로 달려갔다." };
      }
      if (path.endsWith("/draft"))
        return {
          turnNumber: branch ? 5 : 1,
          title: "숲의 입구",
          body: method === "PUT" ? body.body : "그가 숲으로 달려갓다.",
          savedAt: method === "PUT" ? "2026-10-19T06:00:00Z" : undefined,
        };
      if (path.endsWith("/deliveries") || path.endsWith("/my-turns")) return [];
      if (path.endsWith("/chapter-tree")) return [];
      if (path.endsWith("/home-feed")) return homeFeedOf([]);
      if (path === "/api/v1/novels") return emptyPage;
      return {
        novel: {
          id: 42,
          kind: "RELAY",
          mode: branch ? "OPEN" : "CIRCLE",
          title: "달빛 숲",
          description: "함께 쓰는 숲 이야기",
          genre: "판타지",
          ownerNickname: "작가",
          memberCount: 2,
          memberLimit: 2,
          isPublic: true,
          mine: true,
          myTurn: !branch,
          likeCount: 0,
          liked: false,
          createdAt: "2026-10-19T06:00:00Z",
          status: "ONGOING",
          chapterCount: 1,
          chapterLimit: 20,
          deliveryCount: 3,
        },
        members: [],
        applications: [],
        myMembership: "ACTIVE",
        canWrite: !branch,
        turnNumber: 1,
        myDeliveryId: branch ? 5 : undefined,
      };
    },
  );
  await page.goto("/novel/42");
  await page
    .getByRole("button", {
      name: branch ? "받은 가지 이어 쓰기" : "다음 장 이어 쓰기",
      exact: true,
    })
    .click();
  await expect(
    page.getByRole("textbox", { name: "이어지는 이야기" }),
  ).toHaveValue("그가 숲으로 달려갓다.");
  return calls;
}

for (const branch of [false, true]) {
  test(`${branch ? "branch" : "turn"} previews a rewrite and saves only after applying it`, async ({
    page,
  }) => {
    const errors = collectErrors(page);
    const calls = await openEditor(page, branch);
    const input = page.getByRole("textbox", { name: "이어지는 이야기" });
    await page.getByRole("button", { name: "AI로 문장 다듬기" }).click();
    await expect(page.getByText("다듬기 제안", { exact: true })).toBeVisible();
    await expect(input).toHaveValue("그가 숲으로 달려갓다.");
    expect(calls.filter((call) => call.method === "PUT")).toHaveLength(0);
    const request = calls.find((call) => call.path.endsWith("/writing-assist"));
    expect(request?.path).toBe(
      branch
        ? "/api/v1/novels/deliveries/5/writing-assist"
        : "/api/v1/novels/42/writing-assist",
    );
    expect(request?.body).toEqual({
      turnNumber: branch ? 5 : 1,
      text: "그가 숲으로 달려갓다.",
    });
    await page.getByRole("button", { name: "제안 적용" }).click();
    await expect(input).toHaveValue("그가 숲으로 달려갔다.");
    await page.getByRole("button", { name: "임시저장", exact: true }).click();
    await expect
      .poll(() => calls.filter((call) => call.method === "PUT").length)
      .toBe(1);
    expect(calls.find((call) => call.method === "PUT")?.body.body).toBe(
      "그가 숲으로 달려갔다.",
    );
    expect(errors).toEqual([]);
  });
}

test("editing the draft makes the previous suggestion inapplicable", async ({
  page,
}) => {
  await openEditor(page);
  await page.getByRole("button", { name: "AI로 문장 다듬기" }).click();
  await expect(page.getByRole("button", { name: "제안 적용" })).toBeEnabled();
  await page
    .getByRole("textbox", { name: "이어지는 이야기" })
    .fill("내가 계속 써 내려간 원고.");
  await expect(page.getByRole("button", { name: "제안 적용" })).toBeDisabled();
  await expect(page.getByText(/요청한 뒤 원고가 바뀌었어요/)).toBeVisible();
});

test("quota errors preserve the original draft and are not retried", async ({
  page,
}) => {
  const calls = await openEditor(page, false, true);
  await page.getByRole("button", { name: "AI로 문장 다듬기" }).click();
  await expect(page.getByRole("alert")).toContainText("24시간에 10번");
  await expect(
    page.getByRole("textbox", { name: "이어지는 이야기" }),
  ).toHaveValue("그가 숲으로 달려갓다.");
  expect(
    calls.filter((call) => call.path.endsWith("/writing-assist")),
  ).toHaveLength(1);
});

test("only the selected passage of a long manuscript is sent and replaced", async ({
  page,
}) => {
  const calls = await openEditor(page);
  const input = page.getByRole("textbox", { name: "이어지는 이야기" });
  const prefix = "앞 문단. ".repeat(350);
  const passage = "그가 숲으로 달려갓다.";
  const suffix = " 뒷 문단.";
  await input.fill(prefix + passage + suffix);
  await input.press("ControlOrMeta+End");
  for (let index = 0; index < suffix.length; index++)
    await input.press("ArrowLeft");
  for (let index = 0; index < passage.length; index++)
    await input.press("Shift+ArrowLeft");
  await page.getByRole("button", { name: "AI로 문장 다듬기" }).click();
  await expect(page.getByRole("button", { name: "제안 적용" })).toBeEnabled();
  expect(
    calls.find((call) => call.path.endsWith("/writing-assist"))?.body.text,
  ).toBe(passage);
  await page.getByText("다듬기 제안", { exact: true }).scrollIntoViewIfNeeded();
  await page.screenshot({ path: test.info().outputPath("writing-assist.png") });
  await page.getByRole("button", { name: "제안 적용" }).click();
  await expect(input).toHaveValue(prefix + "그가 숲으로 달려갔다." + suffix);
});

test("continuation previews a paragraph before appending and never saves automatically", async ({
  page,
}) => {
  const calls = await openEditor(page);
  const input = page.getByRole("textbox", { name: "이어지는 이야기" });
  await page.getByRole("button", { name: "다음 문단 제안받기" }).click();
  await expect(
    page.getByText("나뭇잎 사이로 작은 문이 모습을 드러냈다.", { exact: true }),
  ).toBeVisible();
  await expect(input).toHaveValue("그가 숲으로 달려갓다.");
  expect(
    calls.find((call) => call.path.endsWith("/story-assist"))?.body,
  ).toEqual({
    turnNumber: 1,
    mode: "CONTINUE",
    body: "그가 숲으로 달려갓다.",
    prompt: "",
  });
  await page.getByRole("button", { name: "원고 끝에 넣기" }).click();
  await expect(input).toHaveValue(
    "그가 숲으로 달려갓다.\n\n나뭇잎 사이로 작은 문이 모습을 드러냈다.",
  );
  expect(calls.filter((call) => call.method === "PUT")).toHaveLength(0);
});

test("a branch can choose one of three plots and then generate a paragraph in that direction", async ({
  page,
}) => {
  const calls = await openEditor(page, true);
  await page.getByRole("tab", { name: "전개 추천" }).click();
  await page.getByRole("button", { name: "전개 3가지 추천받기" }).click();
  await expect(page.getByText("낯선 편지", { exact: true })).toBeVisible();
  await expect(page.getByText("숲속의 발자국", { exact: true })).toBeVisible();
  await expect(page.getByText("오래된 약속", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "2번 전개로 이어쓰기" }).click();
  await expect(
    page.getByRole("button", { name: "원고 끝에 넣기" }),
  ).toBeEnabled();
  const requests = calls.filter((call) => call.path.endsWith("/story-assist"));
  expect(requests).toHaveLength(2);
  expect(requests[0].path).toBe("/api/v1/novels/deliveries/5/story-assist");
  expect(requests[1].body).toMatchObject({ turnNumber: 5, mode: "CONTINUE" });
  expect(requests[1].body.prompt).toContain("숲속의 발자국");
  await expect(
    page.getByRole("textbox", { name: "이어지는 이야기" }),
  ).toHaveValue("그가 숲으로 달려갓다.");
});

test("opening requires a seed and is inserted before the existing draft", async ({
  page,
}) => {
  await openEditor(page);
  await page.getByRole("tab", { name: "첫 문단" }).click();
  await expect(
    page.getByRole("button", { name: "첫 문단 만들기" }),
  ).toBeDisabled();
  await page
    .getByRole("textbox", { name: "소재·분위기·원하는 방향" })
    .fill("비 오는 밤, 신비로운 편지");
  await page.getByRole("button", { name: "첫 문단 만들기" }).click();
  await expect(
    page.getByRole("button", { name: "원고 맨 앞에 넣기" }),
  ).toBeEnabled();
  await page.getByRole("button", { name: "원고 맨 앞에 넣기" }).click();
  await expect(
    page.getByRole("textbox", { name: "이어지는 이야기" }),
  ).toHaveValue(
    "빗소리 사이로 편지 한 장이 도착했다.\n\n그가 숲으로 달려갓다.",
  );
});

test("story suggestions cannot be applied after the manuscript or seed changes", async ({
  page,
}) => {
  await openEditor(page);
  await page.getByRole("button", { name: "다음 문단 제안받기" }).click();
  await expect(
    page.getByRole("button", { name: "원고 끝에 넣기" }),
  ).toBeEnabled();
  await page
    .getByRole("textbox", { name: "소재·분위기·원하는 방향" })
    .fill("다른 분위기");
  await expect(
    page.getByRole("button", { name: "원고 끝에 넣기" }),
  ).toBeDisabled();
  await expect(
    page.getByText(
      "요청한 뒤 원고나 소재가 바뀌었어요. 현재 내용으로 다시 제안받아 주세요.",
    ),
  ).toBeVisible();
});

test("story quota errors preserve the draft and are not retried", async ({
  page,
}) => {
  const calls = await openEditor(page, false, true);
  await page.getByRole("button", { name: "다음 문단 제안받기" }).click();
  await expect(page.getByRole("alert")).toContainText("24시간에 10번");
  await expect(
    page.getByRole("textbox", { name: "이어지는 이야기" }),
  ).toHaveValue("그가 숲으로 달려갓다.");
  expect(
    calls.filter((call) => call.path.endsWith("/story-assist")),
  ).toHaveLength(1);
});
