import { useEffect, useMemo, useRef } from "react";
import { Animated, Easing, StyleSheet } from "react-native";
import Svg, { Path } from "react-native-svg";
import { colors } from "../theme";
import { nativeDriverEnabled } from "./fruitMotion";
import {
  ballRollShift,
  SPARKLE_PERIOD_MS,
  SPARKLE_SHINE_SHARE,
  SPARKLE_STILL_SHINE,
  SPARKLE_TURN_DEGREES,
  sparkleDelayOf,
  SPARKLES,
  SWAY_DEGREES,
  SWAY_PERIOD_MS,
} from "../design/fruitGlow";

// 좋아요를 많이 받은 인기 열매의 반짝이와 흔들림. 값은 src/design/fruitGlow.ts에 있다.

// 흔들림을 멈출 때 똑바로 서기까지의 시간
const SWAY_SETTLE_MS = 160;

// 가운데로 오목하게 들어간 네 갈래 별. -1~1 칸에 그린다.
const SPARKLE_PATH =
  "M0 -1 Q0.12 -0.12 1 0 Q0.12 0.12 0 1 Q-0.12 0.12 -1 0 Q-0.12 -0.12 0 -1Z";

// 인기 열매 둘레에서 작은 별이 하나씩 차례로 반짝였다 사라진다.
// 열매 그림 칸 위에 겹쳐 놓고, 누르기를 가로채지 않는다.
export function FruitSparkles({
  fruitLeft,
  fruitTop,
  size,
  layer,
  startDelayMs,
  moving,
}: {
  // 열매 그림 칸의 왼쪽 위(열매 밭 기준)와 크기. 별 자리는 이 칸에 대한 비율이다.
  fruitLeft: number;
  fruitTop: number;
  size: number;
  // 열매 몸통과 같은 쌓는 순서. 열매 앞에 보이고, 더 앞쪽 열매에는 가려진다.
  layer: number;
  // 인기 열매 여럿이 한꺼번에 반짝이지 않도록 열매마다 시작을 늦춘다.
  startDelayMs: number;
  // 반짝일지. 동작 줄이기거나 홈이 가려져 있으면 별을 가만히 켜 둔다.
  moving: boolean;
}) {
  return (
    <>
      {SPARKLES.map((sparkle, index) => {
        const radius = sparkle.radius * size;
        return (
          <Sparkle
            key={index}
            left={fruitLeft + sparkle.x * size - radius}
            top={fruitTop + sparkle.y * size - radius}
            radius={radius}
            layer={layer}
            delayMs={startDelayMs + sparkleDelayOf(index)}
            moving={moving}
          />
        );
      })}
    </>
  );
}

function Sparkle({
  left,
  top,
  radius,
  layer,
  delayMs,
  moving,
}: {
  left: number;
  top: number;
  radius: number;
  layer: number;
  delayMs: number;
  moving: boolean;
}) {
  // 0은 꺼짐, 1은 가장 크게 반짝일 때
  const shine = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!moving) {
      shine.setValue(SPARKLE_STILL_SHINE);
      return;
    }
    shine.setValue(0);
    const shineMs = SPARKLE_PERIOD_MS * SPARKLE_SHINE_SHARE;
    const shineTo = (toValue: number) =>
      Animated.timing(shine, {
        toValue,
        duration: shineMs / 2,
        easing: Easing.inOut(Easing.sin),
        useNativeDriver: nativeDriverEnabled,
      });
    const twinkle = Animated.loop(
      Animated.sequence([
        shineTo(1),
        shineTo(0),
        Animated.delay(SPARKLE_PERIOD_MS - shineMs),
      ]),
    );
    const start = setTimeout(() => twinkle.start(), delayMs);
    return () => {
      clearTimeout(start);
      twinkle.stop();
    };
  }, [shine, moving, delayMs]);

  const turn = shine.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", `${SPARKLE_TURN_DEGREES}deg`],
  });
  return (
    <Animated.View
      style={[
        styles.sparkle,
        {
          zIndex: layer,
          left,
          top,
          width: radius * 2,
          height: radius * 2,
          opacity: shine,
          transform: [{ scale: shine }, { rotate: turn }],
        },
      ]}
    >
      <Svg width={radius * 2} height={radius * 2} viewBox="-1 -1 2 2">
        <Path d={SPARKLE_PATH} fill={colors.sparkle} />
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
  sparkle: { position: "absolute", pointerEvents: "none" },
});
