import { test } from "node:test";
import assert from "node:assert/strict";
import {
  groundViewThrough,
  planFlight,
  skyStart,
  toScreen,
  toWorld,
  type FlightInput,
  type FruitFlight,
  type RollAway,
} from "../src/design/fruitFlight";
import { flightStyleFor, type Bounce } from "../src/design/skyDrop";

// 뒷줄 열매 자리가 화면 y 440(원근 배율 0.8), 앞줄 열매 자리가 y 520(원근 배율 1)인 땅
const view = groundViewThrough(
  170,
  { y: 440, depth: 0.8 },
  { y: 520, depth: 1 },
);
const spot = toWorld(view, { x: 80, y: 480 });
const ENTRY_Y = -150;
const kinds = [true, false];
const bounces: Bounce[] = ["thud", "roll", "hop"];
// 오른쪽으로 조금 비스듬히 앞으로 100만큼 굴러와 멈춘다.
const RIGHTWARD: RollAway = { side: 94, toward: 34 };

function inputFor(
  bounce: Bounce = "roll",
  rollsLikeBall = true,
  rollAway: RollAway = RIGHTWARD,
): FlightInput {
  return {
    start: skyStart(view, spot, rollAway, ENTRY_Y),
    rest: spot,
    view,
    size: 44,
    rollsLikeBall,
    restTilt: 20,
    style: flightStyleFor(bounce, rollsLikeBall),
  };
}

function* everyFlight() {
  for (const bounce of bounces) {
    for (const rollsLikeBall of kinds) {
      for (const rollAway of [RIGHTWARD, { side: -60, toward: -20 }]) {
        yield {
          name: `${bounce} ${rollsLikeBall} ${rollAway.side}`,
          flight: planFlight(inputFor(bounce, rollsLikeBall, rollAway)),
        };
      }
    }
  }
}

function indexAt(flight: FruitFlight, progress: number) {
  return flight.times.findIndex((time) => time >= progress - 1e-9);
}

// 열매가 땅에서 떠 있는 화면 높이. 그림자는 늘 열매 바로 아래 땅에 있다.
function liftOf(flight: FruitFlight) {
  return flight.offsetY.map(
    (offset, index) => flight.shadowOffsetY[index] - offset,
  );
}

// 처음 부딪힌 뒤 튕겨 오른 높이들(구간마다 가장 높은 점)
function bounceLifts(flight: FruitFlight) {
  const lift = liftOf(flight);
  const peaks: number[] = [];
  for (
    let index = indexAt(flight, flight.landingAt) + 1;
    index < lift.length - 1;
    index++
  ) {
    if (lift[index] > lift[index - 1] && lift[index] >= lift[index + 1])
      peaks.push(lift[index]);
  }
  return peaks;
}

test("a point on the ground comes back where it started after projecting", () => {
  const point = { side: -60, distance: 1500, height: 0 };
  const back = toWorld(view, toScreen(view, point));
  assert.ok(Math.abs(back.side - point.side) < 1e-6);
  assert.ok(Math.abs(back.distance - point.distance) < 1e-6);
  assert.ok(Math.abs(back.height) < 1e-6);
});

test("farther ground looks higher on the screen and smaller", () => {
  const near = toScreen(view, { side: 0, distance: 1200, height: 0 });
  const far = toScreen(view, { side: 0, distance: 2400, height: 0 });
  assert.ok(far.y < near.y);
  assert.ok(far.depth < near.depth);
});

test("every fruit starts above the top edge of the screen", () => {
  for (const rollAway of [RIGHTWARD, { side: -60, toward: -20 }]) {
    const { start } = inputFor("roll", true, rollAway);
    assert.ok(Math.abs(toScreen(view, start).y - ENTRY_Y) < 0.01);
  }
});

