// 좋아요로 열매가 여무는 정도. React·Expo 의존성이 없어서 node 테스트가 가능하다.
// 홈 열매는 999개까지 지금 모습(100개부터 인기 열매 반짝이)이고, 1000개가 되면 금빛으로 물들고 금빛 고리가 퍼진다.
// 상세 이야기 나무 가지 끝 열매는 단계마다 익은 색 → 크기 → 잎 수로 알차지고,
// 1000개면 대롱대롱 흔들리며 금빛으로 물들고 고리가 퍼진다(시안 reference/sian/ripen-harvest/).
// 알·송이처럼 열매 수를 늘리는 표현은 사용자가 기각했다. 열매는 늘 하나다.

import { mix } from "../theme";

// 단계가 오르는 좋아요 수. 0단계(풋열매)는 100개 미만이다.
export const RIPE_LIKE_COUNTS = [100, 200, 400, 700, 1000] as const;
export const FULLY_RIPE_STAGE = RIPE_LIKE_COUNTS.length;

export function ripeStageOf(likeCount: number) {
  return RIPE_LIKE_COUNTS.filter((count) => likeCount >= count).length;
}

// 1000개 이상, 다 여문 열매
export function isFullyRipe(likeCount: number) {
  return ripeStageOf(likeCount) === FULLY_RIPE_STAGE;
}

// 다음 단계까지 남은 좋아요 수. 다 여물었으면 없다.
export function likesToNextStage(likeCount: number) {
  const next = RIPE_LIKE_COUNTS.find((count) => likeCount < count);
  return next === undefined ? undefined : next - likeCount;
}

export interface TreeFruitLook {
  // 열매 크기 배율
  scale: number;
  // 풋열매일 때 연둣빛으로 섞는 정도(0이면 작품 색 그대로)
  unripe: number;
  // 꼭지에 붙은 잎 수
  leaves: number;
}

// 단계별 가지 끝 열매 모습. 잎은 200·700개에 하나씩 늘고 크기는 단계마다 조금씩 커진다.
const TREE_FRUIT_LOOKS: TreeFruitLook[] = [
  { scale: 0.78, unripe: 0.5, leaves: 1 },
  { scale: 0.9, unripe: 0, leaves: 1 },
  { scale: 1, unripe: 0, leaves: 2 },
  { scale: 1.08, unripe: 0, leaves: 2 },
  { scale: 1.16, unripe: 0, leaves: 3 },
  { scale: 1.24, unripe: 0, leaves: 3 },
];

export function treeFruitLookOf(likeCount: number) {
  return TREE_FRUIT_LOOKS[ripeStageOf(likeCount)];
}

// 다 여문 열매를 금빛으로 물들이는 정도. 파란 열매도 탁해지지 않고 맑은 금빛이 되도록 금빛을 많이 섞는다.
export const RIPE_GOLD_MIX = 0.85;

export function ripeColorOf(color: string, gold: string, ripe: boolean) {
  return ripe ? mix(color, gold, RIPE_GOLD_MIX) : color;
}

// 다 여문 가지 끝 열매가 무거워져 꼭지가 늘어나는 길이(열매 40칸 기준)
export const RIPE_STEM_DROOP = 7;
// 대롱대롱 흔들리는 가장 큰 각도와 한 번 왕복하는 시간
export const DANGLE_DEGREES = 7;
export const DANGLE_PERIOD_MS = 3200;
// 금빛 고리가 퍼지는 시간과 크기(열매 크기에 대한 비율). 고리 둘이 반 박자씩 엇갈려 퍼진다.
export const RING_PERIOD_MS = 2600;
export const RING_FROM_SCALE = 0.75;
export const RING_TO_SCALE = 1.35;
// 동작 줄이기면 고리를 이 크기·진하기로 가만히 둔다.
export const RING_STILL_SCALE = 1.05;
export const RING_STILL_OPACITY = 0.6;
