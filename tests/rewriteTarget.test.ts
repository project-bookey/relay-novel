import { test } from "node:test";
import assert from "node:assert/strict";
import {
  applyRewrite,
  rewriteTarget,
} from "../src/components/write/rewriteTarget";

test("rewrites only the selected passage and preserves surrounding whitespace and paragraphs", () => {
  const body = "첫 문단.\n\n  그가 달려갓다.  \n\n마지막 문단.";
  const start = body.indexOf("  그가");
  const end = body.indexOf("\n\n마지막");
  const target = rewriteTarget(body, { start, end });
  assert.equal(target.text, "그가 달려갓다.");
  assert.equal(
    applyRewrite(body, target, "그가 달려갔다."),
    "첫 문단.\n\n  그가 달려갔다.  \n\n마지막 문단.",
  );
});

test("empty selection uses the whole short draft while long drafts require a selection", () => {
  assert.equal(
    rewriteTarget("짧은 원고", { start: 2, end: 2 }).text,
    "짧은 원고",
  );
  assert.throws(
    () => rewriteTarget("가".repeat(2001), { start: 0, end: 0 }),
    /2,000자/,
  );
  assert.equal(
    rewriteTarget("가".repeat(20001), { start: 100, end: 110 }).text.length,
    10,
  );
});

test("stale suggestions and suggestions beyond the chapter limit cannot overwrite the draft", () => {
  const target = rewriteTarget("원래 원고", { start: 0, end: 0 });
  assert.throws(
    () => applyRewrite("이후 수정한 원고", target, "AI 제안"),
    /원고가 바뀌었어요/,
  );
  const longBody = "가".repeat(20000);
  const selection = rewriteTarget(longBody, { start: 0, end: 1 });
  assert.throws(() => applyRewrite(longBody, selection, "두 글자"), /20,000자/);
});
