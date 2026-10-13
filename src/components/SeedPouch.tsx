import Svg, { Ellipse, Path } from "react-native-svg";
import { colors, ICON_LINE_PX } from "../theme";

// 새 이야기를 심는 씨앗주머니. 색 없이 검은 선으로만 그린 주머니로,
// 입구로 씨앗이 살짝 보이며 앞면에 + 표시가 있다. 48x48 칸에 그린다.
export function SeedPouch({ size = 40 }: { size?: number }) {
  // 48칸 그림을 size로 늘리고 줄이므로, 선도 그만큼 거꾸로 맞춰야 화면에서 같은 굵기로 보인다.
  const lineWidth = (ICON_LINE_PX * 48) / size;

  return (
    <Svg width={size} height={size} viewBox="0 0 48 48">
      <Ellipse
        cx={21}
        cy={10.6}
        rx={1.7}
        ry={2.3}
        fill={colors.paper}
        stroke={colors.black}
        strokeWidth={lineWidth}
      />
      <Ellipse
        cx={26.6}
        cy={10.1}
        rx={1.7}
        ry={2.3}
        fill={colors.paper}
        stroke={colors.black}
        strokeWidth={lineWidth}
      />
      <Path
        d="M 18 17 C 9 21 6 31 9 38 C 11 43.5 37 43.5 39 38 C 42 31 39 21 30 17 Z"
        fill={colors.paper}
        stroke={colors.black}
        strokeWidth={lineWidth}
        strokeLinejoin="round"
      />
      <Path
        d="M 17.5 17 L 14 9.5 Q 19 12 21.5 8.6 Q 24 11.6 26.5 8.6 Q 29 12 34 9.5 L 30.5 17 Z"
        fill={colors.paper}
        stroke={colors.black}
        strokeWidth={lineWidth}
        strokeLinejoin="round"
      />
      <Path
        d="M 24 18.4 Q 20 22.5 18.5 20 M 24 18.4 Q 28 22.5 29.5 20"
        stroke={colors.black}
        strokeWidth={lineWidth}
        strokeLinecap="round"
        fill="none"
      />
      <Path
        d="M 24 26 V 35 M 19.5 30.5 H 28.5"
        stroke={colors.black}
        strokeWidth={lineWidth + 0.4}
        strokeLinecap="round"
      />
    </Svg>
  );
}
