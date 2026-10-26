import { test, expect } from "@playwright/test";
import { pickCover, uploadedCover } from "./mockBackend";

test("mobile demo lets a visitor pick a chapter fruit, read it and is sent to log in to continue it", async ({
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
  // 열매 하나는 지금 이어 쓸 수 있는 회차 하나다.
  const fruit = page.getByRole("button", {
    name: "비 오는 날의 우체부 4장 「밤의 끝」 열매",
  });
  await expect(fruit).toBeVisible();
  // 열매가 모두 하늘에서 떨어져 땅에 멈출 때까지 기다린 뒤 찍는다.
  // 아직 떨어지기 전인 열매는 화면 위 바깥에 멈춰 있으므로, 먼저 모두 땅으로 내려왔는지 본다.
  const fruits = page.getByRole("button", { name: / 열매$/ });
  await expect
    .poll(
      () =>
        fruits.evaluateAll((nodes) =>
          Math.min(...nodes.map((node) => node.getBoundingClientRect().top)),
        ),
      // 느린 환경에서도 열매가 모두 떨어져 내려앉을 때까지 넉넉히 기다린다.
      { timeout: 10_000 },
    )
    .toBeGreaterThan(250);
  for (const each of await fruits.all()) await each.click({ trial: true });
  await page.screenshot({
    path: "test-results/mobile-home.png",
    fullPage: true,
  });
  await fruit.click();
  // 누르면 그 회차를 읽고, 남은 가지 자리를 보고 이어 쓸 수 있다.
  await expect(
    page.getByText("창밖의 풍경이 조금씩 달라지고 있었다.", { exact: false }),
  ).toBeVisible();
  await expect(page.getByText(/이어 쓸 자리가 3개 남았어요/)).toBeVisible();
  await page.getByRole("button", { name: "이전 장" }).click();
  await expect(
    page.getByText("엇갈린 약속", { exact: true }).last(),
  ).toBeVisible();
  // 둘러보기에서는 이어 쓰기 전에 로그인한다.
  await page.getByRole("button", { name: "이 회차에서 이어 쓰기" }).click();
  await expect(
    page.getByRole("textbox", { name: "Bookey 계정 이메일" }),
  ).toBeVisible();
  expect(errors).toEqual([]);
});

test("backend contract supports login, circle creation with the owner's first chapter, draft save and turn handoff", async ({
  page,
}) => {
  // 만들면 1회차가 올라가 달조각 차례(created), 달조각이 2회차를 쓰면 다시 내 차례(writing), 3회차를 올리면 달조각 차례(published).
  let phase: "created" | "writing" | "published" = "created";
  const chapterCountOf = { created: 1, writing: 2, published: 3 };
  let liked = false;
  let likeCount = 12;
  const calls: { path: string; body: any }[] = [];
  const summary = () => ({
    id: 42,
    kind: "RELAY",
    title: "별사탕 우체국",
    description: "함께 만드는 작은 우주",
    genre: "판타지",
    status: "ONGOING",
    mode: "CIRCLE",
    ownerNickname: "별조각",
    memberCount: 2,
    memberLimit: 2,
    chapterCount: chapterCountOf[phase],
    chapterLimit: 20,
    isPublic: false,
    mine: true,
    myTurn: phase === "writing",
    createdAt: "2026-10-12T09:00:00Z",
    likeCount,
    liked,
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
        currentWriter: phase !== "writing",
      },
    ],
    applications: [],
    myMembership: "ACTIVE",
    canApply: false,
    canWrite: phase === "writing",
    canStart: false,
    canComplete: true,
    turnNumber: chapterCountOf[phase] + 1,
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
    else if (path === "/api/v1/novels" && method === "POST") {
      expect(body.kind).toBe("RELAY");
      // 모여 만들기는 고른 팔로우 작가와 비공개로 만든다.
      expect(body.mode).toBe("CIRCLE");
      expect(body.inviteeIds).toEqual([2]);
      expect(body.isPublic).toBe(false);
      // 1회차는 만든 사람이 작품과 함께 올린다.
      expect(body.firstChapter).toEqual({
        title: "첫 번째 별",
        body: "밤하늘에서 별사탕 하나가 떨어졌다.",
      });
      // 표지는 꼭 넣는다. 먼저 올려 둔 표지의 id를 함께 보낸다.
      expect(body.coverId).toBe(uploadedCover.id);
      data = detail();
    } else if (path.endsWith("/novels/covers") && method === "POST")
      data = uploadedCover;
    else if (path.endsWith("/follows/following"))
      data = {
        content: [
          {
            userId: 2,
            nickname: "달조각",
            mutual: true,
            followedAt: "2026-10-01T09:00:00Z",
          },
        ],
        page: 0,
        hasNext: false,
        totalElements: 1,
        totalPages: 1,
        size: 50,
      };
    else if (path.endsWith("/novels/genres"))
      data = ["판타지", "일상", "미스터리", "로맨스", "SF"];
    else if (path.endsWith("/deliveries")) data = [];
    else if (path.endsWith("/chapter-tree"))
      data = [
        { title: "첫 번째 별", authorNickname: "별조각" },
        { title: "두 번째 별", authorNickname: "달조각" },
        { title: "세 번째 별", authorNickname: "별조각" },
      ]
        .slice(0, chapterCountOf[phase])
        .map((chapter, index) => ({
          ...chapter,
          id: 100 + index,
          parentChapterId: index === 0 ? undefined : 99 + index,
          chapterNumber: index + 1,
          excerpt: "밤하늘에서 별사탕 하나가 떨어졌다.",
          createdAt: "2026-10-12T09:00:00Z",
        }));
    else if (path.endsWith("/novels/home-feed"))
      data = {
        novels: [summary()],
        freeRefreshesLeftToday: 2,
        dailyFreeRefreshes: 2,
        resetsAt: "2026-10-15T15:00:00Z",
      };
    else if (path === "/api/v1/novels")
      data = {
        content: [summary()],
        page: 0,
        hasNext: false,
        totalElements: 1,
        totalPages: 1,
        size: 20,
      };
    else if (path.endsWith("/draft"))
      data = {
        ...body,
        turnNumber: 3,
        title: body?.title || "",
        body: body?.body || "",
        savedAt: method === "PUT" ? "2026-10-12T09:00:00Z" : undefined,
      };
    else if (path.endsWith("/chapters") && method === "POST") {
      expect(body.turnNumber).toBe(3);
      phase = "published";
      data = {
        id: 102,
        novelId: 42,
        chapterNumber: 3,
        title: body.title,
        body: body.body,
        authorNickname: "별조각",
        createdAt: "2026-10-12T09:00:00Z",
      };
    } else if (path.endsWith("/my-turns"))
      data = phase === "writing" ? [summary()] : [];
    else if (path.endsWith("/like") && method === "POST") {
      // 그사이 다른 사람들도 눌러서 서버의 수는 앱이 미리 보여 준 수보다 크다.
      liked = !liked;
      likeCount = liked ? 30 : 29;
      data = { liked, likeCount };
    } else data = detail();
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
  // 씨앗주머니를 눌러 새 이야기를 심는다. 표지는 꼭 넣는다.
  await page.getByRole("button", { name: "새 이야기 심기" }).click();
  await pickCover(page);
  await page
    .getByRole("textbox", { name: "이야기 제목" })
    .fill("별사탕 우체국");
  await page
    .getByRole("textbox", { name: "이야기 소개" })
    .fill("함께 만드는 작은 우주");
  // 팔로우한 작가를 골라 모여 만든다.
  await page.getByRole("radio", { name: "모여 만들기" }).click();
  await page.getByRole("checkbox", { name: "달조각" }).click();
  await page.getByRole("textbox", { name: "1회차 제목" }).fill("첫 번째 별");
  await page
    .getByRole("textbox", { name: "1회차 이야기" })
    .fill("밤하늘에서 별사탕 하나가 떨어졌다.");
  await page
    .getByRole("button", { name: "1회차 올리고 모여 만들기 시작하기" })
    .click();
  await expect(
    page.getByText("달조각 님이 이어 쓰고 있어요.").last(),
  ).toBeVisible();
  // 좋아요를 누르면 서버가 돌려준 실제 수로 맞춘다.
  await page.getByRole("button", { name: "좋아요 12개" }).click();
  await expect(page.getByRole("button", { name: "좋아요 30개" })).toBeVisible();
  expect(calls.filter((c) => c.path === "/api/v1/novels/42/like")).toHaveLength(
    1,
  );
  // 달조각이 2회차를 올려 차례가 돌아왔다.
  phase = "writing";
  await page.reload();
  await page.getByRole("button", { name: "다음 장 이어 쓰기" }).click();
  await page
    .getByRole("textbox", { name: "이번 장의 제목" })
    .fill("세 번째 별");
  await page
    .getByRole("textbox", { name: "이어지는 이야기" })
    .fill(
      "밤하늘에서 별사탕 하나가 떨어졌다. 그 안에는 누군가의 첫 문장이 담겨 있었다.",
    );
  // 손을 멈추면 저절로 임시저장한다.
  await expect(page.getByText(/저장됨/).last()).toBeVisible();
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

test("mobile demo moves between home, my page and fruits with the bottom buttons", async ({
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
  await expect(
    page.getByRole("button", { name: "새 이야기 심기" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "마이", exact: true }).click();
  // 마이 맨 위 유리 명함에 내 작품 수가 있다.
  await expect(page.getByLabel("내 작품 1편")).toBeVisible();
  await expect(
    page.getByRole("button", { name: "달빛을 파는 가게, 이야기 이어가는 중" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "열매", exact: true }).click();
  // 열매 탭은 위쪽에 나를 위한 이야기(둘러보기는 좋아요가 많은 예시)를 두고, 그 아래 모든 이야기를 표지 서가로 보인다.
  await expect(
    page.getByRole("heading", { name: "나를 위한 이야기" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "모든 이야기" }),
  ).toBeVisible();
  // 상태는 서가에서 고를 수 없다.
  const recruiting = page.getByRole("button", {
    name: "우리의 여름은 아직, 작가 모집 중",
  });
  await expect(recruiting).toBeVisible();
  const completedTab = page.getByRole("button", {
    name: "완결된 이야기",
    exact: true,
  });
  await expect(completedTab).toHaveCount(0);
  // 돋보기를 누르면 서가 위로 검색 유리막이 덮인다. 치기 전에는 이번 주 많이 이어 쓴 이야기 순위가 보이고,
  // 뒤의 서가는 화면 읽기에서 숨는다. 아무도 이어 쓰지 않은 작품은 순위에 없다.
  await page.getByRole("button", { name: "열매 찾기" }).click();
  await expect(
    page.getByRole("heading", { name: "이번 주 많이 이어 쓴 이야기" }),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: /^1위 / })).toBeVisible();
  await expect(recruiting).toHaveCount(0);
  // 치면 순위 자리가 결과로 바뀌고, 칠 때마다 바로 바뀐다.
  const searchBox = page.getByRole("textbox", { name: "열매 찾기" });
  const completed = page.getByRole("button", {
    name: "받는 사람: 내일의 너, 완결된 이야기",
  });
  await searchBox.fill("별빛");
  await expect(completed).toHaveCount(0);
  await searchBox.fill("받는");
  await expect(completed).toBeVisible();
  // 결과는 상태·장르로 거른다(완결된 SF는 없다).
  await completedTab.click();
  await expect(completed).toBeVisible();
  await page.getByRole("button", { name: "SF", exact: true }).click();
  await expect(completed).toHaveCount(0);
  await page.getByRole("button", { name: "SF", exact: true }).click();
  await expect(completed).toBeVisible();
  // 키보드의 찾기를 누르면 그 말이 최근 찾은 말에 남는다.
  await searchBox.press("Enter");
  // 취소하면 유리막이 걷히고 서가로 돌아온다.
  await page.getByRole("button", { name: "찾기 닫기" }).click();
  await expect(recruiting).toBeVisible();
  await expect(completedTab).toHaveCount(0);
  // 다시 열면 최근 찾은 말이 있고, 누르면 그 말로 다시 찾는다.
  await page.getByRole("button", { name: "열매 찾기" }).click();
  const recentWord = page.getByRole("button", { name: "받는 다시 찾기" });
  await expect(recentWord).toBeVisible();
  await recentWord.click();
  await expect(searchBox).toHaveValue("받는");
  await expect(completed).toBeVisible();
  // 지우개로 비우면 다시 순위가 보이고, ×로 지우면 최근 찾은 말 묶음이 사라진다.
  await searchBox.fill("");
  await page.getByRole("button", { name: "받는 지우기" }).click();
  await expect(recentWord).toHaveCount(0);
  await page.getByRole("button", { name: "찾기 닫기" }).click();
  await expect(recruiting).toBeVisible();
  await page.getByRole("button", { name: "홈", exact: true }).click();
  await expect(
    page.getByRole("button", {
      name: "비 오는 날의 우체부 4장 「밤의 끝」 열매",
    }),
  ).toBeVisible();
  expect(errors).toEqual([]);
});

test("mobile demo lets a visitor pick up a fruit, move it forward and drop it", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/");
  await page.getByText("먼저 둘러보기 →").click();
  const fruit = page.getByRole("button", {
    name: "비 오는 날의 우체부 4장 「밤의 끝」 열매",
  });
  const fruits = page.getByRole("button", { name: / 열매$/ });
  await expect
    .poll(
      () =>
        fruits.evaluateAll((nodes) =>
          Math.min(...nodes.map((node) => node.getBoundingClientRect().top)),
        ),
      // 느린 환경에서도 열매가 모두 떨어져 내려앉을 때까지 넉넉히 기다린다.
      { timeout: 10_000 },
    )
    .toBeGreaterThan(250);
  // 모두 내려앉아 멈출 때까지 기다린다. 땅에 멈춘 열매만 집을 수 있으므로 자리가 더는 바뀌지 않는지 본다.
  await page.waitForTimeout(2500);
  await expect
    .poll(
      async () => {
        const first = (await fruit.boundingBox())!;
        await page.waitForTimeout(300);
        const second = (await fruit.boundingBox())!;
        return Math.abs(first.x - second.x) + Math.abs(first.y - second.y);
      },
      { timeout: 10_000 },
    )
    .toBeLessThan(0.1);
  // 열매 바닥은 그림 칸 높이의 90% 지점이다(FruitArt의 FRUIT_BOTTOM).
  const bottomOf = (box: { y: number; height: number }) =>
    box.y + box.height * 0.9;
  const before = (await fruit.boundingBox())!;
  // 열매 자리는 매번 무작위라 바로 앞 열매가 아래쪽을 가릴 수 있어, 가려지지 않는 윗부분을 누른다.
  const from = {
    x: before.x + before.width / 2,
    y: before.y + before.height * 0.3,
  };
  const bubbleMeta = page.getByText("4장 · 밤의 끝", { exact: true });

  // 길게 누르면 말풍선으로 어느 작품의 몇 장인지 보이고, 끌지 않고 놓으면 그 자리에 그대로 있다.
  await page.mouse.move(from.x, from.y);
  await page.mouse.down();
  await page.waitForTimeout(600);
  await expect(bubbleMeta).toBeVisible();
  await expect(
    page.getByText("이어 쓸 자리 3개 · 작가 5명", { exact: true }),
  ).toBeVisible();
  await expect(page.getByText("일상", { exact: true })).toBeVisible();
  await page.mouse.up();
  await expect(bubbleMeta).toHaveCount(0);
  const peeked = (await fruit.boundingBox())!;
  expect(Math.abs(peeked.x - before.x)).toBeLessThan(1);
  expect(Math.abs(peeked.y - before.y)).toBeLessThan(1);
  // 길게 누른 뒤 뒤늦게 소설로 넘어가지 않는지, 잠시 기다렸다가 확인한다.
  await page.waitForTimeout(500);
  await expect(page).not.toHaveURL(/\/novel\//);

  // 끌면 열매가 손가락 아래에 그대로 붙어 앞쪽 빈 땅까지 따라온다.
  // 왼쪽 끝 열매를 왼쪽으로 끌면 땅 끝에 걸리므로 화면 가운데 쪽으로 끈다.
  const drag = { x: from.x < 195 ? 30 : -30, y: 150 };
  await page.mouse.down();
  // 끌기는 열매 윗부분 안에서 옆으로 움직여 시작한다. 웹의 마우스는 다른 열매 위에서 시작한 끌기를
  // 뒤쪽 열매에 넘기지 않는다(터치 기기는 처음 누른 열매를 계속 끈다).
  await page.mouse.move(from.x + Math.sign(drag.x) * 12, from.y);
  await page.waitForTimeout(16);
  for (let step = 1; step <= 15; step++) {
    await page.mouse.move(
      from.x + (drag.x * step) / 15,
      from.y + (drag.y * step) / 15,
    );
    await page.waitForTimeout(16);
  }
  await page.waitForTimeout(200);
  const held = (await fruit.boundingBox())!;
  expect(Math.abs(held.x + held.width / 2 - (from.x + drag.x))).toBeLessThan(2);
  expect(Math.abs(bottomOf(held) - (bottomOf(before) + drag.y))).toBeLessThan(
    2,
  );
  // 앞쪽으로 옮기면 가까워진 만큼 커 보인다.
  expect(held.height).toBeGreaterThan(before.height);
  await expect(
    page.getByText("비 오는 날의 우체부", { exact: true }),
  ).toBeVisible();

  // 놓으면 바로 아래 땅으로 떨어져 멈추고 말풍선은 사라진다.
  await page.mouse.up();
  await page.waitForTimeout(1500);
  await expect(bubbleMeta).toHaveCount(0);
  const after = (await fruit.boundingBox())!;
  expect(Math.abs(after.x + after.width / 2 - (from.x + drag.x))).toBeLessThan(
    2,
  );
  expect(bottomOf(after)).toBeGreaterThan(bottomOf(held) + 10);

  // 옮긴 열매도 누르면 그 회차로 간다.
  await fruit.click();
  await expect(
    page.getByText("창밖의 풍경이 조금씩 달라지고 있었다.", { exact: false }),
  ).toBeVisible();
  expect(errors).toEqual([]);
});

test("mobile demo shows a popular story's likes and sends a visitor to log in to like it", async ({
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
  // 좋아요가 100개를 넘은 열매는 별이 반짝이고 흔들리지만, 누르는 영역은 그대로라 바로 누를 수 있다.
  // 그림을 볼 수 없는 사람도 알 수 있게 이름 앞에 "인기"가 붙는다.
  await page
    .getByRole("button", {
      name: "인기 마지막 별빛 정거장 6장 「이야기의 끝」 열매",
    })
    .click();
  await expect(page.getByText(/이어 쓸 자리가/)).toBeVisible();
  // 좋아요는 작품 화면에 있다. 열매 탭에서 그 작품을 연다.
  await page
    .getByLabel("뒤로", { exact: true })
    .filter({ visible: true })
    .click();
  await page.getByRole("button", { name: "열매", exact: true }).click();
  // 좋아요가 많아 위의 '나를 위한 이야기'에도, 아래 서가에도 있다. 어느 쪽이든 같은 작품으로 간다.
  await page
    .getByRole("button", { name: "마지막 별빛 정거장, 이야기 이어가는 중" })
    .first()
    .click();
  const like = page.getByRole("button", { name: "좋아요 311개" });
  await expect(like).toBeVisible();
  await like.click();
  await expect(
    page.getByRole("textbox", { name: "Bookey 계정 이메일" }),
  ).toBeVisible();
  expect(errors).toEqual([]);
});

test("mobile demo switches to the dark screen mode on the my page and keeps it after reload", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  const openMyPage = async () => {
    await page.getByText("먼저 둘러보기 →").click();
    await page.getByRole("button", { name: "마이", exact: true }).click();
    await expect(page.getByText("화면 모드", { exact: true })).toBeVisible();
  };
  await page.goto("/");
  await openMyPage();
  // 마이 맨 위는 닉네임(둘러보기에서는 예시 작가 "달조각")이다.
  const heading = page.getByRole("heading", { name: "달조각" });
  // 밝은 모드 잉크색(#30362F)
  await expect(heading).toHaveCSS("color", "rgb(48, 54, 47)");

  // 화면 모드 줄을 누르면 아래에서 고르는 창이 올라온다.
  await page.getByRole("button", { name: "화면 모드, 기기 설정" }).click();
  await page.getByRole("radio", { name: "어둡게" }).click();
  // 고르면 창이 닫히고 줄에 고른 값이 적힌다.
  await expect(
    page.getByRole("button", { name: "화면 모드, 어둡게" }),
  ).toBeVisible();
  // 어두운 모드 잉크색(#E6E8E1)
  await expect(heading).toHaveCSS("color", "rgb(230, 232, 225)");

  // 고른 모드는 기기에 남아 새로 열어도 그대로다.
  await page.reload();
  await openMyPage();
  await page.getByRole("button", { name: "화면 모드, 어둡게" }).click();
  await expect(page.getByRole("radio", { name: "어둡게" })).toHaveAttribute(
    "aria-checked",
    "true",
  );
  await expect(page.getByRole("heading", { name: "달조각" })).toHaveCSS(
    "color",
    "rgb(230, 232, 225)",
  );
  expect(errors).toEqual([]);
});
