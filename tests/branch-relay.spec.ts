import { test, expect } from "@playwright/test";
import {
  collectErrors,
  emptyPage,
  homeFeedOf,
  mockBackend,
} from "./mockBackend";

test("a delivered fruit lets the reader grow a new branch from the chapter they received", async ({
  page,
}) => {
  const errors = collectErrors(page);
  let written = false;
  const novel = () => ({
    id: 77,
    kind: "RELAY",
    mode: "OPEN",
    deliveryCount: 3,
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
  const root = {
    id: 300,
    chapterNumber: 1,
    title: "용왕의 병",
    authorNickname: "자라",
    excerpt: "용궁에 근심이 가득했다.",
    createdAt: "2026-10-12T09:00:00Z",
  };
  const firstBranch = {
    id: 301,
    parentChapterId: 300,
    chapterNumber: 2,
    title: "육지로",
    authorNickname: "거북",
    excerpt: "자라는 뭍으로 올라갔다.",
    createdAt: "2026-10-13T09:00:00Z",
  };
  const myBranch = {
    id: 302,
    parentChapterId: 300,
    chapterNumber: 2,
    title: "다른 길",
    authorNickname: "나",
    excerpt: "토끼가 먼저 찾아왔다.",
    createdAt: "2026-10-14T09:00:00Z",
  };
  const calls = await mockBackend(page, ({ path, method, body }) => {
    if (path.endsWith("/auth/login"))
      return { accessToken: "test-access", refreshToken: "test-refresh" };
    if (path === "/api/v1/novels") return emptyPage;
    if (path.endsWith("/novels/home-feed")) return homeFeedOf([]);
    if (path.endsWith("/my-turns")) return [];
    if (path === "/api/v1/novels/deliveries")
      return written
        ? []
        : [
            {
              deliveryId: 5,
              novel: novel(),
              chapterId: 300,
              chapterNumber: 1,
              chapterTitle: "용왕의 병",
              dueAt: "2026-10-15T09:00:00Z",
            },
          ];
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
        ...myBranch,
        novelId: 77,
        title: body.title,
        body: body.body,
      };
    }
    if (path.endsWith("/chapter-tree"))
      return written ? [root, firstBranch, myBranch] : [root, firstBranch];
    if (path.endsWith("/chapters/nodes/300"))
      return {
        ...root,
        novelId: 77,
        body: "용궁에 근심이 가득했다. 용왕의 병을 고칠 약은 토끼의 간뿐이었다.",
      };
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
      myDeliveryId: written ? undefined : 5,
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
  // 나에게 배달된 열매가 홈에 떨어진다.
  await page.getByRole("button", { name: "나에게 온 토끼의 간 열매" }).click();
  await expect(page.getByText("나에게 온 열매예요.")).toBeVisible();
  // 가지가 갈라진 작품은 목차에 가지 이름과 끝 열매가 보인다.
  await expect(
    page.getByRole("button", { name: /CHAPTER 02 가지 1_1 육지로.*끝 열매/ }),
  ).toBeVisible();
  await page.getByRole("button", { name: "받은 가지 이어 쓰기" }).click();
  // 받은 회차를 편집기 위에서 다시 볼 수 있다.
  await expect(page.getByText("이어받은 1화")).toBeVisible();
  await page.getByRole("textbox", { name: "이번 장의 제목" }).fill("다른 길");
  await page
    .getByRole("textbox", { name: "이어지는 이야기" })
    .fill("토끼가 먼저 용궁을 찾아왔다.");
  await page.getByRole("button", { name: "임시저장", exact: true }).click();
  await expect(page.getByText(/최근 저장/).last()).toBeVisible();
  await page.getByRole("button", { name: "회차 발행", exact: true }).click();
  await page.getByRole("button", { name: "발행하고 열매 보내기" }).click();
  // 발행한 가지는 받은 회차에서 갈라진 새 가지로 목차에 들어온다.
  await expect(
    page.getByRole("button", { name: /CHAPTER 02 가지 1_2 다른 길/ }),
  ).toBeVisible();
  const published = calls.filter(
    (call) =>
      call.path.endsWith("/deliveries/5/chapters") && call.method === "POST",
  );
  expect(published).toHaveLength(1);
  expect(published[0].body).toEqual({
    title: "다른 길",
    body: "토끼가 먼저 용궁을 찾아왔다.",
  });
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
