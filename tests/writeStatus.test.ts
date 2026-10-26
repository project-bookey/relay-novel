import { test } from "node:test";
import assert from "node:assert/strict";
import {
  leaveBlockedError,
  saveLineOf,
  savedTimeOf,
  writingPlaceOf,
} from "../src/components/write/writeStatus";
import { passageOf } from "../src/components/write/rewriteTarget";

test("the top line names the story and where this chapter grows", () => {
  const base = { novelTitle: "고양이 도서관", chapterCount: 3 };
  assert.equal(
    writingPlaceOf({
      ...base,
      kind: "branch",
      mode: "OPEN",
      parentChapterNumber: 3,
    }),
    "고양이 도서관 · 3장에서 뻗는 가지",
  );
  assert.equal(
    writingPlaceOf({ ...base, kind: "branch", mode: "OPEN" }),
    "고양이 도서관 · 새 가지",
  );
  assert.equal(
    writingPlaceOf({ ...base, kind: "turn", mode: "OPEN" }),
    "고양이 도서관 · 내 줄기의 다음 회차",
  );
  assert.equal(
    writingPlaceOf({ ...base, kind: "turn", mode: "CIRCLE" }),
    "고양이 도서관 · 4장",
  );
});

test("saved time is written as morning or afternoon with minutes", () => {
  assert.equal(savedTimeOf(new Date(2026, 9, 26, 9, 41)), "오전 9:41");
  assert.equal(savedTimeOf(new Date(2026, 9, 26, 21, 5)), "오후 9:05");
  assert.equal(savedTimeOf(new Date(2026, 9, 26, 0, 30)), "오전 12:30");
  assert.equal(savedTimeOf(new Date(2026, 9, 26, 12, 0)), "오후 12:00");
});

test("the save line follows the auto save from typing to saved or failed", () => {
  const base = {
    length: 1240,
    canSave: true,
    waiting: false,
    saving: false,
    failed: false,
  };
  assert.deepEqual(saveLineOf(base), {
    text: "1,240 / 20,000자",
    failed: false,
  });
  assert.deepEqual(saveLineOf({ ...base, waiting: true }), {
    text: "1,240 / 20,000자 · 저장하는 중…",
    failed: false,
  });
  const savedAt = new Date(2026, 9, 26, 9, 41).toISOString();
  assert.deepEqual(saveLineOf({ ...base, savedAt }), {
    text: "1,240 / 20,000자 · 저장됨 오전 9:41",
    failed: false,
  });
  assert.deepEqual(saveLineOf({ ...base, failed: true, savedAt }), {
    text: "저장하지 못했어요 · 다시",
    failed: true,
  });
  // 다시 저장하는 동안에는 실패를 보이지 않는다.
  assert.equal(
    saveLineOf({ ...base, failed: true, saving: true }).text,
    "1,240 / 20,000자 · 저장하는 중…",
  );
  // 쓸 수 없는 원고는 실패해도 다시 저장하라고 하지 않는다.
  assert.deepEqual(saveLineOf({ ...base, canSave: false, failed: true }), {
    text: "1,240 / 20,000자 · 저장할 수 없어요",
    failed: false,
  });
});

test("the polish popup previews the picked passage or the whole draft", () => {
  const body = "  첫 문단.\n\n그가 달려갓다. ";
  assert.deepEqual(passageOf(body, { start: 0, end: 0 }), {
    selected: false,
    text: "첫 문단.\n\n그가 달려갓다.",
  });
  const start = body.indexOf("그가");
  assert.deepEqual(passageOf(body, { start, end: body.length }), {
    selected: true,
    text: "그가 달려갓다.",
  });
});

test("leaving is blocked with the server's reason when the draft cannot be saved", () => {
  assert.equal(
    leaveBlockedError(new Error("집필 차례가 지났어요.")).message,
    "집필 차례가 지났어요. 원고를 복사해 보관하거나, 저장하지 않고 나갈 수 있어요.",
  );
  assert.equal(
    leaveBlockedError(null).message,
    "저장할 수 없는 원고가 있어요. 원고를 복사해 보관하거나, 저장하지 않고 나갈 수 있어요.",
  );
});
