import { test } from "node:test";
import assert from "node:assert/strict";
import { daysUntilPurge, purgeLabel } from "../src/design/branchBin";

const now = new Date("2026-10-19T03:00:00Z");

test("whole days left before the branch is removed", () => {
  assert.equal(daysUntilPurge("2026-10-26T03:00:00Z", now), 7);
  assert.equal(daysUntilPurge("2026-10-26T02:59:00Z", now), 6);
  assert.equal(purgeLabel("2026-10-26T03:00:00Z", now), "7일 뒤 사라져요");
});

test("less than a day left reads as today", () => {
  assert.equal(daysUntilPurge("2026-10-19T20:00:00Z", now), 0);
  assert.equal(purgeLabel("2026-10-19T20:00:00Z", now), "오늘 안에 사라져요");
});

test("a passed removal date never counts below zero", () => {
  assert.equal(daysUntilPurge("2026-10-18T03:00:00Z", now), 0);
});
