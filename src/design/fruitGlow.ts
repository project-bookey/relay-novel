import { fruitGeometries } from "./fruitShapes";

// 좋아요를 많이 받은 인기 열매의 연출 값. 땅에 내려앉은 인기 열매는 둘레에서 작은 별이 반짝이고,
// 땅에 닿은 점을 축으로 오뚝이처럼 좌우로 기우뚱한다. 그리기와 움직임은 src/components/FruitGlow.tsx가 한다.

// 좋아요가 이만큼 이상이면 인기 열매다.
export const GLOW_LIKE_COUNT = 100;

export function isPopular(likeCount: number) {
  return likeCount >= GLOW_LIKE_COUNT;
}

// 열매 둘레의 네 갈래 별. 자리(x, y)와 반지름은 열매 그림 칸 크기에 대한 비율이다.
// 몸통 왼쪽 위·오른쪽·꼭지 옆·왼쪽 아래에 흩어 두고, 하나씩 차례로 반짝인다.
export const SPARKLES = [
  { x: 0.08, y: 0.3, radius: 0.12 },
  { x: 0.96, y: 0.46, radius: 0.105 },
  { x: 0.8, y: 0.06, radius: 0.09 },
  { x: 0.14, y: 0.78, radius: 0.08 },
];

// 별 하나가 반짝였다 다시 반짝이기까지의 시간. 그중 앞부분에 커졌다 작아지고 나머지는 꺼져 있다.
export const SPARKLE_PERIOD_MS = 2800;
export const SPARKLE_SHINE_SHARE = 0.4;
// 반짝이며 별이 도는 각도
export const SPARKLE_TURN_DEGREES = 45;
// 동작 줄이기거나 홈이 가려져 있으면 별을 이만큼 반짝인 모습으로 가만히 켜 둔다(1이 가장 크고 진할 때).
export const SPARKLE_STILL_SHINE = 0.8;

// 별마다 반짝이기 시작하는 때. 한 바퀴 안에 고르게 나눠 하나씩 차례로 반짝이게 한다.
export function sparkleDelayOf(sparkleIndex: number) {
  return Math.round((sparkleIndex / SPARKLES.length) * SPARKLE_PERIOD_MS);
}

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
