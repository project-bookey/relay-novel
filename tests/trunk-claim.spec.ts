import { test, expect, type Page } from "@playwright/test";
import {
  collectErrors,
  emptyPage,
  fruitOf,
  homeFeedOf,
  mockBackend,
} from "./mockBackend";

async function login(page: Page) {
  await page.goto("/");
  await page
    .getByRole("textbox", { name: "Bookey 계정 이메일" })
    .fill("owner@example.test");
  await page.getByRole("textbox", { name: "비밀번호" }).fill("test-password");
  await page
    .getByRole("button", { name: "로그인하고 이야기 이어가기" })
    .click();
}

const novelOf = (mine: boolean, chapterCount: number) => ({
  id: 77,
  kind: "RELAY",
  mode: "OPEN",
  branchLimit: 3,
  title: "토끼의 간",
  description: "용궁으로 간 토끼 이야기",
  genre: "판타지",
  genres: ["판타지"],
  status: "ONGOING",
  ownerNickname: mine ? "나" : "자라",
  memberCount: 1,
  chapterCount,
  chapterLimit: 20,
  isPublic: true,
  mine,
  myTurn: false,
  createdAt: "2026-10-12T09:00:00Z",
  likeCount: 3,
  liked: false,
});

const reading = (
  node: { id: number; parentChapterId?: number; trunk: boolean },
  extra: Record<string, unknown> = {},
) => ({
  chapterNumber: node.parentChapterId ? 2 : 1,
  title: node.parentChapterId ? "줄기 둘째 마디" : "용왕의 병",
  authorNickname: "나",
  createdAt: "2026-10-12T09:00:00Z",
  ...node,
  novelId: 77,
  body: node.parentChapterId
    ? "토끼는 다시 바다를 건넜다."
    : "용궁에 근심이 가득했다.",
  viewCount: 0,
  canSelfContinue: false,
  selfContinueCost: 5,
  canClaim: false,
  slotsLeft: 3,
  ...extra,
});

test("the first writer keeps growing the trunk upward from their last chapter, without a deadline", async ({
  page,
}) => {
  const errors = collectErrors(page);
  let grown = false;
  const root = { id: 300, trunk: true };
  const second = { id: 301, parentChapterId: 300, trunk: true };
  const node = (chapter: typeof root | typeof second) => ({
    id: chapter.id,
    parentChapterId:
      "parentChapterId" in chapter ? chapter.parentChapterId : undefined,
    chapterNumber: "parentChapterId" in chapter ? 2 : 1,
    title: "parentChapterId" in chapter ? "줄기 둘째 마디" : "용왕의 병",
    authorNickname: "나",
    excerpt: "",
    createdAt: "2026-10-12T09:00:00Z",
    trunk: true,
  });
  const calls = await mockBackend(page, ({ path, method, body }) => {
    if (path.endsWith("/auth/login"))
      return { accessToken: "test-access", refreshToken: "test-refresh" };
    if (path === "/api/v1/novels" || path.endsWith("/novels/mine"))
      return emptyPage;
    if (path.endsWith("/novels/home-feed")) return homeFeedOf([]);
    if (path.endsWith("/my-turns") || path.endsWith("/deliveries")) return [];
    if (path.endsWith("/novels/77/draft"))
      return {
        turnNumber: grown ? 3 : 2,
        title: body?.title || "",
        body: body?.body || "",
        savedAt: method === "PUT" ? "2026-10-21T09:00:00Z" : undefined,
      };
    if (path.endsWith("/novels/77/chapters") && method === "POST") {
      grown = true;
      return reading(second, { title: body.title, body: body.body });
    }
    if (path.endsWith("/chapter-tree"))
      return grown ? [node(root), node(second)] : [node(root)];
    if (path.endsWith("/chapters/nodes/300")) return reading(root);
    if (path.endsWith("/chapters/nodes/301")) return reading(second);
    return {
      novel: novelOf(true, grown ? 2 : 1),
      members: [],
      applications: [],
      myMembership: "ACTIVE",
      canApply: false,
      canWrite: true,
      canStart: false,
      canComplete: true,
      turnNumber: grown ? 3 : 2,
    };
  });
  await login(page);
  await expect(
    page.getByRole("button", { name: "새 이야기 심기" }),
  ).toBeVisible();
  await page.goto("/novel/77");
  await expect(page.getByText("내 줄기를 이어 써요.")).toBeVisible();
  await page.getByRole("button", { name: "줄기 이어 쓰기" }).click();
  await expect(page.getByText(/내 줄기의 다음 회차/)).toBeVisible();
  await page
    .getByRole("textbox", { name: "이번 장의 제목" })
    .fill("줄기 둘째 마디");
  await page
    .getByRole("textbox", { name: "이어지는 이야기" })
    .fill("토끼는 다시 바다를 건넜다.");
  await page.getByRole("button", { name: "회차 발행", exact: true }).click();
  await page.getByRole("button", { name: "발행하고 열매 맺기" }).click();
  // 줄기는 차례 번호(turnNumber)로 낡은 쓰기를 막는다.
  await expect
    .poll(
      () =>
        calls.filter(
          (call) =>
            call.path.endsWith("/novels/77/chapters") && call.method === "POST",
        ).length,
    )
    .toBe(1);
  const published = calls.find(
    (call) =>
      call.path.endsWith("/novels/77/chapters") && call.method === "POST",
  );
  expect(published?.body).toEqual({
    turnNumber: 2,
    title: "줄기 둘째 마디",
    body: "토끼는 다시 바다를 건넜다.",
  });
  // 줄기를 잇는 버튼은 줄기 끝 회차에만 있다.
  await page.getByRole("button", { name: /CHAPTER 01/ }).click();
  await expect(
    page.getByText("용궁에 근심이 가득했다.").filter({ visible: true }),
  ).toBeVisible();
  await expect(
    page
      .getByRole("button", { name: "줄기 이어 쓰기" })
      .filter({ visible: true }),
  ).toHaveCount(0);
  await page.getByRole("button", { name: "다음 장" }).click();
  await expect(page.getByText("토끼는 다시 바다를 건넜다.")).toBeVisible();
  await expect(
    page
      .getByRole("button", { name: "줄기 이어 쓰기" })
      .filter({ visible: true }),
  ).toBeVisible();
  expect(errors).toEqual([]);
});

