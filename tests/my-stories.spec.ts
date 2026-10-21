import { test, expect } from "@playwright/test";
import { collectErrors, homeFeedOf, mockBackend } from "./mockBackend";

const titles = [
  "첫 번째 이야기",
  "두 번째 이야기",
  "세 번째 이야기",
  "네 번째 이야기",
  "다섯 번째 이야기",
  "여섯 번째 이야기",
];

const summaryOf = (id: number, title: string) => ({
  id,
  kind: "RELAY",
  mode: "CIRCLE",
  status: "ONGOING",
  title,
  description: "함께 쓰는 이야기.",
  genre: "판타지",
  genres: ["판타지"],
  ownerNickname: "나",
  memberCount: 3,
  memberLimit: 6,
  chapterCount: 2,
  chapterLimit: 20,
  isPublic: true,
  mine: true,
  myTurn: false,
  createdAt: "2026-10-14T09:00:00Z",
  likeCount: 5,
  liked: false,
});

test("the my page shows four of my stories in a row and the rest on the my stories page", async ({
  page,
}) => {
  const errors = collectErrors(page);
  const mine = titles.map((title, index) => summaryOf(60 + index, title));
  await mockBackend(page, ({ path }) => {
    if (path.endsWith("/auth/login"))
      return { accessToken: "test-access", refreshToken: "test-refresh" };
    if (path.endsWith("/api/v1/me"))
      return { id: 9, handle: "writer", nickname: "글쓰는사람" };
    if (path.endsWith("/novels/home-feed")) return homeFeedOf([]);
    if (path.endsWith("/my-turns") || path.endsWith("/deliveries")) return [];
    if (path.endsWith("/novels/mine"))
      return {
        content: mine,
        page: 0,
        size: 20,
        totalElements: mine.length,
        totalPages: 1,
        hasNext: false,
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

  await expect(page.getByRole("heading", { name: "글쓰는사람" })).toBeVisible();
  await expect(page.getByLabel("내 작품 6편")).toBeVisible();
  // 마이에는 네 권만 한 줄로 놓인다.
  await expect(
    page.getByRole("button", { name: "네 번째 이야기, 이야기 이어가는 중" }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "다섯 번째 이야기, 이야기 이어가는 중" }),
  ).toHaveCount(0);

  // 더 보기를 누르면 내 작품 화면에서 모두 본다.
  await page.getByRole("button", { name: "내 작품 더 보기" }).click();
  await expect(page).toHaveURL(/\/my-stories$/);
  await expect(
    page.getByRole("button", { name: "여섯 번째 이야기, 이야기 이어가는 중" }),
  ).toBeVisible();
  expect(errors).toEqual([]);
});
