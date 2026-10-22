import { expect, type Page, type Route } from "@playwright/test";

export type Call = { path: string; method: string; body: any };
type Responder = (call: Call, route: Route) => Promise<unknown> | unknown;

// 백엔드를 모의한다. responder가 undefined를 돌려주면 이미 직접 응답한 것으로 본다.
export async function mockBackend(page: Page, respond: Responder) {
  const calls: Call[] = [];
  await page.route("**/api/v1/**", async (route) => {
    const request = route.request();
    const path = new URL(request.url()).pathname;
    const method = request.method();
    if (method === "OPTIONS") {
      await route.fulfill({
        status: 204,
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Headers": "*",
          "Access-Control-Allow-Methods": "GET,POST,PUT,OPTIONS",
        },
      });
      return;
    }
    let body: any;
    try {
      body = request.postDataJSON();
    } catch {}
    const call = { path, method, body };
    calls.push(call);
    const data = await respond(call, route);
    if (data === undefined) return;
    await route.fulfill({
      json: data,
      headers: { "Access-Control-Allow-Origin": "*" },
    });
  });
  return calls;
}

// 서버가 표지 올리기(POST /novels/covers)에 돌려주는 표지. 작품을 만들 때 이 id를 함께 보낸다.
export const uploadedCover = {
  id: 77,
  url: "https://cdn.example.test/covers/77.png",
};

// 1×1 PNG. 웹의 사진 고르기는 파일 고르기 창을 띄우므로 이 그림을 넣는다.
const TINY_PNG =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=";

// 작품 만들기에서 표지를 고르고 다 올라갈 때까지 기다린다(표지는 꼭 넣는다).
// 모의 서버는 POST /novels/covers에 uploadedCover로 답해야 한다. 올리기에 실패해도 "표지를 골랐어요."는 보이므로
// 올리기 응답을 직접 기다려, 모의 서버가 답하지 않으면 여기서 바로 실패하게 한다.
export async function pickCover(page: Page) {
  const chooser = page.waitForEvent("filechooser");
  const uploaded = page.waitForResponse(
    (response) =>
      response.url().endsWith("/novels/covers") &&
      response.request().method() === "POST",
  );
  await page.getByRole("button", { name: "표지 사진 고르기" }).click();
  await (
    await chooser
  ).setFiles({
    name: "cover.png",
    mimeType: "image/png",
    buffer: Buffer.from(TINY_PNG, "base64"),
  });
  expect((await uploaded).ok()).toBe(true);
  await expect(page.getByText("표지를 골랐어요.")).toBeVisible();
}

export function collectErrors(page: Page) {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (/Invalid DOM property|non-boolean attribute/.test(message.text()))
      errors.push(message.text());
  });
  return errors;
}

export const emptyPage = {
  content: [],
  page: 0,
  hasNext: false,
  totalElements: 0,
  totalPages: 0,
  size: 20,
};

// 홈 열매 하나(NovelHomeFruitView) — 작품의 이어 쓸 수 있는 회차. 접근성 이름은 "제목 1장 「첫 장」 열매"다.
export function fruitOf(
  novel: { id: number },
  chapter: { id?: number; number?: number; title?: string } = {},
) {
  return {
    chapterId: chapter.id ?? novel.id * 100 + 1,
    chapterNumber: chapter.number ?? 1,
    chapterTitle: chapter.title ?? "첫 장",
    excerpt: "이야기가 시작된다.",
    authorNickname: "자라",
    createdAt: "2026-10-12T09:00:00Z",
    slotsLeft: 3,
    novel,
  };
}

// 홈 열매 밭 묶음(NovelHomeFeedView). 작품마다 1장이 열매 하나로 놓인다. 회차를 정하려면 fruits를 넘긴다.
export function homeFeedOf(
  novels: { id: number }[],
  freeRefreshesLeftToday = 2,
  fruits = novels.map((novel) => fruitOf(novel)),
) {
  return {
    novels,
    fruits,
    freeRefreshesLeftToday,
    dailyFreeRefreshes: 2,
    resetsAt: "2026-10-15T15:00:00Z",
  };
}
