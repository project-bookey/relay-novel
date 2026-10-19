import { test, expect } from "@playwright/test";
import {
  collectErrors,
  emptyPage,
  homeFeedOf,
  mockBackend,
} from "./mockBackend";

const binBranch = {
  chapterId: 402,
  novelId: 77,
  novelTitle: "토끼의 간",
  chapterNumber: 3,
  title: "늦은 편지",
  excerpt: "편지는 사흘 늦게 도착했다.",
  viewCount: 12,
  prunedAt: "2026-10-17T09:00:00Z",
  purgeAt: "2099-10-24T09:00:00Z",
};

async function login(page: import("@playwright/test").Page) {
  await page.goto("/");
  await page
    .getByRole("textbox", { name: "Bookey 계정 이메일" })
    .fill("reader@example.test");
  await page.getByRole("textbox", { name: "비밀번호" }).fill("test-password");
  await page
    .getByRole("button", { name: "로그인하고 이야기 이어가기" })
    .click();
}

test("mobile demo shows the branch bin on the my page and sends a visitor to log in to restore", async ({
  page,
}) => {
  const errors = collectErrors(page);
  await page.goto("/");
  await page.getByText("먼저 둘러보기 →").click();
  await page.getByRole("button", { name: "마이", exact: true }).click();
  await expect(
    page.getByText("나뭇가지 수거함", { exact: true }),
  ).toBeVisible();
  await expect(page.getByText("젖은 편지의 주소")).toBeVisible();
  await expect(page.getByText("멈춘 시계탑")).toBeVisible();
  await expect(page.getByText("햇살 0개")).toBeVisible();
  await page.getByRole("button", { name: "햇살 3개로 살리기" }).first().click();
  await expect(
    page.getByRole("button", { name: "로그인하고 이야기 이어가기" }),
  ).toBeVisible();
  expect(errors).toEqual([]);
});

test("restoring without enough sunlight opens the sunlight sheet, and discarding empties the bin", async ({
  page,
}) => {
  const errors = collectErrors(page);
  let discarded = false;
  const calls = await mockBackend(page, async ({ path, method }, route) => {
    if (path.endsWith("/auth/login"))
      return { accessToken: "test-access", refreshToken: "test-refresh" };
    if (path === "/api/v1/novels" || path.endsWith("/novels/mine"))
      return emptyPage;
    if (path.endsWith("/novels/home-feed")) return homeFeedOf([]);
    if (path.endsWith("/my-turns") || path.endsWith("/deliveries")) return [];
    if (path.endsWith("/me/sunlight"))
      return {
        balance: 1,
        restoreCost: 3,
        selfBranchCost: 5,
        products: [
          {
            productId: "relaynovel.sunlight.10",
            quantity: 10,
            amountKrw: 1100,
          },
        ],
      };
    if (path.endsWith("/me/branch-bin/402/restore") && method === "POST") {
      await route.fulfill({
        status: 402,
        json: {
          code: "NOVEL_SUNLIGHT_INSUFFICIENT",
          message: "햇살이 모자라요. 햇살을 채운 뒤 다시 해 주세요.",
          timestamp: "2026-10-19T09:00:00Z",
        },
        headers: { "Access-Control-Allow-Origin": "*" },
      });
      return undefined;
    }
    if (path.endsWith("/me/branch-bin/402/discard") && method === "POST") {
      discarded = true;
      return { branches: [], restoreCost: 3 };
    }
    if (path.endsWith("/me/branch-bin"))
      return { branches: discarded ? [] : [binBranch], restoreCost: 3 };
    return [];
  });
  await login(page);
  await page.getByRole("button", { name: "마이", exact: true }).click();
  await expect(page.getByText("늦은 편지")).toBeVisible();
  await expect(page.getByText(/조회 12 · \d+일 뒤 사라져요/)).toBeVisible();
  await expect(page.getByText("햇살 1개")).toBeVisible();

  await page.getByRole("button", { name: "햇살 3개로 살리기" }).click();
  // 모자란 햇살은 오류 상자 대신 햇살 채우기 창으로 안내한다. 웹에는 앱 안 결제가 없다.
  await expect(
    page.getByText("가지를 살리려면 햇살 3개가 필요해요."),
  ).toBeVisible();
  await expect(
    page.getByText("햇살은 iOS·Android 앱에서 채울 수 있어요."),
  ).toBeVisible();
  await page.getByRole("button", { name: "닫기", exact: true }).click();

  // 버리기는 한 번 더 묻는다.
  await page.getByRole("button", { name: "버리기", exact: true }).click();
  await expect(
    page.getByText("버리면 이 가지는 바로 사라지고 다시 살릴 수 없어요."),
  ).toBeVisible();
  await page.getByRole("button", { name: "버리기", exact: true }).click();
  await expect(page.getByText("수거함이 비어 있어요.")).toBeVisible();
  expect(calls.filter((call) => call.path.endsWith("/discard"))).toHaveLength(
    1,
  );
  expect(errors).toEqual([]);
});

