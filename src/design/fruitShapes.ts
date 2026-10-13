// 열매 몸통을 이루는 면들과, 면마다 빛을 얼마나 받는지, 그림자가 어디에 지는지를 계산한다.
// React·Expo 의존성이 없어서 node 테스트가 가능하다. 좌표는 40x40 칸 기준이다.
import type { FruitShape } from "../theme";

export interface Point {
  x: number;
  y: number;
}

// 화면 기준으로 x는 오른쪽, y는 아래, z는 보는 사람 쪽이다.
export interface Direction {
  x: number;
  y: number;
  z: number;
}

export interface Facet {
  corners: Point[];
  // 면이 바라보는 방향
  facing: Direction;
}

export interface FruitGeometry {
  facets: Facet[];
  // 몸통 바깥 윤곽
  outline: Point[];
  // 땅에 지는 그림자. 열매가 땅에 닿은 곳에서 시작해 빛 반대쪽(오른쪽 뒤)으로 눕는다.
  shadow: Point[];
  // 꼭지가 몸통에서 시작되는 높이
  stemBase: number;
}

// 모든 열매의 바닥이 닿는 땅의 높이
export const GROUND_LINE = 36;

// 그림자 그림이 차지하는 영역. 오른쪽 뒤로 눕는 그림자가 다 들어가도록 넓게 잡는다.
export const SHADOW_BOX = { left: 0, top: 16, width: 46, height: 20 };

function normalize(direction: Direction): Direction {
  const length = Math.hypot(direction.x, direction.y, direction.z);
  return {
    x: direction.x / length,
    y: direction.y / length,
    z: direction.z / length,
  };
}

// 빛은 왼쪽 위 앞쪽에서 온다.
const LIGHT = normalize({ x: -0.35, y: -0.8, z: 0.49 });

// 면이 빛과 얼마나 마주하는지(-1~1). 클수록 밝다.
export function brightnessOf(facing: Direction) {
  const unit = normalize(facing);
  return unit.x * LIGHT.x + unit.y * LIGHT.y + unit.z * LIGHT.z;
}

// 이 그림은 비스듬히 내려다본 모습이라, 땅 위에서 앞뒤로 움직인 거리와 높이가 화면에서는 줄어 보인다.
// (정육면체 모서리 비율에서 잰 값: 앞뒤 1은 화면 위아래 0.55, 높이 1은 화면 0.82)
const DEPTH_ON_SCREEN = 0.55;
const HEIGHT_ON_SCREEN = 0.82;

// 그림자는 빛과 반대쪽으로 눕는다. 빛이 왼쪽 위 앞쪽에서 오므로 오른쪽 뒤(화면 위쪽)로 진다.
// 면의 밝기와 같은 빛(LIGHT)에서 계산해, 명암과 그림자 방향이 늘 맞는다.
// 값은 화면에서 높이 1만큼 떠 있는 점의 그림자가 옮겨지는 거리다.
const SHADOW_SLANT = {
  x: -LIGHT.x / -LIGHT.y / HEIGHT_ON_SCREEN,
  y: ((LIGHT.z / -LIGHT.y) * DEPTH_ON_SCREEN) / HEIGHT_ON_SCREEN,
};

// 땅 위의 점(ground)에서 height만큼 떠 있는 점의 그림자 자리
function shadowOf(ground: Point, height: number): Point {
  return {
    x: ground.x + SHADOW_SLANT.x * height,
    y: ground.y - SHADOW_SLANT.y * height,
  };
}

// 공·별사탕처럼 정면을 보는 몸통은, 윤곽의 각 점이 바로 아래 땅에서 그만큼 떠 있다고 본다.
function frontFacingShadow(outline: Point[]) {
  return outline.map((point) =>
    shadowOf({ x: point.x, y: GROUND_LINE }, GROUND_LINE - point.y),
  );
}

