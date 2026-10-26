export interface TextSelection {
  start: number;
  end: number;
}
export interface RewriteTarget {
  body: string;
  start: number;
  end: number;
  text: string;
}

export const MAX_REWRITE_LENGTH = 2000;

export function rewriteTarget(
  body: string,
  selection: TextSelection,
): RewriteTarget {
  const selected = selection.end > selection.start;
  const start = selected
    ? Math.max(0, Math.min(selection.start, body.length))
    : 0;
  const end = selected
    ? Math.max(start, Math.min(selection.end, body.length))
    : body.length;
  const raw = body.slice(start, end);
  const text = raw.trim();
  if (!text) throw new Error("먼저 다듬을 이야기를 적어 주세요.");
  if (text.length > MAX_REWRITE_LENGTH)
    throw new Error("다듬을 부분을 2,000자 이내로 선택해 주세요.");
  const trimmedStart = start + raw.length - raw.trimStart().length;
  return { body, start: trimmedStart, end: trimmedStart + text.length, text };
}

export function applyRewrite(
  current: string,
  target: RewriteTarget,
  suggestion: string,
): string {
  if (current !== target.body)
    throw new Error(
      "요청한 뒤 원고가 바뀌었어요. 현재 원고로 다시 다듬어 주세요.",
    );
  const updated =
    current.slice(0, target.start) + suggestion + current.slice(target.end);
  if (updated.length > 20000)
    throw new Error(
      "제안을 적용하면 원고가 20,000자를 넘어요. 조금 줄인 뒤 적용해 주세요.",
    );
  return updated;
}

// 다듬기 팝업에 미리 보여 줄 글. 고른 부분이 없으면 원고 전체다.
export function passageOf(body: string, selection: TextSelection) {
  const selected = selection.end > selection.start;
  const raw = selected ? body.slice(selection.start, selection.end) : body;
  return { selected, text: raw.trim() };
}
