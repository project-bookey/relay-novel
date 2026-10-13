import { test } from "node:test";
import assert from "node:assert/strict";
import { planFruitPath, type FruitPathInput } from "../src/design/fruitPath";

const roundFruit: FruitPathInput = {
  fallHeight: 420,
  size: 44,
  rollsLikeBall: true,
  direction: 1,
  gravity: 2400,
  restTilt: 20,
};
const angularFruit: FruitPathInput = { ...roundFruit, rollsLikeBall: false };

function landingIndex(path: ReturnType<typeof planFruitPath>) {
  return path.times.findIndex((time) => time >= path.landingAt);
}

// 처음 부딪힌 뒤 튕겨 올라간 높이들(구간마다 가장 높은 점)
function bounceHeights(path: ReturnType<typeof planFruitPath>) {
  const peaks: number[] = [];
  for (
    let index = landingIndex(path) + 1;
    index < path.height.length - 1;
    index++
  ) {
    const height = path.height[index];
    if (height > path.height[index - 1] && height >= path.height[index + 1])
      peaks.push(height);
  }
  return peaks;
}

test("a fruit starts high in the air and comes to rest on its spot", () => {
  const path = planFruitPath(roundFruit);
  assert.equal(path.height[0], 420);
  assert.equal(path.height.at(-1), 0);
  assert.equal(path.offsetX.at(-1), 0);
});

test("a fruit first hits the ground away from where it finally rests", () => {
  const path = planFruitPath(roundFruit);
  const firstHit = path.offsetX[landingIndex(path)];
  assert.ok(Math.abs(firstHit) > roundFruit.size, `처음 닿은 곳 ${firstHit}`);
});

test("a fruit bounces toward the given side", () => {
  const toRight = planFruitPath(roundFruit);
  const toLeft = planFruitPath({ ...roundFruit, direction: -1 });
  assert.ok(toRight.offsetX[landingIndex(toRight)] < 0);
  assert.ok(toLeft.offsetX[landingIndex(toLeft)] > 0);
});

test("each bounce is lower than the one before", () => {
  const peaks = bounceHeights(planFruitPath(roundFruit));
  assert.ok(peaks.length >= 2, `튕긴 횟수 ${peaks.length}`);
  assert.ok(peaks[0] < roundFruit.fallHeight * 0.2);
  for (let index = 1; index < peaks.length; index++) {
    assert.ok(peaks[index] < peaks[index - 1]);
  }
});

test("a fruit never sinks below the ground", () => {
  for (const input of [roundFruit, angularFruit]) {
    assert.ok(planFruitPath(input).height.every((height) => height >= 0));
  }
});

test("a round fruit rolls one full turn and rests slightly tilted", () => {
  const path = planFruitPath(roundFruit);
  assert.ok(Math.abs((path.angle.at(-1) ?? 0) - 380) < 0.5);
});

test("an angular fruit tumbles in the air but rests upright", () => {
  const path = planFruitPath(angularFruit);
  const largestTilt = Math.max(...path.angle.map(Math.abs));
  assert.ok(largestTilt > 10, `가장 크게 기운 각도 ${largestTilt}`);
  assert.ok(Math.abs(path.angle.at(-1) ?? 0) < 0.001);
});

test("time moves forward from start to finish", () => {
  const { times } = planFruitPath(roundFruit);
  assert.equal(times[0], 0);
  assert.equal(times.at(-1), 1);
  for (let index = 1; index < times.length; index++) {
    assert.ok(times[index] > times[index - 1]);
  }
});
