import { useEffect, useState } from "react";
import { AccessibilityInfo, Animated, Easing, Platform } from "react-native";
import type { FruitPath } from "../design/fruitPath";
import type { FruitShape } from "../theme";

// 웹에는 네이티브 애니메이션 모듈이 없어서 켜면 경고만 난다.
const nativeDriverEnabled = Platform.OS !== "web";

// 높이 있을 때는 카메라에 가까워 크게 보이다가, 땅에 닿으며 제 크기가 된다.
const FALL_START_SCALE = 1.45;

// 하나씩 "톡, 토독" 떨어지도록 열매마다 시작을 조금씩 늦춘다.
const FIRST_DROP_DELAY = 250;
const DROP_INTERVAL = 170;

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

// 미리 계산한 길(src/design/fruitPath.ts)을 처음부터 끝까지 일정한 빠르기로 따라간다.
// 빨라지고 느려지는 건 길 자체에 들어 있으므로 여기서는 고르게 진행시킨다.
export function playAlongPath(
  progress: Animated.Value,
  durationMs: number,
  order: number,
) {
  return Animated.timing(progress, {
    toValue: 1,
    duration: durationMs,
    delay: FIRST_DROP_DELAY + order * DROP_INTERVAL,
    easing: Easing.linear,
    useNativeDriver: nativeDriverEnabled,
  });
}

// 진행률(0~1)을 길 위의 위치·높이·기울기와, 그에 따른 크기·그림자·속도선으로 바꾼다.
export function followPath(
  progress: Animated.Value,
  path: FruitPath,
  size: number,
) {
  const along = (values: number[]) =>
    progress.interpolate({ inputRange: path.times, outputRange: values });
  const startHeight = path.height[0];
  // 땅에 닿아 있으면 1, 열매 세 개 높이 넘게 떠 있으면 0
  const nearGround = path.height.map(
    (height) => 1 - Math.min(1, height / (size * 3)),
  );
  return {
    translateX: along(path.offsetX),
    translateY: along(path.height.map((height) => -height)),
    // 높이 있을 때는 카메라에 가까워 크게 보인다.
    nearness: along(
      path.height.map(
        (height) => 1 + (FALL_START_SCALE - 1) * (height / startHeight),
      ),
    ),
    rotate: progress.interpolate({
      inputRange: path.times,
      outputRange: path.angle.map((angle) => `${angle}deg`),
    }),
    // 열매가 높이 떠 있을수록 그림자는 작고 옅다.
    shadowScale: along(nearGround.map((closeness) => 0.35 + 0.65 * closeness)),
    shadowOpacity: along(nearGround),
    fruitOpacity: progress.interpolate({
      inputRange: [0, path.landingAt * 0.3, 1],
      outputRange: [0, 1, 1],
    }),
    // 속도선은 처음 떨어질 때만 보이고, 땅에서 튕길 때는 보이지 않는다.
    speedLineOpacity: progress.interpolate({
      inputRange: [0, path.landingAt * 0.8, path.landingAt, 1],
      outputRange: [1, 1, 0, 0],
    }),
  };
}
