import type { FruitFlight, ScreenPoint } from "./fruitFlight";
import { GROUND_LINE, type Point } from "./fruitShapes";

// 나무에 매달려 있다가 떨어지는 열매의 움직임. 꼭지 끝이 가지에 붙어 가지를 따라 흔들리다가(진자처럼 흔들림),
// 놓이는 순간부터는 미리 계산한 낙하(planFlight)를 따라 땅에 부딪혀 튀고 멈춘다.
// 놓이는 순간 가지가 흔들려 생긴 자리 차이는 떨어지는 동안 서서히 없앤다. 열매 밭(FieldFruit)이 그대로 재생하도록
// 매달린 시간까지 한 FruitFlight로 이어 붙인다. React·Expo 의존성이 없어서 node 테스트가 가능하다.

// 열매는 40x40 칸에 그린다(FruitArt). 바닥 가운데와, 구르거나 흔들릴 때 축이 되는 몸통 가운데
const BOX = 40;
const BOTTOM: Point = { x: 20, y: GROUND_LINE };
const BODY_CENTER: Point = { x: 20, y: BOX * 0.58 };
// 매달린 동안 미리 계산하는 간격(ms)
const HANG_SAMPLE_MS = 1000 / 30;

export interface HangingInput {
  // 가지에 매달린 자리에서 떨어지기 시작해 땅에 멈추기까지(시작 높이는 매달린 자리의 열매 바닥이다)
  flight: FruitFlight;
  // 멈출 자리의 열매 바닥 가운데(열매 밭 px)
  rest: ScreenPoint;
  // 멈출 자리에서의 열매 그림 크기(px)
  size: number;
  // 꼭지 끝(열매 칸 좌표). 이 점이 가지에 붙어 있다.
  stemTip: Point;
  // 가지에서 떨어지는 때(ms)
  releaseMs: number;
  // 그 시각(atMs)에 꼭지 끝이 붙어 있는 가지 자리(열매 밭 px)와, 진자처럼 흔들린 각도(도)
  attachAt: (atMs: number) => ScreenPoint;
  swingAt: (atMs: number) => number;
}

const clamp01 = (value: number) => Math.min(1, Math.max(0, value));
const smoothstep = (progress: number) =>
  progress * progress * (3 - 2 * progress);

function rotate(point: Point, degrees: number): Point {
  const radians = (degrees * Math.PI) / 180;
  return {
    x: point.x * Math.cos(radians) - point.y * Math.sin(radians),
    y: point.x * Math.sin(radians) + point.y * Math.cos(radians),
  };
}

export function hangThenFall(input: HangingInput): FruitFlight {
  const { flight, rest, size, stemTip, releaseMs } = input;
  const fallMs = flight.durationMs;
  const totalMs = releaseMs + fallMs;
  // 매달린 동안의 크기(멀리 있는 만큼 작다)
  const nearness = flight.nearness[0];
  const unit = (size / BOX) * nearness;
  // 바닥에서 몸통 가운데까지, 몸통 가운데에서 꼭지 끝까지(화면 px, 흔들리기 전)
  const centerFromBottom = {
    x: (BODY_CENTER.x - BOTTOM.x) * unit,
    y: (BODY_CENTER.y - BOTTOM.y) * unit,
  };
  const tipFromCenter = {
    x: (stemTip.x - BODY_CENTER.x) * unit,
    y: (stemTip.y - BODY_CENTER.y) * unit,
  };
  // 꼭지 끝이 attach에 붙은 채 몸통 가운데를 축으로 swing만큼 돈 열매의, 멈출 자리에서 떨어진 거리
  const hangingOffset = (attach: ScreenPoint, swing: number) => {
    const tip = rotate(tipFromCenter, swing);
    return {
      x: attach.x - centerFromBottom.x - tip.x - rest.x,
      y: attach.y - centerFromBottom.y - tip.y - rest.y,
    };
  };

  const times: number[] = [];
  const offsetX: number[] = [];
  const offsetY: number[] = [];
  const angle: number[] = [];
  const keep = {
    nearness: [] as number[],
    shadowOffsetY: [] as number[],
    shadowScale: [] as number[],
    shadowOpacity: [] as number[],
    stretchX: [] as number[],
    stretchY: [] as number[],
  };

  // 1. 가지에 매달려 흔들린다. 그림자는 아직 땅에 지지 않는다.
  for (let atMs = 0; atMs < releaseMs - 0.5; atMs += HANG_SAMPLE_MS) {
    const swing = input.swingAt(atMs);
    const offset = hangingOffset(input.attachAt(atMs), swing);
    times.push(atMs / totalMs);
    offsetX.push(offset.x);
    offsetY.push(offset.y);
    angle.push(swing);
    keep.nearness.push(nearness);
    keep.shadowOffsetY.push(flight.shadowOffsetY[0]);
    keep.shadowScale.push(flight.shadowScale[0]);
    keep.shadowOpacity.push(0);
    keep.stretchX.push(1);
    keep.stretchY.push(1);
  }

  // 2. 놓인다. 놓인 자리와 미리 계산한 낙하의 시작점 차이를 땅에 닿기 전에 없애고, 남은 흔들림도 잦아든다.
  const releaseSwing = input.swingAt(releaseMs);
  const released = hangingOffset(input.attachAt(releaseMs), releaseSwing);
  const gap = {
    x: released.x - flight.offsetX[0],
    y: released.y - flight.offsetY[0],
  };
  const blendUntil = flight.landingAt * 0.85;
  flight.times.forEach((progress, index) => {
    const elapsed = progress * fallMs;
    const blend = 1 - smoothstep(clamp01(progress / blendUntil));
    times.push((releaseMs + elapsed) / totalMs);
    offsetX.push(flight.offsetX[index] + gap.x * blend);
    offsetY.push(flight.offsetY[index] + gap.y * blend);
    angle.push(flight.angle[index] + releaseSwing * Math.exp(-elapsed / 140));
    keep.nearness.push(flight.nearness[index]);
    keep.shadowOffsetY.push(flight.shadowOffsetY[index]);
    keep.shadowScale.push(flight.shadowScale[index]);
    keep.shadowOpacity.push(flight.shadowOpacity[index]);
    keep.stretchX.push(flight.stretchX[index]);
    keep.stretchY.push(flight.stretchY[index]);
  });

  return {
    durationMs: totalMs,
    landingAt: (releaseMs + flight.landingAt * fallMs) / totalMs,
    times,
    offsetX,
    offsetY,
    angle,
    ...keep,
  };
}
