import { test, expect } from "@playwright/test";
import {
  collectErrors,
  emptyPage,
  homeFeedOf,
  mockBackend,
} from "./mockBackend";

const novel = (id: number, title: string) => ({
  id,
  kind: "RELAY",
  mode: "OPEN",
  deliveryCount: 3,
  title,
  description: `${title} 이야기`,
  genre: "판타지",
  status: "ONGOING",
  ownerNickname: "자라",
  memberCount: 2,
  chapterCount: 2,
  chapterLimit: 20,
  isPublic: true,
  mine: false,
  myTurn: false,
  createdAt: "2026-10-12T09:00:00Z",
  likeCount: 3,
  liked: false,
});

const usedUp =
  "오늘 무료 새로고침을 다 썼어요. 자정이 지나면 다시 할 수 있어요.";

test("the refresh button swaps the home fruits for a new bundle until today's free refreshes run out", async ({
  page,
}) => {
  // 처음 나무가 내려오는 연출과 새로고침 연출을 한 번씩 기다린다.
  test.setTimeout(60_000);
  const errors = collectErrors(page);
  const rabbit = novel(11, "토끼의 간");
  const letter = novel(12, "용궁의 편지");
  // 서버에 놓인 묶음과 오늘 남은 무료 횟수
  let shelf = [rabbit];
  let leftToday = 2;
  let refreshes = 0;
  const calls = await mockBackend(page, async ({ path, method }, route) => {
    if (path.endsWith("/auth/login"))
      return { accessToken: "test-access", refreshToken: "test-refresh" };
    if (path.endsWith("/novels/home-feed/refresh") && method === "POST") {
      refreshes += 1;
      // 새 작품이 자리보다 적으면 남은 자리는 이전 묶음에서 채운다.
      if (refreshes === 1) {
        shelf = [letter, rabbit];
        leftToday = 1;
        return homeFeedOf(shelf, leftToday);
      }
      // 그사이 다른 기기에서 마지막 횟수를 썼다. 서버가 판정해 거절하고 안내 문구를 보낸다.
      leftToday = 0;
      await route.fulfill({
        status: 429,
        json: {
          code: "NOVEL_REFRESH_DAILY_LIMIT",
          message: usedUp,
          timestamp: "2026-10-15T09:00:00Z",
        },
        headers: { "Access-Control-Allow-Origin": "*" },
      });
      return undefined;
    }
    if (path.endsWith("/novels/home-feed")) return homeFeedOf(shelf, leftToday);
    if (path.endsWith("/deliveries") || path.endsWith("/my-turns")) return [];
    return emptyPage;
  });
  await page.goto("/");
  await page
    .getByRole("textbox", { name: "Bookey 계정 이메일" })
    .fill("reader@example.test");
  await page.getByRole("textbox", { name: "비밀번호" }).fill("test-password");
  await page
    .getByRole("button", { name: "로그인하고 이야기 이어가기" })
    .click();
  await expect(
    page.getByRole("button", { name: "토끼의 간 열매" }),
  ).toBeVisible();

  // 나무 연출이 끝나야 누를 수 있고, 남은 횟수를 이름으로 알려 준다.
  const refresh = page.getByRole("button", { name: /^새 열매 받기/ });
  await expect(refresh).toHaveAccessibleName("새 열매 받기, 오늘 2번 남았어요");
  await expect(refresh).toBeEnabled({ timeout: 15_000 });
  await refresh.click();
  await expect(
    page.getByRole("button", { name: "용궁의 편지 열매" }),
  ).toBeVisible();
  await expect(refresh).toHaveAccessibleName("새 열매 받기, 오늘 1번 남았어요");
  // 원래 열매는 굴러 나가고, 묶음에 다시 든 열매는 새 열매와 함께 나무에서 다시 떨어진다.
  await expect(
    page.getByRole("button", { name: "토끼의 간 열매" }),
  ).toHaveCount(1);

  await expect(refresh).toBeEnabled({ timeout: 15_000 });
  await refresh.click();
  await expect(page.getByRole("alert")).toHaveText(usedUp);
  // 거절되면 남은 횟수를 서버에서 다시 받아 맞춘다.
  await expect(refresh).toHaveAccessibleName("새 열매 받기, 오늘은 다 썼어요");
  expect(
    calls.filter(
      (call) =>
        call.path.endsWith("/novels/home-feed/refresh") &&
        call.method === "POST",
    ),
  ).toHaveLength(2);
  expect(errors).toEqual([]);
});
