import { test } from "node:test";
import assert from "node:assert/strict";
import {
  FULLY_RIPE_STAGE,
  isFullyRipe,
  likesToNextStage,
  ripeStageOf,
  treeFruitLookOf,
} from "../src/design/fruitRipeness";

test("the stage rises at 100, 200, 400, 700 and 1000 likes", () => {
  assert.deepEqual(
    [0, 99, 100, 199, 200, 399, 400, 699, 700, 999, 1000, 5000].map(
      ripeStageOf,
    ),
    [0, 0, 1, 1, 2, 2, 3, 3, 4, 4, 5, 5],
  );
  assert.equal(FULLY_RIPE_STAGE, 5);
});

test("only 1000 likes or more is fully ripe", () => {
  assert.equal(isFullyRipe(999), false);
  assert.equal(isFullyRipe(1000), true);
});

test("likes to the next stage count down to the next threshold", () => {
  assert.equal(likesToNextStage(0), 100);
  assert.equal(likesToNextStage(760), 240);
  assert.equal(likesToNextStage(1000), undefined);
});

test("a tree fruit grows and gains leaves but stays a single fruit", () => {
  const looks = [0, 100, 200, 400, 700, 1000].map(treeFruitLookOf);
  // 풋열매만 연둣빛
  assert.ok(looks[0].unripe > 0);
  assert.ok(looks.slice(1).every((look) => look.unripe === 0));
  // 단계마다 커지고 잎은 줄지 않는다
  for (let index = 1; index < looks.length; index++) {
    assert.ok(looks[index].scale > looks[index - 1].scale);
    assert.ok(looks[index].leaves >= looks[index - 1].leaves);
  }
  assert.deepEqual(
    looks.map((look) => look.leaves),
    [1, 1, 2, 2, 3, 3],
  );
});
