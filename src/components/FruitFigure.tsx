import { Animated, StyleSheet, View } from "react-native";
import type { FruitShape } from "../theme";
import { FRUIT_BOTTOM, FRUIT_CENTER, FruitBody, FruitStem } from "./FruitArt";
import { rollsLikeBall } from "./fruitMotion";

type Angle = string | Animated.AnimatedInterpolation<string>;

// 홈 열매의 몸통과 꼭지. 굴러가며 돌고, 인기 열매는 땅에 가만히 있는 동안 흔들린다.
// 누르는 영역(바깥 뷰)은 그대로 두고 이 그림만 움직인다.
export function FruitFigure({
  shape,
  color,
  size,
  rotate,
  sway,
}: {
  shape: FruitShape;
  color: string;
  size: number;
  // 구르거나 기울어 있는 각도
  rotate: Angle;
  // 인기 열매의 흔들림(src/components/FruitGlow.tsx의 useSway)
  sway: { tilt: Angle; roll: Animated.AnimatedInterpolation<number> };
}) {
  const isBall = rollsLikeBall(shape);
  // 모난 열매는 땅에 닿은 점을 축으로 기우뚱하고,
  // 구는 꼭지를 돌리며 그만큼 옆으로 굴러 제자리에서 구르듯 흔들린다.
  const swaying = isBall
    ? [{ translateX: sway.roll }]
    : [{ rotate: sway.tilt }];
  const stemTilt = isBall ? sway.tilt : "0deg";

  return (
    <Animated.View style={[styles.swaying, { transform: swaying }]}>
      {/* 구는 돌아도 겉모양이 같으므로 몸통은 그대로 두고 꼭지만 돌린다.
          그래야 굴러가는 동안에도 빛이 늘 왼쪽 위에서 비친다. */}
      {isBall && <FruitBody shape={shape} color={color} size={size} />}
      <Animated.View
        style={[
          styles.rollingBody,
          { transform: [{ rotate }, { rotate: stemTilt }] },
        ]}
      >
        {!isBall && (
          <View style={styles.overlay}>
            <FruitBody shape={shape} color={color} size={size} />
          </View>
        )}
        <View style={styles.overlay}>
          <FruitStem shape={shape} size={size} />
        </View>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  // 흔들릴 때는 바닥을 축으로 한다.
  // 네이티브의 transformOrigin은 정수 퍼센트만 읽으므로 반올림해 둔다.
  swaying: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    transformOrigin: `50% ${Math.round(FRUIT_BOTTOM * 100)}%`,
  },
  // 구를 때는 몸통 가운데를 축으로 한다.
  rollingBody: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    transformOrigin: `${FRUIT_CENTER.x} ${FRUIT_CENTER.y}`,
  },
  // 몸통과 꼭지 그림을 같은 자리에 겹쳐 놓는다.
  overlay: { position: "absolute", top: 0, left: 0 },
});