// 점들을 모두 감싸는 가장 작은 볼록 다각형(시계 방향)
function convexHull(points: Point[]): Point[] {
  const sorted = [...points].sort((first, second) =>
    first.x === second.x ? first.y - second.y : first.x - second.x,
  );
  const turn = (origin: Point, first: Point, second: Point) =>
    (first.x - origin.x) * (second.y - origin.y) -
    (first.y - origin.y) * (second.x - origin.x);
  const half = (ordered: Point[]) => {
    const chain: Point[] = [];
    for (const point of ordered) {
      while (
        chain.length >= 2 &&
        turn(chain[chain.length - 2], chain[chain.length - 1], point) <= 0
      )
        chain.pop();
      chain.push(point);
    }
    chain.pop();
    return chain;
  };
  return [...half(sorted), ...half([...sorted].reverse())];
}

function pointAt(center: Point, angleDegrees: number, radius: number): Point {
  const radians = (angleDegrees * Math.PI) / 180;
  return {
    x: center.x + Math.cos(radians) * radius,
    y: center.y + Math.sin(radians) * radius,
  };
}

function centroid(corners: Point[]): Point {
  const sum = corners.reduce(
    (total, corner) => ({ x: total.x + corner.x, y: total.y + corner.y }),
    { x: 0, y: 0 },
  );
  return { x: sum.x / corners.length, y: sum.y / corners.length };
}

// 로우폴리 공. 바깥 열 개, 안쪽 다섯 개 꼭짓점을 이어 스무 개의 삼각형 면으로 나눈다.
// 공의 면은 중심에서 멀수록 옆을 향하므로, 면의 가운데 위치로 바라보는 방향을 정한다.
function sphere(): FruitGeometry {
  const center = { x: 20, y: 23 };
  const radius = GROUND_LINE - center.y;
  const innerRadius = 6.8;
  const outer = (angle: number) => pointAt(center, angle, radius);
  const triangles: Point[][] = [];
  for (let index = 0; index < 5; index++) {
    const angle = -72 + index * 72;
    const inner = pointAt(center, angle, innerRadius);
    const nextInner = pointAt(center, angle + 72, innerRadius);
    triangles.push(
      [center, inner, nextInner],
      [inner, outer(angle - 18), outer(angle + 18)],
      [inner, outer(angle + 18), outer(angle + 54)],
      [inner, outer(angle + 54), nextInner],
    );
  }
  const facets = triangles.map((corners) => {
    const middle = centroid(corners);
    const sideX = (middle.x - center.x) / radius;
    const sideY = (middle.y - center.y) / radius;
    const front = Math.sqrt(Math.max(0.05, 1 - sideX * sideX - sideY * sideY));
    return { corners, facing: { x: sideX, y: sideY, z: front } };
  });
  const outline = Array.from({ length: 10 }, (_, index) =>
    outer(-90 + index * 36),
  );
  return {
    facets,
    outline,
    shadow: frontFacingShadow(outline),
    stemBase: 10.4,
  };
}

// 위에서 비스듬히 내려다본 정육면체. 윗면·왼쪽 면·오른쪽 면이 보인다.
function cube(): FruitGeometry {
  const top = { x: 20, y: 10 };
  const left = { x: 8.5, y: 16.3 };
  const right = { x: 31.5, y: 16.3 };
  const middle = { x: 20, y: 22.6 };
  const bottomLeft = { x: 8.5, y: 29.7 };
  const bottomRight = { x: 31.5, y: 29.7 };
  const bottom = { x: 20, y: GROUND_LINE };
  // 땅에 닿은 바닥 마름모(앞·오른쪽·뒤·왼쪽 모서리)와 정육면체의 높이
  const height = bottom.y - middle.y;
  const footprint = [
    bottom,
    bottomRight,
    { x: 20, y: top.y + height },
    bottomLeft,
  ];
  return {
    facets: [
      { corners: [top, right, middle, left], facing: { x: 0, y: -1, z: 0.2 } },
      {
        corners: [left, middle, bottom, bottomLeft],
        facing: { x: -1, y: 0, z: 1 },
      },
      {
        corners: [middle, right, bottomRight, bottom],
        facing: { x: 1, y: 0, z: 1 },
      },
    ],
    outline: [top, right, bottomRight, bottom, bottomLeft, left],
    shadow: convexHull([
      ...footprint,
      ...footprint.map((corner) => shadowOf(corner, height)),
    ]),
    // 꼭지는 윗면 한가운데에 꽂혀 있다.
    stemBase: centroid([top, right, middle, left]).y,
  };
}

