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
import type { ChapterLink } from "../design/chapterTree";
import { darken, storyColorOf } from "../theme";
import { useColors } from "../theme/themed";
import type { NovelSummary } from "../api/types";

const leafColorNames: Record<Leaf["tone"], "leafLight" | "leaf" | "leafDeep"> =
  {
    light: "leafLight",
    base: "leaf",
    deep: "leafDeep",
  };

function describeTree(novel: NovelSummary, fruitCount: number) {
  if (novel.chapterCount === 0) return "이야기 나무, 아직 새싹이에요";
  return `이야기 나무, 가지 ${novel.chapterCount}개, 열매 ${fruitCount}개`;
}

// 소설 하나의 나무. 회차가 가지가 되고, 소설마다 모양이 다르다.
// 회차 나무(nodes)를 주면 갈라진 가지까지 그리고, 없으면 회차 수만큼 한 줄기로 그린다.
export function StoryTree({
  novel,
  nodes,
  height = 230,
}: {
  novel: NovelSummary;
  nodes?: ChapterLink[];
  height?: number;
}) {
  const tree = useMemo(
    () =>
      growStoryTree({
        seed: novel.id,
        chapterCount: novel.chapterCount,
        memberCount: novel.memberCount,
        growing: novel.status === "ONGOING",
        nodes,
      }),
    [novel.id, novel.chapterCount, novel.memberCount, novel.status, nodes],
  );
  const colors = useColors();
  const fruitColor = storyColorOf(novel.id);
  const { trunk } = tree;

  return (
    <View
      accessible
      accessibilityRole="image"
      accessibilityLabel={describeTree(novel, tree.fruits.length)}
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
            key={branch.id}
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
            fill={colors[leafColorNames[leaf.tone]]}
            opacity={0.92}
          />
        ))}
        {tree.fruits.map((fruit) => (
          <Circle
            key={fruit.id}
            cx={fruit.x}
            cy={fruit.y}
            r={fruit.radius}
            fill={fruitColor}
            stroke={darken(fruitColor, 0.25)}
            strokeWidth={1}
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
