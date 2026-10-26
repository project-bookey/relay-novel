import type { NovelDetail, NovelMode } from "../../api/types";
import { MAX_BODY_LENGTH } from "./limits";
import type { WriteTarget } from "./writeTarget";

// 이어 쓰기 화면 맨 위 가운데의 첫 줄: 어느 작품의 어디를 쓰는지.
// 첫 작가의 줄기는 회차 수(가지 포함)와 깊이가 달라 몇 장인지 쓰지 않는다.
export function writingPlaceOf({
  novelTitle,
  kind,
  mode,
  chapterCount,
  parentChapterNumber,
}: {
  novelTitle: string;
  kind: "turn" | "branch";
  mode: NovelMode;
  chapterCount: number;
  // 맡은 열매에서 뻗을 때 이어받은 회차가 몇 장인지
  parentChapterNumber?: number;
}) {
  return `${novelTitle} · ${placeOf(kind, mode, chapterCount, parentChapterNumber)}`;
}

function placeOf(
  kind: "turn" | "branch",
  mode: NovelMode,
  chapterCount: number,
  parentChapterNumber?: number,
) {
  if (kind === "branch")
    return parentChapterNumber === undefined
      ? "새 가지"
      : `${parentChapterNumber}장에서 뻗는 가지`;
  if (mode === "OPEN") return "내 줄기의 다음 회차";
  return `${chapterCount + 1}장`;
}

// "오전 9:41"처럼 저장한 때를 짧게 쓴다.
export function savedTimeOf(date: Date) {
  const hours = date.getHours();
  const noon = hours < 12 ? "오전" : "오후";
  const hour = hours % 12 === 0 ? 12 : hours % 12;
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${noon} ${hour}:${minutes}`;
}

// 맨 위 가운데의 둘째 줄: 글자 수와 저절로 저장한 상태(2026-10-26 사용자 결정, 임시저장 버튼 없앰).
// 저장하지 못했으면 글자 수 대신 다시 저장하라는 말만 둔다.
export function saveLineOf({
  length,
  canSave,
  waiting,
  saving,
  failed,
  savedAt,
}: {
  length: number;
  // 지금 이 원고를 저장할 수 있는지(쓸 수 있고 로그인돼 있음)
  canSave: boolean;
  // 고친 뒤 손을 멈추기를 기다리는 중
  waiting: boolean;
  saving: boolean;
  failed: boolean;
  savedAt?: string;
}) {
  if (canSave && failed && !saving)
    return { text: "저장하지 못했어요 · 다시", failed: true };
  const count = `${length.toLocaleString("ko-KR")} / ${MAX_BODY_LENGTH.toLocaleString("ko-KR")}자`;
  const state = saveStateOf(canSave, waiting || saving, savedAt);
  return { text: state ? `${count} · ${state}` : count, failed: false };
}

function saveStateOf(canSave: boolean, saving: boolean, savedAt?: string) {
  if (!canSave) return "저장할 수 없어요";
  if (saving) return "저장하는 중…";
  if (savedAt) return `저장됨 ${savedTimeOf(new Date(savedAt))}`;
  return "";
}

const KEEP_OR_DISCARD =
  "원고를 복사해 보관하거나, 저장하지 않고 나갈 수 있어요.";

// 나가려다 막혔을 때 보일 말. 서버가 저장을 거절했으면 그 까닭을 앞에 둔다.
export function leaveBlockedError(cause: unknown) {
  const reason =
    cause instanceof Error ? cause.message : "저장할 수 없는 원고가 있어요.";
  return new Error(`${reason} ${KEEP_OR_DISCARD}`);
}

// 발행하면 무엇이 일어나는지. 차례대로 쓰는 작품은 다음 작가에게 넘어가고, 열매로 퍼뜨리는 작품은
// 발행한 회차가 다른 사람들의 홈에 이어 쓸 수 있는 열매로 놓인다.
export function publishCopy(target: WriteTarget, detail: NovelDetail) {
  const spreads = target.kind === "branch" || detail.novel.mode === "OPEN";
  if (!spreads)
    return {
      hint: "발행한 회차는 수정할 수 없고, 다음 작가에게 집필 차례가 넘어가요.",
      action: "발행하고 다음 작가에게 넘기기",
    };
  return {
    hint: "발행한 회차는 수정할 수 없고, 다른 사람들이 이 회차에서 가지를 뻗어 이어 쓸 수 있어요.",
    action: "발행하고 열매 맺기",
  };
}
