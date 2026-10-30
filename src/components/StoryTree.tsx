import { useMemo, useState } from "react";
import { View, type LayoutChangeEvent } from "react-native";
import Svg, { Circle, Ellipse, G, Path } from "react-native-svg";
import { useIsFocused } from "expo-router";
import {
  curvePath,
  growStoryTree,
  TREE_HEIGHT,
  TREE_WIDTH,
  type Leaf,
} from "../design/storyTree";
import type { ChapterLink } from "../design/chapterTree";
import { fruitShapeOf, storyColorOf } from "../theme";
import { useColors } from "../theme/themed";
import type { NovelSummary } from "../api/types";
import { isFullyRipe, treeFruitLookOf } from "../design/fruitRipeness";
import { useReducedMotion } from "./fruitMotion";
import { DanglingTreeFruit, stemTopOf, TreeFruitArt } from "./TreeFruit";

// 가지 끝 열매 그림 칸의 가로 크기(나무 그림 단위). 열매 몸통은 이보다 조금 작다.
const TREE_FRUIT_WIDTH = 16;
// 이보다 작게 그려지는 나무(카드·표지의 작은 나무)는 다 여문 열매도 흔들지 않고 금빛만 보인다.
const MIN_MOVING_SCALE = 0.6;

const leafColorNames: Record<Leaf["tone"], "leafLight" | "leaf" | "leafDeep"> =
  {
    light: "leafLight",
    base: "leaf",
    deep: "leafDeep",
  };

function describeTree(novel: NovelSummary, fruitCount: number) {
  if (novel.chapterCount === 0) return "이야기 나무, 아직 새싹이에요";
  const base = `이야기 나무, 가지 ${novel.chapterCount}개, 열매 ${fruitCount}개`;
  return isFullyRipe(novel.likeCount) ? `${base}, 다 여문 열매` : base;
}

// 나무 그림(viewBox)이 칸 가운데에 비율을 지켜 들어간다. 그림 좌표를 칸 좌표로 바꾸는 배율과 여백.
function fitOf(width: number, height: number) {
  const scale = Math.min(width / TREE_WIDTH, height / TREE_HEIGHT);
  return {
    scale,
    offsetX: (width - TREE_WIDTH * scale) / 2,
    offsetY: (height - TREE_HEIGHT * scale) / 2,
  };
}

// 소설 하나의 나무. 회차가 가지가 되고, 소설마다 모양이 다르다.
// 회차 나무(nodes)를 주면 갈라진 가지까지 그리고, 없으면 회차 수만큼 한 줄기로 그린다.
export function StoryTree({
  novel,
  nodes,
  height = 230,
  groundColor,
}: {
  novel: NovelSummary;
  nodes?: ChapterLink[];
  height?: number;
  // 작품 색 종이 위에 그릴 때(표지 자리) 그 종이에 맞춘 땅 색. 없으면 기본 땅 색.
  groundColor?: string;
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
  const reduced = useReducedMotion();
  const focused = useIsFocused();
  // 다 여문 열매가 흔들릴 때만 나무 그림 위 칸에 따로 놓는다. 칸 크기를 알아야 자리를 맞출 수 있다.
  const [box, setBox] = useState({ width: 0, height: 0 });
  const onLayout = (event: LayoutChangeEvent) => {
    const { width, height: boxHeight } = event.nativeEvent.layout;
    setBox({ width, height: boxHeight });
  };
  const fit = fitOf(box.width, box.height);
  const look = treeFruitLookOf(novel.likeCount);
  const ripe = isFullyRipe(novel.likeCount);
  const shape = fruitShapeOf(novel.id);
  // 흔들리는 열매는 화면에 보이고, 동작 줄이기가 아니고, 나무가 충분히 클 때만이다.
  const dangling =
    ripe &&
    !reduced &&
    focused &&
    box.width > 0 &&
    fit.scale >= MIN_MOVING_SCALE;
  // 열매 40칸을 나무 그림 단위로 줄이는 배율. 꼭지 끝을 가지 끝에 맞춘다.
  const fruitUnit = (TREE_FRUIT_WIDTH * look.scale) / 40;
  const stemTop = stemTopOf(shape, ripe);

  return (
    <View
      accessible
      accessibilityRole="image"
      accessibilityLabel={describeTree(novel, tree.fruits.length)}
      style={{ width: "100%", height }}
      onLayout={onLayout}
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
          fill={groundColor ?? colors.ground}
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
        {!dangling &&
          tree.fruits.map((fruit) => (
            <G
              key={fruit.id}
              // 열매 자리(fruit)는 가지 끝보다 3만큼 아래라(storyTree.ts), 꼭지는 가지 끝에 단다.
              transform={`translate(${fruit.x - 20 * fruitUnit} ${fruit.y - 3 - stemTop * fruitUnit}) scale(${fruitUnit})`}
            >
              <TreeFruitArt
                shape={shape}
                color={fruitColor}
                look={look}
                ripe={ripe}
              />
            </G>
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
      {dangling &&
        tree.fruits.map((fruit, index) => (
          <DanglingTreeFruit
            key={fruit.id}
            shape={shape}
            color={fruitColor}
            look={look}
            stemX={fit.offsetX + fruit.x * fit.scale}
            stemY={fit.offsetY + (fruit.y - 3) * fit.scale}
            width={TREE_FRUIT_WIDTH * look.scale * fit.scale}
            // 고리는 나무마다 하나만 퍼뜨린다.
            withRing={index === 0}
          />
        ))}
    </View>
  );
}
