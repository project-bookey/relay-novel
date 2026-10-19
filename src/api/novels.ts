import { Platform } from "react-native";
import { api } from "./client";
import type {
  Page,
  NovelSummary,
  NovelDetail,
  NovelLikeView,
  NovelStatus,
  NovelDelivery,
  NovelHomeFeed,
  BranchBin,
  SunlightCheckout,
  SunlightVerify,
  SunlightWallet,
  RefreshCheckout,
  RefreshStore,
  RefreshVerify,
  ChapterNode,
  Chapter,
  BaseWork,
  BranchWrite,
  Draft,
  Write,
  CreateNovel,
  NovelCover,
} from "./types";
import { ApiError } from "./transport";
const root = "/api/v1/novels";

// 기기에서 고른 표지 사진(앱 전용). 서버는 JPG·PNG·WebP, 10MB까지 받는다.
export interface CoverImage {
  uri: string;
  name: string;
  type: string;
  // 웹에서 고른 실제 파일
  file?: Blob;
}

async function readWebFile(uri: string) {
  try {
    return await (await fetch(uri)).blob();
  } catch {
    throw new ApiError(
      0,
      "COVER_READ",
      "사진을 읽지 못했어요. 다른 사진을 골라 주세요.",
    );
  }
}

// 업로드할 파일 파트. 웹은 실제 파일(Blob)을, 네이티브는 RN이 읽어 보낼 { uri, name, type }을 넣는다.
async function coverForm(image: CoverImage) {
  const form = new FormData();
  if (Platform.OS === "web") {
    const blob = image.file ?? (await readWebFile(image.uri));
    form.append("file", blob, image.name);
  } else {
    const nativeFile = { uri: image.uri, name: image.name, type: image.type };
    form.append("file", nativeFile as unknown as Blob);
  }
  return form;
}

