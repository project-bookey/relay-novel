import { test } from "node:test";
import assert from "node:assert/strict";
import {
  BLINK,
  DOT_LINE,
  DOT_RADIUS,
  DOT_ROW_Y,
  DROOP,
  EFFECT_MS,
  FLYING_LEAVES,
  LEAF_FLIGHT_MS,
  LEAVES_END_MS,
  SPROUT_GRID,
  SPROUT_PIVOT,
  SPROUT_STEM,
  sproutDots,
  WIGGLE,
} from "../src/design/refreshSprout";

const filledOf = (left: number, total: number) =>
  sproutDots(left, total)
    .map((dot) => (dot.filled ? "●" : "○"))
    .join("");

test("the dots under the sprout empty from the right as free refreshes are used", () => {
  assert.equal(filledOf(2, 2), "●●");
  assert.equal(filledOf(1, 2), "●○");
  assert.equal(filledOf(0, 2), "○○");
  // 하루 무료 횟수는 서버가 정하므로 점 개수도 그것을 따른다.
  assert.equal(filledOf(2, 3), "●●○");
});

test("the dots sit centered under the stem without touching it", () => {
  const [first, second] = sproutDots(2, 2);
  assert.ok(Math.abs((first.x + second.x) / 2 - SPROUT_STEM.x) < 1e-9);
  // 줄기 끝(둥근 끝 반 굵기 1 포함)과 점 테두리 사이가 띄어 있어 이어져 보이지 않는다.
  const dotTop = DOT_ROW_Y - DOT_RADIUS - DOT_LINE / 2;
  assert.ok(dotTop - (SPROUT_STEM.bottom + 1) >= 1.5);
  assert.ok(DOT_ROW_Y + DOT_RADIUS + DOT_LINE / 2 <= SPROUT_GRID);
});

test("unknown counts draw no dots and odd counts are clamped", () => {
  assert.deepEqual(sproutDots(undefined, 2), []);
  assert.deepEqual(sproutDots(1, undefined), []);
  assert.deepEqual(sproutDots(0, 0), []);
  assert.equal(filledOf(5, 2), "●●");
  assert.equal(filledOf(-1, 2), "○○");
});

test("many dots still fit inside the icon without overlapping", () => {
  const dots = sproutDots(5, 5);
  const outer = DOT_RADIUS + DOT_LINE / 2;
  assert.ok(dots[0].x - outer >= 0);
  assert.ok(dots[dots.length - 1].x + outer <= SPROUT_GRID);
  for (let index = 1; index < dots.length; index++) {
    assert.ok(dots[index].x - dots[index - 1].x > outer * 2);
  }
});

test("each press effect starts and ends at rest with times moving forward", () => {
  for (const [track, rest] of [
    [WIGGLE, 0],
    [DROOP, 0],
    [BLINK, 1],
  ] as const) {
    assert.equal(track.times[0], 0);
    assert.equal(track.values[0], rest);
    assert.equal(track.values[track.values.length - 1], rest);
    assert.equal(track.times.length, track.values.length);
    for (let index = 1; index < track.times.length; index++) {
      assert.ok(track.times[index] > track.times[index - 1]);
    }
  }
  // 휘청임은 흐려지기 전에 끝나고, 다 쓴 뒤의 깜빡임은 기울어 있는 동안 끝난다.
  assert.ok(WIGGLE.times[WIGGLE.times.length - 1] <= EFFECT_MS);
  assert.ok(BLINK.times[BLINK.times.length - 1] <= DROOP.times[2]);
});

test("flying leaves leave from the leaf tips outward, one after another", () => {
  FLYING_LEAVES.forEach((leaf, index) => {
    const outward = {
      x: leaf.from.x - SPROUT_PIVOT.x,
      y: leaf.from.y - SPROUT_PIVOT.y,
    };
    assert.ok(outward.x * leaf.move.x + outward.y * leaf.move.y > 0);
    if (index > 0) assert.ok(leaf.delayMs > FLYING_LEAVES[index - 1].delayMs);
  });
  assert.equal(
    LEAVES_END_MS,
    FLYING_LEAVES[FLYING_LEAVES.length - 1].delayMs + LEAF_FLIGHT_MS,
  );
});
