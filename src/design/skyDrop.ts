import {
  toScreen,
  toWorld,
  type FlightStyle,
  type GroundView,
  type RollAway,
  type ScreenPoint,
} from "./fruitFlight";

// 홈 열매가 하늘에서 떨어져 땅에 부딪힌 뒤 어떻게 될지 정한다. 진짜 열매처럼 떨어질 때마다 다르다.
// thud: 털썩 떨어져 거의 그 자리에 선다.
// roll: 부딪힌 힘으로 멀리 굴러간다. 모난 열매는 구르지 못하고 미끄러진다.
// hop: 크게 튀어 올라 옆으로 날아가, 처음 닿은 곳과 다른 자리에 내려앉는다.
// 멈출 자리는 미리 정해 두지 않고, 처음 닿은 곳에서 이렇게 움직인 결과로 정해진다.
export type Bounce = "thud" | "roll" | "hop";

const common = {
  gravity: 3000,
  squash: 0.16,
  squashFadeSeconds: 0.08,
  stretch: 0.08,
};

// kick이 클수록 떨어지는 동안은 거의 곧게 내려오다가, 부딪히는 순간 옆으로 세게 튄다.
const ballStyles: Record<Bounce, FlightStyle> = {
  thud: {
    ...common,
    restitution: 0.2,
    maxBounces: 2,
    kick: 2.5,
    settleSeconds: 0.25,
    tumbleDegrees: 0,
  },
  roll: {
    ...common,
    restitution: 0.3,
    maxBounces: 3,
    kick: 6,
    settleSeconds: 1,
    tumbleDegrees: 0,
  },
  hop: {
    ...common,
    restitution: 0.46,
    maxBounces: 3,
    kick: 9,
    settleSeconds: 0.45,
    tumbleDegrees: 0,
  },
};

// 모난 열매는 공중에서 기우뚱하고, 땅에 닿으면 금방 멈춘다.
const blockStyles: Record<Bounce, FlightStyle> = {
  thud: { ...ballStyles.thud, tumbleDegrees: 14 },
  roll: {
    ...ballStyles.roll,
    restitution: 0.25,
    kick: 5,
    settleSeconds: 0.45,
    tumbleDegrees: 20,
  },
  hop: {
    ...ballStyles.hop,
    restitution: 0.42,
    settleSeconds: 0.25,
    tumbleDegrees: 28,
  },
};

export function flightStyleFor(bounce: Bounce, rollsLikeBall: boolean) {
  return (rollsLikeBall ? ballStyles : blockStyles)[bounce];
}

interface BounceChance {
  bounce: Bounce;
  chance: number;
  // 처음 닿은 곳에서 멈출 때까지 가는 거리의 범위(원근 배율 1의 화면 픽셀)
  reach: [number, number];
}

const ballChances: BounceChance[] = [
  { bounce: "thud", chance: 0.2, reach: [4, 14] },
  { bounce: "roll", chance: 0.5, reach: [70, 140] },
  { bounce: "hop", chance: 0.3, reach: [60, 120] },
];
const blockChances: BounceChance[] = [
  { bounce: "thud", chance: 0.35, reach: [4, 12] },
  { bounce: "roll", chance: 0.25, reach: [24, 48] },
  { bounce: "hop", chance: 0.4, reach: [50, 100] },
];

// 옆으로 가는 쪽에서 앞뒤로 비스듬해질 수 있는 가장 큰 각도(라디안, 약 50°)
const MAX_SLANT = 0.9;
// 열매 무리 바깥쪽으로 튈 확률. 무리가 한가운데로 뭉치지 않고 조금씩 퍼진다.
const OUTWARD_CHANCE = 0.65;
// 처음 땅에 닿는 자리를 정해 둔 자리에서 흩뜨리는 정도(원근 배율 1의 화면 픽셀)
const LANDING_JITTER = { x: 18, y: 10 };
// 멈춘 열매끼리 띄우는 거리(열매 크기에 대한 비율). 화면에서 앞뒤는 좁아 보이므로 더 넓게 친다.
const SPACING = 0.9;
const DEPTH_SPACING = 1.4;
// 가려던 자리가 막혔을 때 덜 가 보는 비율들. 먼저 멈춘 열매에 부딪혀 멈춘 셈이다.
const SHORTER = [1, 0.6, 0.3];

export interface DropGround {
  view: GroundView;
  // 열매가 멈출 수 있는 땅의 화면 범위
  bounds: { left: number; right: number; top: number; bottom: number };
  // 원근 배율 1인 곳의 열매 크기
  fruitSize: number;
  // 그림 좌표계를 화면에 맞춰 늘리고 줄인 비율. 가는 거리에 곱한다.
  scale: number;
}

export interface DropFruit {
  id: number;
  rollsLikeBall: boolean;
  // 처음 땅에 닿을 자리. 여기서 조금 흩뜨린다.
  landing: ScreenPoint;
}

