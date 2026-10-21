/** Contract: project-bookey-backend /api/v1/novels (NovelDtos.java). */
export type NovelStatus = "RECRUITING" | "ONGOING" | "COMPLETED";
// OPEN: 자리가 남은 회차가 홈 열매로 놓이고, 고른 사람이 자리를 맡아 가지를 뻗어 이어 쓴다. 첫 작가는 줄기를 계속 잇는다.
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
  // 대표 장르(genres의 첫 번째)
  genre: string;
  // 작품 장르(1~3개, 고른 순서)
  genres: string[];
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
  // 예전 앱 호환용 — 무작위 배달을 없애서 앱은 읽지 않는다.
  deliveryCount?: number;
  // OPEN: 회차 하나에 붙을 수 있는 가지 수(2~5). 첫 작가의 줄기는 따로 센다.
  branchLimit?: number;
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
  // 글쓴이를 뺀, 이 회차를 연 사람 수(한 사람당 한 번)
  viewCount: number;
  // 내가 쓴 회차라 햇살을 내고 다음 회차를 이어 쓸 수 있는지. 서버가 가지 자리·목표 회차를 따져 정한다.
  canSelfContinue: boolean;
  // 내 글 잇기에 드는 햇살
  selfContinueCost: number;
  // 첫 작가의 줄기 회차인지. 줄기는 수거되지 않고 나무가 이 회차들을 따라 위로 자란다.
  trunk: boolean;
  // 내가 이 회차에서 자리를 맡고 이어 쓸 수 있는지. 서버가 가지 자리·목표 회차·내 회차인지를 따져 정한다.
  canClaim: boolean;
  // 이 회차에 남은 가지 자리
  slotsLeft: number;
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
  // 첫 작가의 줄기 회차인지
  trunk: boolean;
}
// 홈 열매 하나(NovelHomeFruitView) — 지금 이어 쓸 수 있는 회차. 같은 작품의 다른 회차가 따로 열매가 될 수 있다.
export interface HomeFruitView {
  chapterId: number;
  chapterNumber: number;
  chapterTitle: string;
  excerpt: string;
  authorNickname: string;
  createdAt: string;
  // 이 회차에 남은 가지 자리
  slotsLeft: number;
  novel: NovelSummary;
}
// 홈 열매 밭에 지금 놓인 묶음과 오늘 남은 무료 새로고침(NovelHomeFeedView).
// 내가 자리를 맡은 열매와 내 차례 소설은 홈이 이 묶음보다 먼저 놓는다.
export interface NovelHomeFeed {
  // 예전 앱 호환용 — fruits의 작품을 한 번씩. 앱은 fruits를 읽는다.
  novels: NovelSummary[];
  // 피드 자리에 놓을 열매, 서버가 저장한 순서대로
  fruits: HomeFruitView[];
  freeRefreshesLeftToday: number;
  dailyFreeRefreshes: number;
  // 무료 새로고침이 다시 채워지는 때(다음 한국 시간 자정)
  resetsAt: string;
  // 무료를 다 쓴 뒤 광고를 보고 받을 수 있는 새로고침(오늘 남은 수, 하루 수). 자정에 무료와 함께 다시 찬다.
  // 광고 새로고침을 모르는 예전 서버에서는 비어 있다.
  adRefreshesLeftToday?: number;
  dailyAdRefreshes?: number;
  // 결제하고 아직 쓰지 않은 새로고침. 무료 다음으로 쓴다.
  paidRefreshes?: number;
}
// 새로고침을 사는 스토어. 앱 안 결제만 받는다.
export type RefreshStore = "APPLE" | "GOOGLE";
// 새로고침 결제를 시작하면 서버가 만든 주문(NovelRefreshCheckoutView)
export interface RefreshCheckout {
  provider: RefreshStore;
  productId: string;
  orderId: string;
  amountKrw: number;
}
// 스토어 결제를 마친 뒤 서버에 확인을 맡기는 내용(NovelRefreshVerifyRequest)
export interface RefreshVerify {
  provider: RefreshStore;
  orderId: string;
  productId: string;
  // Google의 구매 토큰
  receiptData?: string;
  // Apple의 거래 id
  originalTransactionId?: string;
}
// CLAIM: 홈의 열매를 골라 맡은 자리, SELF: 햇살을 내고 내 회차에 이어 쓰는 열매(그만두면 햇살을 돌려받는다),
// RANDOM: 예전에 무작위로 온 열매(새로 생기지 않는다)
export type DeliverySource = "CLAIM" | "SELF" | "RANDOM";
// 내가 자리를 맡은 열매. 마감 전에 이 회차에서 가지를 뻗어 이어 쓸 수 있다.
export interface NovelDelivery {
  deliveryId: number;
  novel: NovelSummary;
  chapterId: number;
  chapterNumber: number;
  chapterTitle: string;
  dueAt: string;
  source: DeliverySource;
}
// 나뭇가지 수거함의 가지 하나(NovelBinBranchView). 지울 날(purgeAt) 전에 살리거나 버린다.
export interface BinBranch {
  chapterId: number;
  novelId: number;
  novelTitle: string;
  chapterNumber: number;
  title: string;
  excerpt: string;
  viewCount: number;
  prunedAt: string;
  purgeAt: string;
}
export interface BranchBin {
  branches: BinBranch[];
  // 가지 하나를 살리는 데 드는 햇살
  restoreCost: number;
}
// 햇살 충전 상품. 스토어에 같은 id의 소모형 상품으로 등록돼 있다.
export interface SunlightProduct {
  productId: string;
  quantity: number;
  amountKrw: number;
}
// 햇살 잔액과 쓰는 값(NovelSunlightView)
export interface SunlightWallet {
  balance: number;
  restoreCost: number;
  selfBranchCost: number;
  products: SunlightProduct[];
}
// 햇살 충전 주문(NovelSunlightCheckoutView)
export interface SunlightCheckout {
  provider: RefreshStore;
  productId: string;
  orderId: string;
  quantity: number;
  amountKrw: number;
}
// 스토어 결제를 마친 뒤 서버에 확인을 맡기는 내용(NovelSunlightVerifyRequest)
export interface SunlightVerify {
  provider: RefreshStore;
  orderId: string;
  productId: string;
  receiptData?: string;
  originalTransactionId?: string;
}
export interface BaseWork {
  id: number;
  title: string;
  genre: string;
  synopsis: string;
  source: string;
}
// 자리를 맡은 열매에서 뻗는 가지. 낡은 쓰기는 열매 id와 그 상태로 서버가 막는다.
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
  // 대표 장르. genres를 모르는 예전 서버도 받도록 genres의 첫 번째를 함께 보낸다.
  genre?: string;
  // 작품 장르(1~3개, 고른 순서). 첫 번째가 대표 장르가 된다.
  genres: string[];
  isPublic: boolean;
  chapterLimit: number;
  turnHours: number;
  // OPEN: 회차 하나에 붙을 수 있는 가지 수(2~5). 첫 작가의 줄기는 따로 센다.
  branchLimit?: number;
  // CIRCLE: 함께 쓸 팔로우한 작가(본인 빼고 최대 9명)
  inviteeIds?: number[];
  baseWorkId?: number;
  // 먼저 올린 표지(POST /novels/covers)의 id
  coverId?: number;
  // 만든 사람이 쓰는 1회차. 작품과 함께 저장돼 회차 없는 작품이 생기지 않는다.
  firstChapter: { title: string; body: string };
}
// 올린 표지 (NovelCoverView)
export interface NovelCover {
  id: number;
  url: string;
  width?: number;
  height?: number;
}
// 내 정보 (GET /api/v1/me, 북키 계정과 같은 MeResponse 중 마이에서 쓰는 것만)
export interface MyProfile {
  id: number;
  handle: string;
  nickname: string;
  avatarUrl?: string;
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
export type StoryMode = "CONTINUE" | "PLOT" | "OPENING";
export interface StoryOption {
  title: string;
  text: string;
}
export interface StorySuggestions {
  suggestions: StoryOption[];
}
export interface StoryRequest {
  turnNumber: number;
  mode: StoryMode;
  body: string;
  prompt: string;
}
