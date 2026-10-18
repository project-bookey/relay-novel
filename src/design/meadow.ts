import { seededRandom } from "./storyTree";

// 홈 열매 밭의 풀과 꽃(사용자가 고른 시안 G에서 하늘·산·초록 바탕을 빼고 풀 모양과 꽃 모양만 남긴 것).
// 바탕은 그대로 두고, 보이지 않는 능선 아래 열매 밭 둘레에 풀 포기와 꽃 무더기를 흩뿌린다.
// 좌표는 열매 밭 그림 좌표(fruitLayout과 같은 너비 340 기준, 열매 밭 위쪽이 0)이고, 그리는 쪽이 열매와 같은 배율로 늘린다.

type Point = [number, number];

// 화면에서 보이는 범위(열매 밭 그림 좌표). 화면 크기마다 달라서 그 안에 풀과 꽃을 흩뿌린다.
export interface MeadowView {
  left: number;
  right: number;
  bottom: number;
}

// 풀이 나기 시작하는 보이지 않는 능선. 가운데가 가장 높은 완만한 곡선이고 넓은 화면에서도 양옆으로 이어진다.
// 열매 밭 땅의 뒤쪽 끝(fruitLayout의 GROUND.top, y 64)보다 늘 위에 있어 어느 열매든 풀 사이에 놓인다.
const RIDGE: Point[] = [
  [-240, 90],
  [-44, 66],
  [-24, 63],
  [36, 52],
  [105, 44],
  [175, 40],
  [245, 44],
  [304, 50],
  [364, 60],
  [384, 63],
  [580, 88],
];
export const RIDGE_TOP = Math.min(...RIDGE.map(([, y]) => y));

const round = (value: number) => Math.round(value * 10) / 10;

// 능선 점들을 지나는 부드러운 곡선(Catmull-Rom)의 구간별 베지어 조절점
function ridgeSegments() {
  const points = [RIDGE[0], ...RIDGE, RIDGE[RIDGE.length - 1]];
  const segments: [Point, Point, Point, Point][] = [];
  for (let index = 1; index < points.length - 2; index++) {
    const [before, from, to, after] = points.slice(index - 1, index + 3);
    segments.push([
      from,
      [from[0] + (to[0] - before[0]) / 6, from[1] + (to[1] - before[1]) / 6],
      [to[0] - (after[0] - from[0]) / 6, to[1] - (after[1] - from[1]) / 6],
      to,
    ]);
  }
  return segments;
}
const SEGMENTS = ridgeSegments();

const bezier = (a: number, b: number, c: number, d: number, t: number) =>
  (1 - t) ** 3 * a +
  3 * (1 - t) ** 2 * t * b +
  3 * (1 - t) * t ** 2 * c +
  t ** 3 * d;

// 곡선을 촘촘히 짚어 둔 점. 능선 높이를 x로 찾을 때 쓴다.
const RIDGE_SAMPLES: Point[] = SEGMENTS.flatMap(([from, c1, c2, to]) =>
  Array.from({ length: 24 }, (_, step): Point => {
    const t = step / 24;
    return [
      bezier(from[0], c1[0], c2[0], to[0], t),
      bezier(from[1], c1[1], c2[1], to[1], t),
    ];
  }),
).concat([RIDGE[RIDGE.length - 1]]);

// x 자리의 능선 높이. 능선 점 바깥은 끝 높이 그대로 평평하게 이어진다.
export function ridgeAt(x: number) {
  if (x <= RIDGE_SAMPLES[0][0]) return RIDGE_SAMPLES[0][1];
  for (let index = 1; index < RIDGE_SAMPLES.length; index++) {
    const [x1, y1] = RIDGE_SAMPLES[index];
    if (x > x1) continue;
    const [x0, y0] = RIDGE_SAMPLES[index - 1];
    return y0 + ((y1 - y0) * (x - x0)) / (x1 - x0 || 1);
  }
  return RIDGE_SAMPLES[RIDGE_SAMPLES.length - 1][1];
}

// 풀 포기와 꽃. 뒤쪽(능선 가까이)은 작고 앞쪽은 크게 그려 원근을 낸다.
export interface Tuft {
  x: number;
  y: number;
  size: number;
}
export interface Flower extends Tuft {
  // 0은 흰 꽃, 1은 노란 꽃
  kind: 0 | 1;
}
export interface MeadowDecor {
  tufts: Tuft[];
  flowers: Flower[];
}

// 넓이 1만(그림 좌표²)마다 놓는 개수. 풀은 시안보다 줄여(사용자 요청) 390×844 화면에 열여섯 포기쯤 난다.
const TUFTS_PER_AREA = 1.1;
const FLOWER_CLUSTERS_PER_AREA = 0.45;
// 칸 안에서 자리를 흔드는 폭(칸 크기에 대한 비율). 줄을 맞춘 티가 나지 않을 만큼만 흔든다.
const JITTER = 0.6;
// 꽃 무더기 칸을 풀 칸과 어긋나게 미는 비율. 꽃이 풀 포기에 겹쳐 피지 않게 한다.
const FLOWER_SHIFT = 0.25;
// 아래쪽 버튼 줄과 그 위 조금은 비워 둔다(그림 좌표). 맨 아래 풀이 버튼 줄에 붙어 보이지 않게 한다.
const BOTTOM_ROOM = 100;
const DECOR_SEED = 21;

