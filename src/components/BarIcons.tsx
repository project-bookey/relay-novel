import { useId } from "react";
import Svg, { Circle, Defs, G, Mask, Path, Rect } from "react-native-svg";
import { colors } from "../theme";

// 하단 바의 아이콘들(홈·사용자·열매·씨앗주머니). 모두 24칸에 검은 선으로 그린다.
// strokeWidth도 24칸 기준이라, 화면에서 같은 굵기로 보이려면 그리는 크기에 맞춰 환산해 넘긴다.
export interface BarIconProps {
  size: number;
  strokeWidth: number;
}

function line(strokeWidth: number) {
  return {
    fill: "none",
    stroke: colors.black,
    strokeWidth,
    strokeLinecap: "round",
    strokeLinejoin: "round",
  } as const;
}

// 밑동에서 끝까지 양쪽으로 똑같이 부푼 잎. 선이 아니라 면으로 칠한다.
function leafPath(
  baseX: number,
  baseY: number,
  tipX: number,
  tipY: number,
  bulge: number,
) {
  const midX = (baseX + tipX) / 2;
  const midY = (baseY + tipY) / 2;
  const length = Math.hypot(tipX - baseX, tipY - baseY);
  const normalX = (-(tipY - baseY) / length) * bulge;
  const normalY = ((tipX - baseX) / length) * bulge;
  return (
    `M${baseX} ${baseY}Q${midX + normalX} ${midY + normalY} ${tipX} ${tipY}` +
    `Q${midX - normalX} ${midY - normalY} ${baseX} ${baseY}Z`
  );
}

const FRUIT_LEAVES = [
  leafPath(7.1, 5.5, 9.5, 3.9, 1.25),
  leafPath(12.65, 9.25, 15.05, 8.1, 1.25),
  leafPath(18.8, 4.65, 21.2, 3.2, 1.25),
];
const POUCH_LEAVES = [
  leafPath(10.3, 5, 8.2, 4.05, 1.05),
  leafPath(11.2, 5, 12.95, 3.45, 0.9),
];

// 가운데에 둥근 문이 난 집
export function HomeIcon({ size, strokeWidth }: BarIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path
        d="M9.12 19.68H5.12A0.8 0.8 0 0 1 4.32 18.88V10.55L12 4.32L19.68 10.55V18.88A0.8 0.8 0 0 1 18.88 19.68H14.88V14.8A2.88 2.88 0 0 0 9.12 14.8Z"
        {...line(strokeWidth)}
      />
    </Svg>
  );
}

export function UserIcon({ size, strokeWidth }: BarIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Circle cx={12} cy={8.13} r={3.84} {...line(strokeWidth)} />
      <Path
        d="M4.8 19.65C4.8 16 8 13.92 12 13.92S19.2 16 19.2 19.65"
        {...line(strokeWidth)}
      />
    </Svg>
  );
}

const SPHERE_RADIUS = 4.45;
// 구 둘레와 뒤 열매 선 사이의 틈
const SPHERE_GAP = 0.93;

// 꼭지와 잎이 달린 열매 셋(정육면체·구·피라미드). 앞의 구와 겹치는 부분은
// 뒤 열매 선을 구 둘레보다 조금 넓게 지워서, 구가 앞에 놓인 것처럼 보이게 한다.
export function FruitsIcon({ size, strokeWidth }: BarIconProps) {
  // 화면에 아이콘이 여러 개 있어도 지우개 모양이 섞이지 않도록 아이콘마다 이름을 따로 붙인다.
  const maskId = `fruits-${useId().replace(/[^\w-]/g, "")}`;
  // 선이 굵어져도 틈이 그대로 보이도록, 구 선의 바깥 가장자리부터 틈만큼 지운다.
  const eraseRadius = SPHERE_RADIUS + strokeWidth / 2 + SPHERE_GAP;
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Defs>
        <Mask
          id={maskId}
          maskUnits="userSpaceOnUse"
          x={0}
          y={0}
          width={24}
          height={24}
        >
          <Rect width={24} height={24} fill="#fff" />
          <Circle cx={12} cy={15.9} r={eraseRadius} fill="#000" />
        </Mask>
      </Defs>
      <G mask={`url(#${maskId})`}>
        <Rect
          x={2.88}
          y={7.17}
          width={7.2}
          height={7.23}
          rx={1.4}
          {...line(strokeWidth)}
        />
        <Path d="M18.15 5.4L22.1 13.45H14.75Z" {...line(strokeWidth)} />
      </G>
      <Circle cx={12} cy={15.9} r={SPHERE_RADIUS} {...line(strokeWidth)} />
      <Path
        d="M6.39 7.17V5.2M12 11.45V9.42M18.15 5.4V4.47"
        {...line(strokeWidth)}
      />
      {FRUIT_LEAVES.map((leaf) => (
        <Path key={leaf} d={leaf} fill={colors.black} />
      ))}
    </Svg>
  );
}

// 시계 방향으로 도는 화살표(새로고침). 아래쪽을 돌아 위쪽에서 오른쪽을 가리키고, 오른쪽 위는 비어 있다.
export function RefreshIcon({ size, strokeWidth }: BarIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d="M18.77 10.14A7.2 7.2 0 1 1 12 5.4" {...line(strokeWidth)} />
      <Path d="M9.4 2.7L12 5.4L9.4 8.1" {...line(strokeWidth)} />
    </Svg>
  );
}

// 새 이야기를 심는 씨앗주머니. 묶은 입구 위로 새싹이 나 있고, 앞면에 + 표시가 있으며
// 오른쪽으로 씨앗(네모·세모·동그라미)이 흘러나온다.
export function SeedPouch({ size, strokeWidth }: BarIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path
        d="M8.1 9.9L7.35 6.35Q9.2 6.35 10.6 6.5Q12 6.35 13.85 6.35L13.15 9.9Z"
        {...line(strokeWidth)}
      />
      <Path
        d="M7.9 9.9C7.2 10.9 4.1 13 4.1 16.4C4.1 18.6 5.6 20.07 8.4 20.07H12.8C15.6 20.07 17.1 18.6 17.1 16.4C17.1 13 14 10.9 13.3 9.9Z"
        {...line(strokeWidth)}
      />
      <Path d="M10.56 13.3V17.4M8.6 15.36H12.5" {...line(strokeWidth)} />
      <Path d="M10.6 6.6V5" {...line(strokeWidth)} />
      {POUCH_LEAVES.map((leaf) => (
        <Path key={leaf} d={leaf} fill={colors.black} />
      ))}
      <Rect
        x={18.71}
        y={11.6}
        width={1.7}
        height={1.7}
        rx={0.3}
        transform="rotate(20 19.56 12.45)"
        fill={colors.black}
      />
      <Path
        d="M21.15 15.15L22.35 17.1H20.1Z"
        fill={colors.black}
        stroke={colors.black}
        strokeWidth={0.3}
        strokeLinejoin="round"
      />
      <Circle cx={19.35} cy={19.2} r={0.96} fill={colors.black} />
    </Svg>
  );
}
