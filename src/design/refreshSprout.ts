import type { Point } from "./fruitShapes";
import type { Track } from "./canopyShow";

// 홈 오른쪽 위 새로고침 버튼(사용자가 고른 시안 D, reference/sian/refresh-button). 유리 없이 검은 새싹만 두고,
// 그 아래 점으로 오늘 남은 무료 새로고침을 보여 준다(●● → ●○ → ○○).
// 누르면 새싹이 나무처럼 휘청이며 잎이 흩날리고, 다 쓴 뒤 누르면 시무룩하게 기울며 빈 점이 깜빡인다.
// 좌표는 24칸 아이콘 단위다. 그리기는 src/components/BarIcons.tsx, 움직임은 src/components/home이 한다.

export const SPROUT_GRID = 24;

// 줄기와, 밑동에서 끝까지 양쪽으로 똑같이 부푼 잎 셋(왼쪽·오른쪽·꼭대기)
export const SPROUT_STEM = { x: 12, top: 9.8, bottom: 16.2 };
export const SPROUT_LEAVES: { base: Point; tip: Point; bulge: number }[] = [
  { base: { x: 11.6, y: 13.9 }, tip: { x: 6.3, y: 10.7 }, bulge: 2 },
  { base: { x: 12.4, y: 12.1 }, tip: { x: 17.7, y: 8.9 }, bulge: 2 },
  { base: { x: 12, y: 10.1 }, tip: { x: 12, y: 3.5 }, bulge: 1.8 },
];
// 새싹이 휘청이고 기울 때의 축(줄기 밑동)
export const SPROUT_PIVOT: Point = { x: SPROUT_STEM.x, y: SPROUT_STEM.bottom };

// ---------- 남은 횟수 점 ----------

// 점 줄의 높이와 점 크기. 반지름은 테두리 가운데까지다. 줄기와 이어져 보이지 않게 줄기 밑동에서 떨어뜨린다.
export const DOT_ROW_Y = 21.9;
export const DOT_RADIUS = 1.5;
export const DOT_LINE = 1.1;
// 점 가운데 사이 거리. 점이 많아도 줄이 이 너비를 넘지 않게 좁힌다.
const DOT_GAP = 5.4;
const DOT_ROW_MAX_WIDTH = 19;

export interface SproutDot {
  // 점 가운데 x
  x: number;
  filled: boolean;
}

// 하루 무료 횟수(total, 서버가 정함)만큼 새싹 아래 가운데에 점을 놓고, 오늘 남은 만큼(left) 왼쪽부터 칠한다.
// 횟수를 아직 모르면 점을 그리지 않는다.
export function sproutDots(
  left: number | undefined,
  total: number | undefined,
): SproutDot[] {
  if (left === undefined || total === undefined) return [];
  const count = Math.max(0, Math.floor(total));
  const filledCount = Math.min(Math.max(left, 0), count);
  const gap =
    count > 1 ? Math.min(DOT_GAP, DOT_ROW_MAX_WIDTH / (count - 1)) : 0;
  const firstX = SPROUT_STEM.x - (gap * (count - 1)) / 2;
  return Array.from({ length: count }, (_, index) => ({
    x: firstX + index * gap,
    filled: index < filledCount,
  }));
}

// ---------- 움직임 ----------

// 손가락이 닿으면 꾹 들어가는 크기
export const PRESSED_SCALE = 0.86;
// 누르면 새싹이 줄기 밑동을 축으로 휘청인다(시각 ms → 각도 도, 음수가 왼쪽).
export const WIGGLE: Track = {
  times: [0, 100, 220, 340, 460, 580],
  values: [0, -16, 13, -8, 4, 0],
};
// 다 쓴 뒤 누르면 시무룩하게 기울었다가 천천히 돌아온다.
export const DROOP: Track = {
  times: [0, 260, 1500, 1900],
  values: [0, 11, 11, 0],
};
// 다 쓴 뒤 누르면 빈 점이 두 번 깜빡인다(투명도).
export const BLINK: Track = {
  times: [0, 100, 200, 300, 400],
  values: [1, 0.15, 1, 0.15, 1],
};
// 서버가 답해 점 하나가 비워질 때 그 점이 톡 커졌다 돌아온다.
export const DOT_POP = { scale: 1.6, durationMs: 240 };
// 누른 뒤 이만큼 지나야 흐려진다(나무 연출 동안 못 누름). 그 전에는 효과를 또렷하게 보여 준다.
export const EFFECT_MS = 600;

// 휘청일 때 잎 끝에서 하나씩 흩날리는 작은 초록 잎. move는 날아가는 거리(24칸 단위), turn은 도는 각도(도)
export interface FlyingLeaf {
  from: Point;
  move: Point;
  turn: number;
  delayMs: number;
}
const LEAF_FLIGHTS = [
  { move: { x: -6.5, y: -3.5 }, turn: -150 },
  { move: { x: 6.5, y: -4.5 }, turn: 170 },
  { move: { x: 2.5, y: -6.5 }, turn: 130 },
];
export const FLYING_LEAVES: FlyingLeaf[] = SPROUT_LEAVES.map((leaf, index) => ({
  from: leaf.tip,
  ...LEAF_FLIGHTS[index],
  delayMs: 60 + index * 40,
}));
// 잎 하나가 나타나는 시간과 날아가 사라지기까지의 시간
export const LEAF_APPEAR_MS = 80;
export const LEAF_FLIGHT_MS = 720;
// 마지막 잎이 사라지는 때
export const LEAVES_END_MS =
  Math.max(...FLYING_LEAVES.map((leaf) => leaf.delayMs)) + LEAF_FLIGHT_MS;
