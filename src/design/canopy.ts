import type { Point } from "./fruitShapes";

// 홈 위쪽에 머무는 나무. 새로고침하면 이 나무가 툭 떨어져 쿵 하고 내려오고, 가지 위 캐릭터들이 방방 뛰어
// 매달린 열매를 떨어뜨린다(사용자가 고른 시안 B, reference/sian/tree-refresh).
// 로그인 나무(HomeTree)와 같은 그림체로 테두리 없는 둥근 잎을 세 가지 초록으로 칠하고,
// 화면 가장자리에서 들어오는 굵은 큰 가지가 잎 앞을 가로지른다. 잎은 가지에 붙어 가지와 함께 흔들린다.
// 좌표는 너비 390인 휴대폰에서 나무가 다 내려와 쉴 때의 화면 좌표(화면 맨 위가 0)이고, 그리는 쪽이 화면 너비에 맞춰 늘리고 줄인다.

export const CANOPY_WIDTH = 390;
// 나무 그림이 내려오는 높이. 왼쪽 큰 가지 밑동과 그 아래 잔가지 잎까지 들어간다.
export const CANOPY_HEIGHT = 200;

export type LeafTone = "light" | "base" | "deep";
// 가지 묶음은 그 가지에 선 캐릭터 이름으로 부른다. 캐릭터가 뛰면 자기 가지 묶음이 가장 크게 휜다.
export type BranchGroup = "circle" | "triangle" | "square";
export const branchGroupNames: BranchGroup[] = ["circle", "triangle", "square"];

export interface LeafCircle {
  x: number;
  y: number;
  r: number;
  tone: LeafTone;
}

// 잎 층. owner가 가지 묶음이면 그 가지와 같은 축·각도로 돌고, root면 나무 전체와만 움직인다.
export interface FoliageLayer {
  owner: BranchGroup | "root";
  circles: LeafCircle[];
  // 이 층을 그리는 칸(나무 좌표)
  bounds: Bounds;
}

