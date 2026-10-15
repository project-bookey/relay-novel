import { memo, useMemo, type ReactNode } from "react";
import { Animated, StyleSheet } from "react-native";
import Svg, { Circle, Path } from "react-native-svg";
import { colors } from "../../theme";
import {
  CANOPY_HEIGHT,
  CANOPY_WIDTH,
  ROOT_PIVOT,
  branchGroups,
  branchLayers,
  foliageLayers,
  perches,
  type BranchGroup,
  type Bounds,
  type LeafTone,
} from "../../design/canopy";
import type { CanopyShow } from "../../design/canopyShow";
import type { Point } from "../../design/fruitShapes";
import { CanopyCharacter } from "./CanopyCharacter";
import { follow, followAngle, turnAround, type Turning } from "./canopyMotion";

const BAND_CENTER = { x: CANOPY_WIDTH / 2, y: CANOPY_HEIGHT / 2 };

const toneColors: Record<LeafTone | "bark", string> = {
  light: colors.leafLight,
  base: colors.leaf,
  deep: colors.leafDeep,
  bark: colors.bough,
};

const centerOf = (bounds: Bounds): Point => ({
  x: (bounds.left + bounds.right) / 2,
  y: (bounds.top + bounds.bottom) / 2,
});

// 층 하나. 그린 범위(bounds)만큼의 칸에 그리고, 붙은 가지 묶음이 있으면 그 밑동을 축으로 함께 돈다.
function Layer({
  bounds,
  scale,
  pivot,
  angle,
  children,
}: {
  bounds: Bounds;
  scale: number;
  // 함께 돌 가지 묶음의 밑동과 휜 각도. 없으면 나무 전체와만 움직인다.
  pivot?: Point;
  angle?: Turning;
  children: ReactNode;
}) {
  const width = bounds.right - bounds.left;
  const height = bounds.bottom - bounds.top;
  const center = centerOf(bounds);
  const turning =
    pivot && angle
      ? turnAround(
          {
            x: (pivot.x - center.x) * scale,
            y: (pivot.y - center.y) * scale,
          },
          angle,
        )
      : undefined;
  return (
    <Animated.View
      style={[
        styles.layer,
        {
          left: bounds.left * scale,
          top: bounds.top * scale,
          width: width * scale,
          height: height * scale,
        },
        !!turning && { transform: turning },
      ]}
    >
      <Svg
        width={width * scale}
        height={height * scale}
        viewBox={`${bounds.left} ${bounds.top} ${width} ${height}`}
      >
        {children}
      </Svg>
    </Animated.View>
  );
}

