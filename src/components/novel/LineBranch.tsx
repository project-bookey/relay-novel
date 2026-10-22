import { View } from "react-native";
import Svg, {
  Circle,
  Ellipse,
  G,
  Path,
  Text as SvgText,
} from "react-native-svg";
import { BASE_FONT } from "../../theme/fonts";
import {
  LINE_BRANCH_WIDTH,
  lineBranchShape,
  runLabel,
  type BranchRun,
} from "../../design/lineBranch";
import type { LineRun } from "../../design/storyLines";
import { darken, mix, storyColorOf } from "../../theme";
import { useColors } from "../../theme/themed";

// 줄기 하나를 로그인 나무 그림체의 작은 가지로 그린다. 그림일 뿐이라 읽기 도구에서는 건너뛴다(카드가 글로 설명함).
// 이 줄기만의 토막은 나무 껍질 색에 잎이 붙고, 앞 열매와 같이 지나는 토막은 바탕색 쪽으로 옅게 칠한다.
// 끝에는 끝난 줄기면 열매, 아직 자라는 줄기면 봉오리가 달린다.
export function LineBranch({
  novelId,
  runs,
  mergedLines,
  ownLine,
  chapterCount,
  finished,
  readingAt,
}: {
  novelId: number;
  runs: LineRun[];
  mergedLines: number;
  ownLine: number;
  chapterCount: number;
  finished: boolean;
  readingAt?: number;
}) {
  const colors = useColors();
  const shape = lineBranchShape(runs, ownLine, chapterCount, readingAt);
  const twig = colors.bark;
  const fadedTwig = mix(colors.bark, colors.background, 0.55);
  const fruitColor = storyColorOf(novelId);
  const colorOf = (run: BranchRun) => (run.kind === "own" ? twig : fadedTwig);
  const { tip } = shape;

  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={{ width: "100%", aspectRatio: LINE_BRANCH_WIDTH / shape.height }}
    >
      <Svg
        width="100%"
        height="100%"
        viewBox={`0 0 ${LINE_BRANCH_WIDTH} ${shape.height}`}
      >
        {shape.stubs.map((stub) => (
          <G key={`stub-${stub.x}`}>
            <Path
              d={`M ${stub.x - 6} ${stub.y} L ${stub.x + 16} ${stub.y - 3}`}
              stroke={fadedTwig}
              strokeWidth={stub.thickness}
              strokeLinecap="round"
            />
            <Circle
              cx={stub.x + 19}
              cy={stub.y - 5}
              r={4}
              fill={colors.leafLight}
            />
            <Circle cx={stub.x + 15} cy={stub.y - 8} r={3} fill={colors.leaf} />
          </G>
        ))}
        {shape.runs.map((run) => (
          <G key={`run-${run.from}`} opacity={run.kind === "merged" ? 0.6 : 1}>
            {run.bendFromX != null && run.bendFromY != null && (
              <Path
                d={bendPath(run.bendFromX, run.bendFromY, run.startX, run.y)}
                stroke={colorOf(run)}
                strokeWidth={run.thickness}
                strokeLinecap="round"
                fill="none"
              />
            )}
            <Path
              d={`M ${run.startX} ${run.y} L ${run.endX - 2} ${run.y}`}
              stroke={colorOf(run)}
              strokeWidth={run.thickness}
              strokeLinecap="round"
              strokeDasharray={run.kind === "merged" ? "1 7" : undefined}
            />
            <SvgText
              x={run.startX}
              y={run.y + run.thickness / 2 + 10}
              fontSize={9}
              fontFamily={BASE_FONT}
              fill={colors.muted}
            >
              {runLabel(run, mergedLines)}
            </SvgText>
          </G>
        ))}
        {shape.leaves.map((leaf) => (
          <Ellipse
            key={`leaf-${leaf.x}`}
            cx={leaf.x}
            cy={leaf.y}
            rx={5}
            ry={2.6}
            fill={colors.leaf}
            transform={`rotate(${leaf.side * -25} ${leaf.x} ${leaf.y})`}
          />
        ))}
        <Path
          d={`M ${tip.x - 2} ${tip.y} L ${tip.x + 4} ${tip.y + 4}`}
          stroke={twig}
          strokeWidth={2}
          strokeLinecap="round"
        />
        {finished ? (
          <G>
            <Ellipse
              cx={tip.x + 10}
              cy={tip.y - 2}
              rx={4.5}
              ry={2.2}
              fill={colors.leafDeep}
              transform={`rotate(-30 ${tip.x + 10} ${tip.y - 2})`}
            />
            <Circle
              cx={tip.x + 6}
              cy={tip.y + 10}
              r={8}
              fill={fruitColor}
              stroke={darken(fruitColor, 0.25)}
              strokeWidth={1}
            />
          </G>
        ) : (
          <G>
            <Ellipse
              cx={tip.x + 10}
              cy={tip.y + 1}
              rx={4}
              ry={2}
              fill={colors.leaf}
              transform={`rotate(-30 ${tip.x + 10} ${tip.y + 1})`}
            />
            <Circle
              cx={tip.x + 6}
              cy={tip.y + 8}
              r={5.5}
              fill={colors.bud}
              stroke={darken(colors.bud, 0.3)}
              strokeWidth={1}
            />
          </G>
        )}
        {!!shape.reading && (
          <G>
            <Circle
              cx={shape.reading.x}
              cy={shape.reading.y}
              r={7}
              fill={colors.paper}
              stroke={colors.ink}
              strokeWidth={2}
            />
            <Circle
              cx={shape.reading.x}
              cy={shape.reading.y}
              r={2.5}
              fill={colors.ink}
            />
          </G>
        )}
      </Svg>
    </View>
  );
}

// 앞 토막 높이에서 한 칸 아래 토막으로 부드럽게 내려가는 길
function bendPath(fromX: number, fromY: number, toX: number, toY: number) {
  const middleY = (fromY + toY) / 2;
  return `M ${fromX - 6} ${fromY} Q ${fromX + 2} ${fromY} ${fromX + 5} ${middleY} T ${toX} ${toY}`;
}
