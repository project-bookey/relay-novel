import { useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
  Pressable,
  StyleSheet,
  View,
  type LayoutChangeEvent,
} from "react-native";
import type { NovelSummary } from "../api/types";
import { fruitShapeOf, lighten, storyColorOf } from "../theme";
import {
  FRUIT_BOTTOM,
  FRUIT_CENTER,
  FruitBody,
  FruitShadow,
  FruitStem,
  SHADOW_ORIGIN,
} from "./FruitArt";
import {
  groundViewThrough,
  planFlight,
  skyStart,
  toWorld,
  type FruitFlight,
} from "../design/fruitFlight";
import { flightStyleFor, planDrops } from "../design/skyDrop";
import { SHADOW_BOX } from "../design/fruitShapes";
import {
  followFlight,
  playTimeline,
  rollsLikeBall,
  useReducedMotion,
} from "./fruitMotion";

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

interface PlacedFruit {
  story: NovelSummary;
  rest: { x: number; y: number; depth: number };
  flight: FruitFlight;
  delayMs: number;
}

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
  const plans = planDrops(
    {
      view,
      bounds: {
        left: GROUND.left * scale,
        right: GROUND.right * scale,
        top: fieldTop + GROUND.top * scale,
        bottom: fieldTop + GROUND.bottom * scale,
      },
      fruitSize: FRUIT_SIZE * scale,
      scale,
    },
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
      size: FRUIT_SIZE * scale,
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
  return { fruits: backToFront, scale };
}