export const novels = {
  feed: (status?: NovelStatus, page = 0) =>
    api<Page<NovelSummary>>(root, { query: { kind: "RELAY", status, page } }),
  mine: (page = 0) =>
    api<Page<NovelSummary>>(`${root}/mine`, { query: { kind: "RELAY", page } }),
  turns: () => api<NovelSummary[]>(`${root}/my-turns`),
  // 홈 열매 밭에 놓인 묶음과 오늘 남은 무료 새로고침 수. 불러오기만 해서는 횟수가 줄지 않는다.
  homeFeed: () => api<NovelHomeFeed>(`${root}/home-feed`),
  // 열매 밭을 새 묶음으로 바꾼다. 하루 무료 횟수를 다 쓰면 서버가 거절한다(NOVEL_REFRESH_DAILY_LIMIT).
  // 무료를 다 쓰면 결제하고 아직 쓰지 않은 새로고침을 쓴다.
  refreshHomeFeed: () =>
    api<NovelHomeFeed>(`${root}/home-feed/refresh`, { method: "POST" }),
  // 광고를 끝까지 본 뒤의 새로고침. 하루 광고 횟수를 다 쓰면 서버가 거절한다(NOVEL_REFRESH_AD_LIMIT).
  refreshHomeFeedWithAd: () =>
    api<NovelHomeFeed>(`${root}/home-feed/refresh/ad`, { method: "POST" }),
  // 새로고침 한 번을 사는 주문. 무료·광고·결제한 새로고침이 남아 있으면 서버가 거절한다(NOVEL_REFRESH_STILL_LEFT).
  checkoutRefresh: (provider: RefreshStore) =>
    api<RefreshCheckout>(`${root}/home-feed/refresh-purchases/checkout`, {
      method: "POST",
      body: { provider },
    }),
  // 스토어 결제를 서버가 확인하면 결제한 새로고침이 하나 늘어난 묶음을 준다. 같은 주문은 한 번만 센다.
  verifyRefresh: (body: RefreshVerify) =>
    api<NovelHomeFeed>(`${root}/home-feed/refresh-purchases/verify`, {
      method: "POST",
      body,
    }),
  get: (id: number) => api<NovelDetail>(`${root}/${id}`),
  // 누를 때마다 좋아요가 켜지고 꺼진다. 결과는 서버의 실제 상태다.
  toggleLike: (id: number) =>
    api<NovelLikeView>(`${root}/${id}/like`, { method: "POST" }),
  create: (body: CreateNovel) =>
    api<NovelDetail>(root, { method: "POST", body }),
  apply: (id: number) =>
    api<NovelDetail>(`${root}/${id}/applications`, { method: "POST" }),
  decide: (id: number, userId: number, approved: boolean) =>
    api<NovelDetail>(`${root}/${id}/applications/${userId}`, {
      method: "PUT",
      body: { approved },
    }),
  start: (id: number) =>
    api<NovelDetail>(`${root}/${id}/start`, { method: "POST" }),
  complete: (id: number) =>
    api<NovelDetail>(`${root}/${id}/complete`, { method: "POST" }),
  // 회차 나무 전체. 마디마다 부모 회차가 있다.
  chapterTree: (id: number) => api<ChapterNode[]>(`${root}/${id}/chapter-tree`),
  // 가지가 갈라진 작품은 같은 깊이에 회차가 여럿이라 id로 읽는다.
  chapter: (id: number, chapterId: number) =>
    api<Chapter>(`${root}/${id}/chapters/nodes/${chapterId}`),
  draft: (id: number) => api<Draft>(`${root}/${id}/draft`),
  rewrite: (id: number, turnNumber: number, text: string) =>
    api<{ text: string }>(`${root}/${id}/writing-assist`, {
      method: "POST",
      body: { turnNumber, text },
    }),
  rewriteDelivery: (deliveryId: number, text: string) =>
    api<{ text: string }>(`${root}/deliveries/${deliveryId}/writing-assist`, {
      method: "POST",
      body: { turnNumber: deliveryId, text },
    }),
  saveDraft: (id: number, body: Write) =>
    api<Draft>(`${root}/${id}/draft`, { method: "PUT", body }),
  publish: (id: number, body: Write) =>
    api<Chapter>(`${root}/${id}/chapters`, { method: "POST", body }),
  // 내가 받은 열매(배달). 홈 열매 밭에 떨어진다.
  deliveries: () => api<NovelDelivery[]>(`${root}/deliveries`),
  deliveryDraft: (deliveryId: number) =>
    api<Draft>(`${root}/deliveries/${deliveryId}/draft`),
  saveDeliveryDraft: (deliveryId: number, body: BranchWrite) =>
    api<Draft>(`${root}/deliveries/${deliveryId}/draft`, {
      method: "PUT",
      body,
    }),
  // 받은 회차에서 가지를 뻗어 발행한다. 새 회차는 다시 무작위로 배달된다.
  publishBranch: (deliveryId: number, body: BranchWrite) =>
    api<Chapter>(`${root}/deliveries/${deliveryId}/chapters`, {
      method: "POST",
      body,
    }),
  // 넘기기 — 열매가 다른 한 사람에게 다시 배달된다.
  decline: (deliveryId: number) =>
    api<void>(`${root}/deliveries/${deliveryId}/decline`, { method: "POST" }),
  // 내 글 잇기 — 햇살을 내고 내가 쓴 회차를 나에게 배달한다. 그 뒤로는 받은 열매처럼 쓰고 발행한다.
  // 햇살이 모자라면 402 NOVEL_SUNLIGHT_INSUFFICIENT.
  selfDelivery: (id: number, chapterId: number) =>
    api<NovelDelivery>(`${root}/${id}/chapters/${chapterId}/self-delivery`, {
      method: "POST",
    }),
  // 나뭇가지 수거함 — 한 달 동안 조회가 50회를 못 넘겨 나무에서 숨긴 내 가지.
  branchBin: () => api<BranchBin>(`${root}/me/branch-bin`),
  // 햇살을 내고 나무로 되돌린다. 살린 날부터 한 달 뒤 다시 판정한다.
  restoreBranch: (chapterId: number) =>
    api<BranchBin>(`${root}/me/branch-bin/${chapterId}/restore`, {
      method: "POST",
    }),
  // 바로 지우고 부모 회차의 가지 자리를 비운다.
  discardBranch: (chapterId: number) =>
    api<BranchBin>(`${root}/me/branch-bin/${chapterId}/discard`, {
      method: "POST",
    }),
  sunlight: () => api<SunlightWallet>(`${root}/me/sunlight`),
  checkoutSunlight: (provider: RefreshStore, productId: string) =>
    api<SunlightCheckout>(`${root}/sunlight-purchases/checkout`, {
      method: "POST",
      body: { provider, productId },
    }),
  // 스토어 결제를 서버가 확인하면 햇살이 들어간 잔액을 준다. 같은 주문은 한 번만 넣는다.
  verifySunlight: (body: SunlightVerify) =>
    api<SunlightWallet>(`${root}/sunlight-purchases/verify`, {
      method: "POST",
      body,
    }),
  genres: () => api<string[]>(`${root}/genres`),
  myGenres: () => api<string[]>(`${root}/me/genres`),
  saveMyGenres: (genres: string[]) =>
    api<string[]>(`${root}/me/genres`, { method: "PUT", body: { genres } }),
  baseWorks: () => api<BaseWork[]>(`${root}/base-works`),
  // 소설에 붙지 않은 표지는 하루 뒤 서버가 지운다.
  uploadCover: async (image: CoverImage) =>
    api<NovelCover>(`${root}/covers`, {
      method: "POST",
      body: await coverForm(image),
    }),
};
