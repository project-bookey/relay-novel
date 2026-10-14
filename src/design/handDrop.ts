import {
  planFlight,
  toScreen,
  toWorld,
  type FlightStyle,
  type FruitFlight,
  type GroundView,
  type ScreenPoint,
} from "./fruitFlight";
import { DEPTH_SPACING, flightStyleFor, SPACING } from "./skyDrop";

// 손으로 집어 든 열매의 자세와, 놓았을 때 떨어지는 움직임을 정한다.
// 든 열매는 손가락 아래에 그대로 붙어 따라오고, 들어 올린 만큼 바로 아래 땅에서 떠 있다.
// 놓으면 그 땅으로 곧게 떨어져 처음 하늘에서 떨어질 때처럼 부딪혀 찌그러지고 몇 번 튄 뒤 멈춘다.
// 땅에서 미끄러지지 않고, 다른 열매 위로 떨어지면 그 열매에 튕겨 옆 빈자리에 내려앉는다.
// React·Expo 의존성이 없어서 node 테스트가 가능하다.

// 놓은 자리에 다른 열매가 있으면 둘레를 이만큼씩(열매 크기에 대한 비율) 넓혀 가며 빈자리를 찾는다.
const RING_STEP = 0.45;
const RING_COUNT = 8;
const RING_DIRECTIONS = 16;
// 마지막으로 튄 뒤 땅에서 움직이는 시간. 짧게 두어 옆으로 가는 건 튀어 오른 동안 거의 끝낸다.
const SETTLE_SECONDS = 0.1;
// 이 높이(그림 좌표계)부터는 처음 떨어질 때만큼 찌그러지고 늘어난다. 더 낮으면 그만큼 덜하다.
const FULL_SQUASH_HEIGHT = 40;

export interface GroundBounds {
  left: number;
  right: number;
  top: number;
  bottom: number;
}

// 땅 위 한 자리(열매 바닥)와 그곳의 원근 배율
export interface RestingFruit extends ScreenPoint {
  depth: number;
}

export function depthAt(view: GroundView, groundY: number) {
  return (groundY - view.horizonY) / view.eyeHeight;
}

function clamp(value: number, low: number, high: number) {
  return Math.min(high, Math.max(low, value));
}

export function clampToGround(bounds: GroundBounds, point: ScreenPoint) {
  return {
    x: clamp(point.x, bounds.left, bounds.right),
    y: clamp(point.y, bounds.top, bounds.bottom),
  };
}

export interface HoldInput {
  view: GroundView;
  // 든 열매 아래 땅이 될 수 있는 범위
  bounds: GroundBounds;
  // 든 열매 바닥이 올라갈 수 있는 가장 높은 화면 y. 이보다 위로는 따라가지 않는다.
  skyTop: number;
  // 집기 전에 놓여 있던 자리(열매 바닥)
  rest: ScreenPoint;
  // 집은 뒤 손가락이 움직인 거리
  drag: ScreenPoint;
  // 땅에서 들어 올린 높이(원근 배율 1 기준)
  holdHeight: number;
}

export interface HoldPose {
  // 열매 바닥의 화면 자리. 손가락을 그대로 따라간다.
  bottom: ScreenPoint;
  // 바로 아래 땅. 놓으면 여기로 떨어진다.
  ground: RestingFruit;
  // 땅에서 열매 바닥까지의 높이(원근 배율 1 기준)
  height: number;
}

export function holdPose(input: HoldInput): HoldPose {
  const { view, bounds } = input;
  const bottom = {
    x: clamp(input.rest.x + input.drag.x, bounds.left, bounds.right),
    y: clamp(input.rest.y + input.drag.y, input.skyTop, bounds.bottom),
  };
  // 들어 올린 열매 바로 아래 땅은 열매보다 (높이 × 그 땅의 원근 배율)만큼 아래에 보인다.
  // 땅의 원근 배율도 그 땅의 화면 y에 따라 달라지므로 두 관계를 함께 풀어 땅의 y를 구한다.
  const lean = input.holdHeight / view.eyeHeight;
  const groundY = (bottom.y - lean * view.horizonY) / (1 - lean);
  // 땅 끝을 넘어가면 땅 끝에 멈추고 높이가 그만큼 달라진다. 하늘로 올리면 뒤쪽 땅 위로 더 높이 든다.
  const landingY = clamp(groundY, bounds.top, bounds.bottom);
  const depth = depthAt(view, landingY);
  const height = Math.max(0, (landingY - bottom.y) / depth);
  return { bottom, ground: { x: bottom.x, y: landingY, depth }, height };
}

