import { test } from "node:test";
import assert from "node:assert/strict";
import {
  ballRollShift,
  GLOW_LIKE_COUNT,
  isPopular,
  SPARKLE_PERIOD_MS,
  SPARKLE_SHINE_SHARE,
  sparkleDelayOf,
  SPARKLES,
  SWAY_PERIOD_MS,
  swayDelayOf,
} from "../src/design/fruitGlow";

test("a fruit glows from 100 likes on", () => {
  assert.equal(GLOW_LIKE_COUNT, 100);
  assert.equal(isPopular(0), false);
  assert.equal(isPopular(99), false);
  assert.equal(isPopular(100), true);
  assert.equal(isPopular(311), true);
});

test("sparkles sit around the fruit body and shine one after another", () => {
  // 몸통(가운데 0.5, 0.58 · 반지름 약 0.33) 한가운데를 덮지 않고 둘레에 놓인다.
  for (const sparkle of SPARKLES) {
    const fromCenter = Math.hypot(sparkle.x - 0.5, sparkle.y - 0.58);
    assert.ok(fromCenter > 0.3);
    assert.ok(sparkle.radius > 0 && sparkle.radius < 0.15);
  }
  const delays = SPARKLES.map((_, index) => sparkleDelayOf(index));
  for (let index = 1; index < delays.length; index++) {
    assert.ok(delays[index] > delays[index - 1]);
  }
  assert.ok(delays[delays.length - 1] < SPARKLE_PERIOD_MS);
  // 앞 별이 꺼질 즈음 다음 별이 켜져, 두 개 넘게 한꺼번에 반짝이지 않는다.
  const shineMs = SPARKLE_PERIOD_MS * SPARKLE_SHINE_SHARE;
  assert.ok(shineMs <= delays[2] - delays[0]);
});

test("popular fruits start swaying at different moments within one sway", () => {
  const delays = [1, 2, 3, 4, 5, 6, 7].map(swayDelayOf);
  for (const delay of delays) {
    assert.ok(delay >= 0 && delay < SWAY_PERIOD_MS);
  }
  assert.equal(new Set(delays).size, delays.length);
  // 같은 소설은 언제나 같은 박자로 흔들린다.
  assert.equal(swayDelayOf(6), swayDelayOf(6));
});

test("a ball rocks by rolling only a pixel or two at fruit size", () => {
  const shiftAtFruitSize = ballRollShift() * 44;
  assert.ok(shiftAtFruitSize > 0.5);
  assert.ok(shiftAtFruitSize < 2);
});
