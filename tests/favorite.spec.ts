import { expect, test, type Page } from "@playwright/test";
import {
  collectErrors,
  emptyPage,
  homeFeedOf,
  mockBackend,
} from "./mockBackend";

// 작품 화면의 즐겨찾기(좋아요와 따로, 하트 옆 책갈피). 서버가 실패하면 누르기 전으로 되돌린다.
async function openNovel(page: Page, failFavorite = false, oldServer = false) {
  await page.addInitScript(() => {
    localStorage.setItem(
      "relay-novel.tokens",
      JSON.stringify({
        accessToken: "test-access",
        refreshToken: "test-refresh",
      }),
    );
  });
  let favorited = false;
  const calls = await mockBackend(page, async ({ path, method }, route) => {
    if (path === "/api/v1/novels/42/favorite" && method === "POST") {
      if (failFavorite) {
        await route.fulfill({
          status: 500,
          json: {
            code: "SERVER_ERROR",
            message: "잠시 뒤 다시 시도해 주세요.",
          },
          headers: { "Access-Control-Allow-Origin": "*" },
        });
        return undefined;
      }
      favorited = !favorited;
      return { favorited };
    }
    if (path.endsWith("/deliveries") || path.endsWith("/my-turns")) return [];
    if (path.endsWith("/chapter-tree")) return [];
    if (path.endsWith("/home-feed")) return homeFeedOf([]);
    if (path === "/api/v1/novels") return emptyPage;
    return {
      novel: {
        id: 42,
        kind: "RELAY",
        mode: "OPEN",
        title: "달빛 숲",
        description: "함께 쓰는 숲 이야기",
        genre: "판타지",
        ownerNickname: "작가",
        memberCount: 2,
        isPublic: true,
        mine: false,
        myTurn: false,
        likeCount: 3,
        liked: false,
        // 즐겨찾기를 모르는 예전 서버는 이 값을 보내지 않는다.
        ...(oldServer ? {} : { favorited }),
        createdAt: "2026-10-19T06:00:00Z",
        status: "ONGOING",
        chapterCount: 0,
        chapterLimit: 20,
        branchLimit: 3,
      },
      members: [],
      applications: [],
      myMembership: "NONE",
      canWrite: false,
      turnNumber: 1,
    };
  });
  await page.goto("/novel/42");
  await expect(page.getByText("달빛 숲", { exact: true })).toBeVisible();
  return calls;
}

test("a reader adds a story to favorites next to the heart and removes it again", async ({
  page,
}) => {
  const errors = collectErrors(page);
  const calls = await openNovel(page);
  await page.getByRole("button", { name: "즐겨찾기에 담기" }).click();
  await expect(
    page.getByRole("button", { name: "즐겨찾기에서 빼기" }),
  ).toBeVisible();
  await expect(page.getByText("즐겨찾기에 담았어요")).toBeVisible();
  // 좋아요는 그대로다.
  await expect(page.getByRole("button", { name: "좋아요 3개" })).toBeVisible();

  await page.getByRole("button", { name: "즐겨찾기에서 빼기" }).click();
  await expect(
    page.getByRole("button", { name: "즐겨찾기에 담기" }),
  ).toBeVisible();
  await expect(page.getByText("즐겨찾기에서 뺐어요")).toBeVisible();
  expect(
    calls.filter((call) => call.path === "/api/v1/novels/42/favorite"),
  ).toHaveLength(2);
  expect(calls.some((call) => call.path.endsWith("/42/like"))).toBe(false);
  expect(errors).toEqual([]);
});

test("a failed favorite returns to the state before pressing and says why", async ({
  page,
}) => {
  const errors = collectErrors(page);
  await openNovel(page, true);
  await page.getByRole("button", { name: "즐겨찾기에 담기" }).click();
  await expect(page.getByRole("alert")).toContainText(
    "잠시 뒤 다시 시도해 주세요.",
  );
  await expect(
    page.getByRole("button", { name: "즐겨찾기에 담기" }),
  ).toBeVisible();
  await expect(page.getByText("즐겨찾기에 담았어요")).toHaveCount(0);
  expect(errors).toEqual([]);
});

test("a visitor browsing the demo is sent to log in to add a favorite", async ({
  page,
}) => {
  const errors = collectErrors(page);
  await page.goto("/");
  await page.getByText("먼저 둘러보기 →").click();
  await page.getByRole("button", { name: "열매", exact: true }).click();
  // 둘러보기 예시 가운데 E2E가 기대는 앞의 네 편 하나를 연다.
  await page
    .getByRole("button", { name: /^달빛을 파는 가게/ })
    .first()
    .click();
  await page.getByRole("button", { name: "즐겨찾기에 담기" }).click();
  await expect(page).toHaveURL(/\/login/);
  expect(errors).toEqual([]);
});

test("the bookmark stays hidden while the server does not know favorites yet", async ({
  page,
}) => {
  const errors = collectErrors(page);
  await openNovel(page, false, true);
  await expect(page.getByRole("button", { name: "좋아요 3개" })).toBeVisible();
  await expect(
    page.getByRole("button", { name: "즐겨찾기에 담기" }),
  ).toHaveCount(0);
  expect(errors).toEqual([]);
});
