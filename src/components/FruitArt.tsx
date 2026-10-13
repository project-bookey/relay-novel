import Svg, { Path, Polygon } from "react-native-svg";
import { colors, darken, lighten, type FruitShape } from "../theme";
import {
  brightnessOf,
  fruitGeometries,
  GROUND_LINE,
  SHADOW_BOX,
  type Direction,
  type Point,
} from "../design/fruitShapes";

// 열매는 40x40 칸에 그린다. 모두 면이 보이는 입체(구·정육면체·피라미드·별사탕)이고,
// 나무 그림처럼 단색 면을 이어 붙인다. 면마다 빛을 얼마나 받는지에 따라 밝기가 다르다.

// 몸통 바닥이 칸 높이의 어디쯤인지. 땅에 놓을 때 이 지점을 땅에 맞춘다.
export const FRUIT_BOTTOM = GROUND_LINE / 40;
// 몸통 한가운데. 구르거나 흔들릴 때 이 점을 축으로 돈다.
export const FRUIT_CENTER = { x: "50%", y: "58%" };

// 나무 그림처럼 몇 가지 단색만 쓰도록 밝기를 다섯 단계로 나눈다.
function facetTone(color: string, facing: Direction) {
  const brightness = brightnessOf(facing);
  if (brightness >= 0.8) return lighten(color, 0.3);
  if (brightness >= 0.55) return lighten(color, 0.1);
  if (brightness >= 0.3) return color;
  if (brightness >= 0.05) return darken(color, 0.14);
  return darken(color, 0.26);
}

function toPoints(corners: Point[]) {
  return corners
    .map((corner) => `${corner.x.toFixed(2)},${corner.y.toFixed(2)}`)
    .join(" ");
}

// 면으로 이루어진 몸통. 빛을 받는 방향에 따라 면마다 밝기가 다르다.
export function FruitBody({
  shape,
  color,
  size,
}: {
  shape: FruitShape;
  color: string;
  size: number;
}) {
  return (
    <Svg width={size} height={size} viewBox="0 0 40 40">
      {fruitGeometries[shape].facets.map((facet, index) => {
        const tone = facetTone(color, facet.facing);
        // 같은 색 테두리를 얇게 둘러 면과 면 사이에 흰 틈이 보이지 않게 한다.
        return (
          <Polygon
            key={index}
            points={toPoints(facet.corners)}
            fill={tone}
            stroke={tone}
            strokeWidth={0.4}
            strokeLinejoin="round"
          />
        );
      })}
    </Svg>
  );
}

// 꼭지와 잎. 몸통과 같은 40x40 칸에 그려서 몸통 위에 겹쳐 놓는다.
export function FruitStem({
  shape,
  size,
}: {
  shape: FruitShape;
  size: number;
}) {
  const { stemBase } = fruitGeometries[shape];
  const stemTop = stemBase - 5.8;
  const leafBase = stemBase - 3.8;
  return (
    <Svg width={size} height={size} viewBox="0 0 40 40">
      <Path
        d={`M 20 ${stemBase} Q 20 ${stemBase - 3.6} 22.2 ${stemTop}`}
        stroke={colors.bark}
        strokeWidth={2}
        strokeLinecap="round"
        fill="none"
      />
      <Path
        d={`M 21.6 ${leafBase} Q 27 ${leafBase - 4} 31 ${leafBase - 1} Q 26 ${leafBase + 3} 21.6 ${leafBase} Z`}
        fill={colors.leaf}
      />
    </Svg>
  );
}

// 그림자 그림에서 열매가 땅에 닿는 점의 위치(비율). 그림자는 이 점을 기준으로 줄었다 늘어난다.
export const SHADOW_ORIGIN = {
  x: (20 - SHADOW_BOX.left) / SHADOW_BOX.width,
  y: (GROUND_LINE - SHADOW_BOX.top) / SHADOW_BOX.height,
};

// 땅에 지는 그림자. 열매가 땅에 닿은 점에서 시작하므로 열매 바닥에 꼭 붙는다.
// 빛이 앞쪽에서 오므로 열매 앞(아래)쪽 땅에는 그림자가 생기지 않는다.
export function FruitShadow({
  shape,
  size,
}: {
  shape: FruitShape;
  size: number;
}) {
  const { shadow } = fruitGeometries[shape];
  const unit = size / 40;
  return (
    <Svg
      width={SHADOW_BOX.width * unit}
      height={SHADOW_BOX.height * unit}
      viewBox={`${SHADOW_BOX.left} ${SHADOW_BOX.top} ${SHADOW_BOX.width} ${SHADOW_BOX.height}`}
    >
      <Polygon
        points={toPoints(shadow)}
        fill={colors.fruitShadow}
        opacity={0.3}
      />
    </Svg>
  );
}
