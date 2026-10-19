import type { StoryMode, StoryOption } from "../../api/types";

export function applyStory(
  current: string,
  source: string,
  mode: StoryMode,
  suggestion: string,
): string {
  if (current !== source)
    throw new Error(
      "요청한 뒤 원고가 바뀌었어요. 현재 원고로 다시 제안받아 주세요.",
    );
  if (mode === "PLOT")
    throw new Error("전개를 골라 다음 문단을 먼저 만들어 주세요.");
  const text = suggestion.trim();
  if (!text) throw new Error("제안 내용을 확인해 주세요.");
  const updated =
    mode === "OPENING"
      ? text + (current ? "\n\n" + current : "")
      : (current ? current + "\n\n" : "") + text;
  if (updated.length > 20000)
    throw new Error(
      "제안을 넣으면 원고가 20,000자를 넘어요. 조금 줄인 뒤 넣어 주세요.",
    );
  return updated;
}

export function plotPrompt(prompt: string, option: StoryOption): string {
  // 고른 전개를 먼저 넣어 소재가 길어도 전개가 잘리지 않게 한다.
  return `희망 전개: ${option.title} — ${option.text}\n${prompt}`.slice(0, 300);
}
