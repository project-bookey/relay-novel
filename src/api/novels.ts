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
  refreshHomeFeed: () =>
    api<NovelHomeFeed>(`${root}/home-feed/refresh`, { method: "POST" }),
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
