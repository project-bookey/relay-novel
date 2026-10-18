import { memo, useMemo } from "react";
import { StyleSheet, View } from "react-native";
import Svg, { G, Path } from "react-native-svg";
import { useColors } from "../../theme/themed";
import type { ScreenPoint } from "../../design/fruitFlight";
import { meadowPaths, scatterMeadow } from "../../design/meadow";

// 홈 열매 밭 뒤에 흩뿌린 풀과 꽃(모양과 자리는 src/design/meadow.ts). 바탕은 칠하지 않고 화면 전체에 겹쳐 두며,
// 누르기를 가로채지 않는다. 열매 밭과 같은 배율·자리로 그려서 열매가 늘 풀 사이에 놓인다.
export const Meadow = memo(function Meadow({
  windowWidth,
  windowHeight,
  origin,
  scale,
  fieldTop,
}: {
  windowWidth: number;
  windowHeight: number;
  // 열매 밭 왼쪽 위의 화면 자리
  origin: ScreenPoint;
  // 열매 밭 그림 좌표의 배율과 위쪽 자리(fruitLayout의 fieldPlacementOf)
  scale: number;
  fieldTop: number;
}) {
  const colors = useColors();
  // 열매 밭 그림 좌표의 원점이 놓이는 화면 자리
  const fieldX = origin.x;
  const fieldY = origin.y + fieldTop;
  const shapes = useMemo(() => {
    const view = {
      left: -fieldX / scale,
      right: (windowWidth - fieldX) / scale,
      bottom: (windowHeight - fieldY) / scale,
    };
    return meadowPaths(scatterMeadow(view));
  }, [fieldX, fieldY, scale, windowWidth, windowHeight]);

  return (
    <View
      style={[
        styles.backdrop,
        {
          left: -origin.x,
          top: -origin.y,
          width: windowWidth,
          height: windowHeight,
        },
      ]}
    >
      <Svg width={windowWidth} height={windowHeight}>
        <G transform={`translate(${fieldX} ${fieldY}) scale(${scale})`}>
          <Path d={shapes.sideBlades} fill={colors.grassBlade} />
          <Path d={shapes.midBlades} fill={colors.grassBladeDeep} />
          <Path
            d={shapes.stems}
            fill="none"
            stroke={colors.grassBladeDeep}
            strokeWidth={1}
            strokeLinecap="round"
          />
          <Path
            d={shapes.petals[0]}
            fill={colors.flowerPetal}
            stroke={colors.flowerPetalEdge}
            strokeWidth={0.6}
          />
          <Path d={shapes.petals[1]} fill={colors.flowerPetalWarm} />
          <Path d={shapes.cores[0]} fill={colors.flowerCore} />
          <Path d={shapes.cores[1]} fill={colors.flowerCoreWarm} />
        </G>
      </Svg>
    </View>
  );
});

const styles = StyleSheet.create({
  backdrop: { position: "absolute", pointerEvents: "none" },
});