export interface DropPlan {
  bounce: Bounce;
  // 멈출 자리(열매 바닥)와 그곳의 원근 배율
  rest: ScreenPoint & { depth: number };
  // 처음 닿은 곳에서 멈출 자리까지 간 거리(땅 위 세상 기준)
  rollAway: RollAway;
}

// 0 이상 1 미만의 고른 수를 차례로 내는 작은 난수기(mulberry32). 같은 씨앗이면 늘 같은 수가 나온다.
function randomFrom(seed: number) {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let mixed = state;
    mixed = Math.imul(mixed ^ (mixed >>> 15), mixed | 1);
    mixed ^= mixed + Math.imul(mixed ^ (mixed >>> 7), mixed | 61);
    return ((mixed ^ (mixed >>> 14)) >>> 0) / 4294967296;
  };
}

function pickBounce(chances: BounceChance[], roll: number) {
  let total = 0;
  for (const chance of chances) {
    total += chance.chance;
    if (roll < total) return chance;
  }
  return chances[chances.length - 1];
}

// 열매마다 땅에 부딪힌 뒤 어떻게 될지 정하고, 그렇게 움직인 결과로 멈출 자리를 구한다.
// 같은 씨앗이면 늘 같은 결과라서, 화면 크기가 바뀌어 다시 계산해도 열매가 다른 데로 옮겨 가지 않는다.
// 가려던 자리가 땅 밖이거나 먼저 멈춘 열매와 겹치면, 그 열매에 부딪혀 덜 가거나 반대쪽으로 튄 것으로 본다.
export function planDrops(
  ground: DropGround,
  fruits: DropFruit[],
  seed: number,
): DropPlan[] {
  const { view, bounds, fruitSize, scale } = ground;
  const centerX = (bounds.left + bounds.right) / 2;
  const placed: DropPlan[] = [];

  const clampX = (x: number) =>
    Math.min(bounds.right, Math.max(bounds.left, x));
  const clampY = (y: number) =>
    Math.min(bounds.bottom, Math.max(bounds.top, y));
  const fits = (point: ScreenPoint & { depth: number }) =>
    point.x >= bounds.left &&
    point.x <= bounds.right &&
    point.y >= bounds.top &&
    point.y <= bounds.bottom &&
    placed.every(({ rest }) => {
      const gap = SPACING * fruitSize * ((rest.depth + point.depth) / 2);
      return (
        Math.hypot(rest.x - point.x, (rest.y - point.y) * DEPTH_SPACING) >= gap
      );
    });

  return fruits.map((fruit) => {
    const random = randomFrom(seed ^ Math.imul(fruit.id, 0x9e3779b1));
    const chance = pickBounce(
      fruit.rollsLikeBall ? ballChances : blockChances,
      random(),
    );
    const [shortest, longest] = chance.reach;
    const reach = (shortest + random() * (longest - shortest)) * scale;
    // 한가운데 자리는 바깥쪽이 따로 없으므로 왼쪽·오른쪽을 반반으로 고른다.
    const away =
      fruit.landing.x === centerX
        ? random() < 0.5
          ? -1
          : 1
        : Math.sign(fruit.landing.x - centerX);
    const side = random() < OUTWARD_CHANCE ? away : -away;
    const slant = (random() * 2 - 1) * MAX_SLANT;
    const landing = toWorld(view, {
      x: clampX(
        fruit.landing.x + (random() * 2 - 1) * LANDING_JITTER.x * scale,
      ),
      y: clampY(
        fruit.landing.y + (random() * 2 - 1) * LANDING_JITTER.y * scale,
      ),
    });

    const restAfter = (rollAway: RollAway) =>
      toScreen(view, {
        side: landing.side + rollAway.side,
        distance: landing.distance - rollAway.toward,
        height: 0,
      });
    const plan = (rollAway: RollAway): DropPlan => ({
      bounce: chance.bounce,
      rest: restAfter(rollAway),
      rollAway,
    });

    // 가려던 쪽, 반대쪽 순서로 조금씩 덜 가 본다.
    for (const direction of [side, -side]) {
      for (const share of SHORTER) {
        const rollAway = {
          side: direction * reach * share * Math.cos(slant),
          toward: reach * share * Math.sin(slant),
        };
        if (fits(restAfter(rollAway))) {
          const found = plan(rollAway);
          placed.push(found);
          return found;
        }
      }
    }
    // 그래도 막히면 처음 닿은 곳 둘레에서 비어 있는 가장 가까운 자리로 튕겨 나간 것으로 본다.
    for (let ring = 1; ring <= 4; ring++) {
      for (let step = 0; step < 12; step++) {
        const angle = (Math.PI * 2 * step) / 12;
        const distance = ring * SPACING * fruitSize * 0.6;
        const rollAway = {
          side: distance * Math.cos(angle),
          toward: distance * Math.sin(angle),
        };
        if (fits(restAfter(rollAway))) {
          const found = plan(rollAway);
          placed.push(found);
          return found;
        }
      }
    }
    const fallback = plan({ side: 0, toward: 0 });
    placed.push(fallback);
    return fallback;
  });
}