function FallingFruit({
  fruit,
  size,
  reduced,
  onOpen,
}: {
  fruit: PlacedFruit;
  size: number;
  reduced: boolean;
  onOpen: (story: NovelSummary) => void;
}) {
  const { story, rest, flight, delayMs } = fruit;
  const shape = fruitShapeOf(story.id);
  const isBall = rollsLikeBall(shape);
  const left = rest.x - size / 2;
  const top = rest.y - size * FRUIT_BOTTOM;

  // 진행률 0은 화면 밖 하늘에 있는 처음 자리라, 첫 그리기부터 열매가 땅에 번쩍 보이지 않는다.
  const progress = useRef(new Animated.Value(0)).current;
  const landed = useRef(false);

  useEffect(() => {
    // 동작 줄이기 설정이거나 이미 내려앉았으면 다시 떨어지지 않고 제자리만 맞춘다.
    // 화면 크기가 바뀌거나 오류 안내가 떠도 열매가 처음부터 다시 떨어지지 않게 하려는 것이다.
    if (reduced || landed.current) {
      progress.setValue(1);
      return;
    }
    progress.setValue(0);
    const motion = playTimeline(progress, flight.durationMs, delayMs);
    motion.start(({ finished }) => {
      if (finished) landed.current = true;
    });
    return () => motion.stop();
  }, [progress, reduced, flight, delayMs]);

  const motion = useMemo(
    () => followFlight(progress, flight),
    [progress, flight],
  );

  // 멀리 있는 열매는 살짝 옅어 보이게 한다.
  const color = lighten(storyColorOf(story.id), (1 - rest.depth) * 0.6);

  return (
    <>
      <Animated.View
        style={[
          styles.layer,
          styles.passThrough,
          styles.shadow,
          {
            // 그림자는 열매와 같은 칸 좌표로 그려서 열매 바닥에 그대로 붙는다.
            left: left + (SHADOW_BOX.left / 40) * size,
            top: top + (SHADOW_BOX.top / 40) * size,
            opacity: motion.shadowOpacity,
            transform: [
              { translateX: motion.translateX },
              { translateY: motion.shadowTranslateY },
              { scale: motion.shadowScale },
            ],
          },
        ]}
      >
        <FruitShadow shape={shape} size={size} />
      </Animated.View>
      <Animated.View
        style={[
          styles.layer,
          styles.fallingBody,
          {
            left,
            top,
            width: size,
            height: size,
            transform: [
              { translateX: motion.translateX },
              { translateY: motion.translateY },
              { scaleX: motion.scaleX },
              { scaleY: motion.scaleY },
            ],
          },
        ]}
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${story.title} 열매`}
          hitSlop={6}
          onPress={() => onOpen(story)}
          style={{ width: size, height: size }}
        >
          {/* 구는 돌아도 겉모양이 같으므로 몸통은 그대로 두고 꼭지만 돌린다.
              그래야 굴러가는 동안에도 빛이 늘 왼쪽 위에서 비친다. */}
          {isBall && <FruitBody shape={shape} color={color} size={size} />}
          <Animated.View
            style={[
              styles.rollingBody,
              { transform: [{ rotate: motion.rotate }] },
            ]}
          >
            {!isBall && (
              <View style={styles.overlay}>
                <FruitBody shape={shape} color={color} size={size} />
              </View>
            )}
            <View style={styles.overlay}>
              <FruitStem shape={shape} size={size} />
            </View>
          </Animated.View>
        </Pressable>
      </Animated.View>
    </>
  );
}

// 홈 화면의 열매 밭. 오로지 열매와 땅만 있다. 소설 열매가 하나씩 화면 밖 하늘에서 떨어져 흰 땅에 부딪히고,
// 털썩 멈추거나, 굴러가거나, 크게 튀어 다른 자리로 가서 멈춘다. 누르면 그 소설로 간다.
export function FruitField({
  stories,
  onOpen,
}: {
  stories: NovelSummary[];
  onOpen: (story: NovelSummary) => void;
}) {
  const reduced = useReducedMotion();
  const [area, setArea] = useState({ width: 0, height: 0 });
  // 홈에 들어올 때마다 열매가 튀고 굴러간 결과가 달라진다. 한 번 정해지면 화면 크기가 바뀌어도 그대로다.
  const [seed] = useState(() => Math.floor(Math.random() * 2 ** 31));
  const field = useMemo(
    () =>
      area.width > 0
        ? layoutField(area.width, area.height, stories, seed)
        : undefined,
    [area.width, area.height, stories, seed],
  );

  return (
    <View
      style={styles.stage}
      onLayout={(event: LayoutChangeEvent) => {
        const { width, height } = event.nativeEvent.layout;
        setArea({ width, height });
      }}
    >
      {field?.fruits.map((fruit) => (
        <FallingFruit
          key={fruit.story.id}
          fruit={fruit}
          size={FRUIT_SIZE * field.scale * fruit.rest.depth}
          reduced={reduced}
          onOpen={onOpen}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  // 열매가 이 영역 위쪽 여백과 상태 표시줄 너머 화면 밖에서 들어오도록, 영역 밖도 자르지 않는다.
  stage: { flex: 1, width: "100%", overflow: "visible" },
  layer: { position: "absolute" },
  // 원근으로 커지거나 땅에 눌릴 때는 바닥을 축으로 한다.
  // 네이티브의 transformOrigin은 정수 퍼센트만 읽으므로 반올림해 둔다.
  fallingBody: { transformOrigin: `50% ${Math.round(FRUIT_BOTTOM * 100)}%` },
  // 구를 때는 몸통 가운데를 축으로 한다.
  rollingBody: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    transformOrigin: `${FRUIT_CENTER.x} ${FRUIT_CENTER.y}`,
  },
  // 열매가 떠오르면 그림자는 땅에 닿는 점을 향해 줄어든다.
  // 네이티브의 transformOrigin은 정수 퍼센트만 읽으므로 반올림해 둔다.
  shadow: {
    transformOrigin: `${Math.round(SHADOW_ORIGIN.x * 100)}% ${Math.round(SHADOW_ORIGIN.y * 100)}%`,
  },
  // 몸통과 꼭지 그림을 같은 자리에 겹쳐 놓는다.
  overlay: { position: "absolute", top: 0, left: 0 },
  // 그림자가 뒤쪽 열매를 누르는 손가락을 가로채지 않게 한다.
  passThrough: { pointerEvents: "none" },
});
