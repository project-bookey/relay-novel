import { useLayoutEffect, useMemo, useRef } from "react";
import { Animated, Easing } from "react-native";
import { useReducedMotion } from "./fruitMotion";

// 유리 방울이 깔릴 칸. key가 그대로인데 자리만 바뀌면(화면 너비가 바뀌는 등) 움직이지 않고 바로 옮긴다.
export interface LensSpot {
  key: string | number;
  left: number;
  right: number;
}

// 고른 칸 아래에 깔리는 유리 방울(아래 바의 '지금 있는 곳', 열매 탭 장르 바). 다른 칸으로 옮기면 가는 쪽 가장자리가
// 먼저 뻗어 나가고 뒤쪽 가장자리가 늦게 따라와, 물방울처럼 늘어났다가 모이며 살짝 부풀었다 가라앉는다.
// 처음 자리에는 움직임 없이 놓는다. 위치와 너비를 바꾸므로 네이티브 드라이버 없이 움직인다.
export function useLiquidLens(spot: LensSpot | undefined) {
  const reduced = useReducedMotion();
  const left = useRef(new Animated.Value(spot?.left ?? 0)).current;
  const right = useRef(new Animated.Value(spot?.right ?? 0)).current;
  const swell = useRef(new Animated.Value(0)).current;
  const shown = useRef(spot);

  const key = spot?.key;
  const toLeft = spot?.left ?? 0;
  const toRight = spot?.right ?? 0;
  // 칸 자리를 나중에 재는 곳(장르 바)에서 방울이 0 자리에 한 번 그려졌다가 튀지 않도록, 그리기 전에 놓는다.
  useLayoutEffect(() => {
    if (key === undefined) return;
    const from = shown.current;
    shown.current = { key, left: toLeft, right: toRight };
    const movedToOtherSpot = from !== undefined && from.key !== key;
    if (!movedToOtherSpot || reduced) {
      left.setValue(toLeft);
      right.setValue(toRight);
      swell.setValue(0);
      return;
    }
    const lead = { stiffness: 380, damping: 26, useNativeDriver: false };
    const trail = { stiffness: 160, damping: 20, useNativeDriver: false };
    const goingRight = toLeft > from.left;
    const motion = Animated.parallel([
      Animated.spring(left, {
        toValue: toLeft,
        ...(goingRight ? trail : lead),
      }),
      Animated.spring(right, {
        toValue: toRight,
        ...(goingRight ? lead : trail),
      }),
      Animated.sequence([
        Animated.timing(swell, {
          toValue: 1,
          duration: 120,
          easing: Easing.out(Easing.quad),
          useNativeDriver: false,
        }),
        Animated.spring(swell, {
          toValue: 0,
          stiffness: 200,
          damping: 14,
          useNativeDriver: false,
        }),
      ]),
    ]);
    motion.start();
    // 움직이는 중에 또 옮기면 지금 자리에서 새 자리로 이어서 간다.
    return () => motion.stop();
  }, [key, toLeft, toRight, reduced, left, right, swell]);

  return useMemo(
    () => ({
      left,
      width: Animated.subtract(right, left),
      transform: [
        {
          scale: swell.interpolate({
            inputRange: [0, 1],
            outputRange: [1, 1.12],
          }),
        },
      ],
    }),
    [left, right, swell],
  );
}
