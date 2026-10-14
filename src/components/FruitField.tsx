import { useMemo, useRef, useState } from "react";
import { StyleSheet, View, type LayoutChangeEvent } from "react-native";
import { useIsFocused } from "expo-router";
import type { NovelSummary } from "../api/types";
import { fruitShapeOf } from "../theme";
import {
  groundViewThrough,
  planFlight,
  skyStart,
  toWorld,
} from "../design/fruitFlight";
import { flightStyleFor, planDrops } from "../design/skyDrop";
import { FieldFruit, type FruitNeighbors } from "./FieldFruit";
import type { PlacedFruit } from "./fruitPlacement";
import type { RestingFruit } from "../design/handDrop";
import type { FieldGround } from "./fruitHand";
import { rollsLikeBall, useReducedMotion } from "./fruitMotion";

// 그림 좌표계. 실제 크기는 화면 너비에 맞춰 늘리고 줄인다.
const VIEW_WIDTH = 340;
const FIELD_HEIGHT = 190;
// 원근 배율 1인 곳(맨 앞줄)의 열매 크기
const FRUIT_SIZE = 44;
// 맨 뒷줄 열매 자리의 원근 배율. 앞줄보다 조금 멀어서 작고 옅게 보인다.
const BACK_ROW_DEPTH = 0.8;
// 아래쪽 버튼 줄이 차지하는 높이. 열매 무리는 그 위에 놓는다.
const BOTTOM_BAR_SPACE = 76;
// 버튼 줄 위 남는 공간 중 열매 무리 위쪽에 두는 비율. 위쪽에 열매가 떨어져 내려올 하늘을 넉넉히 남긴다.
const FIELD_PLACEMENT = 0.6;
// 열매가 하늘에서 들어오는 높이. 이 영역 위쪽 여백과 상태 표시줄까지 넘어선 화면 밖에서 시작한다.
const SKY_ENTRY_Y = -150;
// 화면이 뜬 뒤 첫 열매가 떨어지기 시작할 때까지 기다리는 시간과, 열매 사이 평균 간격(초)
const FIRST_DROP_SECONDS = 0.35;
const DROP_GAP_SECONDS = 0.2;
// 하나씩 "톡… 톡톡… 톡" 떨어지도록 열매 사이 간격을 들쭉날쭉하게 늘이고 줄인다.
const DROP_GAP_RHYTHM = [1, 0.6, 1.5, 0.8, 1.2, 0.7, 1.3];

interface Spot {
  x: number;
  y: number;
}

// 열매가 처음 땅에 닿는 자리. 가운데부터 채워서 열매가 적으면 한가운데에 떨어진다.
// 멈추는 자리는 여기서 튕기거나 굴러간 결과라 떨어질 때마다 다르다.
const landingSpots: Spot[] = [
  { x: 170, y: 124 },
  { x: 92, y: 160 },
  { x: 252, y: 164 },
  { x: 124, y: 90 },
  { x: 226, y: 94 },
  { x: 300, y: 128 },
  { x: 40, y: 128 },
];
export const FRUIT_FIELD_LIMIT = landingSpots.length;
const BACK_ROW_Y = Math.min(...landingSpots.map((spot) => spot.y));
const FRONT_ROW_Y = Math.max(...landingSpots.map((spot) => spot.y));
// 굴러가거나 튄 열매가 멈출 수 있는 땅의 범위(그림 좌표계). 화면 양옆과 아래쪽 버튼 줄에 닿지 않는다.
const GROUND = { left: 24, right: 316, top: 64, bottom: 182 };
// 손으로 옮긴 열매는 처음 배치보다 앞쪽, 아래쪽 버튼 줄에서 이만큼(화면 px) 위까지 놓을 수 있다.
const HAND_FRONT_GAP = 12;
// 든 열매 위에 뜨는 말풍선이 화면 위로 잘리지 않도록 남기는 높이(화면 px)
const BUBBLE_ROOM = 150;