// 비스듬히 본 피라미드. 왼쪽 면과 오른쪽 면이 보인다.
function pyramid(): FruitGeometry {
  const apex = { x: 20, y: 8.2 };
  const baseLeft = { x: 6.5, y: 31 };
  const baseFront = { x: 23.5, y: GROUND_LINE };
  const baseRight = { x: 33.5, y: 29.5 };
  // 보이지 않는 뒤쪽 모서리까지 넣은 바닥 사각형과, 그 한가운데에서 꼭짓점까지의 높이
  const baseBack = {
    x: baseLeft.x + baseRight.x - baseFront.x,
    y: baseLeft.y + baseRight.y - baseFront.y,
  };
  const base = [baseFront, baseRight, baseBack, baseLeft];
  const baseCenter = centroid(base);
  return {
    facets: [
      {
        corners: [apex, baseLeft, baseFront],
        facing: { x: -0.75, y: -0.3, z: 0.6 },
      },
      {
        corners: [apex, baseFront, baseRight],
        facing: { x: 0.75, y: -0.3, z: 0.6 },
      },
    ],
    outline: [apex, baseRight, baseFront, baseLeft],
    shadow: convexHull([...base, shadowOf(baseCenter, baseCenter.y - apex.y)]),
    stemBase: 8.8,
  };
}

// 건빵에 든 별사탕처럼 동그란 몸통 둘레에 뾰족한 돌기가 여덟 개 뻗은 사탕.
// 돌기마다 가운데 능선을 사이에 두고 두 면으로 나뉘어, 한쪽은 밝고 한쪽은 어둡다.
const STAR_CANDY_SPIKES = 8;

function starCandy(): FruitGeometry {
  const tipRadius = 13;
  const valleyRadius = 8.2;
  const bodyRadius = 6.8;
  const center = { x: 20, y: GROUND_LINE - tipRadius };
  const halfStep = 180 / STAR_CANDY_SPIKES;
  const facets: Facet[] = [];
  const outline: Point[] = [];
  for (let index = 0; index < STAR_CANDY_SPIKES; index++) {
    const tipAngle = -90 + index * 2 * halfStep;
    const tip = pointAt(center, tipAngle, tipRadius);
    const valleyBefore = pointAt(center, tipAngle - halfStep, valleyRadius);
    const valleyAfter = pointAt(center, tipAngle + halfStep, valleyRadius);
    const outward = pointAt({ x: 0, y: 0 }, tipAngle, 1);
    const towardBefore = pointAt({ x: 0, y: 0 }, tipAngle - 90, 1);
    const towardAfter = pointAt({ x: 0, y: 0 }, tipAngle + 90, 1);
    facets.push(
      {
        corners: [center, valleyBefore, tip],
        facing: {
          x: 0.3 * outward.x + 0.6 * towardBefore.x,
          y: 0.3 * outward.y + 0.6 * towardBefore.y,
          z: 0.74,
        },
      },
      {
        corners: [center, tip, valleyAfter],
        facing: {
          x: 0.3 * outward.x + 0.6 * towardAfter.x,
          y: 0.3 * outward.y + 0.6 * towardAfter.y,
          z: 0.74,
        },
      },
    );
    outline.push(valleyBefore, tip);
  }
  // 가운데는 빛 쪽을 살짝 바라보는 동그란 몸통으로 덮어, 돌기가 몸통 둘레에만 보이게 한다.
  facets.push({
    corners: Array.from({ length: 16 }, (_, index) =>
      pointAt(center, index * 22.5, bodyRadius),
    ),
    facing: { x: -0.2, y: -0.3, z: 1 },
  });
  return {
    facets,
    outline,
    shadow: frontFacingShadow(outline),
    stemBase: center.y - tipRadius + 0.8,
  };
}

// 모양은 바뀌지 않으므로 한 번만 계산해 둔다.
export const fruitGeometries: Record<FruitShape, FruitGeometry> = {
  sphere: sphere(),
  cube: cube(),
  pyramid: pyramid(),
  star: starCandy(),
};