test("a fruit falls almost straight down and travels after it lands", () => {
  for (const bounce of ["roll", "hop"] as const) {
    const flight = planFlight(inputFor(bounce));
    const landing = indexAt(flight, flight.landingAt);
    const drift = flight.offsetX[landing] - flight.offsetX[0];
    // 오른쪽으로 갈 것이라 멈출 자리 왼쪽에 떨어진다.
    assert.ok(flight.offsetX[landing] < -40, bounce);
    assert.ok(
      Math.abs(drift) < 0.3 * Math.abs(flight.offsetX[0]),
      `${bounce} 떨어지는 동안 옆으로 간 거리 ${drift}`,
    );
  }
});

test("a hopping fruit flies sideways during its first bounce", () => {
  const flight = planFlight(inputFor("hop"));
  const lift = liftOf(flight);
  const landing = indexAt(flight, flight.landingAt);
  // 처음 튀어 올랐다가 다시 땅에 닿을 때까지
  let next = landing + 1;
  while (next < lift.length - 1 && lift[next] > 0.5) next++;
  const flown = flight.offsetX[next] - flight.offsetX[landing];
  assert.ok(Math.max(...lift.slice(landing)) > 60, "크게 튀어 오른다");
  assert.ok(
    flown > 0.3 * Math.abs(flight.offsetX[landing]),
    `날아간 거리 ${flown}`,
  );
});

test("a thud bounces lower than a hop", () => {
  const highest = (bounce: Bounce) => {
    const flight = planFlight(inputFor(bounce));
    return Math.max(...liftOf(flight).slice(indexAt(flight, flight.landingAt)));
  };
  assert.ok(highest("thud") < highest("hop") / 2);
});

test("every fruit comes to rest exactly on its spot", () => {
  for (const { name, flight } of everyFlight()) {
    assert.equal(flight.offsetX.at(-1), 0, name);
    assert.equal(flight.offsetY.at(-1), 0, name);
    assert.equal(flight.shadowOffsetY.at(-1), 0, name);
  }
});

test("a fruit never sinks below the ground", () => {
  for (const { name, flight } of everyFlight()) {
    assert.ok(
      liftOf(flight).every((lift) => lift > -1e-6),
      name,
    );
  }
});

test("each bounce is lower than the one before", () => {
  const peaks = bounceLifts(planFlight(inputFor("hop")));
  assert.ok(peaks.length >= 2, `튕긴 횟수 ${peaks.length}`);
  for (let index = 1; index < peaks.length; index++) {
    assert.ok(peaks[index] < peaks[index - 1]);
  }
});

test("the shadow grows darker as the fruit comes down", () => {
  const flight = planFlight(inputFor());
  const landing = indexAt(flight, flight.landingAt);
  assert.equal(flight.shadowOpacity[0], 0);
  for (let index = 1; index <= landing; index++) {
    assert.ok(flight.shadowOpacity[index] >= flight.shadowOpacity[index - 1]);
  }
  assert.equal(flight.shadowOpacity[landing], 1);
});

test("a fruit squashes when it lands and is back to shape at rest", () => {
  const flight = planFlight(inputFor());
  const landing = indexAt(flight, flight.landingAt);
  assert.ok(flight.stretchY[landing] < 0.9);
  assert.ok(flight.stretchX[landing] > 1);
  assert.ok(Math.abs((flight.stretchY.at(-1) ?? 0) - 1) < 0.01);
});

test("a rolling round fruit rests slightly tilted and an angular fruit upright", () => {
  const round = planFlight(inputFor("roll", true));
  const turn = Math.abs(round.angle.at(-1) ?? 0) % 360;
  assert.ok(Math.abs(turn - 20) < 1e-6, `기운 각도 ${turn}`);
  const angular = planFlight(inputFor("roll", false));
  assert.ok(Math.abs(angular.angle.at(-1) ?? 1) < 1e-6);
});

test("time moves forward from start to finish", () => {
  for (const { name, flight } of everyFlight()) {
    assert.equal(flight.times[0], 0, name);
    assert.equal(flight.times.at(-1), 1, name);
    for (let index = 1; index < flight.times.length; index++) {
      assert.ok(flight.times[index] > flight.times[index - 1], name);
    }
  }
});
