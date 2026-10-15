import type { Page, Route } from "@playwright/test";

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

// 홈 열매 밭 묶음(NovelHomeFeedView)
export function homeFeedOf(novels: unknown[], freeRefreshesLeftToday = 2) {
  return {
    novels,
    freeRefreshesLeftToday,
    dailyFreeRefreshes: 2,
    resetsAt: "2026-10-15T15:00:00Z",
  };
}
