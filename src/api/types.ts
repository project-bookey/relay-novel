/** Contract: project-bookey-backend /api/v1/novels (NovelDtos.java). */
export type NovelStatus = "RECRUITING" | "ONGOING" | "COMPLETED";
// OPEN: 회차마다 무작위로 고른 사람에게 열매로 배달되고, 받은 사람이 가지를 뻗어 이어 쓴다.
// CIRCLE: 만든 사람이 고른 작가들이 차례대로 한 줄기로 쓴다.
export type NovelMode = "OPEN" | "CIRCLE";
export interface Page<T> {
  content: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  hasNext: boolean;
}
export interface NovelSummary {
  id: number;
  kind: "RELAY" | "SOLO";
  status: NovelStatus;
  title: string;
  description: string;
  genre: string;
  coverUrl?: string;
  ownerNickname: string;
  // OPEN은 회차를 쓴 작가 수, CIRCLE은 참가자 수
  memberCount: number;
  // OPEN은 작가 수 제한이 없어 비어 있다.
  memberLimit?: number;
  chapterCount: number;
  chapterLimit: number;
  isPublic: boolean;
  mine: boolean;
  myTurn: boolean;
  turnDueAt?: string;
  createdAt: string;
  // 탈퇴한 사람을 뺀 좋아요 수
  likeCount: number;
  // 내가 좋아요를 눌렀는지
  liked: boolean;
  mode: NovelMode;
  // OPEN: 회차 하나를 배달할 사람 수
  deliveryCount?: number;
}
// 좋아요 토글 결과. 누른 뒤 서버의 실제 상태다.
export interface NovelLikeView {
  liked: boolean;
  likeCount: number;
}
export interface Member {
  userId: number;
  nickname: string;
  avatarUrl?: string;
  status: string;
  owner: boolean;
  currentWriter: boolean;
}
export interface NovelDetail {
  novel: NovelSummary;
  members: Member[];
  applications: Member[];
  myMembership: string;
  canApply: boolean;
  canWrite: boolean;
  canStart: boolean;
  canComplete: boolean;
  turnNumber: number;
  currentWriterNickname?: string;
  coverId?: number;
  // 이 작품에서 내가 들고 있는 열매. 있으면 그 회차에서 가지를 뻗어 이어 쓸 수 있다.
  myDeliveryId?: number;
  baseWorkId?: number;
}
export interface Chapter {
  id: number;
  novelId: number;
  chapterNumber: number;
  title: string;
  body: string;
  authorNickname: string;
  createdAt: string;
  // 뻗어 나온 회차. 뿌리 회차는 비어 있다.
  parentChapterId?: number;
}
// 회차 나무의 마디 하나. chapterNumber는 가지의 깊이다(뿌리 = 1).
export interface ChapterNode {
  id: number;
  parentChapterId?: number;
  chapterNumber: number;
  title: string;
  authorNickname: string;
  excerpt: string;
  createdAt: string;
}
// 홈 열매 밭에 지금 놓인 묶음과 오늘 남은 무료 새로고침(NovelHomeFeedView).
// 나에게 온 열매와 내 차례 소설은 묶음을 만들 때 뺀다. 그 뒤에 배달되거나 차례가 된 작품은 함께 올 수 있어
// 홈이 id로 한 번만 놓는다.
export interface NovelHomeFeed {
  novels: NovelSummary[];
  freeRefreshesLeftToday: number;
  dailyFreeRefreshes: number;
  // 무료 새로고침이 다시 채워지는 때(다음 한국 시간 자정)
  resetsAt: string;
}
// 내가 받은 열매. 이 회차에서 가지를 뻗어 이어 쓸 수 있다.
export interface NovelDelivery {
  deliveryId: number;
  novel: NovelSummary;
  chapterId: number;
  chapterNumber: number;
  chapterTitle: string;
  dueAt: string;
}
export interface BaseWork {
  id: number;
  title: string;
  genre: string;
  synopsis: string;
  source: string;
}
// 배달받은 열매에서 뻗는 가지. 낡은 쓰기는 배달 id와 그 상태로 서버가 막는다.
export interface BranchWrite {
  title: string;
  body: string;
}
export interface Draft {
  turnNumber: number;
  title: string;
  body: string;
  savedAt?: string;
}
export interface Write {
  turnNumber: number;
  title: string;
  body: string;
}
export interface CreateNovel {
  kind: "RELAY";
  mode: NovelMode;
  title: string;
  description: string;
  genre: string;
  isPublic: boolean;
  chapterLimit: number;
  turnHours: number;
  // OPEN: 회차 하나를 배달할 사람 수(1~10)
  deliveryCount?: number;
  // CIRCLE: 함께 쓸 팔로우한 작가(본인 빼고 최대 9명)
  inviteeIds?: number[];
  baseWorkId?: number;
}
// 팔로우 목록의 한 사람 (GET /api/v1/follows/following)
export interface FollowUser {
  userId: number;
  nickname: string;
  avatarUrl?: string;
  mutual: boolean;
  followedAt: string;
}
// 회원가입 (북키 계정과 같은 /api/v1/auth)
export type SignupVerification = "EMAIL_CODE" | "IDENTITY" | "NONE";
export interface SignupConfig {
  verification: SignupVerification;
  identityDevStub: boolean;
}
export interface EmailCode {
  expiresInSec: number;
  // 로컬 서버에서만 담긴다.
  devCode?: string;
  resendsLeft?: number;
  sendLimit: number;
}
export interface SignupConsent {
  termsAgreed: boolean;
  termsVersion?: string;
  privacyAgreed: boolean;
  privacyVersion?: string;
  ageConfirmed: boolean;
  marketingAgreed: boolean;
  marketingVersion?: string;
}
export interface Signup {
  email: string;
  password: string;
  nickname: string;
  code?: string;
  consent: SignupConsent;
}
export type LegalKey =
  "terms" | "privacy-consent" | "marketing" | "privacy-policy";
export interface LegalDocument {
  key: string;
  title: string;
  version: string;
  effectiveDate: string;
  body: string;
}
export interface Tokens {
  accessToken: string;
  refreshToken: string;
}
