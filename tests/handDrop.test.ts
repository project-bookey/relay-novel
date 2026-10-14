import { test } from "node:test";
import assert from "node:assert/strict";
import { groundViewThrough, shadowAt } from "../src/design/fruitFlight";
import {
  clampToGround,
  depthAt,
  holdPose,
  planHandDrop,
  type HoldInput,
  type HoldPose,
  type RestingFruit,
} from "../src/design/handDrop";

// 뒷줄 열매 자리가 화면 y 440(원근 배율 0.8), 앞줄 열매 자리가 y 520(원근 배율 1)인 땅.
// 손으로 옮길 때는 앞쪽으로 y 700까지 놓을 수 있다.
const view = groundViewThrough(
  170,
  { y: 440, depth: 0.8 },
  { y: 520, depth: 1 },
);
const bounds = { left: 24, right: 316, top: 420, bottom: 700 };
const FRUIT_SIZE = 44;
const rest = { x: 150, y: 480 };

function poseFor(overrides: Partial<HoldInput> = {}): HoldPose {
  return holdPose({
    view,
    bounds,
    skyTop: 150,
    rest,
    drag: { x: 0, y: 0 },
    holdHeight: 40,
    ...overrides,
  });
}

function dropFor(pose: HoldPose, others: RestingFruit[] = []) {
  return planHandDrop({
    view,
    bounds,
    pose,
    fruitSize: FRUIT_SIZE,
    scale: 1,
    rollsLikeBall: true,
    others,
  });
}

function near(actual: number, expected: number, tolerance = 1e-6) {
  assert.ok(
    Math.abs(actual - expected) < tolerance,
    `${actual} is not close to ${expected}`,
  );
}

// 하늘에서 떨어진 열매끼리 띄우는 기준(skyDrop.ts)과 같다.
function overlaps(point: RestingFruit, other: RestingFruit) {
  const gap = 0.9 * FRUIT_SIZE * ((point.depth + other.depth) / 2);
  return Math.hypot(point.x - other.x, (point.y - other.y) * 1.4) < gap;
}

test("a held fruit stays right under the finger", () => {
  for (const drag of [
    { x: 0, y: 0 },
    { x: 30, y: 60 },
    { x: -50, y: -20 },
    { x: 10, y: 150 },
  ]) {
    const { bottom } = poseFor({ drag });
    near(bottom.x, rest.x + drag.x);
    near(bottom.y, rest.y + drag.y);
  }
});

test("a fruit picked up without lifting stays on its spot", () => {
  const pose = poseFor({ holdHeight: 0 });
  near(pose.bottom.y, rest.y);
  near(pose.ground.y, rest.y);
  near(pose.height, 0);
});

test("a lifted fruit floats over the ground right below it", () => {
  const pose = poseFor({ drag: { x: 20, y: 40 } });
  near(pose.ground.x, pose.bottom.x);
  near(pose.height, 40);
  near(pose.ground.depth, depthAt(view, pose.ground.y));
  // 땅에 가까운 쪽(앞)일수록 같은 높이도 화면에서 더 크게 보인다.
  near(pose.ground.y - pose.bottom.y, 40 * pose.ground.depth);
});

test("raising a fruit above the back edge holds it higher over the back edge", () => {
  const pose = poseFor({ drag: { x: 0, y: -200 } });
  near(pose.ground.y, bounds.top);
  assert.ok(pose.height > 40);
});

test("a held fruit stops at the front edge, the sides and the top", () => {
  const forward = poseFor({ drag: { x: 9999, y: 9999 } });
  near(forward.bottom.x, bounds.right);
  near(forward.bottom.y, bounds.bottom);
  near(forward.ground.y, bounds.bottom);
  near(forward.height, 0);
  const backward = poseFor({ drag: { x: -9999, y: -9999 } });
  near(backward.bottom.x, bounds.left);
  near(backward.bottom.y, 150);
});

test("a dropped fruit falls straight down onto the ground below without sliding", () => {
  const pose = poseFor({ drag: { x: 20, y: 100 } });
  const { rest: landing, flight } = dropFor(pose);
  near(landing.x, pose.ground.x);
  near(landing.y, pose.ground.y);
  for (const offset of flight.offsetX) near(offset, 0);
  // 놓은 자리(든 열매 바닥)에서 떨어지기 시작한다.
  near(landing.y + flight.offsetY[0], pose.bottom.y);
  assert.equal(flight.offsetY.at(-1), 0);
});

test("the drop starts with the size and shadow the held fruit had", () => {
  const pose = poseFor({ drag: { x: -30, y: 80 } });
  const { rest: landing, flight } = dropFor(pose);
  const shadow = shadowAt(pose.height, FRUIT_SIZE);
  near(flight.nearness[0] * landing.depth, pose.ground.depth);
  near(flight.shadowOffsetY[0], pose.ground.y - landing.y);
  near(flight.shadowScale[0], flight.nearness[0] * shadow.scale);
  near(flight.shadowOpacity[0], shadow.opacity);
});

test("a dropped fruit squashes and bounces like the first fall", () => {
  const { flight } = dropFor(poseFor({ drag: { x: 0, y: 60 } }));
  const landing = flight.times.findIndex(
    (time) => time >= flight.landingAt - 1e-9,
  );
  assert.ok(flight.stretchY[landing] < 1);
  const bouncedUp = flight.offsetY
    .slice(landing + 1)
    .some((offset) => offset < -1);
  assert.ok(bouncedUp);
});

test("a fruit dropped onto another bounces off to the nearest open spot", () => {
  const pose = poseFor({ drag: { x: 0, y: 60 } });
  const other = { ...pose.ground };
  const { rest: landing, flight } = dropFor(pose, [other]);
  assert.ok(!overlaps(landing, other));
  assert.ok(
    Math.hypot(landing.x - other.x, landing.y - other.y) < FRUIT_SIZE * 1.5,
  );
  // 다른 열매 위, 놓은 자리에서 떨어지기 시작한다.
  near(landing.x + flight.offsetX[0], pose.bottom.x);
  near(landing.y + flight.offsetY[0], pose.bottom.y);
});

test("a fruit dropped into a crowd stays clear of every other fruit", () => {
  const pose = poseFor({ drag: { x: 0, y: 60 } });
  const center = pose.ground;
  const others = [
    { x: center.x, y: center.y },
    { x: center.x - 40, y: center.y },
    { x: center.x + 40, y: center.y },
    { x: center.x, y: center.y - 25 },
    { x: center.x, y: center.y + 25 },
  ].map((spot) => ({ ...spot, depth: depthAt(view, spot.y) }));
  const { rest: landing } = dropFor(pose, others);
  for (const other of others) assert.ok(!overlaps(landing, other));
  const inside = clampToGround(bounds, landing);
  near(inside.x, landing.x);
  near(inside.y, landing.y);
});

test("a fruit put down with no height still has a valid motion", () => {
  const pose = poseFor({ drag: { x: 0, y: 9999 } });
  near(pose.height, 0);
  const { flight } = dropFor(pose);
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
    assert.ok(values.every((value) => Number.isFinite(value)));
  }
  assert.ok(
    flight.times.every(
      (time, index) => index === 0 || time >= flight.times[index - 1],
    ),
  );
});

test("a fruit dropped from lower squashes less", () => {
  const flatness = (holdHeight: number) => {
    const { flight } = dropFor(poseFor({ holdHeight, drag: { x: 0, y: 60 } }));
    return 1 - Math.min(...flight.stretchY);
  };
  assert.ok(flatness(8) < flatness(40));
  assert.ok(flatness(8) < 0.05);
});
