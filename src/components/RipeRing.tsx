import { useEffect, useRef } from "react";
import { Animated, Easing, StyleSheet, View } from "react-native";
import { useColors } from "../theme/themed";
import { nativeDriverEnabled } from "./fruitMotion";
import {
  RING_FROM_SCALE,
  RING_PERIOD_MS,
  RING_STILL_OPACITY,
  RING_STILL_SCALE,
  RING_TO_SCALE,
} from "../design/fruitRipeness";

// 다 여문 열매(좋아요 1000개 이상) 둘레로 금빛 고리가 천천히 퍼진다. 고리 둘이 반 박자씩 엇갈린다.
// 누르기를 가로채지 않는다. 동작 줄이기면 고리 하나를 가만히 둔다.
export function RipeRing({
  centerX,
  centerY,
  diameter,
  layer,
  moving,
}: {
  centerX: number;
  centerY: number;
  diameter: number;
  layer?: number;
  moving: boolean;
}) {
  const frame = {
    left: centerX - diameter / 2,
    top: centerY - diameter / 2,
    width: diameter,
    height: diameter,
    zIndex: layer,
  };
  return (
    <View style={[styles.frame, frame]}>
      <Ring diameter={diameter} moving={moving} delayMs={0} />
      {moving && (
        <Ring
          diameter={diameter}
          moving={moving}
          delayMs={RING_PERIOD_MS / 2}
        />
      )}
    </View>
  );
}

function Ring({
  diameter,
  moving,
  delayMs,
}: {
  diameter: number;
  moving: boolean;
  delayMs: number;
}) {
  const colors = useColors();
  // 0은 막 퍼지기 시작할 때, 1은 가장 크게 퍼져 사라질 때
  const spread = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!moving) return;
    spread.setValue(0);
    const pulse = Animated.loop(
      Animated.timing(spread, {
        toValue: 1,
        duration: RING_PERIOD_MS,
        easing: Easing.out(Easing.quad),
        useNativeDriver: nativeDriverEnabled,
      }),
    );
    const start = setTimeout(() => pulse.start(), delayMs);
    return () => {
      clearTimeout(start);
      pulse.stop();
    };
  }, [spread, moving, delayMs]);

  const scale = moving
    ? spread.interpolate({
        inputRange: [0, 1],
        outputRange: [RING_FROM_SCALE, RING_TO_SCALE],
      })
    : RING_STILL_SCALE;
  const opacity = moving
    ? spread.interpolate({ inputRange: [0, 1], outputRange: [0.9, 0] })
    : RING_STILL_OPACITY;
  return (
    <Animated.View
      style={[
        styles.ring,
        {
          width: diameter,
          height: diameter,
          borderRadius: diameter / 2,
          borderColor: colors.sparkle,
          opacity,
          transform: [{ scale }],
        },
      ]}
    />
  );
}

const styles = StyleSheet.create({
  frame: { position: "absolute", pointerEvents: "none" },
  ring: { position: "absolute", top: 0, left: 0, borderWidth: 2 },
});
