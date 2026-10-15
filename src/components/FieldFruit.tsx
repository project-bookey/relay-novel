import { useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
  Platform,
  Pressable,
  StyleSheet,
  View,
  type ViewStyle,
} from "react-native";
import type { NovelSummary } from "../api/types";
import { fruitShapeOf, lighten, storyColorOf } from "../theme";
import { FRUIT_BOTTOM, FruitShadow, SHADOW_ORIGIN } from "./FruitArt";
import { FruitFigure } from "./FruitFigure";
import type { HandDrop, RestingFruit } from "../design/handDrop";
import { SHADOW_BOX } from "../design/fruitShapes";
import { isPopular, swayDelayOf } from "../design/fruitGlow";
import { followFlight, playTimeline, rollsLikeBall } from "./fruitMotion";
import { useFruitHand, type FieldGround } from "./fruitHand";
import { FruitBubble } from "./FruitBubble";
import { FruitSparkles, useSway } from "./FruitGlow";
import {
  finalAngleOf,
  placementFrom,
  type PlacedFruit,
  type Placement,
} from "./fruitPlacement";

// 든 열매는 다른 열매보다 앞에 보인다. 말풍선은 그보다 앞이다.
const HELD_LAYER = 100000;
const BUBBLE_LAYER = HELD_LAYER + 1;

// 땅에 놓인 열매들의 자리와 기울기를 함께 적어 두는 곳. 손으로 놓은 열매가 다른 열매 위에 겹치지 않게 하고,
// 새로고침하면 지금 놓인 자리에서 굴러 나가게 한다. 같은 소설이 새 묶음에 다시 올 수 있어 열매마다 붙인 key로 적는다.
export interface FruitNeighbors {
  report: (key: string, rest: RestingFruit, angle: number) => void;
  forget: (key: string) => void;
  othersThan: (key: string) => RestingFruit[];
}

// 웹 브라우저가 열매를 끄는 손가락을 화면 스크롤이나 당겨서 새로고침으로 가져가 끌기가 끊기지 않게 한다.
// 웹에만 있는 스타일이라 React Native 타입에는 없다.
const keepTouchOnWeb =
  Platform.OS === "web"
    ? ({ touchAction: "none" } as unknown as ViewStyle)
    : undefined;

