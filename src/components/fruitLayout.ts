import type { NovelSummary } from "../api/types";
import { fruitShapeOf, type FruitShape } from "../theme";
import {
  groundViewThrough,
  planFlight,
  skyStart,
  toScreen,
  toWorld,
  type ScreenPoint,
} from "../design/fruitFlight";
import { flightStyleFor, planDrops, type DropPlan } from "../design/skyDrop";
import {
  GROUND_LINE,
  fruitGeometries,
  type Point,
} from "../design/fruitShapes";
import { canopyPlacement, hangSpotAt, type HangSpot } from "../design/canopy";
import {
  treeStateAt,
  pointOnTree,
  swingAt,
  type CanopyShow,
} from "../design/canopyShow";
import { hangThenFall } from "../design/hangingFlight";
import type { PlacedFruit } from "./fruitPlacement";
import type { FieldGround } from "./fruitHand";
import { rollsLikeBall } from "./fruitMotion";

// 홈 열매 밭의 배치: 열매가 떨어져 멈출 자리와 그 자리로 오는 움직임을 정한다(FruitField가 그린다).
// 위쪽 나무 연출이 있으면 열매는 가지에 매달려 있다가 연출이 정한 때에 떨어진다.

// 그림 좌표계. 실제 크기는 화면 너비에 맞춰 늘리고 줄인다.
export const VIEW_WIDTH = 340;
const FIELD_HEIGHT = 190;
// 원근 배율 1인 곳(맨 앞줄)의 열매 크기
export const FRUIT_SIZE = 44;
// 맨 뒷줄 열매 자리의 원근 배율. 앞줄보다 조금 멀어서 작고 옅게 보인다.
const BACK_ROW_DEPTH = 0.8;
// 아래쪽 버튼 줄이 차지하는 높이. 열매 무리는 그 위에 놓는다.
const BOTTOM_BAR_SPACE = 76;
// 버튼 줄 위 남는 공간 중 열매 무리 위쪽에 두는 비율. 위쪽에 열매가 떨어져 내려올 하늘을 넉넉히 남긴다.
const FIELD_PLACEMENT = 0.6;
// 나무에 매달리지 않은 열매가 하늘에서 들어오는 높이. 이 영역 위쪽 여백과 상태 표시줄까지 넘어선 화면 밖에서 시작한다.
const SKY_ENTRY_Y = -150;
// 화면이 뜬 뒤 첫 열매가 떨어지기 시작할 때까지 기다리는 시간과, 열매 사이 평균 간격(초)
const FIRST_DROP_SECONDS = 0.35;
const DROP_GAP_SECONDS = 0.2;
// 하나씩 "톡… 톡톡… 톡" 떨어지도록 열매 사이 간격을 들쭉날쭉하게 늘이고 줄인다.
const DROP_GAP_RHYTHM = [1, 0.6, 1.5, 0.8, 1.2, 0.7, 1.3];
// 꼭지 끝(열매 칸 좌표의 x). 매달린 열매는 이 점이 가지에 붙어 있다(FruitStem과 같은 자리).
const STEM_TIP_X = 22.2;
// 모든 열매가 가지 아래에 매달리는 배치를 찾을 때까지 튀고 굴러갈 결과를 다시 정해 보는 횟수
const HANG_ATTEMPTS = 24;

interface Spot {
  x: number;
  y: number;
}

// 열매가 처음 땅에 닿는 자리. 가운데부터 채워서 열매가 적으면 한가운데에 떨어진다.
// 멈추는 자리는 여기서 튕기거나 굴러간 결과라 떨어질 때마다 다르다.
const landingSpots: Spot[] = [
  { x: 170, y: 124 },
  { x: 92, y: 160 },
  { x: 252, y: 164 },
  { x: 124, y: 90 },
  { x: 226, y: 94 },
  { x: 300, y: 128 },
  { x: 40, y: 128 },
];
export const FRUIT_FIELD_LIMIT = landingSpots.length;
const BACK_ROW_Y = Math.min(...landingSpots.map((spot) => spot.y));
const FRONT_ROW_Y = Math.max(...landingSpots.map((spot) => spot.y));
// 굴러가거나 튄 열매가 멈출 수 있는 땅의 범위(그림 좌표계). 화면 양옆과 아래쪽 버튼 줄에 닿지 않는다.
const GROUND = { left: 24, right: 316, top: 64, bottom: 182 };
// 손으로 옮긴 열매는 처음 배치보다 앞쪽, 아래쪽 버튼 줄에서 이만큼(화면 px) 위까지 놓을 수 있다.
const HAND_FRONT_GAP = 12;
// 든 열매 위에 뜨는 말풍선이 화면 위로 잘리지 않도록 남기는 높이(화면 px)
const BUBBLE_ROOM = 150;

