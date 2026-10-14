import { useEffect, useMemo, useRef } from "react";
import { Animated, Easing, StyleSheet } from "react-native";
import Svg, { Circle } from "react-native-svg";
import { colors } from "../theme";
import { FRUIT_CENTER_Y } from "./FruitArt";
import { nativeDriverEnabled } from "./fruitMotion";
import {
  ballRollShift,
  HALO_BREATH_MS,
  HALO_BREATH_SCALE,
  HALO_RINGS,
  SWAY_DEGREES,
  SWAY_PERIOD_MS,
} from "../design/fruitGlow";

// 좋아요를 많이 받은 인기 열매의 후광과 흔들림. 값은 src/design/fruitGlow.ts에 있다.

// 후광이 나타나는 시간. 사라질 때는 바로 꺼서, 집었다 금방 놓아도 새 자리에 지난 후광이 비치지 않게 한다.
const HALO_FADE_MS = 400;
// 흔들림을 멈출 때 똑바로 서기까지의 시간
const SWAY_SETTLE_MS = 160;

const OUTER_RADIUS = HALO_RINGS[0].radius;

// 열매 몸통 뒤에 겹친 연노랑 원 세 겹. 숨 쉬듯 천천히 커졌다 작아진다.
// 모든 열매와 그림자보다 뒤에 깔리고, 누르기를 가로채지 않는다.
export function FruitHalo({
  fruitLeft,
  fruitTop,
  size,
  shown,
  moving,
}: {
  // 열매 그림 칸의 왼쪽 위(열매 밭 기준)와 크기. 후광은 그 안의 몸통 가운데에 맞춘다.
  fruitLeft: number;
  fruitTop: number;
  size: number;
  shown: boolean;
  // 숨쉬기와 페이드를 할지. 동작 줄이기거나 홈이 가려져 있으면 가만히 둔다.
  moving: boolean;
}) {
  const appear = useRef(new Animated.Value(0)).current;
  const breath = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const fade = Animated.timing(appear, {
      toValue: shown ? 1 : 0,
      duration: shown && moving ? HALO_FADE_MS : 0,
      useNativeDriver: nativeDriverEnabled,
    });
    fade.start();
    return () => fade.stop();
  }, [appear, shown, moving]);

  useEffect(() => {
    if (!shown || !moving) {
      breath.setValue(0);
      return;
    }
    const breathe = (toValue: number) =>
      Animated.timing(breath, {
        toValue,
        duration: HALO_BREATH_MS / 2,
        easing: Easing.inOut(Easing.sin),
        useNativeDriver: nativeDriverEnabled,
      });
    const loop = Animated.loop(Animated.sequence([breathe(1), breathe(0)]));
    loop.start();
    return () => loop.stop();
  }, [breath, shown, moving]);

  const radius = size * OUTER_RADIUS;
  const centerX = fruitLeft + size / 2;
  const centerY = fruitTop + size * FRUIT_CENTER_Y;
  const scale = breath.interpolate({
    inputRange: [0, 1],
    outputRange: [1, HALO_BREATH_SCALE],
  });
  return (
    <Animated.View
      style={[
        styles.halo,
        {
          left: centerX - radius,
          top: centerY - radius,
          width: radius * 2,
          height: radius * 2,
          opacity: appear,
          transform: [{ scale }],
        },
      ]}
    >
      <Svg width={radius * 2} height={radius * 2} viewBox="-1 -1 2 2">
        {HALO_RINGS.map((ring) => (
          <Circle
            key={ring.radius}
            cx={0}
            cy={0}
            r={ring.radius / OUTER_RADIUS}
            fill={colors.halo}
            opacity={ring.opacity}
          />
        ))}
      </Svg>
    </Animated.View>
  );
}

// 인기 열매가 땅에 닿은 점을 축으로 오뚝이처럼 좌우로 기우뚱하는 움직임.
// tilt는 기울기, roll은 구가 그 기울기만큼 제자리에서 구를 때 옆으로 가는 거리다.
// 꺼지면(집거나 다시 떨어지는 중) 기울어 있던 데서 금방 똑바로 선다.
// 인기 열매가 아니면 한 번도 움직이지 않으므로, 다른 열매의 움직임에는 손대지 않는다.
export function useSway(active: boolean, delayMs: number, size: number) {
  const sway = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!active) return;
    const swing = (
      toValue: number,
      share: number,
      easing: (progress: number) => number,
    ) =>
      Animated.timing(sway, {
        toValue,
        duration: SWAY_PERIOD_MS * share,
        easing,
        useNativeDriver: nativeDriverEnabled,
      });
    // 똑바로 선 데서 오른쪽 끝, 왼쪽 끝을 거쳐 다시 가운데로. 가운데를 지날 때 가장 빠르고
    // 양 끝에서 잠깐 멈칫하는 시계추 움직임이다.
    const rock = Animated.loop(
      Animated.sequence([
        swing(1, 0.25, Easing.out(Easing.sin)),
        swing(-1, 0.5, Easing.inOut(Easing.sin)),
        swing(0, 0.25, Easing.in(Easing.sin)),
      ]),
    );
    const start = setTimeout(() => rock.start(), delayMs);
    return () => {
      clearTimeout(start);
      rock.stop();
      Animated.timing(sway, {
        toValue: 0,
        duration: SWAY_SETTLE_MS,
        useNativeDriver: nativeDriverEnabled,
      }).start();
    };
  }, [sway, active, delayMs]);

  return useMemo(() => {
    const rollDistance = ballRollShift() * size;
    return {
      tilt: sway.interpolate({
        inputRange: [-1, 1],
        outputRange: [`${-SWAY_DEGREES}deg`, `${SWAY_DEGREES}deg`],
      }),
      roll: sway.interpolate({
        inputRange: [-1, 1],
        outputRange: [-rollDistance, rollDistance],
      }),
    };
  }, [sway, size]);
}

const styles = StyleSheet.create({
  halo: { position: "absolute", zIndex: 0, pointerEvents: "none" },
});