test("the author of a chapter can pay sunlight to continue it, then writes it like a delivered fruit", async ({
  page,
}) => {
  const errors = collectErrors(page);
  let sent = false;
  const novel = {
    id: 77,
    kind: "RELAY",
    mode: "OPEN",
    deliveryCount: 10,
    branchLimit: 12,
    title: "토끼의 간",
    description: "용궁으로 간 토끼 이야기",
    genre: "판타지",
    status: "ONGOING",
    ownerNickname: "나",
    memberCount: 1,
    chapterCount: 1,
    chapterLimit: 20,
    isPublic: true,
    mine: true,
    myTurn: false,
    createdAt: "2026-10-12T09:00:00Z",
    likeCount: 3,
    liked: false,
  };
  const root = {
    id: 300,
    chapterNumber: 1,
    title: "용왕의 병",
    authorNickname: "나",
    excerpt: "용궁에 근심이 가득했다.",
    createdAt: "2026-10-12T09:00:00Z",
  };
  const calls = await mockBackend(page, ({ path, method }) => {
    if (path.endsWith("/auth/login"))
      return { accessToken: "test-access", refreshToken: "test-refresh" };
    if (path === "/api/v1/novels") return emptyPage;
    if (path.endsWith("/novels/home-feed")) return homeFeedOf([novel]);
    if (path.endsWith("/my-turns")) return [];
    const delivery = {
      deliveryId: 9,
      novel,
      chapterId: 300,
      chapterNumber: 1,
      chapterTitle: "용왕의 병",
      dueAt: "2099-10-26T09:00:00Z",
      source: "SELF",
    };
    if (path === "/api/v1/novels/deliveries") return sent ? [delivery] : [];
    if (path.endsWith("/chapters/300/self-delivery") && method === "POST") {
      sent = true;
      return delivery;
    }
    if (path.endsWith("/deliveries/9/draft"))
      return { turnNumber: 9, title: "", body: "" };
    if (path.endsWith("/chapter-tree")) return [root];
    if (path.endsWith("/chapters/nodes/300"))
      return {
        ...root,
        novelId: 77,
        body: "용궁에 근심이 가득했다.",
        viewCount: 3,
        canSelfContinue: !sent,
        selfContinueCost: 5,
      };
    if (path.endsWith("/me/sunlight"))
      return { balance: 8, restoreCost: 3, selfBranchCost: 5, products: [] };
    return {
      novel,
      members: [],
      applications: [],
      myMembership: "ACTIVE",
      canApply: false,
      canWrite: false,
      canStart: false,
      canComplete: true,
      turnNumber: 2,
      myDeliveryId: sent ? 9 : undefined,
    };
  });
  await login(page);
  await page.getByRole("button", { name: /토끼의 간 열매/ }).click();
  await page.getByRole("button", { name: /CHAPTER 01/ }).click();
  await page.getByRole("button", { name: "햇살 5개로 다음 회차 쓰기" }).click();
  await expect(
    page.getByText(/다 쓰지 않고 그만두면 햇살을 돌려받아요/),
  ).toBeVisible();
  await page.getByRole("button", { name: "햇살 5개 내고 이어 쓰기" }).click();
  await expect(
    page.getByRole("textbox", { name: "이어지는 이야기" }),
  ).toBeVisible();
  expect(
    calls.filter((call) => call.path.endsWith("/self-delivery")),
  ).toHaveLength(1);
  expect(errors).toEqual([]);
});

test("a fruit-spread story picks how many branches one chapter can grow, between 10 and 20", async ({
  page,
}) => {
  const errors = collectErrors(page);
  const calls = await mockBackend(page, ({ path, method, body }) => {
    if (path.endsWith("/auth/login"))
      return { accessToken: "test-access", refreshToken: "test-refresh" };
    if (path === "/api/v1/novels" && method === "POST")
      return {
        novel: {
          id: 90,
          kind: "RELAY",
          mode: "OPEN",
          deliveryCount: 10,
          branchLimit: body.branchLimit,
          title: body.title,
          description: body.description,
          genre: body.genre,
          status: "ONGOING",
          ownerNickname: "나",
          memberCount: 1,
          chapterCount: 0,
          chapterLimit: 20,
          isPublic: true,
          mine: true,
          myTurn: true,
          createdAt: "2026-10-19T09:00:00Z",
          likeCount: 0,
          liked: false,
        },
        members: [],
        applications: [],
        myMembership: "ACTIVE",
        canApply: false,
        canWrite: false,
        canStart: false,
        canComplete: false,
        turnNumber: 1,
      };
    if (path === "/api/v1/novels") return emptyPage;
    if (path.endsWith("/novels/home-feed")) return homeFeedOf([]);
    if (path.endsWith("/genres")) return ["판타지", "일상"];
    return [];
  });
  await login(page);
  await page.getByRole("button", { name: "새 이야기 심기" }).click();
  await page.getByRole("textbox", { name: "이야기 제목" }).fill("열 갈래 길");
  await page
    .getByRole("textbox", { name: "이야기 소개" })
    .fill("갈래마다 다른 이야기");
  await expect(page.getByLabel("가지 10개")).toBeVisible();
  await expect(
    page.getByRole("button", { name: "가지 하나 줄이기" }),
  ).toBeDisabled();
  await page.getByRole("button", { name: "가지 하나 늘리기" }).click();
  await page.getByRole("button", { name: "가지 하나 늘리기" }).click();
  await expect(page.getByLabel("가지 12개")).toBeVisible();
  await page.getByRole("button", { name: "첫 회차 쓰러 가기" }).click();
  const created = calls.filter(
    (call) => call.path === "/api/v1/novels" && call.method === "POST",
  );
  await expect.poll(() => created.length).toBe(1);
  expect(created[0].body.branchLimit).toBe(12);
  expect(created[0].body.deliveryCount).toBeUndefined();
  expect(errors).toEqual([]);
});