// 그림이 차지하는 칸(나무 좌표)
export interface Bounds {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

// 잎은 그리는 순서대로 층을 이룬다. 맨 뒤 바탕 잎이 위쪽을 넉넉히 덮어, 가지에 붙은 잎이 흔들려 틈이 벌어져도
// 흰 바탕이 비치지 않는다. 이웃한 뭉텅이는 색을 달리해 경계가 드러난다.
const foliageSpecs: Omit<FoliageLayer, "bounds">[] = [
  {
    owner: "root",
    circles: [
      { x: 60, y: -20, r: 90, tone: "base" },
      { x: 195, y: -40, r: 110, tone: "base" },
      { x: 330, y: -20, r: 90, tone: "base" },
    ],
  },
  // 세모가 선 갈래 아래로 늘어진 짙은 잎
  {
    owner: "triangle",
    circles: [
      { x: 178, y: 104, r: 60, tone: "deep" },
      { x: 234, y: 106, r: 44, tone: "deep" },
      { x: 132, y: 120, r: 36, tone: "deep" },
    ],
  },
  // 다이내믹 아일랜드 아래의 밝은 뭉텅이
  { owner: "root", circles: [{ x: 232, y: -2, r: 64, tone: "light" }] },
  // 왼쪽 큰 잎과, 동그라미 가지 뒤로 조금 늘어진 잎
  {
    owner: "circle",
    circles: [
      { x: 60, y: 40, r: 76, tone: "base" },
      { x: 8, y: 60, r: 50, tone: "base" },
      { x: 128, y: 40, r: 56, tone: "base" },
      { x: 40, y: 96, r: 28, tone: "base" },
      { x: 84, y: 92, r: 26, tone: "base" },
      { x: 112, y: 80, r: 20, tone: "base" },
    ],
  },
  // 왼쪽 위 모서리의 밝은 뭉텅이
  { owner: "root", circles: [{ x: 44, y: -40, r: 78, tone: "light" }] },
  // 오른쪽 큰 잎과, 섬 아래에서 오른쪽 큰 가지까지 이어진 잎
  {
    owner: "square",
    circles: [
      { x: 330, y: 30, r: 76, tone: "base" },
      { x: 392, y: 40, r: 50, tone: "base" },
      { x: 282, y: 50, r: 40, tone: "base" },
      { x: 236, y: 70, r: 34, tone: "base" },
      { x: 268, y: 74, r: 30, tone: "base" },
    ],
  },
];

// ---------- 가지 ----------

// 잎 하나. 열매 꼭지 잎과 같은 모양(양쪽이 똑같이 부푼 뾰족한 잎)이다.
interface LeafSpec {
  // 잔가지 위 자리(0 밑동 ~ 1 끝)
  at: number;
  length: number;
  // 잔가지가 뻗은 방향에서 돌린 각도(도, 화면에서 시계 방향이 +)
  turn: number;
  tone?: LeafTone;
}

// 큰 가지에서 갈라지는 잔가지. along은 큰 가지 밑동(0)에서 끝(1)까지의 자리, shape는 그 자리에서 잰 모양이다.
interface TwigSpec {
  along: number;
  shape: Point[];
  width: number;
  leaves: LeafSpec[];
}

// 큰 가지 윗면에 바로 돋은 잎. angle은 화면 기준 방향(도, 오른쪽 0·위 -90)이다.
interface SproutSpec {
  along: number;
  length: number;
  angle: number;
  tone?: LeafTone;
}

interface BranchSpec {
  group: BranchGroup;
  // 밑동부터 끝까지
  points: Point[];
  baseWidth: number;
  tipWidth: number;
  twigs: TwigSpec[];
  sprouts: SproutSpec[];
}

// 사용자가 그려 준 굵은 가지를 옮긴 것. 같은 묶음 안에서는 먼저 적은 가지가 뒤에 그려진다.
// 캐릭터가 선 자리 바로 위로는 잔가지·잎을 내지 않아 발과 몸이 가리지 않는다.
const branchSpecs: Record<string, BranchSpec> = {
  // 왼쪽 아래 모서리에서 들어와 가운데 왼쪽으로 솟는 큰 가지
  leftBough: {
    group: "triangle",
    points: [
      { x: -14, y: 174 },
      { x: 4, y: 166 },
      { x: 38, y: 158 },
      { x: 75, y: 145 },
      { x: 104, y: 130 },
      { x: 123, y: 112 },
      { x: 133, y: 96 },
      { x: 140, y: 84 },
    ],
    baseWidth: 17,
    tipWidth: 4.5,
    twigs: [
      {
        along: 0.28,
        shape: [
          { x: 0, y: 0 },
          { x: -4, y: 10 },
          { x: -12, y: 17 },
        ],
        width: 3.4,
        leaves: [
          { at: 1, length: 8, turn: 10 },
          { at: 0.55, length: 6, turn: -60, tone: "deep" },
        ],
      },
      {
        along: 0.5,
        shape: [
          { x: 0, y: 0 },
          { x: -6, y: -10 },
          { x: -4, y: -20 },
        ],
        width: 3.2,
        leaves: [
          { at: 1, length: 8, turn: -10 },
          { at: 0.5, length: 6, turn: 60 },
        ],
      },
    ],
    sprouts: [{ along: 0.92, length: 7, angle: -60, tone: "light" }],
  },
  // 큰 가지에서 오른쪽으로 갈라져 나온 가지. 세모가 선다.
  triangleFork: {
    group: "triangle",
    points: [
      { x: 100, y: 133 },
      { x: 121, y: 134 },
      { x: 142, y: 136 },
      { x: 166, y: 135 },
      { x: 188, y: 130 },
      { x: 210, y: 122 },
    ],
    baseWidth: 9,
    tipWidth: 3,
    twigs: [
      {
        along: 0.9,
        shape: [
          { x: 0, y: 0 },
          { x: 4, y: -9 },
          { x: 11, y: -14 },
        ],
        width: 2.6,
        leaves: [{ at: 1, length: 7, turn: -10, tone: "light" }],
      },
    ],
    sprouts: [],
  },
  // 왼쪽 끝에서 들어오는 가지. 동그라미가 서고, 끝은 위로 휘어 잎 속으로 들어간다.
  circleBranch: {
    group: "circle",
    points: [
      { x: -14, y: 114 },
      { x: 4, y: 111 },
      { x: 29, y: 111 },
      { x: 52, y: 104 },
      { x: 63, y: 92 },
      { x: 67, y: 80 },
    ],
    baseWidth: 12,
    tipWidth: 3.5,
    twigs: [],
    sprouts: [],
  },
  // 동그라미 가지에서 오른쪽 위로 갈라져 잎 속으로 뻗는 가지
  circleFork: {
    group: "circle",
    points: [
      { x: 50, y: 106 },
      { x: 76, y: 93 },
      { x: 98, y: 82 },
      { x: 122, y: 71 },
      { x: 142, y: 62 },
    ],
    baseWidth: 7.5,
    tipWidth: 2.8,
    twigs: [
      {
        along: 0.62,
        shape: [
          { x: 0, y: 0 },
          { x: 2, y: -9 },
          { x: 8, y: -14 },
        ],
        width: 2.4,
        leaves: [{ at: 1, length: 7, turn: -10, tone: "light" }],
      },
    ],
    sprouts: [],
  },
  // 오른쪽 끝에서 들어와 가운데로 뻗는 큰 가지. 네모가 선다. 끝은 가운데에서 비켜 x 250에서 멈춘다(사용자 요청).
  rightBough: {
    group: "square",
    points: [
      { x: 418, y: 131 },
      { x: 400, y: 127 },
      { x: 370, y: 121 },
      { x: 337, y: 109 },
      { x: 312, y: 97 },
      { x: 283, y: 84 },
      { x: 250, y: 76.6 },
    ],
    baseWidth: 17,
    tipWidth: 4,
    twigs: [
      {
        along: 0.3,
        shape: [
          { x: 0, y: 0 },
          { x: 3, y: 10 },
          { x: 10, y: 16 },
        ],
        width: 3.2,
        leaves: [
          { at: 1, length: 8, turn: 5 },
          { at: 0.5, length: 6, turn: -60, tone: "deep" },
        ],
      },
      {
        along: 0.7,
        shape: [
          { x: 0, y: 0 },
          { x: -4, y: -11 },
          { x: -11, y: -16 },
        ],
        width: 3.2,
        leaves: [
          { at: 1, length: 8, turn: -10 },
          { at: 0.55, length: 6, turn: -70, tone: "deep" },
        ],
      },
    ],
    sprouts: [{ along: 0.92, length: 7, angle: -110, tone: "light" }],
  },
};

// 가지 묶음이 휘는 축(밑동)과 끝이 아래로 처지는 회전 방향, 그리고 캐릭터가 뛸 때 함께 조금 흔들리는 이웃 묶음
export const branchGroups: Record<
  BranchGroup,
  { pivot: Point; dipSign: 1 | -1; neighbors: BranchGroup[] }
> = {
  circle: {
    pivot: branchSpecs.circleBranch.points[0],
    dipSign: 1,
    neighbors: ["triangle"],
  },
  triangle: {
    pivot: branchSpecs.leftBough.points[0],
    dipSign: 1,
    neighbors: ["circle"],
  },
  square: {
    pivot: branchSpecs.rightBough.points[0],
    dipSign: -1,
    neighbors: [],
  },
};

// 나무 전체가 기울 때의 축. 화면 위 바깥의 보이지 않는 줄기 자리다.
export const ROOT_PIVOT: Point = { x: CANOPY_WIDTH / 2, y: -260 };

// ---------- 그림 칸 ----------

// 화면 위 바깥이라 늘 보이지 않는 곳은 그리지 않는다. 나무가 쿵 내려앉으며 더 내려오고 기울어도
// 드러나지 않는 높이까지만 그린다. 층마다 그린 범위만큼만 칸을 잡아 그림이 차지하는 메모리를 줄인다.
const DRAWN_TOP = -30;
// 선 끝이 칸 가장자리에 잘리지 않게 두는 여유
const BOUNDS_PAD = 2;

function boundsOfPoints(points: Point[], pad = 0): Bounds {
  const xs = points.map((point) => point.x);
  const ys = points.map((point) => point.y);
  return {
    left: Math.min(...xs) - pad,
    top: Math.min(...ys) - pad,
    right: Math.max(...xs) + pad,
    bottom: Math.max(...ys) + pad,
  };
}

function unionOf(list: Bounds[]): Bounds {
  return {
    left: Math.min(...list.map((bounds) => bounds.left)),
    top: Math.min(...list.map((bounds) => bounds.top)),
    right: Math.max(...list.map((bounds) => bounds.right)),
    bottom: Math.max(...list.map((bounds) => bounds.bottom)),
  };
}

function drawnBoundsOf(bounds: Bounds): Bounds {
  return {
    left: bounds.left - BOUNDS_PAD,
    top: Math.max(DRAWN_TOP, bounds.top - BOUNDS_PAD),
    right: bounds.right + BOUNDS_PAD,
    bottom: bounds.bottom + BOUNDS_PAD,
  };
}

export const foliageLayers: FoliageLayer[] = foliageSpecs.map((layer) => ({
  ...layer,
  bounds: drawnBoundsOf(
    unionOf(
      layer.circles.map((circle) =>
        boundsOfPoints([{ x: circle.x, y: circle.y }], circle.r),
      ),
    ),
  ),
}));

// ---------- 곡선 도우미 ----------

interface CubicPiece {
  start: Point;
  control1: Point;
  control2: Point;
  end: Point;
}

// 점들을 지나는 매끈한 곡선(Catmull-Rom)을 3차 베지어 조각으로 나눈다.
function smoothPieces(points: Point[]): CubicPiece[] {
  return points.slice(0, -1).map((start, index) => {
    const before = points[Math.max(0, index - 1)];
    const end = points[index + 1];
    const after = points[Math.min(points.length - 1, index + 2)];
    return {
      start,
      control1: {
        x: start.x + (end.x - before.x) / 6,
        y: start.y + (end.y - before.y) / 6,
      },
      control2: {
        x: end.x - (after.x - start.x) / 6,
        y: end.y - (after.y - start.y) / 6,
      },
      end,
    };
  });
}

function pointOnPiece(piece: CubicPiece, progress: number): Point {
  const rest = 1 - progress;
  const weights = [
    rest * rest * rest,
    3 * rest * rest * progress,
    3 * rest * progress * progress,
    progress * progress * progress,
  ];
  const controls = [piece.start, piece.control1, piece.control2, piece.end];
  return {
    x: controls.reduce(
      (sum, point, index) => sum + point.x * weights[index],
      0,
    ),
    y: controls.reduce(
      (sum, point, index) => sum + point.y * weights[index],
      0,
    ),
  };
}

function sampleCurve(points: Point[], stepsPerPiece: number): Point[] {
  const samples: Point[] = [points[0]];
  for (const piece of smoothPieces(points)) {
    for (let step = 1; step <= stepsPerPiece; step++) {
      samples.push(pointOnPiece(piece, step / stepsPerPiece));
    }
  }
  return samples;
}

function cumulativeLengths(samples: Point[]) {
  const lengths = [0];
  for (let index = 1; index < samples.length; index++) {
    const from = samples[index - 1];
    const to = samples[index];
    lengths.push(lengths[index - 1] + Math.hypot(to.x - from.x, to.y - from.y));
  }
  return lengths;
}

const fmt = (value: number) => Number(value.toFixed(2)).toString();

// 밑동에서 끝으로 가늘어지는 가지 모양(면). 곡선 양옆으로 그 자리 굵기의 반씩 띄운 점을 잇고, 양끝은 둥글게 닫는다.
function taperedBranchPath(
  points: Point[],
  baseWidth: number,
  tipWidth: number,
) {
  const samples = sampleCurve(points, 10);
  const lengths = cumulativeLengths(samples);
  const total = lengths[lengths.length - 1];
  const left: Point[] = [];
  const right: Point[] = [];
  samples.forEach((point, index) => {
    const before = samples[Math.max(0, index - 1)];
    const after = samples[Math.min(samples.length - 1, index + 1)];
    const tangentLength =
      Math.hypot(after.x - before.x, after.y - before.y) || 1;
    const normal = {
      x: -(after.y - before.y) / tangentLength,
      y: (after.x - before.x) / tangentLength,
    };
    const half =
      (baseWidth + (tipWidth - baseWidth) * (lengths[index] / total)) / 2;
    left.push({ x: point.x + normal.x * half, y: point.y + normal.y * half });
    right.push({ x: point.x - normal.x * half, y: point.y - normal.y * half });
  });
  const join = (side: Point[]) =>
    side.map((point) => `${fmt(point.x)} ${fmt(point.y)}`).join(" L ");
  const tip = right[right.length - 1];
  const base = left[0];
  return {
    d:
      `M ${join(left)} A ${fmt(tipWidth / 2)} ${fmt(tipWidth / 2)} 0 0 0 ${fmt(tip.x)} ${fmt(tip.y)} ` +
      `L ${join([...right].reverse())} A ${fmt(baseWidth / 2)} ${fmt(baseWidth / 2)} 0 0 0 ${fmt(base.x)} ${fmt(base.y)} Z`,
    // 양끝 둥근 마개는 가장자리 점에서 굵기의 반만큼 더 나간다.
    bounds: boundsOfPoints([...left, ...right], baseWidth / 2),
  };
}

// 가지 잎 크기 배율. 잎을 이 배만큼 키워 가지가 풍성해 보이게 한다.
const LEAF_SCALE = 1.35;

// 잎 하나: 밑동(base)에서 angle 방향으로 뻗은, 양쪽이 똑같이 부푼 뾰족한 잎
function leafPath(base: Point, angleDegrees: number, baseLength: number) {
  const length = baseLength * LEAF_SCALE;
  const radians = (angleDegrees * Math.PI) / 180;
  const end = {
    x: base.x + Math.cos(radians) * length,
    y: base.y + Math.sin(radians) * length,
  };
  const middle = { x: (base.x + end.x) / 2, y: (base.y + end.y) / 2 };
  const bulge = length * 0.3;
  const normal = {
    x: -Math.sin(radians) * bulge,
    y: Math.cos(radians) * bulge,
  };
  const sideA = { x: middle.x + normal.x, y: middle.y + normal.y };
  const sideB = { x: middle.x - normal.x, y: middle.y - normal.y };
  return {
    d:
      `M ${fmt(base.x)} ${fmt(base.y)} Q ${fmt(sideA.x)} ${fmt(sideA.y)} ${fmt(end.x)} ${fmt(end.y)} ` +
      `Q ${fmt(sideB.x)} ${fmt(sideB.y)} ${fmt(base.x)} ${fmt(base.y)} Z`,
    // 2차 곡선은 조절점이 이루는 삼각형 안에 있다.
    bounds: boundsOfPoints([base, end, sideA, sideB]),
  };
}

// 꺾인 선 위에서 길이 비율 at(0~1)인 점과, 그 자리에서 선이 뻗는 방향(도)
function spotOnLine(points: Point[], at: number) {
  const samples = sampleCurve(points, 8);
  const lengths = cumulativeLengths(samples);
  const goal = at * lengths[lengths.length - 1];
  const found = lengths.findIndex((length) => length >= goal);
  const index = Math.min(samples.length - 1, Math.max(1, found));
  const from = samples[index - 1];
  const to = samples[index];
  const mix =
    (goal - lengths[index - 1]) / (lengths[index] - lengths[index - 1] || 1);
  return {
    point: {
      x: from.x + (to.x - from.x) * mix,
      y: from.y + (to.y - from.y) * mix,
    },
    angle: (Math.atan2(to.y - from.y, to.x - from.x) * 180) / Math.PI,
  };
}

// 큰 가지 가운데 선을 잘게 나눈 점과, 밑동에서 각 점까지의 길이
const branchLines = Object.fromEntries(
  Object.entries(branchSpecs).map(([key, spec]) => {
    const samples = sampleCurve(spec.points, 16);
    const lengths = cumulativeLengths(samples);
    return [key, { samples, lengths, total: lengths[lengths.length - 1] }];
  }),
) as Record<string, { samples: Point[]; lengths: number[]; total: number }>;

const widthAlong = (spec: BranchSpec, along: number) =>
  spec.baseWidth + (spec.tipWidth - spec.baseWidth) * along;

// 가지 밑동에서 along(0~1)만큼 간 가운데 선 위의 점
function pointAlong(branchKey: string, along: number): Point {
  const { samples, lengths, total } = branchLines[branchKey];
  const goal = along * total;
  const index = Math.max(
    1,
    lengths.findIndex((length) => length >= goal),
  );
  const from = samples[index - 1];
  const to = samples[index];
  const mix =
    (goal - lengths[index - 1]) / (lengths[index] - lengths[index - 1] || 1);
  return {
    x: from.x + (to.x - from.x) * mix,
    y: from.y + (to.y - from.y) * mix,
  };
}

// 가지 가운데 선이 x를 지나는 자리의 y와, 그 자리가 밑동에서 얼마나 갔는지(0~1). 지나지 않으면 undefined.
function crossingAt(branchKey: string, x: number) {
  const { samples, lengths, total } = branchLines[branchKey];
  for (let index = 0; index < samples.length - 1; index++) {
    const from = samples[index];
    const to = samples[index + 1];
    if (from.x === to.x || (from.x - x) * (to.x - x) > 0) continue;
    const mix = (x - from.x) / (to.x - from.x);
    return {
      y: from.y + (to.y - from.y) * mix,
      along:
        (lengths[index] + (lengths[index + 1] - lengths[index]) * mix) / total,
    };
  }
  return undefined;
}

// 가지 윗면(top)이나 아랫면(under)의 y. 그 자리 굵기만큼 가운데 선에서 떨어져 있다.
function surfaceAt(branchKey: string, x: number, side: "top" | "under") {
  const crossing = crossingAt(branchKey, x);
  if (!crossing) return undefined;
  const half = widthAlong(branchSpecs[branchKey], crossing.along) / 2;
  return side === "top" ? crossing.y - half + 0.6 : crossing.y + half - 0.4;
}

// ---------- 그리기 ----------

// 가지 묶음 그림 조각 하나. paint가 bark면 가지 색, 아니면 그 초록으로 칠한다.
export interface CanopyShape {
  d: string;
  paint: "bark" | LeafTone;
  bounds: Bounds;
}

function twigShapes(branchKey: string, twig: TwigSpec): CanopyShape[] {
  const base = pointAlong(branchKey, twig.along);
  const points = twig.shape.map((offset) => ({
    x: base.x + offset.x,
    y: base.y + offset.y,
  }));
  const leaves = twig.leaves.map((leaf) => {
    const spot = spotOnLine(points, leaf.at);
    return {
      ...leafPath(spot.point, spot.angle + leaf.turn, leaf.length),
      paint: leaf.tone ?? "base",
    } satisfies CanopyShape;
  });
  return [
    {
      ...taperedBranchPath(points, twig.width, twig.width * 0.45),
      paint: "bark",
    },
    ...leaves,
  ];
}

function sproutShape(branchKey: string, sprout: SproutSpec): CanopyShape {
  const center = pointAlong(branchKey, sprout.along);
  const base = {
    x: center.x,
    y: center.y - widthAlong(branchSpecs[branchKey], sprout.along) * 0.35,
  };
  return {
    ...leafPath(base, sprout.angle, sprout.length),
    paint: sprout.tone ?? "base",
  };
}

// 가지 묶음 하나의 그림: 잔가지를 먼저 그리고 큰 가지로 잔가지 밑동을 덮은 뒤, 가지에 바로 돋은 잎을 얹는다.
function groupShapes(group: BranchGroup): CanopyShape[] {
  return Object.entries(branchSpecs)
    .filter(([, spec]) => spec.group === group)
    .flatMap(([key, spec]) => [
      ...spec.twigs.flatMap((twig) => twigShapes(key, twig)),
      {
        ...taperedBranchPath(spec.points, spec.baseWidth, spec.tipWidth),
        paint: "bark" as const,
      },
      ...spec.sprouts.map((sprout) => sproutShape(key, sprout)),
    ]);
}

// 가지는 모든 잎 층을 깐 뒤에 묶음마다 그려서, 굵은 가지가 잎 앞을 가로지른다.
export const branchLayers: {
  group: BranchGroup;
  shapes: CanopyShape[];
  bounds: Bounds;
}[] = branchGroupNames.map((group) => {
  const shapes = groupShapes(group);
  return {
    group,
    shapes,
    bounds: drawnBoundsOf(unionOf(shapes.map((shape) => shape.bounds))),
  };
});

// ---------- 캐릭터와 열매가 닿는 자리 ----------

// 캐릭터마다 발이 닿는 가지 윗면 자리
const perchSpots: Record<BranchGroup, { branch: string; x: number }> = {
  circle: { branch: "circleBranch", x: 36 },
  triangle: { branch: "triangleFork", x: 166 },
  // 오른쪽 위 새로고침 버튼과 겹치지 않도록 시안(x 340)보다 조금 왼쪽에 선다.
  square: { branch: "rightBough", x: 318 },
};

// 새로고침 버튼 가운데 자리(나무 좌표). 네모 오른쪽 위, 상태 표시줄 아래다(사용자 결정: 위 오른쪽, 나무 위).
export const REFRESH_BUTTON_SPOT: Point = { x: 360, y: 64 };

// 넓은 화면(태블릿·웹)에서 나무가 화면을 너무 많이 덮지 않게 묶는 최대 배율
const MAX_CANOPY_SCALE = 1.25;

// 화면 너비에 맞춘 나무 배율과, 나무 그림 왼쪽 끝이 놓이는 화면 x. 나무는 화면 가운데에 둔다.
export function canopyPlacement(screenWidth: number) {
  const scale = Math.min(screenWidth / CANOPY_WIDTH, MAX_CANOPY_SCALE);
  return { scale, left: (screenWidth - CANOPY_WIDTH * scale) / 2 };
}

export const perches = Object.fromEntries(
  branchGroupNames.map((group) => {
    const { branch, x } = perchSpots[group];
    const y = surfaceAt(branch, x, "top");
    if (y === undefined)
      throw new Error(`${branch} 가지가 x=${x}를 지나지 않아요`);
    return [group, { x, y }];
  }),
) as Record<BranchGroup, Point>;

// 열매가 떨어지는 x를 맡은 캐릭터. 왼쪽은 동그라미, 가운데는 세모, 오른쪽은 네모다.
export function ownerOfX(x: number): BranchGroup {
  if (x < 110) return "circle";
  if (x < 236) return "triangle";
  return "square";
}

export interface HangSpot {
  group: BranchGroup;
  // 꼭지 끝이 붙는 가지 아랫면
  attach: Point;
}

// x에서 열매를 매달 가지 아랫면. 그 x를 맡은 캐릭터의 가지를 먼저, 없으면 가장 아래 가지를 고른다.
// 세모 갈래 끝과 오른쪽 큰 가지 끝 사이처럼 가지가 없는 곳이면 undefined다.
export function hangSpotAt(x: number): HangSpot | undefined {
  const candidates = Object.entries(branchSpecs)
    .map(([key, spec]) => ({
      group: spec.group,
      y: surfaceAt(key, x, "under"),
    }))
    .filter(
      (candidate): candidate is { group: BranchGroup; y: number } =>
        candidate.y !== undefined,
    )
    .sort((first, second) => second.y - first.y);
  const owner = ownerOfX(x);
  const chosen =
    candidates.find((candidate) => candidate.group === owner) ?? candidates[0];
  if (!chosen) return undefined;
  return { group: chosen.group, attach: { x, y: chosen.y } };
}
