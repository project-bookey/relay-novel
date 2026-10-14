import { useEffect, useState } from "react";
import { AccessibilityInfo, Animated, Easing, Platform } from "react-native";
import type { FruitFlight } from "../design/fruitFlight";
import type { FruitShape } from "../theme";

// 웹에는 네이티브 애니메이션 모듈이 없어서 켜면 경고만 난다.
export const nativeDriverEnabled = Platform.OS !== "web";

// 처음부터 네이티브 애니메이션 모듈에서 움직이는 값. 손가락을 따라 자주 바꿔도
// React를 거쳐 다시 그리지 않고 바로 화면에 반영된다. 렌더마다 만들면 네이티브 쪽에 값이 쌓이므로 한 번만 만든다.
export function nativeValue(initial: number) {
  return new Animated.Value(initial, { useNativeDriver: nativeDriverEnabled });
}

// 기기의 "동작 줄이기" 설정을 따른다. 켜져 있으면 열매가 처음부터 제자리에 놓인다.
export function useReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    let active = true;
    void AccessibilityInfo.isReduceMotionEnabled().then((enabled) => {
      if (active) setReduced(enabled);
    });
    const subscription = AccessibilityInfo.addEventListener(
      "reduceMotionChanged",
      setReduced,
    );
    return () => {
      active = false;
      subscription.remove();
    };
  }, []);
  return reduced;
}

// 구는 공처럼 굴러가고, 모난 열매(정육면체·피라미드·별사탕)는 공중에서 기우뚱하다 미끄러져 바로 선다.
export function rollsLikeBall(shape: FruitShape) {
  return shape === "sphere";
}

// 미리 계산한 움직임(src/design/fruitFlight.ts)을 처음부터 끝까지 일정한 빠르기로 따라간다.
// 빨라지고 느려지는 건 움직임 자체에 들어 있으므로 여기서는 고르게 진행시킨다.
// 기다리는 동안(delayMs)에는 진행률 0, 곧 화면 밖 하늘의 처음 자리에 머문다.
export function playTimeline(
  progress: Animated.Value,
  durationMs: number,
  delayMs: number,
) {
  return Animated.timing(progress, {
    toValue: 1,
    duration: durationMs,
    delay: delayMs,
    easing: Easing.linear,
    useNativeDriver: nativeDriverEnabled,
  });
}

// 진행률(0~1)을 화면 위치·크기·기울기·그림자로 바꾼다.
// startAngle은 움직이기 전에 이미 기울어 있던 각도다. 다시 떨어뜨린 열매가 그 기울기에서 이어 구른다.
export function followFlight(
  progress: Animated.Value,
  flight: FruitFlight,
  startAngle = 0,
) {
  const along = (values: number[]) =>
    progress.interpolate({ inputRange: flight.times, outputRange: values });
  const turned = (values: number[]) =>
    progress.interpolate({
      inputRange: flight.times,
      outputRange: values.map((angle) => `${startAngle + angle}deg`),
    });
  return {
    translateX: along(flight.offsetX),
    translateY: along(flight.offsetY),
    // 멀리 있을수록 작고, 부딪히면 납작해진다.
    scaleX: along(
      flight.nearness.map(
        (nearness, index) => nearness * flight.stretchX[index],
      ),
    ),
    scaleY: along(
      flight.nearness.map(
        (nearness, index) => nearness * flight.stretchY[index],
      ),
    ),
    rotate: turned(flight.angle),
    shadowTranslateY: along(flight.shadowOffsetY),
    shadowScale: along(flight.shadowScale),
    shadowOpacity: along(flight.shadowOpacity),
  };
}