const stemTipOf = (shape: FruitShape): Point => ({
  x: STEM_TIP_X,
  y: fruitGeometries[shape].stemBase - 5.8,
});

// 위쪽 나무와 열매 밭을 잇는 자리 계산. 나무는 화면 맨 위에, 열매 밭은 화면 안쪽 여백 안에 있다.
export interface CanopyFrame {
  scale: number;
  // 나무 그림 왼쪽 위의 열매 밭 좌표
  left: number;
  top: number;
  toField: (point: Point) => ScreenPoint;
  toCanopyX: (fieldX: number) => number;
}

export function canopyFrameOf(
  windowWidth: number,
  origin: ScreenPoint,
): CanopyFrame {
  const placement = canopyPlacement(windowWidth);
  const left = placement.left - origin.x;
  const top = -origin.y;
  return {
    scale: placement.scale,
    left,
    top,
    toField: (point) => ({
      x: left + point.x * placement.scale,
      y: top + point.y * placement.scale,
    }),
    toCanopyX: (fieldX) => (fieldX - left) / placement.scale,
  };
}

// 나무 연출에 맞춰 가지에 매달았다 떨어뜨릴 때 쓰는 것
interface Hanging {
  show: CanopyShow;
  frame: CanopyFrame;
}

// 열매 밭 그림 좌표를 화면에 놓는 배율과 위쪽 자리. 홈의 풀과 꽃(Meadow)도 같은 자리에 맞춰 그린다.
export function fieldPlacementOf(width: number, height: number) {
  const scale = width / VIEW_WIDTH;
  const room = height - BOTTOM_BAR_SPACE;
  const fieldTop = Math.max(0, (room - FIELD_HEIGHT * scale) * FIELD_PLACEMENT);
  return { scale, room, fieldTop };
}

