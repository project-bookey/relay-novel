import { test, expect } from "@playwright/test";
import { collectErrors, homeFeedOf, mockBackend } from "./mockBackend";

test("AI cover waits for metadata, previews the stored image, preserves it on failure and sends its id when creating", async ({
  page,
}) => {
  const errors = collectErrors(page);
  let attempts = 0;
  let release: () => void = () => {};
  const pending = new Promise<void>((resolve) => {
    release = resolve;
  });
  const coverUrl = "https://cdn.example.test/ai-cover.svg";
  await page.route(coverUrl, (route) =>
    route.fulfill({
      contentType: "image/svg+xml",
      body: '<svg xmlns="http://www.w3.org/2000/svg" width="768" height="1024"><rect width="768" height="1024" fill="#23314d"/></svg>',
    }),
  );
  const calls = await mockBackend(page, async ({ path, method }, route) => {
    if (path.endsWith("/auth/login"))
      return { accessToken: "test-access", refreshToken: "test-refresh" };
    if (path.endsWith("/home-feed")) return homeFeedOf([]);
    if (path.endsWith("/genres")) return ["판타지"];
    if (path.endsWith("/covers/generation-config"))
      return { available: true, dailyLimit: 3 };
    if (path.endsWith("/covers/generate")) {
      attempts += 1;
      if (attempts === 1) {
        await pending;
        return { id: 85, url: coverUrl, width: 768, height: 1024 };
      }
      await route.fulfill({
        status: 429,
        json: {
          code: "AI_COVER_LIMIT",
          message: "표지 생성 횟수를 다 썼어요.",
        },
        headers: { "Access-Control-Allow-Origin": "*" },
      });
      return undefined;
    }
    if (path === "/api/v1/novels" && method === "POST") {
      await route.fulfill({
        status: 503,
        json: { code: "TEST", message: "저장 요청을 확인했어요." },
        headers: { "Access-Control-Allow-Origin": "*" },
      });
      return undefined;
    }
    return [];
  });
  await page.goto("/");
  await page
    .getByRole("textbox", { name: "Bookey 계정 이메일" })
    .fill("writer@example.test");
  await page.getByRole("textbox", { name: "비밀번호" }).fill("test-password");
  await page
    .getByRole("button", { name: "로그인하고 이야기 이어가기" })
    .click();
  await page.getByRole("button", { name: "새 이야기 심기" }).click();
  const generate = page.getByRole("button", {
    name: "AI로 표지 만들기",
    exact: true,
  });
  await expect(generate).toBeDisabled();
  await page
    .getByRole("textbox", { name: "이야기 제목" })
    .fill("달빛을 파는 가게");
  await page
    .getByRole("textbox", { name: "이야기 소개" })
    .fill("보름마다 문을 여는 골목 끝 가게.");
  await generate.click();
  await expect(
    page.getByRole("button", { name: "표지를 만들고 있어요…" }),
  ).toBeDisabled();
  await expect(
    page.getByRole("button", { name: "첫 회차 쓰러 가기" }),
  ).toBeDisabled();
  release();
  await expect(page.getByLabel("고른 표지")).toBeVisible();
  expect(
    calls.find((call) => call.path.endsWith("/covers/generate"))?.body,
  ).toEqual({
    title: "달빛을 파는 가게",
    description: "보름마다 문을 여는 골목 끝 가게.",
    genre: "판타지",
  });
  await page.getByRole("button", { name: "AI로 새 표지 만들기" }).click();
  await expect(page.getByText("표지 생성 횟수를 다 썼어요.")).toBeVisible();
  await expect(page.getByLabel("고른 표지")).toBeVisible();
  await page.getByRole("button", { name: "첫 회차 쓰러 가기" }).click();
  await expect(page.getByText("저장 요청을 확인했어요.")).toBeVisible();
  expect(
    calls.find(
      (call) => call.path === "/api/v1/novels" && call.method === "POST",
    )?.body.coverId,
  ).toBe(85);
  expect(attempts).toBe(2);
  expect(errors).toEqual([]);
});
