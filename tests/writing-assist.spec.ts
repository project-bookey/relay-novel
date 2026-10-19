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
      if (path.endsWith("/writing-assist")) {
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
