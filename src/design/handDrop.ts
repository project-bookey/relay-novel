import {
  planFlight,
  toScreen,
  toWorld,
  type FruitFlight,
  type GroundView,
  type ScreenPoint,
} from "./fruitFlight";
import { flightStyleFor } from "./skyDrop";

// 손으로 집어 든 열매를 놓았을 때의 움직임을 정한다. 든 높이에서 그대로 떨어져 땅에 부딪히고,
// 놓는 순간 손이 움직이던 만큼 그쪽으로 굴러가거나 미끄러져 멈춘다.
// React·Expo 의존성이 없어서 node 테스트가 가능하다.

// 놓는 손의 빠르기(px/초)를 굴러갈 거리로 바꾸는 비율(초)과, 굴러갈 수 있는 가장 먼 거리(그림 좌표계)
const CARRY_SECONDS = 0.15;
const MAX_CARRY = 140;
// 이보다 빠르게 놓으면 털썩 서지 않고 굴러간다(그림 좌표계 px/초).
const ROLL_SPEED = 300;
// 거의 들지 않고 놓아도 땅에 톡 닿는 느낌이 나도록 떨어지는 높이의 하한(그림 좌표계)
const MIN_DROP_HEIGHT = 4;

export interface GroundBounds {
  left: number;
  right: number;
  top: number;
  bottom: number;
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

export function planHandDrop(input: HandDropInput): HandDrop {
  const { view, bounds, ground, velocity, scale } = input;
  const speed = Math.hypot(velocity.x, velocity.y);
  const carryLimit = MAX_CARRY * scale;
  const carry = Math.min(carryLimit, speed * CARRY_SECONDS);
  const carryShare = speed === 0 ? 0 : carry / speed;
  const restPoint = clampToGround(bounds, {
    x: ground.x + velocity.x * carryShare,
    y: ground.y + velocity.y * carryShare,
  });

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
