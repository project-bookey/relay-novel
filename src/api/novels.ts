import { api } from "./client";
import type {
  Page,
  NovelSummary,
  NovelDetail,
  NovelStatus,
  ChapterSummary,
  Chapter,
  Draft,
  Write,
  CreateNovel,
  Tokens,
} from "./types";
const root = "/api/v1/novels";
export const novels = {
  feed: (status?: NovelStatus, page = 0) =>
    api<Page<NovelSummary>>(root, { query: { kind: "RELAY", status, page } }),
  mine: (page = 0) =>
    api<Page<NovelSummary>>(`${root}/mine`, { query: { kind: "RELAY", page } }),
  turns: () => api<NovelSummary[]>(`${root}/my-turns`),
  get: (id: number) => api<NovelDetail>(`${root}/${id}`),
  create: (body: CreateNovel) =>
    api<NovelDetail>(root, { method: "POST", body }),
  join: (inviteCode: string) =>
    api<NovelDetail>(`${root}/join`, { method: "POST", body: { inviteCode } }),
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
  chapters: (id: number, page = 0) =>
    api<Page<ChapterSummary>>(`${root}/${id}/chapters`, { query: { page } }),
  chapter: (id: number, number: number) =>
    api<Chapter>(`${root}/${id}/chapters/${number}`),
  draft: (id: number) => api<Draft>(`${root}/${id}/draft`),
  saveDraft: (id: number, body: Write) =>
    api<Draft>(`${root}/${id}/draft`, { method: "PUT", body }),
  publish: (id: number, body: Write) =>
    api<Chapter>(`${root}/${id}/chapters`, { method: "POST", body }),
};
export const login = (email: string, password: string) =>
  api<Tokens>("/api/v1/auth/login", {
    method: "POST",
    auth: false,
    body: { email, password },
  });
