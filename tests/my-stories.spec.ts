import { test, expect } from "@playwright/test";
import {
  collectErrors,
  emptyPage,
  homeFeedOf,
  mockBackend,
} from "./mockBackend";

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

test("the my page shows my stories in a sideways box and all of them on the my stories page", async ({
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
    // 마이의 다른 책장(내가 이어 쓴 이야기·즐겨찾기)은 비어 있다.
    if (path.endsWith("/me/continued") || path.endsWith("/me/favorites"))
      return emptyPage;
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
  // 마이의 내 작품 상자에서는 표지를 옆으로 넘겨 본다.
  await expect(
    page.getByRole("button", { name: "네 번째 이야기, 이야기 이어가는 중" }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "여섯 번째 이야기, 이야기 이어가는 중" }),
  ).toHaveCount(1);
  // 비어 있는 책장은 안내만 둔다.
  await expect(page.getByText("아직 이어 쓴 이야기가 없어요.")).toBeVisible();

  // 모두 보기를 누르면 내 작품 화면에서 세 칸 서가로 모두 본다.
  await page.getByRole("button", { name: "내 작품 모두 보기" }).click();
  await expect(page).toHaveURL(/\/my-stories$/);
  await expect(
    page.getByRole("button", { name: "여섯 번째 이야기, 이야기 이어가는 중" }),
  ).toBeVisible();
  expect(errors).toEqual([]);
});

test("the glass card counts favorites and stories I branched into, each opening its own shelf", async ({
  page,
}) => {
  const errors = collectErrors(page);
  const pageOf = (content: ReturnType<typeof summaryOf>[]) => ({
    ...emptyPage,
    content,
    totalElements: content.length,
  });
  const branched = { ...summaryOf(21, "가지를 뻗은 이야기"), mine: false };
  const favorites = [
    { ...summaryOf(31, "담아 둔 이야기"), mine: false, favorited: true },
    { ...summaryOf(32, "또 담은 이야기"), mine: false, favorited: true },
  ];
  await mockBackend(page, ({ path }) => {
    if (path.endsWith("/auth/login"))
      return { accessToken: "test-access", refreshToken: "test-refresh" };
    if (path.endsWith("/api/v1/me"))
      return { id: 9, handle: "writer", nickname: "글쓰는사람" };
    if (path.endsWith("/novels/home-feed")) return homeFeedOf([]);
    if (path.endsWith("/my-turns") || path.endsWith("/deliveries")) return [];
    if (path.endsWith("/novels/mine"))
      return pageOf([summaryOf(11, "내가 만든 이야기")]);
    if (path.endsWith("/me/continued")) return pageOf([branched]);
    if (path.endsWith("/me/favorites")) return pageOf(favorites);
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

  // 유리 명함에는 숫자 셋, 마이의 책장은 내 작품과 내가 이어 쓴 이야기 둘이다.
  await expect(page.getByLabel("내가 이어 쓴 이야기 1편")).toBeVisible();
  await expect(
    page.getByRole("button", {
      name: "가지를 뻗은 이야기, 이야기 이어가는 중",
    }),
  ).toBeVisible();
  // 즐겨찾기 숫자를 누르면 즐겨찾기 책장을 모두 본다.
  await page.getByRole("button", { name: "즐겨찾기 2편" }).click();
  await expect(page).toHaveURL(/\/my-stories\?shelf=favorites$/);
  await expect(
    page.getByRole("button", { name: "또 담은 이야기, 이야기 이어가는 중" }),
  ).toBeVisible();
  expect(errors).toEqual([]);
});
