import { test, expect } from "@playwright/test";
import {
  collectErrors,
  emptyPage,
  homeFeedOf,
  mockBackend,
} from "./mockBackend";

// 서버가 내려 주는 표지 주소. 아래에서 작은 그림으로 응답한다.
const coverUrl = "https://cdn.example.test/covers/41.svg";
const coverSvg =
  '<svg xmlns="http://www.w3.org/2000/svg" width="300" height="400"><rect width="300" height="400" fill="#2E3A5C"/><circle cx="200" cy="100" r="50" fill="#F6E3A1"/></svg>';

const summaryOf = (id: number, title: string, cover?: string) => ({
  id,
  kind: "RELAY",
  mode: "OPEN",
  branchLimit: 3,
  status: "ONGOING",
  title,
  description: "보름마다 문을 여는 골목 끝 가게.",
  genre: "판타지",
  coverUrl: cover,
  ownerNickname: "나",
  memberCount: 4,
  chapterCount: 6,
  chapterLimit: 20,
  isPublic: true,
  mine: true,
  myTurn: false,
  createdAt: "2026-10-14T09:00:00Z",
  likeCount: 12,
  liked: false,
});

test("my stories show their covers on the shelf and on the story page", async ({
  page,
}) => {
  const errors = collectErrors(page);
  await page.route(coverUrl, (route) =>
    route.fulfill({ body: coverSvg, contentType: "image/svg+xml" }),
  );
  const covered = summaryOf(41, "달빛을 파는 가게", coverUrl);
  const plain = summaryOf(42, "우산을 두고 온 날");
  await mockBackend(page, ({ path }) => {
    if (path.endsWith("/auth/login"))
      return { accessToken: "test-access", refreshToken: "test-refresh" };
    if (path.endsWith("/novels/home-feed")) return homeFeedOf([]);
    if (path.endsWith("/my-turns") || path.endsWith("/deliveries")) return [];
    // 마이의 다른 책장(내가 이어 쓴 이야기·즐겨찾기)은 비어 있다.
    if (path.endsWith("/me/continued") || path.endsWith("/me/favorites"))
      return emptyPage;
    if (path.endsWith("/novels/mine"))
      return {
        content: [covered, plain],
        page: 0,
        size: 20,
        totalElements: 2,
        totalPages: 1,
        hasNext: false,
      };
    if (path.endsWith("/41/chapter-tree")) return [];
    if (path.endsWith("/novels/41"))
      return {
        novel: covered,
        members: [],
        applications: [],
        myMembership: "OWNER",
        canApply: false,
        canWrite: false,
        canStart: false,
        canComplete: true,
        turnNumber: 6,
        coverId: 9,
      };
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
  await page.getByRole("button", { name: "마이", exact: true }).click();
  // 내 작품은 표지(없으면 작은 나무)와 제목이 있는 짧은 줄이다.
  const coveredRow = page.getByRole("button", {
    name: "달빛을 파는 가게, 이야기 이어가는 중",
  });
  await expect(coveredRow.locator(`img[src="${coverUrl}"]`)).toBeAttached();
  await expect(
    page.getByRole("button", { name: "우산을 두고 온 날, 이야기 이어가는 중" }),
  ).toBeVisible();
  await page.screenshot({ path: "test-results/cover-my.png" });
  await coveredRow.click();
  await expect(page).toHaveURL(/\/novel\/41$/);
  // 상세를 다시 열어 마이 화면의 표지와 섞이지 않게 한다.
  await page.reload();
  // 표지가 있는 작품은 상세 위쪽에 표지와 제목이 나란히 놓인다.
  await expect(
    page.getByText("보름마다 문을 여는 골목 끝 가게."),
  ).toBeVisible();
  await expect(page.getByLabel("달빛을 파는 가게 표지")).toHaveCount(1);
  await page.screenshot({ path: "test-results/cover-detail.png" });
  expect(errors).toEqual([]);
});
