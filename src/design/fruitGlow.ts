import { fruitGeometries } from "./fruitShapes";

// 좋아요를 많이 받은 인기 열매의 연출 값. 땅에 내려앉은 인기 열매는 뒤에 후광이 나고,
// 땅에 닿은 점을 축으로 오뚝이처럼 좌우로 기우뚱한다. 그리기와 움직임은 src/components/FruitGlow.tsx가 한다.

// 좋아요가 이만큼 이상이면 인기 열매다.
export const GLOW_LIKE_COUNT = 100;

export function isPopular(likeCount: number) {
  return likeCount >= GLOW_LIKE_COUNT;
}

// 후광은 몸통 가운데에 겹친 옅은 단색 원 세 겹이다. 나무·열매 그림처럼 그라데이션 없이,
// 바깥 원부터 겹쳐 그려 원이 많이 겹친 안쪽일수록 진해 보이게 한다(빛이 번진 것처럼).
// 반지름은 열매 크기에 대한 비율이다. 몸통 반지름은 약 0.33이다.
export const HALO_RINGS = [
  { radius: 0.82, opacity: 0.14 },
  { radius: 0.66, opacity: 0.16 },
  { radius: 0.5, opacity: 0.2 },
];

// 원 여러 장이 겹친 자리의 진하기. 안쪽 고리일수록 더 많은 원이 겹친다.
export function haloStrengthAt(ringIndex: number) {
  const covering = HALO_RINGS.slice(0, ringIndex + 1);
  const seeThrough = covering.reduce(
    (rest, ring) => rest * (1 - ring.opacity),
    1,
  );
  return 1 - seeThrough;
}

// 후광이 숨 쉬듯 커졌다 작아지는 한 번의 시간과 가장 커질 때의 배율
export const HALO_BREATH_MS = 3000;
export const HALO_BREATH_SCALE = 1.06;

// 좌우로 기우는 가장 큰 각도와, 한쪽 끝에서 반대쪽 끝을 거쳐 돌아오기까지의 시간
export const SWAY_DEGREES = 5;
export const SWAY_PERIOD_MS = 2600;

// 인기 열매 여럿이 한꺼번에 똑같이 흔들리지 않도록 소설마다 흔들기 시작하는 때를 엇갈리게 한다.
// 황금비만큼씩 건너뛰면 id가 이어진 소설끼리도 박자가 고르게 흩어진다.
export function swayDelayOf(storyId: number) {
  const phase = (storyId * 0.618034) % 1;
  return Math.round(phase * SWAY_PERIOD_MS);
}

// 구는 제자리에서 구르듯 흔들린다. 공이 미끄러지지 않고 구르면 도는 각도만큼 반지름 × 각도를 옆으로 간다.
// 그 거리를 열매 크기에 대한 비율로 돌려준다.
export function ballRollShift() {
  const xs = fruitGeometries.sphere.outline.map((corner) => corner.x);
  const radius = (Math.max(...xs) - Math.min(...xs)) / 2 / 40;
  return radius * ((SWAY_DEGREES * Math.PI) / 180);
}
