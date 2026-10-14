import type { NovelSummary } from "../api/types";
import type { FruitFlight } from "../design/fruitFlight";

// 홈 열매 하나가 놓일 자리와 그 자리로 오는 움직임.

// 열매 밭이 처음 정해 준 자리와 하늘에서 떨어지는 움직임
export interface PlacedFruit {
  story: NovelSummary;
  rest: { x: number; y: number; depth: number };
  flight: FruitFlight;
  delayMs: number;
}

// 지금 놓인 자리와 그 자리로 오는 움직임. 손으로 옮기면 바뀐다.
export interface Placement {
  rest: PlacedFruit["rest"];
  flight: FruitFlight;
  delayMs: number;
  // 움직이기 전에 이미 기울어 있던 각도
  startAngle: number;
  // 손으로 떨어뜨린 것이면 화면 밖 하늘이 아니라 놓은 자리에서 떨어진다.
  droppedByHand: boolean;
  // 이 자리를 정할 때의 열매 밭 배치. 화면 크기가 바뀌어 밭을 다시 그리면 처음 자리로 돌아간다.
  layout: PlacedFruit;
}

export function placementFrom(fruit: PlacedFruit): Placement {
  return {
    rest: fruit.rest,
    flight: fruit.flight,
    delayMs: fruit.delayMs,
    startAngle: 0,
    droppedByHand: false,
    layout: fruit,
  };
}

// 움직임이 끝났을 때 열매가 기울어 있는 각도
export function finalAngleOf(placement: Placement) {
  const angles = placement.flight.angle;
  return placement.startAngle + angles[angles.length - 1];
}
