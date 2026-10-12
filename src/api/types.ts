/** Contract: project-bookey-backend /api/v1/novels (NovelDtos.java). */
export type NovelStatus = "RECRUITING" | "ONGOING" | "COMPLETED";
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
  memberCount: number;
  memberLimit: number;
  chapterCount: number;
  chapterLimit: number;
  isPublic: boolean;
  mine: boolean;
  myTurn: boolean;
  turnDueAt?: string;
  createdAt: string;
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
  inviteCode?: string;
  coverId?: number;
}
export interface ChapterSummary {
  id: number;
  chapterNumber: number;
  title: string;
  authorNickname: string;
  excerpt: string;
  createdAt: string;
}
export interface Chapter {
  id: number;
  novelId: number;
  chapterNumber: number;
  title: string;
  body: string;
  authorNickname: string;
  createdAt: string;
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
  title: string;
  description: string;
  genre: string;
  isPublic: boolean;
  memberLimit: number;
  chapterLimit: number;
  turnHours: number;
}
export interface Tokens {
  accessToken: string;
  refreshToken: string;
}
