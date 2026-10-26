// 열매 탭 장르 바를 맨 위에 다시 꺼낼지 정한다(사용자 요청 "카테고리는 따라다니게 하지 말고 위로 올렸을 때 나타나도록").
// 목록 속 장르 바가 화면 위로 지나간 뒤 손가락으로 위로 올리면 나타나고, 다시 내리거나 목록 속 바가 제자리로
// 돌아오면 숨는다. 화면 없이 테스트한다(tests/barReveal.test.ts).

// 이만큼 넘게 움직여야 올림·내림으로 본다(손 떨림을 거른다). 덜 움직이면 모아 두었다가 넘을 때 본다.
export const REVEAL_SLOP = 6;

export interface BarRevealInput {
  // 지난번에 올림·내림을 판정한 위치와 그때의 결과
  anchorY: number;
  shown: boolean;
  // 지금 내린 거리
  y: number;
  // 이만큼 이하로 내렸으면 목록 속 장르 바가 맨 위 나타나는 자리나 그 아래에 보인다.
  inPlaceUntil: number;
  // 끝까지 내렸을 때의 거리. 아이폰은 끝에서 더 끌렸다가 튕겨 돌아오는데, 그 되돌아옴을 올림으로 보지 않는다.
  maxY: number;
}

export function barRevealOf({
  anchorY,
  shown,
  y,
  inPlaceUntil,
  maxY,
}: BarRevealInput): { shown: boolean; anchorY: number } {
  if (y <= inPlaceUntil) return { shown: false, anchorY: y };
  if (y > maxY) return { shown, anchorY: maxY };
  const moved = y - anchorY;
  if (Math.abs(moved) <= REVEAL_SLOP) return { shown, anchorY };
  return { shown: moved < 0, anchorY: y };
}
