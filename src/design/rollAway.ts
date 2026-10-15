import {
  BALL_RADIUS_RATIO,
  toScreen,
  toWorld,
  type GroundView,
  type ScreenPoint,
} from "./fruitFlight";

// 새로고침하면 땅에 있던 열매가 밀린 듯 점점 빨라지며 사방으로 굴러 나간다(사용자 요청).
// 열매 밭 가운데에서 바깥쪽으로, 열매마다 방향을 조금씩 흩뜨려 땅 위를 구른다. 열매 밭은 가로로 넓고 앞뒤로 얕아서
// 가운데에서 잰 방향 그대로면 거의 옆으로만 가므로, 땅을 동그랗게 펴서 방향을 정한다(앞줄은 앞으로, 뒷줄은 뒤로).
// 원근을 따라 앞으로 오면 커지고 뒤로 가면 작아지며, 옆이나 앞으로 간 열매는 화면 밖으로 나가고
// 뒤로 간 열매는 멀어지며 흐려진다.
// 구는 몸통 명암은 그대로 두고 꼭지만 굴러간 만큼 돌리고, 모난 열매는 가는 쪽으로 기우뚱하며 작게 깡총 나간다.
// 제자리에서 통통 튀지 않는다. React·Expo 의존성이 없어서 node 테스트가 가능하다.

const SAMPLE_MS = 1000 / 30;
// 처음 빠르기(px/ms)와 점점 빨라지는 정도(px/ms²). 너비 390 화면의 땅 위 거리 기준이다.
const START_SPEED = 0.06;
const SPEED_UP = 0.00045;
// 뒤로 가면 원근 때문에 화면에서 느려 보이므로 그만큼 더 세게 민다.
const BACKWARD_BOOST = 1.2;
// 모난 열매가 깡총 나갈 때 한 번 뛰는 시간과 높이(px), 놓여 있던 기울기에서 가는 쪽으로 기우뚱하기까지의 시간
const HOP_MS = 190;
const HOP_HEIGHT = 4.5;
const LEAN_IN_MS = 120;
// 뒤로 간 열매는 처음보다 이만큼 작아지기 시작하면 흐려져, 이만큼 작아지면 사라진다.
const FADE_FROM_NEARNESS = 0.85;
const GONE_AT_NEARNESS = 0.55;
// 열매마다 바깥쪽에서 흩뜨리는 최대 각도
const SPREAD_DEGREES = 25;
// 앞뒤로 구르는 몫을 이만큼 키운다. 원근 때문에 앞뒤 움직임은 화면에서 짧게 보여, 그대로면 옆으로만 흩어져 보인다.
const DEPTH_EMPHASIS = 1.8;
// 앞으로 굴러와 이만큼 커지면 다 나간 것으로 본다.
const NEAREST = 3;
// 오래 걸려도 이 시간 안에는 끝낸다(ms).
const LONGEST_MS = 2500;
// 바깥쪽 열매부터 차례로 굴러 나가며, 가운데 열매는 이만큼 늦게 출발한다.
export const ROLL_AWAY_STAGGER_MS = 200;

export interface RollAwayInput {
  // 땅에 놓인 자리(열매 바닥 가운데, 열매 밭 px)와 원근 배율
  rest: { x: number; y: number; depth: number };
  view: GroundView;
  // 열매가 놓이는 땅의 범위(열매 밭 px). 이 가운데에서 바깥쪽으로 굴러 나간다.
  area: { left: number; right: number; top: number; bottom: number };
  // 놓인 자리에서의 열매 그림 크기(px)
  size: number;
  rollsLikeBall: boolean;
  // 굴러가기 전 이미 기울어 있던 각도(도)
  startAngle: number;
  // 화면 크기 배율(너비 390 화면에 대한 비율)
  scale: number;
  // 열매가 이 선을 넘으면 화면 밖이다(열매 밭 px).
  edges: { left: number; right: number; bottom: number };
  // 바깥쪽 방향을 흩뜨리는 정도(-1~1). 열매마다 다르게 준다.
  spread: number;
}

export interface RollAway {
  durationMs: number;
  // 아래 값들이 해당하는 시각(ms)
  times: number[];
  // 놓인 자리에서 열매 바닥이 떨어진 화면 거리. 깡총 뛴 높이도 들어 있다.
  offsetX: number[];
  offsetY: number[];
  // 땅에 닿은 점(그림자 자리)이 놓인 자리에서 떨어진 세로 거리
  groundOffsetY: number[];
  // 놓인 자리의 원근 배율에 대한 지금 원근 배율
  nearness: number[];
  angle: number[];
  opacity: number[];
}

const clamp01 = (value: number) => Math.min(1, Math.max(0, value));

