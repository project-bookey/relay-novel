import { test } from "node:test";
import assert from "node:assert/strict";
import {
  groundViewThrough,
  planFlight,
  skyStart,
  toWorld,
} from "../src/design/fruitFlight";
import { flightStyleFor } from "../src/design/skyDrop";
import { GROUND_LINE } from "../src/design/fruitShapes";
import { hangThenFall } from "../src/design/hangingFlight";
import { planRollAway, rollAwayDelayOf } from "../src/design/rollAway";
import { planCanopyShow } from "../src/design/canopyShow";

const view = groundViewThrough(
  171,
  { y: 400, depth: 0.8 },
  { y: 480, depth: 1 },
);
const rest = { x: 170, y: 470 };
const size = 44;
const stemTip = { x: 22.2, y: 4.6 };

function fallFrom(bottomY: number) {
  const restWorld = toWorld(view, rest);
  return planFlight({
    start: skyStart(view, restWorld, { side: 12, toward: 0 }, bottomY),
    rest: restWorld,
    view,
    size,
    rollsLikeBall: false,
    restTilt: 0,
    style: flightStyleFor("hop", false),
  });
}

const increasing = (values: number[]) =>
  values.every((value, index) => index === 0 || value > values[index - 1]);

test("a hanging fruit keeps its stem on the branch, then falls and comes to rest", () => {
  const branchAt = (atMs: number) => ({
    x: 180,
    y: 60 + 3 * Math.sin(atMs / 90),
  });
  const flight = hangThenFall({
    flight: fallFrom(90),
    rest,
    size,
    stemTip,
    releaseMs: 1000,
    attachAt: branchAt,
    swingAt: () => 0,
  });
  assert.ok(increasing(flight.times));
  assert.equal(flight.durationMs, 1000 + fallFrom(90).durationMs);
  // 매달린 동안 꼭지 끝은 가지가 움직이는 대로 붙어 있다.
  const unit = (size / 40) * flight.nearness[0];
  for (let index = 0; flight.times[index] * flight.durationMs < 990; index++) {
    const atMs = flight.times[index] * flight.durationMs;
    const tip = {
      x: rest.x + flight.offsetX[index] + (stemTip.x - 20) * unit,
      y: rest.y + flight.offsetY[index] + (stemTip.y - GROUND_LINE) * unit,
    };
    assert.ok(Math.abs(tip.x - branchAt(atMs).x) < 1e-6);
    assert.ok(Math.abs(tip.y - branchAt(atMs).y) < 1e-6);
    // 매달린 열매의 그림자는 아직 땅에 지지 않는다.
    assert.equal(flight.shadowOpacity[index], 0);
  }
  // 다 떨어지면 멈출 자리에 정확히 놓인다.
  assert.equal(flight.offsetX[flight.offsetX.length - 1], 0);
  assert.equal(flight.offsetY[flight.offsetY.length - 1], 0);
});

test("a fruit lets go of a swaying branch without jumping", () => {
  const flight = hangThenFall({
    flight: fallFrom(90),
    rest,
    size,
    stemTip,
    releaseMs: 1000,
    attachAt: (atMs) => ({ x: 180 + 6 * Math.sin(atMs / 70), y: 60 }),
    swingAt: (atMs) => 8 * Math.sin(atMs / 110),
  });
  const releaseIndex = flight.times.findIndex(
    (progress) => progress * flight.durationMs >= 1000,
  );
  const before = releaseIndex - 1;
  // 놓이기 바로 전(1/30초)과 놓이는 순간 사이에 크게 튀지 않는다.
  assert.ok(
    Math.abs(flight.offsetX[releaseIndex] - flight.offsetX[before]) < 4,
  );
  assert.ok(
    Math.abs(flight.offsetY[releaseIndex] - flight.offsetY[before]) < 4,
  );
  assert.ok(Math.abs(flight.angle[releaseIndex] - flight.angle[before]) < 4);
});

// 땅에 놓인 열매 자리. 원근 배율은 그 높이의 땅에서 정해진다.
const groundSpot = (x: number, y: number) => ({
  x,
  y,
  depth: (y - view.horizonY) / view.eyeHeight,
});
// 열매가 놓이는 땅(가운데 171, 440). 가로로 넓고 앞뒤로 얕다.
const fieldArea = { left: 24, right: 318, top: 402, bottom: 478 };
const screenEdges = { left: -24, right: 366, bottom: 700 };

function rollFrom(
  spot: { x: number; y: number; depth: number },
  rollsLikeBall = false,
) {
  return planRollAway({
    rest: spot,
    view,
    area: fieldArea,
    size: 40 * spot.depth,
    rollsLikeBall,
    startAngle: 14,
    scale: 1,
    edges: screenEdges,
    spread: 0,
  });
}

const lastOf = (values: number[]) => values[values.length - 1];

test("old fruits scatter outward in every direction until they are gone", () => {
  for (const rollsLikeBall of [true, false]) {
    const left = rollFrom(groundSpot(40, 440), rollsLikeBall);
    const right = rollFrom(groundSpot(300, 440), rollsLikeBall);
    const front = rollFrom(groundSpot(171, 478), rollsLikeBall);
    const back = rollFrom(groundSpot(171, 404), rollsLikeBall);
    for (const path of [left, right, front, back]) {
      assert.ok(increasing(path.times));
      assert.equal(lastOf(path.times), path.durationMs);
      // 놓여 있던 기울기에서 이어서 움직인다.
      assert.equal(path.angle[0], 14);
    }
    // 옆으로 간 열매는 화면 밖으로 나간다.
    assert.ok(40 + lastOf(left.offsetX) < screenEdges.left);
    assert.ok(300 + lastOf(right.offsetX) > screenEdges.right);
    // 앞으로 온 열매는 커지며 화면 아래로 나가고, 뒤로 간 열매는 작아지며 흐려져 사라진다.
    assert.ok(lastOf(front.groundOffsetY) > 0);
    assert.ok(lastOf(front.nearness) > 1);
    assert.ok(lastOf(back.groundOffsetY) < 0);
    assert.ok(lastOf(back.nearness) < 1);
    assert.equal(lastOf(back.opacity), 0);
    assert.ok(left.opacity.every((opacity) => opacity === 1));
  }
});

test("the farthest fruit rolls away first", () => {
  assert.equal(rollAwayDelayOf(120, 120), 0);
  assert.ok(rollAwayDelayOf(0, 120) > rollAwayDelayOf(80, 120));
  assert.equal(rollAwayDelayOf(30, 0), 0);
});

test("turning tracks never jump half a turn between neighbouring moments", () => {
  const show = planCanopyShow(7);
  for (const cast of Object.values(show.cast)) {
    const turning = [
      cast.angle,
      cast.lean,
      ...cast.legs.flatMap((leg) => [
        leg.thigh.angle,
        leg.shin.angle,
        leg.footAngle,
      ]),
    ];
    for (const track of turning) {
      track.values.forEach((value, index) => {
        if (index === 0) return;
        assert.ok(Math.abs(value - track.values[index - 1]) < 180);
      });
    }
  }
});
