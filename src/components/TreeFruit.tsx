import { useEffect, useRef } from "react";
import { Animated, Easing, StyleSheet, View } from "react-native";
import Svg, { G, Path } from "react-native-svg";
import { mix, type FruitShape, type Palette } from "../theme";
import { useColors } from "../theme/themed";
import { fruitGeometries, GROUND_LINE } from "../design/fruitShapes";
import {
  DANGLE_DEGREES,
  DANGLE_PERIOD_MS,
  RIPE_GOLD_MIX,
  RIPE_STEM_DROOP,
  type TreeFruitLook,
} from "../design/fruitRipeness";
import { FruitFacets } from "./FruitArt";
import { nativeDriverEnabled } from "./fruitMotion";
import { RipeRing } from "./RipeRing";

// 이야기 나무 가지 끝에 매달린 열매. 홈과 같은 우리 열매(면 입체 + 꼭지 + 잎)를 하나 단다.
// 여문 정도(src/design/fruitRipeness.ts)에 따라 풋열매의 연둣빛 → 작품 색, 크기, 잎 수가 달라지고,
// 다 여물면(좋아요 1000개 이상) 꼭지가 늘어져 금빛으로 물든다. 움직일 수 있을 때만 대롱대롱 흔들리고 고리가 퍼진다.
// 그림은 열매 40칸 좌표이고, 꼭지 끝(가지에 매달리는 점)을 (20, stemTopOf)에 둔다.

// 잎이 붙는 방향. 첫 잎은 홈 열매 꼭지 잎 그대로, 다음은 왼쪽, 그다음은 위로 뻗는다.
const LEAF_TURNS = [0, 155, -60];
// 흔들리는 열매 그림 칸: 위로 늘어난 꼭지가 들어가도록 위를 10칸 더 잡는다.
const BOX_TOP = -10;
const BOX_HEIGHT = 50;

export function stemTopOf(shape: FruitShape, ripe: boolean) {
  const droop = ripe ? RIPE_STEM_DROOP : 0;
  return fruitGeometries[shape].stemBase - 6 - droop;
}

function fruitColorsOf(
  colors: Palette,
  color: string,
  look: TreeFruitLook,
  ripe: boolean,
) {
  if (ripe)
    return {
      body: mix(color, colors.sparkle, RIPE_GOLD_MIX),
      leaf: colors.sparkle,
    };
  const body =
    look.unripe > 0 ? mix(color, colors.leafLight, look.unripe) : color;
  return { body, leaf: colors.leaf };
}

// 꼭지·몸통·잎. 나무 그림 안에 바로 넣을 수도, 흔들리는 칸에 넣을 수도 있다.
export function TreeFruitArt({
  shape,
  color,
  look,
  ripe,
}: {
  shape: FruitShape;
  color: string;
  look: TreeFruitLook;
  ripe: boolean;
}) {
  const colors = useColors();
  const { stemBase } = fruitGeometries[shape];
  const stemTop = stemTopOf(shape, ripe);
  const leafBase = { x: 20.4, y: stemBase - 4.2 };
  const tone = fruitColorsOf(colors, color, look, ripe);
  return (
    <G>
      <Path
        d={`M 20 ${stemTop} Q 20.6 ${stemBase - 3} 20 ${stemBase}`}
        stroke={colors.bark}
        strokeWidth={2}
        strokeLinecap="round"
        fill="none"
      />
      <FruitFacets shape={shape} color={tone.body} />
      {LEAF_TURNS.slice(0, look.leaves).map((turn) => (
        <Path
          key={turn}
          transform={`rotate(${turn} ${leafBase.x} ${leafBase.y})`}
          d={`M ${leafBase.x} ${leafBase.y} Q ${leafBase.x + 5.4} ${leafBase.y - 4} ${leafBase.x + 9.4} ${leafBase.y - 1} Q ${leafBase.x + 4.4} ${leafBase.y + 3} ${leafBase.x} ${leafBase.y} Z`}
          fill={tone.leaf}
        />
      ))}
    </G>
  );
}

// 다 여문 열매가 꼭지 끝을 축으로 대롱대롱 흔들린다. 나무 그림 위에 겹쳐 놓는 칸이라 화면 좌표(px)를 받는다.
// withRing이면 둘레로 금빛 고리도 퍼진다(나무마다 하나만).
export function DanglingTreeFruit({
  shape,
  color,
  look,
  stemX,
  stemY,
  width,
  withRing,
}: {
  shape: FruitShape;
  color: string;
  look: TreeFruitLook;
  // 가지 끝(꼭지가 매달리는 점)의 화면 위치
  stemX: number;
  stemY: number;
  // 열매 그림 칸의 가로 크기(px)
  width: number;
  withRing: boolean;
}) {
  const { stemBase } = fruitGeometries[shape];
  const stemTop = stemTopOf(shape, true);
  const unit = width / 40;
  const height = BOX_HEIGHT * unit;
  // 꼭지 끝이 가지 끝에 오도록 그림 칸을 놓는다.
  const left = stemX - 20 * unit;
  const top = stemY - (stemTop - BOX_TOP) * unit;
  const swing = useDangle();
  // 흔들림 축은 꼭지 끝. 네이티브의 transformOrigin은 정수 퍼센트만 읽으므로 반올림한다.
  const pivotY = Math.round(((stemTop - BOX_TOP) / BOX_HEIGHT) * 100);

  return (
    <View style={styles.layer}>
      {withRing && (
        <RipeRing
          centerX={stemX}
          centerY={top + ((stemBase + GROUND_LINE) / 2 - BOX_TOP) * unit}
          diameter={width * 0.9}
          moving
        />
      )}
      <Animated.View
        style={[
          styles.fruit,
          {
            left,
            top,
            width,
            height,
            transformOrigin: `50% ${pivotY}%`,
            transform: [{ rotate: swing }],
          },
        ]}
      >
        <Svg
          width={width}
          height={height}
          viewBox={`0 ${BOX_TOP} 40 ${BOX_HEIGHT}`}
        >
          <TreeFruitArt shape={shape} color={color} look={look} ripe />
        </Svg>
      </Animated.View>
    </View>
  );
}

// 좌우로 천천히 오가는 각도
function useDangle() {
  const swing = useRef(new Animated.Value(-1)).current;
  useEffect(() => {
    const half = (toValue: number) =>
      Animated.timing(swing, {
        toValue,
        duration: DANGLE_PERIOD_MS / 2,
        easing: Easing.inOut(Easing.sin),
        useNativeDriver: nativeDriverEnabled,
      });
    const loop = Animated.loop(Animated.sequence([half(1), half(-1)]));
    loop.start();
    return () => loop.stop();
  }, [swing]);
  return swing.interpolate({
    inputRange: [-1, 1],
    outputRange: [`${-DANGLE_DEGREES}deg`, `${DANGLE_DEGREES}deg`],
  });
}

const styles = StyleSheet.create({
  layer: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    pointerEvents: "none",
  },
  fruit: { position: "absolute" },
});