// 땅 위에서 바깥쪽으로 가는 방향(좌우 side, 앞뒤 distance의 단위 벡터). 뒤가 +distance다.
// 땅의 좌우 반폭과 앞뒤 반폭으로 나눠 동그랗게 편 자리에서 바깥쪽을 잰다.
function outwardDirection(input: RollAwayInput) {
  const { view, area } = input;
  const middle: ScreenPoint = {
    x: (area.left + area.right) / 2,
    y: (area.top + area.bottom) / 2,
  };
  const center = toWorld(view, middle);
  const sideHalf = Math.abs(
    toWorld(view, { x: area.right, y: middle.y }).side - center.side,
  );
  const distanceHalf = Math.abs(
    toWorld(view, { x: middle.x, y: area.top }).distance - center.distance,
  );
  const rest = toWorld(view, input.rest);
  let side = (rest.side - center.side) / (sideHalf || 1);
  let distance =
    ((rest.distance - center.distance) / (distanceHalf || 1)) * DEPTH_EMPHASIS;
  const length = Math.hypot(side, distance);
  // 한가운데에 놓인 열매는 흩뜨리는 값으로 방향을 정한다.
  if (length < 0.15) {
    side = Math.cos(Math.PI * input.spread);
    distance = Math.sin(Math.PI * input.spread);
  } else {
    side /= length;
    distance /= length;
  }
  const turn = (SPREAD_DEGREES * input.spread * Math.PI) / 180;
  return {
    side: side * Math.cos(turn) - distance * Math.sin(turn),
    distance: side * Math.sin(turn) + distance * Math.cos(turn),
  };
}

export function planRollAway(input: RollAwayInput): RollAway {
  const { view, rest, scale } = input;
  const restWorld = toWorld(view, rest);
  const direction = outwardDirection(input);
  const goingBack = Math.max(0, direction.distance);
  const push = scale * (1 + BACKWARD_BOOST * goingBack);
  const traveledAt = (elapsed: number) =>
    push * (START_SPEED * elapsed + SPEED_UP * elapsed * elapsed);
  const ballRadius = input.size * BALL_RADIUS_RATIO;

  const path: RollAway = {
    durationMs: 0,
    times: [],
    offsetX: [],
    offsetY: [],
    groundOffsetY: [],
    nearness: [],
    angle: [],
    opacity: [],
  };
  for (let elapsed = 0; ; elapsed = Math.min(elapsed + SAMPLE_MS, LONGEST_MS)) {
    const traveled = traveledAt(elapsed);
    const ground = toScreen(view, {
      side: restWorld.side + direction.side * traveled,
      distance: restWorld.distance + direction.distance * traveled,
      height: 0,
    });
    const nearness = ground.depth / rest.depth;
    const fade =
      goingBack > 0
        ? clamp01(
            (nearness - GONE_AT_NEARNESS) /
              (FADE_FROM_NEARNESS - GONE_AT_NEARNESS),
          )
        : 1;
    let lift = 0;
    let angle: number;
    if (input.rollsLikeBall) {
      // 옆으로 구른 만큼 꼭지가 돈다. 오른쪽으로 가면 시계 방향이다.
      angle =
        input.startAngle +
        (traveled / ballRadius) * (180 / Math.PI) * direction.side;
    } else {
      const hop = Math.abs(Math.sin((Math.PI * elapsed) / HOP_MS));
      lift = HOP_HEIGHT * scale * nearness * hop;
      // 놓여 있던 기울기에서 이어서 가는 쪽으로 기우뚱한다.
      const lean = (5 + 15 * hop) * direction.side;
      const leaning = Math.min(1, elapsed / LEAN_IN_MS);
      angle = input.startAngle + (lean - input.startAngle) * leaning;
    }
    path.times.push(elapsed);
    path.offsetX.push(ground.x - rest.x);
    path.offsetY.push(ground.y - lift - rest.y);
    path.groundOffsetY.push(ground.y - rest.y);
    path.nearness.push(nearness);
    path.angle.push(angle);
    path.opacity.push(fade);

    const halfWidth = (input.size * nearness) / 2;
    // 앞으로 굴러온 열매가 화면 아래로 나가기 전에 눈앞까지 커지면 그때 끝낸다.
    const gone =
      fade <= 0 ||
      nearness > NEAREST ||
      ground.x + halfWidth < input.edges.left ||
      ground.x - halfWidth > input.edges.right ||
      ground.y - input.size * nearness > input.edges.bottom;
    // 보간하려면 점이 둘 이상 있어야 하므로 첫 점에서는 끝내지 않는다.
    if (elapsed > 0 && (gone || elapsed >= LONGEST_MS)) {
      path.durationMs = elapsed;
      break;
    }
  }
  return path;
}

// 바깥쪽 열매부터 차례로 굴러 나가도록 출발을 늦추는 시간. 가운데에서 가장 먼 열매가 먼저 나간다.
export function rollAwayDelayOf(distanceFromCenter: number, farthest: number) {
  if (farthest <= 0) return 0;
  return Math.round(
    ROLL_AWAY_STAGGER_MS * (1 - clamp01(distanceFromCenter / farthest)),
  );
}
