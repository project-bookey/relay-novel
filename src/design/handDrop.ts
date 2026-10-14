import {
  planFlight,
  toScreen,
  toWorld,
  type FruitFlight,
  type GroundView,
  type ScreenPoint,
} from "./fruitFlight";
import { DEPTH_SPACING, flightStyleFor, SPACING } from "./skyDrop";

// 손으로 집어 든 열매를 놓았을 때의 움직임을 정한다. 든 높이에서 그대로 떨어져 땅에 부딪히고,
// 놓는 순간 손이 움직이던 만큼 그쪽으로 굴러가거나 미끄러져 멈춘다.
// React·Expo 의존성이 없어서 node 테스트가 가능하다.

// 놓는 손의 빠르기(px/초)를 굴러갈 거리로 바꾸는 비율(초)과, 굴러갈 수 있는 가장 먼 거리(그림 좌표계)
const CARRY_SECONDS = 0.15;
const MAX_CARRY = 140;
// 이보다 빠르게 놓으면 털썩 서지 않고 굴러간다(그림 좌표계 px/초).
const ROLL_SPEED = 300;
// 놓은 자리에 다른 열매가 있으면 둘레를 이만큼씩(열매 크기에 대한 비율) 넓혀 가며 빈자리를 찾는다.
const RING_STEP = 0.45;
const RING_COUNT = 8;
const RING_DIRECTIONS = 16;
// 거의 들지 않고 놓아도 땅에 톡 닿는 느낌이 나도록 떨어지는 높이의 하한(그림 좌표계)
const MIN_DROP_HEIGHT = 4;

export interface GroundBounds {
  left: number;
  right: number;
  top: number;
  bottom: number;
}

// 땅에 놓여 있는 다른 열매의 자리(열매 바닥)와 원근 배율
export interface RestingFruit extends ScreenPoint {
  depth: number;
}

export interface HandDropInput {
  view: GroundView;
  // 열매가 멈출 수 있는 땅의 화면 범위
  bounds: GroundBounds;
  // 든 열매 바로 아래 땅의 화면 자리
  ground: ScreenPoint;
  // 그 자리에서 열매 바닥을 들어 올린 화면 높이
  lift: number;
  // 놓는 순간 손이 움직이던 화면 빠르기(px/초)
  velocity: ScreenPoint;
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
  rest: ScreenPoint & { depth: number };
  flight: FruitFlight;
}

export function depthAt(view: GroundView, groundY: number) {
  return (groundY - view.horizonY) / view.eyeHeight;
}

export function clampToGround(bounds: GroundBounds, point: ScreenPoint) {
  return {
    x: Math.min(bounds.right, Math.max(bounds.left, point.x)),
    y: Math.min(bounds.bottom, Math.max(bounds.top, point.y)),
  };
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

// 멈출 자리가 다른 열매와 겹치면, 먼저 있던 열매에 부딪혀 옆으로 밀려난 것처럼 가장 가까운 빈자리로 옮긴다.
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

export function planHandDrop(input: HandDropInput): HandDrop {
  const { view, bounds, ground, velocity, scale } = input;
  const speed = Math.hypot(velocity.x, velocity.y);
  const carryLimit = MAX_CARRY * scale;
  const carry = Math.min(carryLimit, speed * CARRY_SECONDS);
  const carryShare = speed === 0 ? 0 : carry / speed;
  const carriedTo = clampToGround(bounds, {
    x: ground.x + velocity.x * carryShare,
    y: ground.y + velocity.y * carryShare,
  });
  const restPoint = openSpotNear(
    view,
    bounds,
    carriedTo,
    input.others,
    input.fruitSize,
  );

  const groundDepth = depthAt(view, ground.y);
  const lift = Math.max(input.lift, MIN_DROP_HEIGHT * scale * groundDepth);
  const start = toWorld(view, { x: ground.x, y: ground.y - lift }, groundDepth);
  const rest = toWorld(view, restPoint);
  const bounce = speed > ROLL_SPEED * scale ? "roll" : "thud";
  const style = flightStyleFor(bounce, input.rollsLikeBall);

  const flight = planFlight({
    start,
    rest,
    view,
    size: input.fruitSize,
    rollsLikeBall: input.rollsLikeBall,
    // 든 채 기울어 있던 각도에서 이어서 구르므로, 굴러간 뒤에도 같은 기울기로 멈춘다.
    restTilt: 0,
    style: { ...style, gravity: style.gravity * scale },
  });
  const restScreen = toScreen(view, rest);
  return {
    rest: { x: restScreen.x, y: restScreen.y, depth: restScreen.depth },
    flight,
  };
}
