import { test } from "node:test";
import assert from "node:assert/strict";
import {
  branchLayers,
  foliageLayers,
  hangSpotAt,
  ownerOfX,
  perches,
} from "../src/design/canopy";
import {
  CHARACTER_HEIGHT_UNITS,
  airtimeOf,
  characterFrameAt,
  landingOf,
  rigs,
} from "../src/design/canopyCast";
import {
  TREE_HIDE_OFFSET,
  planCanopyShow,
  planShowSchedule,
  sampleTimes,
  simplifyTrack,
  treeStateAt,
} from "../src/design/canopyShow";

test("characters stand on the top of their own branches", () => {
  // 사용자가 고른 시안(8차)에서 캐릭터가 서던 높이다. 네모는 새로고침 버튼을 비켜
  // 시안보다 왼쪽(x 318)에 서서 가지가 올라간 만큼 조금 높다.
  assert.ok(Math.abs(perches.circle.y - 106.5) < 1);
  assert.ok(Math.abs(perches.triangle.y - 132.9) < 1);
  assert.equal(perches.square.x, 318);
  assert.ok(Math.abs(perches.square.y - 95.9) < 1);
});

test("fruits hang only where a branch passes overhead", () => {
  // 세모 갈래 끝(x 210)과 오른쪽 큰 가지 끝(x 250) 사이에는 가지가 없다.
  assert.equal(hangSpotAt(230), undefined);
  assert.equal(hangSpotAt(300)?.group, "square");
  assert.equal(hangSpotAt(60)?.group, "circle");
  assert.equal(hangSpotAt(180)?.group, "triangle");
  assert.equal(ownerOfX(300), "square");
});

test("every tree drawing is a finite closed shape", () => {
  const paths = branchLayers.flatMap((layer) =>
    layer.shapes.map((shape) => shape.d),
  );
  assert.ok(paths.length > 10);
  for (const path of paths) {
    assert.match(path, /^M /);
    assert.match(path, /Z$/);
    assert.doesNotMatch(path, /NaN|Infinity/);
  }
  const circles = foliageLayers.flatMap((layer) => layer.circles);
  assert.ok(circles.every((circle) => circle.r > 0));
});

test("a standing character keeps both feet where they were drawn", () => {
  for (const rig of Object.values(rigs)) {
    const frame = characterFrameAt(rig, [], 0);
    frame.legs.forEach((leg, index) => {
      assert.deepEqual(leg.foot, rig.feet[index]);
      // 서 있을 때는 무릎이 엉덩이와 발 사이 곧은 선 위에 있다.
      const middle = {
        x: (leg.hip.x + leg.foot.x) / 2,
        y: (leg.hip.y + leg.foot.y) / 2,
      };
      assert.ok(Math.hypot(leg.knee.x - middle.x, leg.knee.y - middle.y) < 1);
    });
    assert.equal(frame.lift, 0);
  }
});

test("crouching before a jump bends the knees outward", () => {
  const jump = { at: 300, height: 30 };
  const frame = characterFrameAt(rigs.triangle, [jump], 299);
  const [left, right] = frame.legs;
  assert.ok(left.knee.x < Math.min(left.hip.x, left.foot.x));
  assert.ok(right.knee.x > Math.max(right.hip.x, right.foot.x));
});

test("a character is highest halfway through a jump and lands on time", () => {
  const jump = { at: 300, height: 30 };
  const top = characterFrameAt(rigs.circle, [jump], 300 + airtimeOf(30) / 2);
  assert.ok(Math.abs(top.lift - 30) < 0.5);
  const landed = characterFrameAt(rigs.circle, [jump], landingOf(jump) + 1);
  assert.equal(landed.lift, 0);
});

test("the square slips after a big landing and shows a red alarm", () => {
  const jump = { at: 300, height: 30, flair: true, slip: true };
  const frame = characterFrameAt(rigs.square, [jump], landingOf(jump) + 300);
  assert.ok(frame.alarm > 0.9);
  assert.notEqual(frame.lean, 0);
  // 미끄러진 오른발은 그린 자리보다 바깥 아래로 빠져 있다.
  assert.ok(frame.legs[1].foot.y > rigs.square.feet[1].y);
});

test("a refresh drops the hidden tree in, lets it settle and lifts it back out of view", () => {
  const schedule = planShowSchedule(7);
  // 나무는 화면 위에 숨어 있다가 떨어진다.
  assert.equal(treeStateAt(schedule, 0).offsetY, TREE_HIDE_OFFSET);
  assert.equal(
    treeStateAt(schedule, schedule.dropAt).offsetY,
    TREE_HIDE_OFFSET,
  );
  assert.ok(schedule.impactAt > schedule.dropAt);
  // 열매가 다 떨어지는 동안에는 제자리에 있고, 가지 흔들림도 잦아든다.
  const beforeExit = treeStateAt(schedule, schedule.exitAt - 1);
  assert.ok(Math.abs(beforeExit.offsetY) < 0.5);
  for (const angle of Object.values(beforeExit.groupAngles))
    assert.ok(Math.abs(angle) < 0.1);
  // 끝나면 다시 화면 위로 숨는다.
  assert.equal(
    treeStateAt(schedule, schedule.durationMs).offsetY,
    TREE_HIDE_OFFSET,
  );
});

test("fruits let go one by one after the third landing", () => {
  const schedule = planShowSchedule(7);
  const thirdLanding = Math.max(
    landingOf(schedule.jumps.circle[2]),
    landingOf(schedule.jumps.triangle[2]),
    landingOf(schedule.jumps.square[2]),
  );
  assert.ok(schedule.fruitDrops.every((at) => at > thirdLanding));
  assert.equal(new Set(schedule.fruitDrops).size, 7);
  // 나무는 마지막 열매가 땅에서 멈출 만큼 기다린 뒤에 올라간다.
  assert.ok(schedule.exitAt >= Math.max(...schedule.fruitDrops) + 2000);
});

test("simplified tracks stay within tolerance and keep both ends", () => {
  const times = sampleTimes(1000);
  const values = times.map((t) => Math.sin(t / 120) * 10);
  const simple = simplifyTrack({ times, values }, 0.1);
  assert.ok(simple.times.length < times.length);
  assert.equal(simple.times[0], 0);
  assert.equal(simple.times[simple.times.length - 1], 1000);
  times.forEach((t, index) => {
    const after = simple.times.findIndex((time) => time >= t);
    const before = Math.max(0, after - 1);
    const span = simple.times[after] - simple.times[before] || 1;
    const share = (t - simple.times[before]) / span;
    const value =
      simple.values[before] +
      (simple.values[after] - simple.values[before]) * share;
    assert.ok(Math.abs(value - values[index]) <= 0.1 + 1e-9);
  });
});

test("show tracks always move forward in time", () => {
  const show = planCanopyShow(7);
  const tracks = [
    show.tree.offsetY,
    show.tree.rootAngle,
    ...Object.values(show.tree.groupAngles),
    ...Object.values(show.cast).flatMap((cast) => [
      cast.lift,
      cast.angle,
      cast.legs[0].thigh.angle,
      cast.legs[1].shin.length,
    ]),
  ];
  for (const track of tracks) {
    assert.equal(track.times.length, track.values.length);
    for (let index = 1; index < track.times.length; index++)
      assert.ok(track.times[index] > track.times[index - 1]);
  }
  // 동그라미는 세 번째에 한 바퀴 구르므로 몸이 360도 돈다.
  assert.ok(Math.max(...show.cast.circle.angle.values) > 350);
  assert.ok(CHARACTER_HEIGHT_UNITS > 0);
});