// 홈 열매 하나. 하늘에서 떨어져 내려앉고, 누르면 그 소설로 간다.
// 끌거나 길게 누르면 집혀 손가락 아래에 붙어 따라오고, 놓으면 바로 아래 땅으로 떨어져 튄 뒤 멈춘다.
export function FieldFruit({
  fruitKey,
  fruit,
  story,
  delivered,
  ground,
  neighbors,
  reduced,
  onScreen,
  onOpen,
}: {
  // 열매 밭에서 이 열매를 가리키는 key(새로고침 차례와 소설 id)
  fruitKey: string;
  fruit: PlacedFruit;
  // 지금 소설 정보. 배치한 뒤 좋아요 수 등이 바뀌어도 최신 것을 보여 준다.
  story: NovelSummary;
  // 나에게 배달된 열매인지. 말풍선과 접근성 이름에 알린다.
  delivered: boolean;
  ground: FieldGround;
  neighbors: FruitNeighbors;
  reduced: boolean;
  // 홈이 지금 보이는지. 가려져 있으면 인기 열매의 흔들림·반짝임을 멈춘다.
  onScreen: boolean;
  onOpen: (story: NovelSummary) => void;
}) {
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
  // 집을 수 있는지는 누르는 순간 바로 알아야 해서 ref에 두고, 인기 열매의 반짝이와 흔들림은
  // 내려앉았을 때 다시 그려야 켜지므로 같은 값을 상태로도 둔다.
  const landed = useRef(false);
  const [settled, setSettled] = useState(false);
  const markLanded = (value: boolean) => {
    landed.current = value;
    setSettled(value);
  };

  useEffect(() => {
    // 동작 줄이기 설정이거나 이미 내려앉았으면 다시 떨어지지 않고 제자리만 맞춘다.
    // 화면 크기가 바뀌거나 오류 안내가 떠도 열매가 처음부터 다시 떨어지지 않게 하려는 것이다.
    if (reduced || (landed.current && !droppedByHand)) {
      progress.setValue(1);
      markLanded(true);
      return;
    }
    markLanded(false);
    progress.setValue(0);
    const motion = playTimeline(progress, flight.durationMs, delayMs);
    motion.start(({ finished }) => {
      if (finished) markLanded(true);
    });
    return () => motion.stop();
  }, [progress, reduced, flight, delayMs, droppedByHand]);

  const restingAngle = finalAngleOf(placement);
  useEffect(() => {
    neighbors.report(fruitKey, rest, restingAngle);
  }, [neighbors, fruitKey, rest, restingAngle]);
  useEffect(() => () => neighbors.forget(fruitKey), [neighbors, fruitKey]);

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
    otherFruits: () => neighbors.othersThan(fruitKey),
    onDrop: dropFromHand,
  });
  const { held } = hand;

  const onPress = () => {
    if (hand.justHeld()) return;
    onOpen(story);
  };

  // 멀리 있는 열매는 살짝 옅어 보이게 한다. 앞줄보다 가까이 옮긴 열매는 제 색 그대로 둔다.
  const farness = Math.max(0, 1 - rest.depth);
  const color = lighten(storyColorOf(story.id), farness * 0.6);
  const motion = held ? hand.holding : falling;
  const rotate = held ? `${finalAngleOf(placement)}deg` : falling.rotate;
  // 좋아요를 많이 받은 열매는 땅에 가만히 있는 동안 둘레에서 별이 반짝이고 오뚝이처럼 기우뚱한다.
  // 홈이 가려져 있거나 동작 줄이기면 별은 가만히 켜 두고 흔들지 않는다.
  const popular = isPopular(story.likeCount);
  const glowing = popular && settled && !held;
  const glowMoves = onScreen && !reduced;
  const sway = useSway(glowing && glowMoves, swayDelayOf(story.id), size);
  // 그림을 볼 수 없는 사람도 인기 열매인 줄 알 수 있게 이름 앞에 붙인다.
  const popularLabel = popular
    ? `인기 ${story.title} 열매`
    : `${story.title} 열매`;
  const label = delivered ? `나에게 온 ${popularLabel}` : popularLabel;
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
          keepTouchOnWeb,
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
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={label}
          hitSlop={6}
          {...hand.pressHandlers}
          onPress={onPress}
          style={{ width: size, height: size }}
        >
          <FruitFigure
            shape={shape}
            color={color}
            size={size}
            rotate={rotate}
            sway={sway}
          />
        </Pressable>
      </Animated.View>
      {glowing && (
        <FruitSparkles
          fruitLeft={left}
          fruitTop={top}
          size={size}
          layer={layer + 1}
          startDelayMs={swayDelayOf(story.id)}
          moving={glowMoves}
        />
      )}
      {held && (
        <View style={[styles.bubbleLayer, { zIndex: BUBBLE_LAYER }]}>
          <FruitBubble
            story={story}
            delivered={delivered}
            centerX={hand.bubble.centerX}
            top={hand.bubble.top}
            appear={hand.bubble.appear}
            screenWidth={ground.view.centerX * 2}
          />
        </View>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  layer: { position: "absolute" },
  // 원근으로 커지거나 땅에 눌릴 때는 바닥을 축으로 한다.
  // 네이티브의 transformOrigin은 정수 퍼센트만 읽으므로 반올림해 둔다.
  fallingBody: { transformOrigin: `50% ${Math.round(FRUIT_BOTTOM * 100)}%` },
  // 열매가 떠오르면 그림자는 땅에 닿는 점을 향해 줄어든다.
  // 네이티브의 transformOrigin은 정수 퍼센트만 읽으므로 반올림해 둔다.
  shadow: {
    transformOrigin: `${Math.round(SHADOW_ORIGIN.x * 100)}% ${Math.round(SHADOW_ORIGIN.y * 100)}%`,
  },
  bubbleLayer: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    pointerEvents: "none",
  },
  // 그림자가 뒤쪽 열매를 누르는 손가락을 가로채지 않게 한다.
  passThrough: { pointerEvents: "none" },
});