test("when the last slot was just taken, the claim refusal stays on screen after the button goes away", async ({
  page,
}) => {
  const errors = collectErrors(page);
  let full = false;
  const novel = novelOf(false, 1);
  const root = { id: 300, trunk: true };
  const full409 = "이 회차에는 가지 자리가 다 찼어요.";
  await mockBackend(page, async ({ path, method }, route) => {
    if (path.endsWith("/auth/login"))
      return { accessToken: "test-access", refreshToken: "test-refresh" };
    if (path === "/api/v1/novels") return emptyPage;
    if (path.endsWith("/novels/home-feed"))
      return homeFeedOf([novel], 2, [
        fruitOf(novel, { id: 300, title: "용왕의 병" }),
      ]);
    if (path.endsWith("/my-turns") || path.endsWith("/deliveries")) return [];
    if (path.endsWith("/chapters/300/claim") && method === "POST") {
      full = true;
      await route.fulfill({
        status: 409,
        json: {
          code: "NOVEL_BRANCH_FULL",
          message: full409,
          timestamp: "2026-10-21T09:00:00Z",
        },
        headers: { "Access-Control-Allow-Origin": "*" },
      });
      return undefined;
    }
    if (path.endsWith("/chapter-tree"))
      return [
        {
          id: 300,
          chapterNumber: 1,
          title: "용왕의 병",
          authorNickname: "자라",
          excerpt: "",
          createdAt: "2026-10-12T09:00:00Z",
          trunk: true,
        },
      ];
    if (path.endsWith("/chapters/nodes/300"))
      return reading(root, {
        authorNickname: "자라",
        canClaim: !full,
        slotsLeft: full ? 0 : 1,
      });
    return {
      novel,
      members: [],
      applications: [],
      myMembership: "NONE",
      canApply: false,
      canWrite: false,
      canStart: false,
      canComplete: false,
      turnNumber: 2,
    };
  });
  await login(page);
  await page
    .getByRole("button", { name: "토끼의 간 1장 「용왕의 병」 열매" })
    .click();
  await page.getByRole("button", { name: "이 회차에서 이어 쓰기" }).click();
  await expect(page.getByText(full409)).toBeVisible();
  await expect(
    page.getByRole("button", { name: "이 회차에서 이어 쓰기" }),
  ).toHaveCount(0);
  await expect(page.getByText(full409)).toBeVisible();
  // 홈 열매에서 바로 연 회차에서도 작품 화면으로 갈 수 있다.
  await page.getByRole("button", { name: "작품 보기" }).click();
  await expect(page.getByText(/회차마다 가지가 자라고 있어요/)).toBeVisible();
  expect(errors).toEqual([]);
});
