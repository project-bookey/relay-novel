import type { Animated } from "react-native";
import type { Point } from "../../design/fruitShapes";
import type { Track } from "../../design/canopyShow";

type Clock = Animated.Value;
export type Moving = number | Animated.AnimatedInterpolation<number>;
export type Turning = string | Animated.AnimatedInterpolation<string>;

// 미리 계산한 값(Track)을 연출 시계(ms)에 맞춰 따라간다. 시계가 끝을 지나면 마지막 값에 머문다.
// 연출이 없으면(쉬는 나무·동작 줄이기) 가만히 있는 값 하나를 그대로 쓴다.
export function follow(
  clock: Clock | undefined,
  track: Track | undefined,
  resting: number,
  scale = 1,
): Moving {
  if (!clock || !track) return resting * scale;
  return clock.interpolate({
    inputRange: track.times,
    outputRange: track.values.map((value) => value * scale),
    extrapolate: "clamp",
  });
}

export function followAngle(
  clock: Clock | undefined,
  track: Track | undefined,
  resting: number,
): Turning {
  if (!clock || !track) return `${resting}deg`;
  return clock.interpolate({
    inputRange: track.times,
    outputRange: track.values.map((value) => `${value}deg`),
    extrapolate: "clamp",
  });
}

// pivot을 축으로 angle만큼 돌린다. React Native는 뷰 가운데를 축으로 돌리므로,
// 축이 뷰 가운데에서 떨어진 만큼(offset, 화면 px) 옮겼다가 돌리고 되돌린다.
export function turnAround(offset: Point, angle: Turning) {
  return [
    { translateX: offset.x },
    { translateY: offset.y },
    { rotate: angle },
    { translateX: -offset.x },
    { translateY: -offset.y },
  ];
}

// 뷰 가운데에서 offset만큼 떨어진 점을 축으로 늘이고 줄인다.
export function scaleAround(offset: Point, scale: Moving) {
  return [
    { translateX: offset.x },
    { translateY: offset.y },
    { scale },
    { translateX: -offset.x },
    { translateY: -offset.y },
  ];
}
