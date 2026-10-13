import { useMemo } from "react";
import { View } from "react-native";
import Svg, { Circle, Ellipse, Path } from "react-native-svg";
import {
  curvePath,
  growStoryTree,
  TREE_HEIGHT,
  TREE_WIDTH,
  type Leaf,
} from "../design/storyTree";
import { colors } from "../theme";
import type { NovelSummary } from "../api/types";

const leafColors: Record<Leaf["tone"], string> = {
  light: colors.leafLight,
  base: colors.leaf,
  deep: colors.leafDeep,
};

function describeTree(novel: NovelSummary) {
  if (novel.chapterCount === 0) return "이야기 나무, 아직 새싹이에요";
  return `이야기 나무, 가지 ${novel.chapterCount}개`;
}

// 소설 하나의 나무. 회차가 가지가 되고, 소설마다 모양이 다르다.
export function StoryTree({
  novel,
  height = 230,
}: {
  novel: NovelSummary;
  height?: number;
}) {
  const tree = useMemo(
    () =>
      growStoryTree({
        seed: novel.id,
        chapterCount: novel.chapterCount,
        memberCount: novel.memberCount,
        growing: novel.status === "ONGOING",
      }),
    [novel.id, novel.chapterCount, novel.memberCount, novel.status],
  );
  const { trunk } = tree;

  return (
    <View
      accessible
      accessibilityRole="image"
      accessibilityLabel={describeTree(novel)}
      style={{ width: "100%", height }}
    >
      <Svg
        width="100%"
        height="100%"
        viewBox={`0 0 ${TREE_WIDTH} ${TREE_HEIGHT}`}
      >
        <Ellipse
          cx={TREE_WIDTH / 2}
          cy={trunk.start.y + 4}
          rx={TREE_WIDTH * 0.32}
          ry={10}
          fill={colors.ground}
        />
        <Path
          d={curvePath(trunk.start, trunk.control, trunk.end)}
          stroke={colors.bark}
          strokeWidth={trunk.thickness}
          strokeLinecap="round"
          fill="none"
        />
        {tree.branches.map((branch) => (
          <Path
            key={branch.chapterNumber}
            d={curvePath(branch.start, branch.control, branch.end)}
            stroke={colors.bark}
            strokeWidth={branch.thickness}
            strokeLinecap="round"
            fill="none"
          />
        ))}
        {tree.leaves.map((leaf, index) => (
          <Circle
            key={index}
            cx={leaf.x}
            cy={leaf.y}
            r={leaf.radius}
            fill={leafColors[leaf.tone]}
            opacity={0.92}
          />
        ))}
        {!!tree.bud && (
          <>
            <Circle
              cx={tree.bud.x}
              cy={tree.bud.y}
              r={10}
              fill={colors.bud}
              opacity={0.45}
            />
            <Circle cx={tree.bud.x} cy={tree.bud.y} r={5} fill={colors.bud} />
          </>
        )}
      </Svg>
    </View>
  );
}
