import { test } from "node:test";
import assert from "node:assert/strict";
import {
  CAST,
  CAST_UNIT_PX,
  HOP_GROUND,
  HOP_MS,
  STARTLE_MS,
  TURN_MS,
  castGeometryOf,
  facingOf,
  hopAct,
  idleAct,
  jogAct,
  peekAct,
  playAct,
  poseAt,
  positionAt,
  runAct,
  startleAct,
  trackOf,
  viewOf,
} from "../src/design/fieldCast";
import { seededRandom } from "../src/design/storyTree";

const close = (actual: number, expected: number, tolerance = 0.05) =>
  assert.ok(
    Math.abs(actual - expected) <= tolerance,
    `${actual} ≉ ${expected}`,
  );
const distance = (a: { x: number; y: number }, b: { x: number; y: number }) =>
  Math.hypot(a.x - b.x, a.y - b.y);

test("standing characters face front with straight legs on the ground", () => {
  for (const who of CAST) {
    const geo = castGeometryOf(who);
    const pose = poseAt(geo, idleAct({ x: 100, y: 500 }, false, 2000), 0);
    assert.equal(viewOf("idle"), "front");
    for (const leg of pose.legs) {
      // 정면에서는 무릎이 옆으로 꺾이지 않고 엉덩이와 발목 사이에 곧게 놓인다.
      close(leg.knee.x, (leg.hip.x + leg.foot.x) / 2);
      close(leg.knee.y, (leg.hip.y + leg.foot.y) / 2);
      assert.ok(
        leg.foot.y > -3 && leg.foot.y < -1.8,
        `${who} foot ${leg.foot.y}`,
      );
    }
  }
});

test("walking turns sideways, bends the knees forward and keeps the planted foot still", () => {
  const geo = castGeometryOf("square");
  const act = jogAct({ x: 100, y: 500 }, { x: 260, y: 500 }, false, 1);
  assert.equal(viewOf(act.type), "side");
  assert.equal(act.flip, false);
  for (let t = 0; t < 840; t += 30) {
    const pose = poseAt(geo, act, t);
    pose.legs.forEach((leg, index) => {
      // 두 마디 길이는 그대로이고, 무릎은 엉덩이~발목 선보다 앞(+x)에 있다.
      close(distance(leg.hip, leg.knee), geo.side.lengths[index], 0.1);
      close(distance(leg.knee, leg.foot), geo.side.lengths[index], 0.1);
      const share = (leg.knee.y - leg.hip.y) / (leg.foot.y - leg.hip.y || 1);
      const lineX = leg.hip.x + (leg.foot.x - leg.hip.x) * share;
      assert.ok(leg.knee.x >= lineX - 0.05, `knee behind the leg at ${t}ms`);
    });
  }
  // 앞다리(1)가 땅을 디디는 동안 땅 위 발 자리(몸 자리 + 발 자리)는 움직이지 않는다.
  const planted = [];
  for (let t = 220; t <= 400; t += 20) {
    const pose = poseAt(geo, act, t);
    planted.push(pose.x + pose.legs[1].foot.x * CAST_UNIT_PX);
    close(pose.legs[1].foot.y, -2.4, 0.01);
  }
  assert.ok(
    Math.max(...planted) - Math.min(...planted) < 0.6,
    `foot slid ${planted}`,
  );
});

test("hops move forward only while in the air", () => {
  const act = hopAct({ x: 100, y: 500 }, { x: 180, y: 500 }, false, 1);
  assert.equal(act.hops, 2);
  const onGround = positionAt(act, HOP_MS * HOP_GROUND * 0.9);
  close(onGround.x, 100);
  const landed = positionAt(act, HOP_MS);
  close(landed.x, 140);
  close(positionAt(act, act.durationMs).x, 180);
});

test("a startled character shouts, then turns sideways and runs off the screen", () => {
  const geo = castGeometryOf("circle");
  const at = { x: 120, y: 600 };
  const startle = startleAct(at, { x: -50, y: 600 });
  assert.equal(viewOf(startle.type), "front");
  assert.equal(startle.flip, true);
  const shout = poseAt(geo, startle, STARTLE_MS / 2);
  assert.ok(shout.alarm === 1 && shout.air > 0);
  const run = runAct(at, { x: -50, y: 600 }, 1, -STARTLE_MS);
  assert.equal(run.flip, true);
  assert.ok(poseAt(geo, run, 100).alarm > 0);
  close(positionAt(run, run.durationMs).x, -50);
  // 정면에서 옆모습으로 돌아서는 동안 몸이 좁아졌다 펴진다.
  const tracks = trackOf(geo, run, 1, facingOf(startle));
  const narrowest = Math.min(...tracks.turn.values.map(Math.abs));
  assert.ok(narrowest < 0.7, `${narrowest}`);
  assert.equal(tracks.front.values[0], 1);
  assert.equal(tracks.front.values[tracks.front.values.length - 1], 0);
  assert.ok(tracks.turn.times.some((time) => time >= TURN_MS / 2));
});

test("peeking leans in from just past the screen edge and looks toward the field", () => {
  const geo = castGeometryOf("triangle");
  const act = peekAct({ x: -24, y: 560 }, { x: -4, y: 560 });
  assert.equal(act.flip, false);
  const leaning = poseAt(geo, act, act.durationMs * 0.4);
  assert.ok(leaning.body.angle > 25);
  close(leaning.x, -4);
  const before = poseAt(geo, act, 0);
  close(before.x, -24);
});

test("tracks run forward in time and play stays inside the field", () => {
  const random = seededRandom(7);
  const area = { left: 20, right: 360, top: 450, bottom: 720 };
  let at = { x: 200, y: 600 };
  let flip = false;
  for (let turn = 0; turn < 40; turn++) {
    const act = playAct(at, flip, area, 1, random);
    assert.ok(act.to.x >= area.left && act.to.x <= area.right);
    assert.ok(act.to.y >= area.top && act.to.y <= area.bottom);
    const tracks = trackOf(castGeometryOf(CAST[turn % 3]), act, 1, {
      view: "front",
      flip,
    });
    for (const track of [
      tracks.x,
      tracks.bodyAngle,
      tracks.legs[0].thigh.angle,
      tracks.turn,
    ]) {
      for (let index = 1; index < track.times.length; index++)
        assert.ok(track.times[index] > track.times[index - 1]);
      assert.equal(track.times[track.times.length - 1], tracks.durationMs);
    }
    at = act.to;
    flip = act.flip;
  }
});