// 열매마다 하늘에서 떨어져 땅에 부딪힌 뒤 어디로 튀고 굴러 멈출지 정하고, 그 움직임을 계산한다.
function layoutField(
  width: number,
  height: number,
  stories: NovelSummary[],
  seed: number,
) {
  const scale = width / VIEW_WIDTH;
  const room = height - BOTTOM_BAR_SPACE;
  const fieldTop = Math.max(0, (room - FIELD_HEIGHT * scale) * FIELD_PLACEMENT);
  const toScreenSpot = (spot: Spot) => ({
    x: spot.x * scale,
    y: fieldTop + spot.y * scale,
  });
  // 뒷줄과 앞줄 열매 자리의 크기 차이로 땅의 원근을 정한다.
  const view = groundViewThrough(
    width / 2,
    { y: fieldTop + BACK_ROW_Y * scale, depth: BACK_ROW_DEPTH },
    { y: fieldTop + FRONT_ROW_Y * scale, depth: 1 },
  );
  const shown = stories.slice(0, FRUIT_FIELD_LIMIT).map((story, order) => ({
    story,
    rollsLikeBall: rollsLikeBall(fruitShapeOf(story.id)),
    landing: toScreenSpot(landingSpots[order]),
  }));
  const bounds = {
    left: GROUND.left * scale,
    right: GROUND.right * scale,
    top: fieldTop + GROUND.top * scale,
    bottom: fieldTop + GROUND.bottom * scale,
  };
  const fruitSize = FRUIT_SIZE * scale;
  const ground: FieldGround = {
    view,
    bounds,
    handBounds: {
      ...bounds,
      bottom: Math.max(bounds.bottom, room - HAND_FRONT_GAP),
    },
    // 땅 뒤쪽 끝보다 위는 하늘이라, 그곳까지 들어 올렸다 놓으면 처음처럼 높이서 떨어진다.
    skyTop: Math.min(bounds.top, BUBBLE_ROOM + fruitSize),
    fruitSize,
    scale,
  };
  const plans = planDrops(
    ground,
    shown.map(({ story, rollsLikeBall, landing }) => ({
      id: story.id,
      rollsLikeBall,
      landing,
    })),
    seed,
  );

  let waitSeconds = FIRST_DROP_SECONDS;
  const placed: PlacedFruit[] = shown.map(({ story, rollsLikeBall }, order) => {
    const { bounce, rest, rollAway } = plans[order];
    const style = flightStyleFor(bounce, rollsLikeBall);
    const restWorld = toWorld(view, rest);
    const flight = planFlight({
      start: skyStart(view, restWorld, rollAway, SKY_ENTRY_Y),
      rest: restWorld,
      view,
      size: fruitSize,
      rollsLikeBall,
      // 소설마다 다 굴러간 뒤 기울어지는 정도가 조금씩 다르다.
      restTilt: 12 + ((story.id * 7) % 16),
      style: {
        ...style,
        // 화면이 작으면 열매가 가는 길도 짧으므로 중력도 그만큼 작게 준다.
        gravity: style.gravity * scale,
      },
    });
    const delayMs = waitSeconds * 1000;
    waitSeconds +=
      DROP_GAP_SECONDS * DROP_GAP_RHYTHM[order % DROP_GAP_RHYTHM.length];
    return { story, rest, flight, delayMs };
  });
  // 뒤쪽 열매부터 그려야 겹칠 때 앞쪽 열매가 앞에 보인다.
  const backToFront = [...placed].sort(
    (first, second) => first.rest.y - second.rest.y,
  );
  return { fruits: backToFront, ground };
}

// 홈 화면의 열매 밭. 오로지 열매와 땅만 있다. 소설 열매가 하나씩 화면 밖 하늘에서 떨어져 흰 땅에 부딪히고,
// 털썩 멈추거나, 굴러가거나, 크게 튀어 다른 자리로 가서 멈춘다. 누르면 그 소설로 가고,
// 끌거나 길게 누르면 집어서 앞쪽 빈 땅까지 옮겨 떨어뜨릴 수 있다.
export function FruitField({
  stories,
  deliveredIds,
  onOpen,
}: {
  stories: NovelSummary[];
  // 나에게 배달된 열매의 소설 id
  deliveredIds: Set<number>;
  onOpen: (story: NovelSummary) => void;
}) {
  const reduced = useReducedMotion();
  const [area, setArea] = useState({ width: 0, height: 0 });
  // 홈에 들어올 때마다 열매가 튀고 굴러간 결과가 달라진다. 한 번 정해지면 화면 크기가 바뀌어도 그대로다.
  const [seed] = useState(() => Math.floor(Math.random() * 2 ** 31));
  // 열매마다 지금 놓인 자리. 그리기와 상관없는 기록이라 상태 대신 ref에 둔다.
  const restsById = useRef(new Map<number, RestingFruit>()).current;
  const neighbors = useMemo<FruitNeighbors>(
    () => ({
      report: (id, rest) => restsById.set(id, rest),
      forget: (id) => restsById.delete(id),
      othersThan: (id) =>
        [...restsById.entries()]
          .filter(([otherId]) => otherId !== id)
          .map(([, rest]) => rest),
    }),
    [restsById],
  );
  // 열매 자리는 어떤 소설들이 놓이는지에만 따른다. 좋아요 수처럼 내용만 바뀐 응답으로 다시 배치하면
  // 손으로 옮긴 열매가 처음 자리로 돌아가므로, 배치는 소설 id 목록이 바뀔 때만 다시 하고
  // 열매에는 그릴 때마다 최신 소설 정보를 넘긴다.
  const storyIds = stories.map((story) => story.id).join(",");
  const field = useMemo(
    () =>
      area.width > 0
        ? layoutField(area.width, area.height, stories, seed)
        : undefined,
    [area.width, area.height, storyIds, seed],
  );
  const latestStories = new Map(stories.map((story) => [story.id, story]));
  // 홈이 다른 탭이나 소설 화면에 가려져 있으면 인기 열매의 흔들림·숨쉬기를 멈춰 배터리를 아낀다.
  const onScreen = useIsFocused();

  return (
    <View
      style={styles.stage}
      onLayout={(event: LayoutChangeEvent) => {
        const { width, height } = event.nativeEvent.layout;
        setArea({ width, height });
      }}
    >
      {field?.fruits.map((fruit) => (
        <FieldFruit
          key={fruit.story.id}
          fruit={fruit}
          story={latestStories.get(fruit.story.id) ?? fruit.story}
          delivered={deliveredIds.has(fruit.story.id)}
          ground={field.ground}
          neighbors={neighbors}
          reduced={reduced}
          onScreen={onScreen}
          onOpen={onOpen}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  // 열매가 이 영역 위쪽 여백과 상태 표시줄 너머 화면 밖에서 들어오도록, 영역 밖도 자르지 않는다.
  stage: { flex: 1, width: "100%", overflow: "visible" },
});
