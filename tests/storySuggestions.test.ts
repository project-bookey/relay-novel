import { test } from "node:test";
import assert from "node:assert/strict";
import {
  applyStory,
  plotPrompt,
} from "../src/components/write/storySuggestions";

test("continuation appends and opening prepends without replacing the draft", () => {
  assert.equal(
    applyStory("원래 원고", "원래 원고", "CONTINUE", "다음 문단"),
    "원래 원고\n\n다음 문단",
  );
  assert.equal(
    applyStory("원래 원고", "원래 원고", "OPENING", "첫 문단"),
    "첫 문단\n\n원래 원고",
  );
  assert.equal(applyStory("", "", "OPENING", "첫 문단"), "첫 문단");
});

test("stale, empty and oversized generated paragraphs never overwrite a draft", () => {
  assert.throws(
    () => applyStory("새 원고", "옛 원고", "CONTINUE", "제안"),
    /원고가 바뀌었어요/,
  );
  assert.throws(() => applyStory("원고", "원고", "CONTINUE", " "), /확인/);
  assert.throws(
    () =>
      applyStory("가".repeat(20000), "가".repeat(20000), "CONTINUE", "제안"),
    /20,000자/,
  );
  assert.throws(
    () => applyStory("원고", "원고", "PLOT", "전개 요약"),
    /다음 문단/,
  );
});

test("a selected plot is kept at the beginning of bounded generation hints", () => {
  const hint = plotPrompt("소재".repeat(200), {
    title: "낯선 편지",
    text: "문밖에서 누군가 편지를 건넨다.",
  });
  assert.ok(
    hint.startsWith("희망 전개: 낯선 편지 — 문밖에서 누군가 편지를 건넨다."),
  );
  assert.equal(hint.length, 300);
});
