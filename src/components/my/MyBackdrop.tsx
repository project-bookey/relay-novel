import { useId } from "react";
import { StyleSheet, View } from "react-native";
import Svg, {
  Circle,
  Defs,
  LinearGradient,
  RadialGradient,
  Rect,
  Stop,
} from "react-native-svg";
import type { NovelSummary } from "../../api/types";
import { storyColorOf } from "../../theme";
import { useColors } from "../../theme/themed";

// 번진 빛을 놓는 자리(가로·세로 0~100)와 크기. 앞의 작품일수록 위쪽 큰 빛이 된다.
const GLOWS = [
  { x: 18, y: 26, r: 46 },
  { x: 62, y: 14, r: 42 },
  { x: 96, y: 38, r: 44 },
  { x: 36, y: 62, r: 40 },
  { x: 82, y: 72, r: 38 },
];

// 아이폰에서 맨 위를 끌어내려도 바탕색 띠가 드러나지 않도록 위로 OVERSCROLL만큼 더 칠한다.
const OVERSCROLL = 240;

// 마이 맨 위를 물들이는 내 이야기 색(사용자가 고른 시안 reference/sian/my-redesign A′ "유리 명함").
// 내 작품·이어 쓴 이야기마다 그 작품 색을 크게 번진 빛으로 겹쳐 깔고, 아래로 갈수록 바탕색으로 사라지게 한다.
// 시안은 표지 사진을 흐렸지만, 사진을 칸마다 흐리면 칸 사이 경계가 드러나서 작품 색 빛으로 대신한다.
// 작품이 없으면 아무것도 깔지 않는다(유리 명함만 남는다).
export function MyBackdrop({
  stories,
  height,
}: {
  stories: NovelSummary[];
  height: number;
}) {
  const colors = useColors();
  // 웹에서는 SVG id가 문서 전체에서 하나여야 해서 화면마다 다른 앞머리를 붙인다.
  const idPrefix = `my-backdrop-${useId().replace(/[^\w-]/g, "")}`;
  const glows = stories.slice(0, GLOWS.length);
  if (glows.length === 0) return null;
  // 보이는 칸이 0~100이 되도록, 위로 더 칠하는 몫만큼 viewBox를 위로 늘린다.
  const extra = (100 * OVERSCROLL) / height;
  return (
    <View
      pointerEvents="none"
      style={[
        styles.backdrop,
        { top: -OVERSCROLL, height: height + OVERSCROLL },
      ]}
    >
      <Svg
        style={StyleSheet.absoluteFill}
        width="100%"
        height="100%"
        viewBox={`0 ${-extra} 100 ${100 + extra}`}
        preserveAspectRatio="none"
      >
        <Defs>
          {glows.map((story, index) => (
            <RadialGradient key={index} id={`${idPrefix}-glow-${index}`}>
              <Stop
                offset="0"
                stopColor={storyColorOf(story.id)}
                stopOpacity={colors.backdropGlowOpacity}
              />
              <Stop
                offset="1"
                stopColor={storyColorOf(story.id)}
                stopOpacity={0}
              />
            </RadialGradient>
          ))}
          <LinearGradient id={`${idPrefix}-fade`} x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={colors.background} stopOpacity={0.1} />
            <Stop
              offset="0.5"
              stopColor={colors.background}
              stopOpacity={0.15}
            />
            <Stop offset="1" stopColor={colors.background} stopOpacity={1} />
          </LinearGradient>
        </Defs>
        {glows.map((_, index) => (
          <Circle
            key={index}
            cx={GLOWS[index].x}
            cy={GLOWS[index].y}
            r={GLOWS[index].r}
            fill={`url(#${idPrefix}-glow-${index})`}
          />
        ))}
        <Rect
          x="0"
          y={-extra}
          width="100"
          height={100 + extra}
          fill={`url(#${idPrefix}-fade)`}
        />
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: { position: "absolute", left: 0, right: 0 },
});
