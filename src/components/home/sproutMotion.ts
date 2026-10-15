import { useEffect, useMemo, useRef } from "react";
import { Animated, Easing } from "react-native";
import type { Track } from "../../design/canopyShow";
import {
  BLINK,
  DOT_POP,
  DROOP,
  EFFECT_MS,
  LEAVES_END_MS,
  PRESSED_SCALE,
  WIGGLE,
} from "../../design/refreshSprout";
import { nativeDriverEnabled, useReducedMotion } from "../fruitMotion";

// 나무 연출 중이거나 오늘 횟수를 다 썼을 때의 투명도와, 흐려지고 돌아오는 시간
const DIM_OPACITY = 0.45;
const DIM_FADE_MS = 200;

// 미리 정한 값(Track)을 차례로 지나간다. 지금 값에서 출발하므로, 기운 채로 다시 누르면 똑바로 튀었다가
// 다시 기울지 않고 그 자리에서 이어진다. 새 움직임이 시작되면 같은 값의 이전 움직임은 멈춘다.
function playTrack(value: Animated.Value, track: Track) {
  return Animated.sequence(
    track.times.slice(1).map((time, index) =>
      Animated.timing(value, {
        toValue: track.values[index + 1],
        duration: time - track.times[index],
        easing: Easing.inOut(Easing.quad),
        useNativeDriver: nativeDriverEnabled,
      }),
    ),
  );
}

// 새로고침 새싹 버튼의 움직임. 모두 크기·회전·투명도라 네이티브 드라이버로 돈다.
// 동작 줄이기 설정이면 효과 없이 흐려지기만 한다.
export function useSproutMotion({
  left,
  dimmed,
}: {
  // 오늘 남은 무료 새로고침. 줄어들면 막 비워진 점이 톡 커졌다 돌아온다.
  left: number | undefined;
  // 연출 중이거나 다 써서 흐리게 둘 때
  dimmed: boolean;
}) {
  const reduced = useReducedMotion();
  const squash = useRef(new Animated.Value(1)).current;
  // 휘청이는 각도와 시무룩하게 기우는 각도(도). 둘을 더해 새싹을 돌린다.
  const wiggle = useRef(new Animated.Value(0)).current;
  const droop = useRef(new Animated.Value(0)).current;
  // 흩날리는 잎의 시계(ms). 0이면 아직 나타나기 전, 끝이면 다 사라진 뒤라 둘 다 보이지 않는다.
  const leafClock = useRef(new Animated.Value(0)).current;
  const dotsOpacity = useRef(new Animated.Value(1)).current;
  const dotPop = useRef(new Animated.Value(1)).current;
  const dim = useRef(new Animated.Value(dimmed ? DIM_OPACITY : 1)).current;
  const pressedAt = useRef(0);
  const shownLeft = useRef(left);

  useEffect(() => {
    const target = dimmed ? DIM_OPACITY : 1;
    if (reduced) {
      dim.setValue(target);
      return;
    }
    // 누르자마자 흐려지면 효과가 묻히므로, 누른 직후에는 효과가 끝날 때까지 기다렸다 흐리게 한다.
    const sincePress = Date.now() - pressedAt.current;
    const delay = dimmed ? Math.max(0, EFFECT_MS - sincePress) : 0;
    const fade = Animated.timing(dim, {
      toValue: target,
      duration: DIM_FADE_MS,
      delay,
      useNativeDriver: nativeDriverEnabled,
    });
    fade.start();
    return () => fade.stop();
  }, [dimmed, reduced, dim]);

  useEffect(() => {
    const previous = shownLeft.current;
    shownLeft.current = left;
    if (reduced || left === undefined || previous === undefined) return;
    if (left >= previous) return;
    const pop = Animated.sequence([
      Animated.timing(dotPop, {
        toValue: DOT_POP.scale,
        duration: DOT_POP.durationMs * 0.4,
        easing: Easing.out(Easing.quad),
        useNativeDriver: nativeDriverEnabled,
      }),
      Animated.timing(dotPop, {
        toValue: 1,
        duration: DOT_POP.durationMs * 0.6,
        easing: Easing.inOut(Easing.quad),
        useNativeDriver: nativeDriverEnabled,
      }),
    ]);
    pop.start();
    return () => pop.stop();
  }, [left, reduced, dotPop]);

  const sproutAngle = useMemo(
    () =>
      Animated.add(wiggle, droop).interpolate({
        inputRange: [-180, 180],
        outputRange: ["-180deg", "180deg"],
      }),
    [wiggle, droop],
  );

  // 손가락이 닿으면 꾹 들어가고, 떼면 통 튀어 올랐다 자리 잡는다.
  const pressIn = () => {
    if (reduced) return;
    Animated.timing(squash, {
      toValue: PRESSED_SCALE,
      duration: 90,
      easing: Easing.out(Easing.quad),
      useNativeDriver: nativeDriverEnabled,
    }).start();
  };
  const pressOut = () => {
    if (reduced) return;
    Animated.spring(squash, {
      toValue: 1,
      stiffness: 320,
      damping: 11,
      useNativeDriver: nativeDriverEnabled,
    }).start();
  };

  // 눌렀을 때의 효과. 남은 횟수가 있으면 휘청이며 잎이 흩날리고, 다 썼으면 시무룩하게 기울며 빈 점이 깜빡인다.
  const play = (usedUp: boolean) => {
    pressedAt.current = Date.now();
    if (reduced) return;
    if (usedUp) {
      Animated.parallel([
        playTrack(droop, DROOP),
        playTrack(dotsOpacity, BLINK),
      ]).start();
      return;
    }
    leafClock.setValue(0);
    Animated.parallel([
      playTrack(wiggle, WIGGLE),
      Animated.timing(leafClock, {
        toValue: LEAVES_END_MS,
        duration: LEAVES_END_MS,
        easing: Easing.linear,
        useNativeDriver: nativeDriverEnabled,
      }),
    ]).start();
  };

  return {
    reduced,
    squash,
    dim,
    sproutAngle,
    leafClock,
    dotsOpacity,
    dotPop,
    pressIn,
    pressOut,
    play,
  };
}
