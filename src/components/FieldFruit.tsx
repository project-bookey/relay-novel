import { useEffect, useMemo, useRef, useState } from "react";
import { Animated, Platform, Pressable, StyleSheet, View } from "react-native";
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
import type { FruitFlight } from "../design/fruitFlight";
import type { HandDrop } from "../design/handDrop";
import { SHADOW_BOX } from "../design/fruitShapes";
import { followFlight, playTimeline, rollsLikeBall } from "./fruitMotion";
import { useFruitHand, type FieldGround } from "./fruitHand";

// 든 열매는 다른 열매보다 앞에 보인다.
const HELD_LAYER = 100000;

export interface PlacedFruit {
  story: NovelSummary;
  rest: { x: number; y: number; depth: number };
  flight: FruitFlight;
  delayMs: number;
}

// 지금 놓인 자리와 그 자리로 오는 움직임. 손으로 옮기면 바뀐다.
interface Placement {
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

function placementFrom(fruit: PlacedFruit): Placement {
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
function finalAngleOf(placement: Placement) {
  const angles = placement.flight.angle;
  return placement.startAngle + angles[angles.length - 1];
}

// 홈 열매 하나. 하늘에서 떨어져 내려앉고, 누르면 그 소설로 간다.
// 끌거나 길게 누르면 집어 들어 옮길 수 있고, 놓으면 그 자리에서 떨어져 튕기거나 굴러가 멈춘다.
export function FieldFruit({
  fruit,
  ground,
  reduced,
  onOpen,
}: {
  fruit: PlacedFruit;
  ground: FieldGround;
  reduced: boolean;
  onOpen: (story: NovelSummary) => void;
}) {
  const { story } = fruit;
  const shape = fruitShapeOf(story.id);
  const isBall = rollsLikeBall(shape);

  const [moved, setMoved] = useState<Placement>();
  const placement =
    moved && moved.layout === fruit ? moved : placementFrom(fruit);
  const { rest, flight, delayMs, startAngle, droppedByHand } = placement;
  const size = ground.fruitSize * rest.depth;
  const left = rest.x - size / 2;
  const top = rest.y - size * FRUIT_BOTTOM;

  // 진행률 0은 떨어지기 시작하는 처음 자리라, 첫 그리기부터 열매가 땅에 번쩍 보이지 않는다.
  const progress = useRef(new Animated.Value(0)).current;
  const landed = useRef(false);

  useEffect(() => {
    // 동작 줄이기 설정이거나 이미 내려앉았으면 다시 떨어지지 않고 제자리만 맞춘다.
    // 화면 크기가 바뀌거나 오류 안내가 떠도 열매가 처음부터 다시 떨어지지 않게 하려는 것이다.
    if (reduced || (landed.current && !droppedByHand)) {
      progress.setValue(1);
      landed.current = true;
      return;
    }
    landed.current = false;
    progress.setValue(0);
    const motion = playTimeline(progress, flight.durationMs, delayMs);
    motion.start(({ finished }) => {
      if (finished) landed.current = true;
    });
    return () => motion.stop();
  }, [progress, reduced, flight, delayMs, droppedByHand]);

  const falling = useMemo(
    () => followFlight(progress, flight, startAngle),
    [progress, flight, startAngle],
  );

  // 놓은 자리에서 다시 떨어진다. 새 자리로 바꿔 그리는 첫 장면부터 놓은 자리에 보이도록
  // 진행률을 먼저 처음으로 돌린다.
  const dropFromHand = (drop: HandDrop) => {
    progress.setValue(reduced ? 1 : 0);
    setMoved({
      rest: drop.rest,
      flight: drop.flight,
      delayMs: 0,
      startAngle: finalAngleOf(placement),
      droppedByHand: true,
      layout: placement.layout,
    });
  };
  const hand = useFruitHand({
    rest,
    ground,
    reduced,
    rollsLikeBall: isBall,
    canGrab: () => landed.current,
    onDrop: dropFromHand,
  });
  const { held } = hand;

  const onPress = () => {
    if (hand.justDragged()) return;
    onOpen(story);
  };

  // 멀리 있는 열매는 살짝 옅어 보이게 한다.
  const color = lighten(storyColorOf(story.id), (1 - rest.depth) * 0.6);
  const motion = held ? hand.holding : falling;
  const rotate = held ? `${finalAngleOf(placement)}deg` : falling.rotate;
  // 앞쪽 열매가 겹칠 때 앞에 보이도록 땅 위 자리 순서로 쌓는다. 그림자는 열매 몸통보다 아래에 둔다.
  const layer = Math.round(rest.y) * 2;

  return (
    <>
      <Animated.View
        style={[
          styles.layer,
          styles.passThrough,
          styles.shadow,
          {
            zIndex: layer,
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
        {...hand.panHandlers}
        style={[
          styles.layer,
          styles.fallingBody,
          {
            zIndex: held ? HELD_LAYER : layer + 1,
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
        {/* 들어 올린 열매와 원래 누른 자리 사이를 채운다. 웹 마우스는 커서 아래 요소로 끌기를 보내므로(터치는 처음 누른 요소로 보낸다),
            길게 눌러 든 열매가 커서 위로 떠오른 뒤에도 끌기를 이 열매가 이어받게 한다. */}
        {held && Platform.OS === "web" && (
          <View style={[styles.grip, { height: size + hand.holdHeight * 2 }]} />
        )}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${story.title} 열매`}
          hitSlop={6}
          {...hand.pressHandlers}
          onPress={onPress}
          style={{ width: size, height: size }}
        >
          {/* 구는 돌아도 겉모양이 같으므로 몸통은 그대로 두고 꼭지만 돌린다.
              그래야 굴러가는 동안에도 빛이 늘 왼쪽 위에서 비친다. */}
          {isBall && <FruitBody shape={shape} color={color} size={size} />}
          <Animated.View
            style={[styles.rollingBody, { transform: [{ rotate }] }]}
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

const styles = StyleSheet.create({
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
  grip: { position: "absolute", top: 0, left: 0, right: 0 },
  // 그림자가 뒤쪽 열매를 누르는 손가락을 가로채지 않게 한다.
  passThrough: { pointerEvents: "none" },
});
