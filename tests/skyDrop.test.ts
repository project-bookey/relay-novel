import { test } from "node:test";
import assert from "node:assert/strict";
import { groundViewThrough } from "../src/design/fruitFlight";
import { planDrops, type DropGround } from "../src/design/skyDrop";

// 휴대폰 화면 폭(342px)에 맞춘 땅. 홈 화면의 열매 밭과 같은 비율이다.
const scale = 342 / 340;
const fieldTop = 300;
const ground: DropGround = {
  view: groundViewThrough(
    171,
    { y: fieldTop + 90 * scale, depth: 0.8 },
    { y: fieldTop + 164 * scale, depth: 1 },
  ),
  bounds: {
    left: 24 * scale,
    right: 316 * scale,
    top: fieldTop + 64 * scale,
    bottom: fieldTop + 182 * scale,
  },
  fruitSize: 44 * scale,
  scale,
};
const landings = [
  { x: 170, y: 124 },
  { x: 92, y: 160 },
  { x: 252, y: 164 },
  { x: 124, y: 90 },
  { x: 226, y: 94 },
  { x: 300, y: 128 },
  { x: 40, y: 128 },
];
const fruits = landings.map((spot, index) => ({
  id: index + 1,
  rollsLikeBall: index % 4 === 0,
  landing: { x: spot.x * scale, y: fieldTop + spot.y * scale },
}));
const seeds = Array.from({ length: 200 }, (_, index) => index * 7919 + 1);

test("the same seed always gives the same drops", () => {
  assert.deepEqual(
    planDrops(ground, fruits, 42),
    planDrops(ground, fruits, 42),
  );
});

test("different visits end up with fruits in different places", () => {
  const first = planDrops(ground, fruits, 1).map(({ rest }) => rest);
  const second = planDrops(ground, fruits, 2).map(({ rest }) => rest);
  assert.notDeepEqual(first, second);
});

test("every fruit stops on the ground inside the field", () => {
  const { left, right, top, bottom } = ground.bounds;
  for (const seed of seeds) {
    for (const { rest } of planDrops(ground, fruits, seed)) {
      assert.ok(rest.x >= left - 1e-6 && rest.x <= right + 1e-6, `${seed}`);
      assert.ok(rest.y >= top - 1e-6 && rest.y <= bottom + 1e-6, `${seed}`);
    }
  }
});

test("fruits never stop on top of each other", () => {
  for (const seed of seeds) {
    const rests = planDrops(ground, fruits, seed).map(({ rest }) => rest);
    for (let first = 0; first < rests.length; first++) {
      for (let second = first + 1; second < rests.length; second++) {
        const a = rests[first];
        const b = rests[second];
        const gap = Math.hypot(a.x - b.x, (a.y - b.y) * 1.4);
        // 열매 크기의 절반보다 가까우면 누를 때 서로 가린다.
        assert.ok(gap > ground.fruitSize * 0.5, `${seed}: ${gap}`);
      }
    }
  }
});

test("some fruits roll or hop far while others stop where they land", () => {
  let far = 0;
  let near = 0;
  for (const seed of seeds) {
    for (const { rollAway } of planDrops(ground, fruits, seed)) {
      const reach = Math.hypot(rollAway.side, rollAway.toward);
      if (reach > 50) far++;
      if (reach < 16) near++;
    }
  }
  const total = seeds.length * fruits.length;
  assert.ok(far > total * 0.2, `멀리 간 열매 ${far}/${total}`);
  assert.ok(near > total * 0.05, `그 자리에 멈춘 열매 ${near}/${total}`);
});
