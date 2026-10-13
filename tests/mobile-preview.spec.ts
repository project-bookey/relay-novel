import { test, expect } from "@playwright/test";

test("mobile demo lets a visitor pick a fruit and read relay chapters", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (/Invalid DOM property|non-boolean attribute/.test(message.text()))
      errors.push(message.text());
  });
  await page.goto("/");
  await page.getByText("먼저 둘러보기 →").click();
  const fruit = page.getByRole("button", { name: "달빛을 파는 가게 열매" });
  await expect(fruit).toBeVisible();
  // 열매가 다 내려앉아 실제로 누를 수 있을 때까지 기다린 뒤 찍는다.
  await fruit.click({ trial: true });
  await page.screenshot({
    path: "test-results/mobile-home.png",
    fullPage: true,
  });
  await fruit.click();
  await expect(page.getByText("함께 쓰는 작가들")).toBeVisible();
  await page.getByRole("button", { name: /CHAPTER 01/ }).click();
  await expect(
    page.getByText("그 가게를 발견한 건 마지막 버스를 놓친 밤이었다.", {
      exact: false,
    }),
  ).toBeVisible();
  await page.getByRole("button", { name: "다음 장" }).click();
  await expect(
    page.getByText("잊어버린 꿈", { exact: true }).last(),
  ).toBeVisible();
  expect(errors).toEqual([]);
});

test("backend contract supports login, relay start, draft save and turn handoff", async ({
  page,
}) => {
  let phase: "recruiting" | "writing" | "published" = "recruiting";
  const calls: { path: string; body: any }[] = [];
  const summary = () => ({
    id: 42,
    kind: "RELAY",
    title: "별사탕 우체국",
    description: "함께 만드는 작은 우주",
    genre: "판타지",
    status: phase === "recruiting" ? "RECRUITING" : "ONGOING",
    ownerNickname: "별조각",
    memberCount: 2,
    memberLimit: 6,
    chapterCount: phase === "published" ? 1 : 0,
    chapterLimit: 20,
    isPublic: true,
    mine: true,
    myTurn: phase === "writing",
    createdAt: "2026-10-12T09:00:00Z",
  });
  const detail = () => ({
    novel: summary(),
    members: [
      {
        userId: 1,
        nickname: "별조각",
        status: "ACTIVE",
        owner: true,
        currentWriter: phase === "writing",
      },
      {
        userId: 2,
        nickname: "달조각",
        status: "ACTIVE",
        owner: false,
        currentWriter: phase === "published",
      },
    ],
    applications: [],
    myMembership: "ACTIVE",
    canApply: false,
    canWrite: phase === "writing",
    canStart: phase === "recruiting",
    canComplete: phase === "published",
    turnNumber: phase === "published" ? 2 : 1,
    currentWriterNickname: phase === "writing" ? "별조각" : "달조각",
  });
  await page.route("**/api/v1/**", async (route) => {
    const request = route.request(),
      path = new URL(request.url()).pathname,
      method = request.method();
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
    calls.push({ path, body });
    let data: unknown;
    if (path.endsWith("/auth/login"))
      data = { accessToken: "test-access", refreshToken: "test-refresh" };
    else if (path === "/api/v1/novels")
      data = {
        content: [summary()],
        page: 0,
        hasNext: false,
        totalElements: 1,
        totalPages: 1,
        size: 20,
      };
    else if (path.endsWith("/start")) {
      phase = "writing";
      data = detail();
    } else if (path.endsWith("/draft"))
      data = {
        ...body,
        turnNumber: 1,
        title: body?.title || "",
        body: body?.body || "",
        savedAt: method === "PUT" ? "2026-10-12T09:00:00Z" : undefined,
      };
    else if (path.endsWith("/chapters") && method === "POST") {
      expect(body.turnNumber).toBe(1);
      phase = "published";
      data = {
        id: 100,
        novelId: 42,
        chapterNumber: 1,
        title: body.title,
        body: body.body,
        authorNickname: "별조각",
        createdAt: "2026-10-12T09:00:00Z",
      };
    } else if (path.endsWith("/chapters"))
      data = {
        content: [],
        page: 0,
        hasNext: false,
        totalElements: 0,
        totalPages: 0,
        size: 20,
      };
    else if (path.endsWith("/my-turns"))
      data = phase === "writing" ? [summary()] : [];
    else data = detail();
    await route.fulfill({
      json: data,
      headers: { "Access-Control-Allow-Origin": "*" },
    });
  });
  await page.goto("/");
  await page
    .getByRole("textbox", { name: "Bookey 계정 이메일" })
    .fill("writer@example.test");
  await page.getByRole("textbox", { name: "비밀번호" }).fill("test-password");
  await page
    .getByRole("button", { name: "로그인하고 이야기 이어가기" })
    .click();
  // 홈에는 열매만 있으므로, 내가 개설한 모집 중인 소설의 열매에서 시작한다.
  await page.getByRole("button", { name: "별사탕 우체국 열매" }).click();
  await page
    .getByRole("button", { name: "모인 작가들과 릴레이 시작하기" })
    .click();
  await page.getByRole("button", { name: "다음 장 이어 쓰기" }).click();
  await page
    .getByRole("textbox", { name: "이번 장의 제목" })
    .fill("첫 번째 별");
  await page
    .getByRole("textbox", { name: "이어지는 이야기" })
    .fill(
      "밤하늘에서 별사탕 하나가 떨어졌다. 그 안에는 누군가의 첫 문장이 담겨 있었다.",
    );
  await page.getByRole("button", { name: "임시저장", exact: true }).click();
  await expect(page.getByText(/최근 저장/).last()).toBeVisible();
  await page.getByRole("button", { name: "회차 발행", exact: true }).click();
  await page
    .getByRole("button", { name: "발행하고 다음 작가에게 넘기기" })
    .click();
  await expect(
    page.getByText("달조각 님이 이어 쓰고 있어요.").last(),
  ).toBeVisible();
  expect(
    calls.filter((c) => c.path.endsWith("/chapters") && c.body?.turnNumber),
  ).toHaveLength(1);
});