// 하늘에서 떨어진 열매끼리 띄우는 거리(skyDrop.ts)와 같은 기준으로, 다른 열매와 겹치지 않는지 본다.
// 앞뒤는 화면에서 좁아 보이므로 더 넓게 친다.
function isOpen(
  view: GroundView,
  point: ScreenPoint,
  others: RestingFruit[],
  fruitSize: number,
) {
  const depth = depthAt(view, point.y);
  return others.every((other) => {
    const gap = SPACING * fruitSize * ((other.depth + depth) / 2);
    const across = other.x - point.x;
    const along = (other.y - point.y) * DEPTH_SPACING;
    return Math.hypot(across, along) >= gap;
  });
}

// 떨어질 자리가 다른 열매와 겹치면, 그 열매에 부딪혀 튕겨 나간 것처럼 가장 가까운 빈자리를 찾는다.
// 땅이 꽉 차 빈자리가 없으면 원래 자리에 둔다.
export function openSpotNear(
  view: GroundView,
  bounds: GroundBounds,
  point: ScreenPoint,
  others: RestingFruit[],
  fruitSize: number,
) {
  if (isOpen(view, point, others, fruitSize)) return point;
  for (let ring = 1; ring <= RING_COUNT; ring++) {
    const distance = ring * RING_STEP * fruitSize;
    for (let step = 0; step < RING_DIRECTIONS; step++) {
      const angle = (Math.PI * 2 * step) / RING_DIRECTIONS;
      const candidate = {
        x: point.x + distance * Math.cos(angle),
        y: point.y + (distance * Math.sin(angle)) / DEPTH_SPACING,
      };
      const inside = clampToGround(bounds, candidate);
      const isInside = inside.x === candidate.x && inside.y === candidate.y;
      if (isInside && isOpen(view, candidate, others, fruitSize)) {
        return candidate;
      }
    }
  }
  return point;
}

export interface HandDropInput {
  view: GroundView;
  // 열매가 멈출 수 있는 땅의 화면 범위
  bounds: GroundBounds;
  // 놓는 순간 든 열매의 자세
  pose: HoldPose;
  // 원근 배율 1인 곳의 열매 크기
  fruitSize: number;
  // 그림 좌표계를 화면에 맞춰 늘리고 줄인 비율
  scale: number;
  rollsLikeBall: boolean;
  // 땅에 놓여 있는 다른 열매들. 그 위에 겹쳐 멈추지 않는다.
  others: RestingFruit[];
}

export interface HandDrop {
  // 멈출 자리(열매 바닥)와 그곳의 원근 배율
  rest: RestingFruit;
  flight: FruitFlight;
}

// 처음 하늘에서 크게 튀어 떨어질 때(skyDrop.ts의 hop)와 같은 중력·찌그러짐·튀는 정도를 쓴다.
// 손 높이에서는 튀는 높이가 낮으므로 모난 열매가 기우뚱하는 각도는 반으로 줄이고,
// 몇 px만 떨어뜨리면 거의 찌그러지지 않게 해서 제자리에서 통통 튀어 보이지 않게 한다.
function handDropStyle(
  rollsLikeBall: boolean,
  scale: number,
  height: number,
): FlightStyle {
  const hop = flightStyleFor("hop", rollsLikeBall);
  const impact = Math.min(1, height / (FULL_SQUASH_HEIGHT * scale));
  return {
    ...hop,
    gravity: hop.gravity * scale,
    settleSeconds: SETTLE_SECONDS,
    tumbleDegrees: hop.tumbleDegrees / 2,
    squash: hop.squash * impact,
    stretch: hop.stretch * impact,
  };
}

export function planHandDrop(input: HandDropInput): HandDrop {
  const { view, pose } = input;
  const start = { ...toWorld(view, pose.ground), height: pose.height };
  const landing = openSpotNear(
    view,
    input.bounds,
    pose.ground,
    input.others,
    input.fruitSize,
  );
  const rest = toWorld(view, landing);
  const flight = planFlight({
    start,
    rest,
    view,
    size: input.fruitSize,
    rollsLikeBall: input.rollsLikeBall,
    // 든 채 기울어 있던 각도에서 이어지므로, 떨어진 뒤에도 같은 기울기로 멈춘다.
    restTilt: 0,
    style: handDropStyle(input.rollsLikeBall, input.scale, pose.height),
  });
  const restScreen = toScreen(view, rest);
  return {
    rest: { x: restScreen.x, y: restScreen.y, depth: restScreen.depth },
    flight,
  };
}
