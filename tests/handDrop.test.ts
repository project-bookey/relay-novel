import { test } from "node:test";
import assert from "node:assert/strict";
import { groundViewThrough } from "../src/design/fruitFlight";
import {
  clampToGround,
  depthAt,
  planHandDrop,
  type HandDropInput,
  type RestingFruit,
} from "../src/design/handDrop";

const view = groundViewThrough(
  170,
  { y: 440, depth: 0.8 },
  { y: 520, depth: 1 },
);
const bounds = { left: 24, right: 316, top: 420, bottom: 540 };

function inputFor(overrides: Partial<HandDropInput> = {}): HandDropInput {
  return {
    view,
    bounds,
    ground: { x: 150, y: 480 },
    lift: 30,
    velocity: { x: 0, y: 0 },
    fruitSize: 44,
    scale: 1,
    rollsLikeBall: true,
    others: [],
    ...overrides,
  };
}

function everyNumberIsFinite(values: number[]) {
  return values.every((value) => Number.isFinite(value));
}

test("a fruit released without moving rests right below where it was held", () => {
  for (const rollsLikeBall of [true, false]) {
    const { rest } = planHandDrop(inputFor({ rollsLikeBall }));
    assert.ok(Math.abs(rest.x - 150) < 1e-6);
    assert.ok(Math.abs(rest.y - 480) < 1e-6);
    assert.ok(Math.abs(rest.depth - depthAt(view, 480)) < 1e-6);
  }
});

test("the drop starts exactly where the held fruit was", () => {
  const input = inputFor({ velocity: { x: 400, y: -100 } });
  const { rest, flight } = planHandDrop(input);
  assert.ok(Math.abs(rest.x + flight.offsetX[0] - 150) < 1e-6);
  assert.ok(Math.abs(rest.y + flight.offsetY[0] - (480 - 30)) < 1e-6);
  // 크기도 든 자리의 원근 배율에서 시작한다.
  const startDepth = flight.nearness[0] * rest.depth;
  assert.ok(Math.abs(startDepth - depthAt(view, 480)) < 1e-6);
  // 끝은 멈출 자리 그대로다.
  assert.equal(flight.offsetX.at(-1), 0);
  assert.equal(flight.offsetY.at(-1), 0);
});

test("a thrown fruit rolls the way the hand moved, farther when faster", () => {
  const slow = planHandDrop(inputFor({ velocity: { x: 200, y: 0 } }));
  const fast = planHandDrop(inputFor({ velocity: { x: 800, y: 0 } }));
  assert.ok(slow.rest.x > 150);
  assert.ok(fast.rest.x > slow.rest.x);
  const left = planHandDrop(inputFor({ velocity: { x: -800, y: 0 } }));
  assert.ok(left.rest.x < 150);
});

test("no throw carries a fruit off the ground", () => {
  for (const velocity of [
    { x: 9000, y: 0 },
    { x: -9000, y: 9000 },
    { x: 0, y: -9000 },
  ]) {
    const { rest } = planHandDrop(inputFor({ velocity }));
    const inside = clampToGround(bounds, rest);
    assert.ok(Math.abs(inside.x - rest.x) < 1e-6);
    assert.ok(Math.abs(inside.y - rest.y) < 1e-6);
  }
});

test("a fruit barely lifted still drops with a valid motion", () => {
  for (const rollsLikeBall of [true, false]) {
    const { flight } = planHandDrop(inputFor({ lift: 0, rollsLikeBall }));
    assert.ok(flight.durationMs > 0);
    for (const values of [
      flight.times,
      flight.offsetX,
      flight.offsetY,
      flight.nearness,
      flight.angle,
      flight.stretchX,
      flight.stretchY,
      flight.shadowScale,
      flight.shadowOpacity,
    ]) {
      assert.ok(everyNumberIsFinite(values));
    }
    assert.ok(
      flight.times.every((time, index) => {
        return index === 0 || time >= flight.times[index - 1];
      }),
    );
  }
});

// 하늘에서 떨어진 열매끼리 띄우는 기준(skyDrop.ts)과 같다.
function overlaps(point: RestingFruit, other: RestingFruit, fruitSize = 44) {
  const gap = 0.9 * fruitSize * ((point.depth + other.depth) / 2);
  return Math.hypot(point.x - other.x, (point.y - other.y) * 1.4) < gap;
}

test("a fruit dropped onto another slides to the nearest open spot", () => {
  const other = { x: 150, y: 480, depth: depthAt(view, 480) };
  const { rest, flight } = planHandDrop(inputFor({ others: [other] }));
  assert.ok(!overlaps(rest, other));
  // 멀리 날아가지 않고 바로 옆에 멈춘다.
  assert.ok(Math.hypot(rest.x - 150, rest.y - 480) < 44 * 1.5);
  // 놓은 자리에서 떨어지기 시작해 밀려난 자리에서 끝난다.
  assert.ok(Math.abs(rest.x + flight.offsetX[0] - 150) < 1e-6);
  assert.equal(flight.offsetX.at(-1), 0);
});

test("a fruit dropped into a crowd stays clear of every other fruit", () => {
  const others = [
    { x: 150, y: 480 },
    { x: 110, y: 480 },
    { x: 190, y: 480 },
    { x: 150, y: 455 },
    { x: 150, y: 505 },
  ].map((spot) => ({ ...spot, depth: depthAt(view, spot.y) }));
  const { rest } = planHandDrop(inputFor({ others }));
  for (const other of others) assert.ok(!overlaps(rest, other));
  const inside = clampToGround(bounds, rest);
  assert.ok(Math.abs(inside.x - rest.x) < 1e-6);
  assert.ok(Math.abs(inside.y - rest.y) < 1e-6);
});