// 새로고침 연출 동안 홈 위쪽에 내려오는 나무와 가지 위 캐릭터 셋. show가 있으면 연출 시계(clock, ms)를
// 따라 내려왔다 다시 올라가고, 없으면 다 내려와 쉬는 모습으로 서 있다. 잎 층과 가지 묶음은 붙은 가지의 축·각도로 함께 돌아
// 캐릭터가 뛰면 가지와 잎이 한 몸처럼 휘청인다. 누를 수 있는 것이 없어 손가락은 그대로 통과한다.
// 열매 밭은 연출 중에도 자주 다시 그려지는데, 그때마다 보간 노드를 새로 만들어 붙이지 않도록
// 연출 값과 자리가 바뀔 때만 다시 그린다.
export const Canopy = memo(function Canopy({
  show,
  clock,
  scale,
  left,
  top,
}: {
  show: CanopyShow | undefined;
  clock: Animated.Value | undefined;
  // 너비 390 화면에 대한 배율과, 나무 그림 왼쪽 위가 놓일 자리(부모 기준 px)
  scale: number;
  left: number;
  top: number;
}) {
  const playing = show ? clock : undefined;
  const motion = useMemo(
    () => ({
      tree: [
        { translateY: follow(playing, show?.tree.offsetY, 0, scale) },
        ...turnAround(
          {
            x: (ROOT_PIVOT.x - BAND_CENTER.x) * scale,
            y: (ROOT_PIVOT.y - BAND_CENTER.y) * scale,
          },
          followAngle(playing, show?.tree.rootAngle, 0),
        ),
      ],
      // 가지 묶음마다 휜 각도. 그 묶음의 잎 층과 가지 층이 같은 값을 나눠 쓴다.
      groupAngles: {
        circle: followAngle(playing, show?.tree.groupAngles.circle, 0),
        triangle: followAngle(playing, show?.tree.groupAngles.triangle, 0),
        square: followAngle(playing, show?.tree.groupAngles.square, 0),
      } satisfies Record<BranchGroup, Turning>,
    }),
    [playing, show, scale],
  );

  return (
    <Animated.View
      style={[
        styles.band,
        {
          left,
          top,
          width: CANOPY_WIDTH * scale,
          height: CANOPY_HEIGHT * scale,
          transform: motion.tree,
        },
      ]}
    >
      {foliageLayers.map((layer, index) => {
        const group = layer.owner === "root" ? undefined : layer.owner;
        return (
          <Layer
            key={`foliage-${index}`}
            bounds={layer.bounds}
            scale={scale}
            pivot={group && branchGroups[group].pivot}
            angle={group && motion.groupAngles[group]}
          >
            {layer.circles.map((circle) => (
              <Circle
                key={`${circle.x}-${circle.y}`}
                cx={circle.x}
                cy={circle.y}
                r={circle.r}
                fill={toneColors[circle.tone]}
              />
            ))}
          </Layer>
        );
      })}
      {branchLayers.map((layer) => (
        <Layer
          key={layer.group}
          bounds={layer.bounds}
          scale={scale}
          pivot={branchGroups[layer.group].pivot}
          angle={motion.groupAngles[layer.group]}
        >
          {layer.shapes.map((shape, index) => (
            <Path key={index} d={shape.d} fill={toneColors[shape.paint]} />
          ))}
        </Layer>
      ))}
      {/* 캐릭터는 모든 가지 앞에 서고, 선 가지 묶음과 같은 축·각도로 함께 흔들린다. */}
      {branchLayers.map((layer) => (
        <CharacterOnBranch
          key={`cast-${layer.group}`}
          who={layer.group}
          bounds={layer.bounds}
          scale={scale}
          angle={motion.groupAngles[layer.group]}
          show={show}
          clock={playing}
        />
      ))}
    </Animated.View>
  );
});

// 가지 위 캐릭터. 선 가지 층과 같은 칸에 놓아 가지가 휘는 만큼 함께 기운다.
function CharacterOnBranch({
  who,
  bounds,
  scale,
  angle,
  show,
  clock,
}: {
  who: BranchGroup;
  bounds: Bounds;
  scale: number;
  angle: Turning;
  show: CanopyShow | undefined;
  clock: Animated.Value | undefined;
}) {
  const center = centerOf(bounds);
  const pivot = branchGroups[who].pivot;
  return (
    <Animated.View
      style={[
        styles.layer,
        {
          left: bounds.left * scale,
          top: bounds.top * scale,
          width: (bounds.right - bounds.left) * scale,
          height: (bounds.bottom - bounds.top) * scale,
          transform: turnAround(
            {
              x: (pivot.x - center.x) * scale,
              y: (pivot.y - center.y) * scale,
            },
            angle,
          ),
        },
      ]}
    >
      <CanopyCharacter
        who={who}
        at={{
          x: (perches[who].x - bounds.left) * scale,
          y: (perches[who].y - bounds.top) * scale,
        }}
        tracks={show?.cast[who]}
        clock={clock}
        scale={scale}
      />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  // 굴러 나가는 열매(0)보다 앞, 땅에 놓이거나 매달린 열매(땅 위 자리 순서로 2 이상)보다 뒤에 그린다.
  band: { position: "absolute", pointerEvents: "none", zIndex: 1 },
  layer: { position: "absolute" },
});