// 열매마다 하늘(또는 나무)에서 떨어져 땅에 부딪힌 뒤 어디로 튀고 굴러 멈출지 정하고, 그 움직임을 계산한다.
// hanging이 있으면 열매는 위쪽 나무 가지에 매달려 있다가 연출이 정한 때에 떨어진다.
export function layoutField(
  width: number,
  height: number,
  stories: NovelSummary[],
  seed: number,
  hanging: Hanging | undefined,
) {
  const { scale, room, fieldTop } = fieldPlacementOf(width, height);
  const toScreenSpot = (spot: Spot) => ({
    x: spot.x * scale,
    y: fieldTop + spot.y * scale,
  });
  // 뒷줄과 앞줄 열매 자리의 크기 차이로 땅의 원근을 정한다.
  const view = groundViewThrough(
    width / 2,
    { y: fieldTop + BACK_ROW_Y * scale, depth: BACK_ROW_DEPTH },
    { y: fieldTop + FRONT_ROW_Y * scale, depth: 1 },
  );
  const shown = stories.slice(0, FRUIT_FIELD_LIMIT).map((story, order) => ({
    story,
    shape: fruitShapeOf(story.id),
    rollsLikeBall: rollsLikeBall(fruitShapeOf(story.id)),
    landing: toScreenSpot(landingSpots[order]),
  }));
  const bounds = {
    left: GROUND.left * scale,
    right: GROUND.right * scale,
    top: fieldTop + GROUND.top * scale,
    bottom: fieldTop + GROUND.bottom * scale,
  };
  const fruitSize = FRUIT_SIZE * scale;
  const ground: FieldGround = {
    view,
    bounds,
    handBounds: {
      ...bounds,
      bottom: Math.max(bounds.bottom, room - HAND_FRONT_GAP),
    },
    // 땅 뒤쪽 끝보다 위는 하늘이라, 그곳까지 들어 올렸다 놓으면 처음처럼 높이서 떨어진다.
    skyTop: Math.min(bounds.top, BUBBLE_ROOM + fruitSize),
    fruitSize,
    scale,
  };
  const plansFor = (trySeed: number) =>
    planDrops(
      ground,
      shown.map(({ story, rollsLikeBall, landing }) => ({
        id: story.id,
        rollsLikeBall,
        landing,
      })),
      trySeed,
    );

  // 떨어지기 시작하는 x는 멈출 자리와 튀어 갈 거리로 정해지고 높이와는 상관없다. 그 x 위의 가지에 꼭지를 매단다.
  const hangSpotOf = (plan: DropPlan, shape: FruitShape) => {
    if (!hanging) return undefined;
    const restWorld = toWorld(view, plan.rest);
    const start = toScreen(view, skyStart(view, restWorld, plan.rollAway, 0));
    const hangingSize = fruitSize * start.depth;
    const attachX = start.x + ((stemTipOf(shape).x - 20) / 40) * hangingSize;
    return hangSpotAt(hanging.frame.toCanopyX(attachX));
  };
  // 가지 사이 빈 곳에 떨어질 열매가 없도록, 모든 열매가 가지 아래에 매달리는 결과가 나올 때까지 다시 정해 본다.
  let plans = plansFor(seed);
  let spots = plans.map((plan, order) => hangSpotOf(plan, shown[order].shape));
  for (
    let attempt = 1;
    hanging && attempt < HANG_ATTEMPTS && !spots.every(Boolean);
    attempt++
  ) {
    plans = plansFor((seed + attempt * 7919) % 2 ** 31);
    spots = plans.map((plan, order) => hangSpotOf(plan, shown[order].shape));
  }

  let waitSeconds = FIRST_DROP_SECONDS;
  const placed: PlacedFruit[] = shown.map(
    ({ story, shape, rollsLikeBall }, order) => {
      const { bounce, rest, rollAway } = plans[order];
      const style = flightStyleFor(bounce, rollsLikeBall);
      const restWorld = toWorld(view, rest);
      const flightFrom = (entryY: number) =>
        planFlight({
          start: skyStart(view, restWorld, rollAway, entryY),
          rest: restWorld,
          view,
          size: fruitSize,
          rollsLikeBall,
          // 소설마다 다 굴러간 뒤 기울어지는 정도가 조금씩 다르다.
          restTilt: 12 + ((story.id * 7) % 16),
          style: {
            ...style,
            // 화면이 작으면 열매가 가는 길도 짧으므로 중력도 그만큼 작게 준다.
            gravity: style.gravity * scale,
          },
        });
      const spot = spots[order];
      if (hanging && spot) {
        return {
          story,
          rest,
          flight: hangingFlightOf(hanging, spot, order, {
            shape,
            rest,
            restDepthSize: fruitSize * rest.depth,
            hangingSize:
              fruitSize *
              toScreen(view, skyStart(view, restWorld, rollAway, 0)).depth,
            flightFrom,
          }),
          delayMs: 0,
        };
      }
      // 나무가 없을 때(연출 없이 다시 배치하거나, 매달 가지를 찾지 못한 열매)는 하늘에서 떨어진다.
      const delayMs = hanging
        ? hanging.show.schedule.fruitDrops[order]
        : waitSeconds * 1000;
      waitSeconds +=
        DROP_GAP_SECONDS * DROP_GAP_RHYTHM[order % DROP_GAP_RHYTHM.length];
      return { story, rest, flight: flightFrom(SKY_ENTRY_Y), delayMs };
    },
  );
  // 뒤쪽 열매부터 그려야 겹칠 때 앞쪽 열매가 앞에 보인다.
  const backToFront = [...placed].sort(
    (first, second) => first.rest.y - second.rest.y,
  );
  return { fruits: backToFront, ground };
}

// 가지에 매달려 흔들리다 연출이 정한 때에 떨어지는 움직임
function hangingFlightOf(
  hanging: Hanging,
  spot: HangSpot,
  order: number,
  fruit: {
    shape: FruitShape;
    rest: ScreenPoint;
    restDepthSize: number;
    hangingSize: number;
    flightFrom: (entryY: number) => ReturnType<typeof planFlight>;
  },
) {
  const { show, frame } = hanging;
  const stemTip = stemTipOf(fruit.shape);
  const attach = frame.toField(spot.attach);
  // 꼭지 끝이 가지에 붙어 있으면 열매 바닥은 그만큼 아래에 있다.
  const bottomY =
    attach.y + ((GROUND_LINE - stemTip.y) / 40) * fruit.hangingSize;
  return hangThenFall({
    flight: fruit.flightFrom(bottomY),
    rest: fruit.rest,
    size: fruit.restDepthSize,
    stemTip,
    releaseMs: show.schedule.fruitDrops[order],
    attachAt: (atMs) =>
      frame.toField(
        pointOnTree(treeStateAt(show.schedule, atMs), spot.group, spot.attach),
      ),
    swingAt: (atMs) => swingAt(show.schedule, spot, order, atMs),
  });
}
