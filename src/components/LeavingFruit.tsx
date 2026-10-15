import { useEffect, useMemo, useRef } from "react";
import { Animated, Easing, StyleSheet } from "react-native";
import type { NovelSummary } from "../api/types";
import { fruitShapeOf, lighten, storyColorOf } from "../theme";
import { SHADOW_BOX } from "../design/fruitShapes";
import type { RollAway } from "../design/rollAway";
import { FRUIT_BOTTOM, FruitShadow, SHADOW_ORIGIN } from "./FruitArt";
import { FruitFigure } from "./FruitFigure";
import { nativeDriverEnabled, nativeValue } from "./fruitMotion";

// 동작 줄이기에서는 굴러 나가는 대신 이 시간 동안 흐려지며 사라진다.
const FADE_MS = 300;

// 새로고침할 때 땅에 있던 열매. 열매 밭이 미리 정한 길(path)을 따라 바깥쪽 사방으로 데굴데굴 굴러 나가고,
// 다 나가면 onGone으로 알린다. 이미 떠나는 열매라 누를 수 없다.
export function LeavingFruit({
  story,
  rest,
  size,
  path,
  delayMs,
  layer,
  reduced,
  onGone,
}: {
  story: NovelSummary;
  rest: { x: number; y: number; depth: number };
  size: number;
  // 굴러 나가는 길(src/design/rollAway.ts)
  path: RollAway;
  delayMs: number;
  // 쌓는 순서. 새로고침 나무보다 뒤에 그려 뒤로 굴러간 열매가 나무에 가린다.
  layer: number;
  reduced: boolean;
  onGone: () => void;
}) {
  const shape = fruitShapeOf(story.id);
  const clock = useRef(nativeValue(0)).current;
  const fade = useRef(nativeValue(1)).current;
  // 마지막으로 받은 onGone을 부른다. 매번 새 함수를 받아도 움직임을 다시 시작하지 않게 한다.
  const goneRef = useRef(onGone);
  goneRef.current = onGone;

  useEffect(() => {
    const motion = reduced
      ? Animated.timing(fade, {
          toValue: 0,
          duration: FADE_MS,
          easing: Easing.out(Easing.quad),
          useNativeDriver: nativeDriverEnabled,
        })
      : Animated.timing(clock, {
          toValue: path.durationMs,
          duration: path.durationMs,
          delay: delayMs,
          easing: Easing.linear,
          useNativeDriver: nativeDriverEnabled,
        });
    motion.start(({ finished }) => {
      if (finished) goneRef.current();
    });
    return () => motion.stop();
  }, [reduced, clock, fade, path, delayMs]);

  const motion = useMemo(() => {
    const along = (values: number[]) =>
      clock.interpolate({
        inputRange: path.times,
        outputRange: values,
        extrapolate: "clamp",
      });
    return {
      translateX: along(path.offsetX),
      translateY: along(path.offsetY),
      groundTranslateY: along(path.groundOffsetY),
      nearness: along(path.nearness),
      opacity: Animated.multiply(fade, along(path.opacity)),
      rotate: clock.interpolate({
        inputRange: path.times,
        outputRange: path.angle.map((degrees) => `${degrees}deg`),
        extrapolate: "clamp",
      }),
    };
  }, [clock, fade, path]);
  const color = lighten(
    storyColorOf(story.id),
    Math.max(0, 1 - rest.depth) * 0.6,
  );
  const left = rest.x - size / 2;
  const top = rest.y - size * FRUIT_BOTTOM;

  return (
    <>
      <Animated.View
        style={[
          styles.layer,
          styles.shadow,
          {
            zIndex: layer,
            left: left + (SHADOW_BOX.left / 40) * size,
            top: top + (SHADOW_BOX.top / 40) * size,
            opacity: motion.opacity,
            transform: [
              { translateX: motion.translateX },
              { translateY: motion.groundTranslateY },
              { scale: motion.nearness },
            ],
          },
        ]}
      >
        <FruitShadow shape={shape} size={size} />
      </Animated.View>
      <Animated.View
        style={[
          styles.layer,
          styles.body,
          {
            zIndex: layer,
            left,
            top,
            width: size,
            height: size,
            opacity: motion.opacity,
            transform: [
              { translateX: motion.translateX },
              { translateY: motion.translateY },
              { scale: motion.nearness },
            ],
          },
        ]}
      >
        <FruitFigure
          shape={shape}
          color={color}
          size={size}
          rotate={motion.rotate}
        />
      </Animated.View>
    </>
  );
}

const styles = StyleSheet.create({
  layer: { position: "absolute", pointerEvents: "none" },
  // 가까워지거나 멀어지면 바닥을 축으로 커지고 작아진다.
  // 네이티브의 transformOrigin은 정수 퍼센트만 읽으므로 반올림해 둔다.
  body: { transformOrigin: `50% ${Math.round(FRUIT_BOTTOM * 100)}%` },
  // 그림자는 열매가 땅에 닿는 점을 기준으로 줄었다 늘어난다.
  shadow: {
    transformOrigin: `${Math.round(SHADOW_ORIGIN.x * 100)}% ${Math.round(SHADOW_ORIGIN.y * 100)}%`,
  },
});
