import { test } from "node:test";
import assert from "node:assert/strict";
import {
  ballRollShift,
  GLOW_LIKE_COUNT,
  HALO_RINGS,
  haloStrengthAt,
  isPopular,
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

test("halo rings get larger and fainter toward the outside", () => {
  assert.equal(HALO_RINGS.length, 3);
  for (let index = 1; index < HALO_RINGS.length; index++) {
    assert.ok(HALO_RINGS[index - 1].radius > HALO_RINGS[index].radius);
    assert.ok(haloStrengthAt(index - 1) < haloStrengthAt(index));
  }
  // 가장 안쪽 원도 열매 몸통(반지름 약 0.33)보다 커서 몸통 둘레로 빛이 보인다.
  const innermost = HALO_RINGS[HALO_RINGS.length - 1];
  assert.ok(innermost.radius > 0.4);
  // 겹친 가운데도 반투명이라 흰 땅 위에 꽉 찬 원반처럼 보이지 않는다.
  assert.ok(haloStrengthAt(HALO_RINGS.length - 1) < 0.5);
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