// 가까운 정도(0이 가장 먼 줄). 능선 가까이(y 58)에서 시작해 앞으로 올수록 커진다.
const nearnessAt = (y: number) => Math.min(1.15, Math.max(0, (y - 58) / 340));
const sizeAt = (y: number) => 0.6 + nearnessAt(y) * 0.95;

export function scatterMeadow(view: MeadowView): MeadowDecor {
  const random = seededRandom(DECOR_SEED);
  const left = view.left + 6;
  const right = view.right - 6;
  const limit = view.bottom - BOTTOM_ROOM;
  // 능선 아래를 넓이에 맞는 칸으로 나눠 칸마다 한 자리씩 고른다. 줄마다 반 칸씩 엇갈리고 칸 안에서
  // 조금씩 흔들어, 뭉치거나 휑하게 빈 곳 없이 고루 퍼진다. shift만큼 칸을 옆으로 밀면 다른 칸 짜임과 어긋난다.
  const spread = (perArea: number, gap: number, shift: number) => {
    const top = RIDGE_TOP + gap;
    const count = ((right - left) * Math.max(0, limit - top) * perArea) / 10000;
    if (count < 1) return [];
    const cell = Math.sqrt(((right - left) * (limit - top)) / count);
    const rows = Math.max(1, Math.round((limit - top) / cell));
    const cols = Math.max(1, Math.round((right - left) / cell));
    const cellWidth = (right - left) / cols;
    const cellHeight = (limit - top) / rows;
    const spots: { x: number; y: number }[] = [];
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        // 오른쪽 끝을 넘친 칸은 왼쪽 끝으로 돌아와 양옆이 똑같이 찬다.
        const across = (col + 0.5 + (row % 2) * 0.5 + shift) % cols;
        const x = left + (across + (random() - 0.5) * JITTER) * cellWidth;
        const y = top + (row + 0.5 + (random() - 0.5) * JITTER) * cellHeight;
        if (x < left || x > right || y > limit) continue;
        if (y < ridgeAt(x) + gap) continue;
        spots.push({ x: round(x), y: round(y) });
      }
    }
    return spots;
  };
  const tufts: Tuft[] = spread(TUFTS_PER_AREA, 10, 0).map((spot) => ({
    ...spot,
    size: round(sizeAt(spot.y)),
  }));
  const flowers: Flower[] = [];
  // 꽃은 두세 송이씩 무리 지어 핀다.
  const clusters = spread(FLOWER_CLUSTERS_PER_AREA, 30, FLOWER_SHIFT);
  for (const [cluster, center] of clusters.entries()) {
    const kind = (cluster % 2) as 0 | 1;
    const count = 2 + Math.floor(random() * 2);
    for (let index = 0; index < count; index++) {
      const x = round(center.x + (random() - 0.5) * 16);
      const y = round(center.y + (random() - 0.5) * 8);
      flowers.push({
        x,
        y,
        size: round(sizeAt(y) * 0.85),
        kind: (index === 2 ? 1 - kind : kind) as 0 | 1,
      });
    }
  }
  return { tufts, flowers };
}

// 흩뿌린 것들을 색마다 경로 하나로 묶는다. 그리는 쪽은 경로 몇 개만 그리면 된다.
const circle = (x: number, y: number, r: number) =>
  `M${round(x - r)},${round(y)}a${round(r)},${round(r)} 0 1 0 ${round(2 * r)},0a${round(r)},${round(r)} 0 1 0 ${round(-2 * r)},0`;
const PETALS: Point[] = [
  [0, -2.3],
  [2.19, -0.71],
  [1.35, 1.86],
  [-1.35, 1.86],
  [-2.19, -0.71],
];

export function meadowPaths(decor: MeadowDecor) {
  const blade = (x: number, y: number, s: number, shape: Point[]) =>
    `M${shape.map(([dx, dy]) => `${round(x + dx * s)},${round(y + dy * s)}`).join("L")}Z`;
  return {
    // 풀 한 포기는 양옆 잎 둘과 가운데 진한 잎 하나다.
    sideBlades: decor.tufts
      .map(
        ({ x, y, size }) =>
          blade(x, y, size, [
            [-4.2, 0],
            [-6.2, -7.2],
            [-0.8, 0],
          ]) +
          blade(x, y, size, [
            [0.8, 0],
            [6, -6.6],
            [4.2, 0],
          ]),
      )
      .join(""),
    midBlades: decor.tufts
      .map(({ x, y, size }) =>
        blade(x, y, size, [
          [-2, 0],
          [0.2, -10],
          [2, 0],
        ]),
      )
      .join(""),
    stems: decor.flowers
      .map(
        ({ x, y, size }) =>
          `M${x},${round(y + 2 * size)}L${x},${round(y + 7 * size)}`,
      )
      .join(""),
    petals: ([0, 1] as const).map((kind) =>
      decor.flowers
        .filter((flower) => flower.kind === kind)
        .map(({ x, y, size }) =>
          PETALS.map(([dx, dy]) =>
            circle(x + dx * size, y + dy * size, 1.9 * size),
          ).join(""),
        )
        .join(""),
    ),
    cores: ([0, 1] as const).map((kind) =>
      decor.flowers
        .filter((flower) => flower.kind === kind)
        .map(({ x, y, size }) => circle(x, y, 1.4 * size))
        .join(""),
    ),
  };
}
