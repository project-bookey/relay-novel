import { test, expect } from "@playwright/test";
import {
  collectErrors,
  emptyPage,
  fruitOf,
  homeFeedOf,
  mockBackend,
} from "./mockBackend";

test("a reader picks an open chapter fruit, holds a slot and grows a new branch from it", async ({
  page,
}) => {
  const errors = collectErrors(page);
  let claimed = false;
  let written = false;
  const novel = () => ({
    id: 77,
    kind: "RELAY",
    mode: "OPEN",
    branchLimit: 3,
    title: "토끼의 간",
    description: "용궁으로 간 토끼 이야기",
    genre: "판타지",
    status: "ONGOING",
    ownerNickname: "자라",
    memberCount: 2,
    chapterCount: written ? 3 : 2,
    chapterLimit: 20,
    isPublic: true,
    mine: false,
    myTurn: false,
    createdAt: "2026-10-12T09:00:00Z",
    likeCount: 3,
    liked: false,
  });
  // 홈 묶음에 함께 놓인 다른 소설
  const neighbor = {
    ...novel(),
    id: 78,
    title: "별주부전",
    chapterCount: 4,
  };
  const root = {
    id: 300,
    chapterNumber: 1,
    title: "용왕의 병",
    authorNickname: "자라",
    excerpt: "용궁에 근심이 가득했다.",
    createdAt: "2026-10-12T09:00:00Z",
    trunk: true,
  };
  const firstBranch = {
    id: 301,
    parentChapterId: 300,
    chapterNumber: 2,
    title: "육지로",
    authorNickname: "거북",
    excerpt: "자라는 뭍으로 올라갔다.",
    createdAt: "2026-10-13T09:00:00Z",
    trunk: false,
  };
  const myBranch = {
    id: 302,
    parentChapterId: 300,
    chapterNumber: 2,
    title: "다른 길",
    authorNickname: "나",
    excerpt: "토끼가 먼저 찾아왔다.",
    createdAt: "2026-10-14T09:00:00Z",
    trunk: false,
  };
  // 읽기 화면이 받는 회차(NovelChapterView)
  const reading = (
    node: typeof root,
    body: string,
    canClaim = false,
    slotsLeft = 0,
  ) => ({
    ...node,
    novelId: 77,
    body,
    viewCount: 1,
    canSelfContinue: false,
    selfContinueCost: 5,
    canClaim,
    slotsLeft,
  });
  const claim = () => ({
    deliveryId: 5,
    novel: novel(),
    chapterId: 300,
    chapterNumber: 1,
    chapterTitle: "용왕의 병",
    dueAt: "2099-10-15T09:00:00Z",
    source: "CLAIM",
  });
  const rootFruit = () => fruitOf(novel(), { id: 300, title: "용왕의 병" });
  const neighborFruit = fruitOf(neighbor, {
    id: 400,
    number: 2,
    title: "거북의 등",
  });
  const calls = await mockBackend(page, ({ path, method, body }) => {
    if (path.endsWith("/auth/login"))
      return { accessToken: "test-access", refreshToken: "test-refresh" };
    if (path === "/api/v1/novels") return emptyPage;
    // 이어 쓴 회차는 서버가 내 열매에서 뺀다.
    if (path.endsWith("/novels/home-feed"))
      return homeFeedOf(
        [novel(), neighbor],
        2,
        written ? [neighborFruit] : [rootFruit(), neighborFruit],
      );
    if (path.endsWith("/my-turns")) return [];
    if (path === "/api/v1/novels/deliveries")
      return claimed && !written ? [claim()] : [];
    if (path.endsWith("/chapters/300/claim") && method === "POST") {
      claimed = true;
      return claim();
    }
    if (path.endsWith("/deliveries/5/draft"))
      return {
        turnNumber: 5,
        title: body?.title || "",
        body: body?.body || "",
        savedAt: method === "PUT" ? "2026-10-14T09:00:00Z" : undefined,
      };
    if (path.endsWith("/deliveries/5/chapters")) {
      written = true;
      return {
        ...reading(myBranch, body.body),
        title: body.title,
      };
    }
    if (path.endsWith("/chapter-tree"))
      return written ? [root, firstBranch, myBranch] : [root, firstBranch];
    if (path.endsWith("/chapters/nodes/301"))
      return reading(firstBranch, "자라는 뭍으로 올라갔다.");
    if (path.endsWith("/chapters/nodes/302"))
      return reading(myBranch, "토끼가 먼저 용궁을 찾아왔다.");
    if (path.endsWith("/chapters/nodes/300"))
      return reading(
        root,
        "용궁에 근심이 가득했다. 용왕의 병을 고칠 약은 토끼의 간뿐이었다.",
        !claimed,
        2,
      );
    return {
      novel: novel(),
      members: [
        {
          userId: 1,
          nickname: "자라",
          status: "ACTIVE",
          owner: true,
          currentWriter: false,
        },
      ],
      applications: [],
      myMembership: "NONE",
      canApply: false,
      canWrite: false,
      canStart: false,
      canComplete: false,
      turnNumber: 3,
      myDeliveryId: claimed && !written ? 5 : undefined,
    };
  });
  await page.goto("/");
  await page
    .getByRole("textbox", { name: "Bookey 계정 이메일" })
    .fill("reader@example.test");
  await page.getByRole("textbox", { name: "비밀번호" }).fill("test-password");
  await page
    .getByRole("button", { name: "로그인하고 이야기 이어가기" })
    .click();
  // 이어 쓸 수 있는 회차가 열매로 떨어진다. 함께 놓인 열매가 다 내려앉은 자리를 적어 둔다.
  const neighborButton = page.getByRole("button", {
    name: "별주부전 2장 「거북의 등」 열매",
  });
  const settledBox = async () => {
    let before = await neighborButton.boundingBox();
    for (;;) {
      await page.waitForTimeout(250);
      const now = await neighborButton.boundingBox();
      if (before && now && before.x === now.x && before.y === now.y) return now;
      before = now;
    }
  };
  const neighborBox = await settledBox();
  // 열매를 누르면 그 회차를 읽고, 그 자리에서 이어 쓰기를 시작해 자리를 맡는다.
  await page
    .getByRole("button", { name: "토끼의 간 1장 「용왕의 병」 열매" })
    .click();
  await expect(
    page.getByText("용왕의 병을 고칠 약은", { exact: false }),
  ).toBeVisible();
  await expect(
    page.getByText(/이어 쓸 자리가 2개 남았어요/).filter({ visible: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "이 회차에서 이어 쓰기" }).click();
  // 맡은 회차를 편집기 위에서 다시 볼 수 있다.
  await expect(page.getByText("이어받은 1장")).toBeVisible();
  await page.getByRole("textbox", { name: "이번 장의 제목" }).fill("다른 길");
  await page
    .getByRole("textbox", { name: "이어지는 이야기" })
    .fill("토끼가 먼저 용궁을 찾아왔다.");
  await page.getByRole("button", { name: "임시저장", exact: true }).click();
  await expect(page.getByText(/최근 저장/).last()).toBeVisible();
  await page.getByRole("button", { name: "회차 발행", exact: true }).click();
  await page.getByRole("button", { name: "발행하고 열매 맺기" }).click();
  // 발행해 가지가 갈라지면 목차는 끝 열매마다 한 줄기로 바뀌고, 새 가지는 1장에서 갈라진 열매 2가 된다.
  const myLine = page.getByRole("button", {
    name: "열매 2, 2장, 다른 길, 자라는 중, 열매 1의 1장에서 갈라졌어요",
  });
  await expect(myLine).toBeVisible();
  await expect(
    page.getByRole("button", { name: /^열매 1, 2장, 육지로/ }),
  ).toBeVisible();
  // 그 열매를 누르면 1장부터 그 줄기를 따라 읽고, 갈라진 회차에서는 옆 가지로 넘길 수 있다.
  await myLine.click();
  await expect(
    page
      .getByText("용왕의 병을 고칠 약은", { exact: false })
      .filter({ visible: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "다음 장" }).click();
  await expect(page.getByText("토끼가 먼저 용궁을 찾아왔다.")).toBeVisible();
  await expect(page.getByText("이 줄기는 아직 자라는 중이에요")).toBeVisible();
  await page.getByRole("button", { name: "이전 가지" }).click();
  await expect(page.getByText("자라는 뭍으로 올라갔다.")).toBeVisible();
  await expect(page.getByRole("button", { name: "다음 가지" })).toBeEnabled();
  await page.getByRole("button", { name: "다른 열매 보기" }).click();
  await expect(myLine).toBeVisible();
  expect(
    calls.filter(
      (call) =>
        call.path.endsWith("/chapters/300/claim") && call.method === "POST",
    ),
  ).toHaveLength(1);
  const published = calls.filter(
    (call) =>
      call.path.endsWith("/deliveries/5/chapters") && call.method === "POST",
  );
  expect(published).toHaveLength(1);
  expect(published[0].body).toEqual({
    title: "다른 길",
    body: "토끼가 먼저 용궁을 찾아왔다.",
  });
  // 이어 쓴 회차는 홈에서 사라지고, 다른 열매는 그대로 놓여 있다.
  // 발행하면 편집기 자리에 작품 화면이 들어서므로, 작품 화면과 읽던 회차를 거슬러 홈으로 간다.
  const back = page
    .getByLabel("뒤로", { exact: true })
    .filter({ visible: true });
  await back.click();
  await expect(
    page
      .getByText("용궁에 근심이 가득했다.", { exact: false })
      .filter({ visible: true }),
  ).toBeVisible();
  await back.click();
  await expect(neighborButton).toBeVisible();
  await expect(
    page.getByRole("button", { name: /토끼의 간 .*열매/ }),
  ).toHaveCount(0);
  expect(await neighborButton.boundingBox()).toEqual(neighborBox);
  // 앱을 다시 열어도 다시 놓이지 않는다.
  await page.goto("/");
  await expect(neighborButton).toBeVisible();
  await expect(
    page.getByRole("button", { name: /토끼의 간 .*열매/ }),
  ).toHaveCount(0);
  expect(errors).toEqual([]);
});

test("a new member signs up with an email code and picks favorite genres", async ({
  page,
}) => {
  const errors = collectErrors(page);
  const calls = await mockBackend(
    page,
    async ({ path, method, body }, route) => {
      if (path.endsWith("/auth/signup-config"))
        return { verification: "EMAIL_CODE", identityDevStub: false };
      if (path.endsWith("/auth/email/code"))
        return {
          expiresInSec: 180,
          devCode: "123456",
          resendsLeft: 4,
          sendLimit: 5,
        };
      if (path.endsWith("/auth/email/code/verify")) {
        await route.fulfill({
          status: 204,
          headers: { "Access-Control-Allow-Origin": "*" },
        });
        return undefined;
      }
      if (path.includes("/public/legal/"))
        return {
          key: path.split("/").pop(),
          title: "약관",
          version: "2026-10-04",
          effectiveDate: "2026-10-04",
          body: "짧은 약관",
        };
      if (path.endsWith("/auth/signup"))
        return {
          accessToken: "new-access",
          refreshToken: "new-refresh",
          expiresInSec: 3600,
          newUser: true,
          user: { id: 9 },
        };
      if (path.endsWith("/novels/genres"))
        return ["판타지", "일상", "미스터리", "로맨스", "SF"];
      if (path.endsWith("/me/genres"))
        return method === "PUT" ? body.genres : [];
      if (path.endsWith("/deliveries") || path.endsWith("/my-turns")) return [];
      if (path.endsWith("/novels/home-feed")) return homeFeedOf([]);
      return emptyPage;
    },
  );
  await page.goto("/");
  await page.getByRole("button", { name: "처음이라면 회원가입" }).click();
  await page
    .getByRole("textbox", { name: "이메일", exact: true })
    .fill("new@example.test");
  await page.getByRole("button", { name: "인증 코드 받기" }).click();
  await page.getByRole("textbox", { name: "이메일 인증 코드" }).fill("123456");
  await page.getByRole("button", { name: "코드 확인" }).click();
  await expect(page.getByText("이메일을 확인했어요.")).toBeVisible();
  await page.getByRole("textbox", { name: "닉네임" }).fill("새작가");
  await page.getByRole("textbox", { name: "비밀번호" }).fill("password1234");
  await page
    .getByRole("checkbox", { name: "[필수] 만 14세 이상입니다" })
    .click();
  // 필수 약관은 문서를 열어 읽은 뒤 동의한다.
  await page.getByRole("checkbox", { name: "[필수] 이용약관" }).click();
  await page.getByRole("button", { name: "동의하기" }).click();
  await page
    .getByRole("checkbox", { name: "[필수] 개인정보 수집·이용" })
    .click();
  await page.getByRole("button", { name: "동의하기" }).click();
  await page.getByRole("button", { name: "이메일로 회원가입" }).click();
  // 가입하면 바로 관심 장르를 고른다.
  await page.getByRole("checkbox", { name: "판타지" }).click();
  await page.getByRole("button", { name: "관심 장르 저장하기" }).click();
  await expect(page.getByText("아직 떨어진 열매가 없어요.")).toBeVisible();
  const signup = calls.find((call) => call.path.endsWith("/auth/signup"));
  expect(signup?.body).toMatchObject({
    email: "new@example.test",
    nickname: "새작가",
    code: "123456",
    consent: {
      ageConfirmed: true,
      termsAgreed: true,
      termsVersion: "2026-10-04",
      privacyAgreed: true,
      marketingAgreed: false,
    },
  });
  const genres = calls.find(
    (call) => call.path.endsWith("/me/genres") && call.method === "PUT",
  );
  expect(genres?.body).toEqual({ genres: ["판타지"] });
  expect(errors).toEqual([]);
});
