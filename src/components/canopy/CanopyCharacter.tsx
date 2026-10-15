import { memo, useMemo, type ReactNode } from "react";
import { Animated, StyleSheet, View } from "react-native";
import Svg, { Path } from "react-native-svg";
import { colors } from "../../theme";
import type { BranchGroup } from "../../design/canopy";
import {
  ALARM,
  CHARACTER_HEIGHT_UNITS,
  FOOT_SIZE,
  footCenterOf,
  rigs,
  type FacePart,
  type LegFrame,
} from "../../design/canopyCast";
import {
  restingFrameOf,
  type CastTracks,
  type LegTracks,
  type SegmentTracks,
} from "../../design/canopyShow";
import type { Point } from "../../design/fruitShapes";
import {
  follow,
  followAngle,
  scaleAround,
  turnAround,
  type Moving,
} from "./canopyMotion";

// 너비 390 화면에서 캐릭터 키(발바닥에서 머리 꼭대기까지, px). 시안에서 사용자가 고른 "보통" 크기다.
const CHARACTER_HEIGHT_PX = 32;
// 몸 그림 칸의 반(캐릭터 단위). 몸 기준점이 칸 가운데에 오고, 위로 느낌표까지 들어간다.
const BODY_HALF = 135;
// 다리 한 마디를 그리는 막대의 처음 길이(캐릭터 단위). 마디 길이에 맞춰 늘이고 줄인다.
const BAR_LENGTH = 10;
// 작게 그려도 선이 이 굵기(너비 390 화면 px) 아래로 가늘어지지 않게 한다.
const LINE_PX = { leg: 1.5, face: 1.25, dash: 1.35, mark: 1.4, alarm: 1.9 };
// 발 타원이 너무 작아 안 보이지 않도록 둔 최소 크기(너비 390 화면 px)
const MIN_FOOT = { width: 3.6, height: 1.8 };

const bodyColors: Record<BranchGroup, string> = {
  circle: colors.castCircle,
  triangle: colors.castTriangle,
  square: colors.castSquare,
};
const accentColors: Record<BranchGroup, string> = {
  circle: colors.castCircleAccent,
  triangle: colors.castTriangleAccent,
  square: colors.castSquareAccent,
};

// 세로로 선 막대(아래쪽이 +y)를 from→to 방향으로 돌리는 각도(도)
const barAngleOf = (from: Point, to: Point) =>
  (Math.atan2(-(to.x - from.x), to.y - from.y) * 180) / Math.PI;

function FaceParts({ parts, stroke }: { parts: FacePart[]; stroke: number }) {
  return parts.map((part) =>
    part.paint === "fill" ? (
      <Path key={part.d} d={part.d} fill={colors.castInk} />
    ) : (
      <Path
        key={part.d}
        d={part.d}
        fill="none"
        stroke={colors.castInk}
        strokeWidth={stroke}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    ),
  );
}

// 다리 한 마디. 가운데를 축으로 돌리고 마디 길이만큼 늘인 막대다.
function LegBar({
  tracks,
  from,
  to,
  clock,
  unit,
  width,
}: {
  tracks: SegmentTracks | undefined;
  from: Point;
  to: Point;
  clock: Animated.Value | undefined;
  unit: number;
  width: number;
}) {
  const length = Math.hypot(to.x - from.x, to.y - from.y);
  const transform = [
    { translateX: follow(clock, tracks?.midX, (from.x + to.x) / 2, unit) },
    { translateY: follow(clock, tracks?.midY, (from.y + to.y) / 2, unit) },
    { rotate: followAngle(clock, tracks?.angle, barAngleOf(from, to)) },
    {
      scaleY: follow(
        clock,
        tracks?.length,
        length / BAR_LENGTH,
        1 / BAR_LENGTH,
      ),
    },
  ];
  return (
    <Animated.View
      style={[
        styles.ink,
        {
          left: -width / 2,
          top: (-BAR_LENGTH * unit) / 2,
          width,
          height: BAR_LENGTH * unit,
          borderRadius: width / 2,
          transform,
        },
      ]}
    />
  );
}

// 다리 하나: 엉덩이-무릎, 무릎-발 두 마디와 바깥을 향한 작은 발
function Leg({
  resting,
  tracks,
  clock,
  unit,
  scale,
}: {
  resting: LegFrame;
  tracks: LegTracks | undefined;
  clock: Animated.Value | undefined;
  unit: number;
  scale: number;
}) {
  const footWidth = Math.max(FOOT_SIZE.rx * 2 * unit, MIN_FOOT.width * scale);
  const footHeight = Math.max(FOOT_SIZE.ry * 2 * unit, MIN_FOOT.height * scale);
  const foot = footCenterOf(resting);
  return (
    <View style={styles.origin}>
      <LegBar
        tracks={tracks?.thigh}
        from={resting.hip}
        to={resting.knee}
        clock={clock}
        unit={unit}
        width={LINE_PX.leg * scale}
      />
      <LegBar
        tracks={tracks?.shin}
        from={resting.knee}
        to={resting.foot}
        clock={clock}
        unit={unit}
        width={LINE_PX.leg * scale}
      />
      <Animated.View
        style={[
          styles.ink,
          {
            left: -footWidth / 2,
            top: -footHeight / 2,
            width: footWidth,
            height: footHeight,
            borderRadius: footHeight / 2,
            transform: [
              { translateX: follow(clock, tracks?.footX, foot.x, unit) },
              { translateY: follow(clock, tracks?.footY, foot.y, unit) },
              {
                rotate: followAngle(
                  clock,
                  tracks?.footAngle,
                  resting.footAngle,
                ),
              },
            ],
          },
        ]}
      />
    </View>
  );
}

// 0~1 값을 뒤집는다(1이면 0).
function inverted(value: Moving): Moving {
  if (typeof value === "number") return 1 - value;
  return value.interpolate({ inputRange: [0, 1], outputRange: [1, 0] });
}

// 나무 위 캐릭터 하나. at(그림 칸 안의 px)이 발바닥 가운데이고, 연출 시계를 따라 웅크렸다 뛰고 내려앉는다.
// 몸은 "버티는 왼발을 축으로 휘청 → 옮김 → 몸 가운데를 축으로 회전 → 늘림" 순서로 놓고(canopyCast의 CharacterFrame),
// 다리는 엉덩이-무릎-발 두 마디 막대로 그린다.
export const CanopyCharacter = memo(function CanopyCharacter({
  who,
  at,
  tracks,
  clock,
  scale,
}: {
  who: BranchGroup;
  at: Point;
  tracks: CastTracks | undefined;
  clock: Animated.Value | undefined;
  scale: number;
}) {
  const rig = rigs[who];
  const unit = (scale * CHARACTER_HEIGHT_PX) / CHARACTER_HEIGHT_UNITS;
  const resting = useMemo(() => restingFrameOf(who), [who]);
  // 선 굵기는 화면 px로 정하고, 몸 그림(캐릭터 단위)에는 단위로 바꿔 넘긴다.
  const strokeUnits = (px: number) => (px * scale) / unit;

  const bodyTransform = useMemo(() => {
    const pivot = resting.leanPivot;
    const center = rig.bodyCenter;
    return [
      ...turnAround(
        { x: pivot.x * unit, y: pivot.y * unit },
        followAngle(clock, tracks?.lean, resting.lean),
      ),
      { translateX: follow(clock, tracks?.shiftX, resting.shiftX, unit) },
      { translateY: follow(clock, tracks?.anchorY, resting.anchorY, unit) },
      ...turnAround(
        { x: center.x * unit, y: center.y * unit },
        followAngle(clock, tracks?.angle, resting.angle),
      ),
      { scaleX: follow(clock, tracks?.scaleX, resting.scaleX) },
      { scaleY: follow(clock, tracks?.scaleY, resting.scaleY) },
    ];
  }, [clock, tracks, resting, rig, unit]);

  const happy = follow(clock, tracks?.happy, resting.happy);
  const alarm = follow(clock, tracks?.alarm, resting.alarm);
  const alarmPop: Moving =
    typeof alarm === "number"
      ? 0.6 + 0.4 * alarm
      : alarm.interpolate({ inputRange: [0, 1], outputRange: [0.6, 1] });

  const box = BODY_HALF * 2 * unit;
  const viewBox = `${-BODY_HALF} ${-BODY_HALF} ${BODY_HALF * 2} ${BODY_HALF * 2}`;
  const layer = { width: box, height: box };
  const drawing = (children: ReactNode) => (
    <Svg width={box} height={box} viewBox={viewBox}>
      {children}
    </Svg>
  );

  return (
    <Animated.View
      style={[
        styles.origin,
        {
          left: at.x,
          top: at.y,
          transform: [
            { translateY: follow(clock, tracks?.lift, resting.lift, -scale) },
          ],
        },
      ]}
    >
      {resting.legs.map((restingLeg, index) => (
        <Leg
          key={index}
          resting={restingLeg}
          tracks={tracks?.legs[index]}
          clock={clock}
          unit={unit}
          scale={scale}
        />
      ))}
      <Animated.View
        style={[
          styles.layer,
          { left: -box / 2, top: -box / 2, ...layer },
          { transform: bodyTransform },
        ]}
      >
        {drawing(
          <>
            <Path d={rig.body} fill={bodyColors[who]} />
            {!rig.happyEyes && (
              <FaceParts
                parts={rig.eyes}
                stroke={strokeUnits(
                  who === "square" ? LINE_PX.dash : LINE_PX.face,
                )}
              />
            )}
          </>,
        )}
        {!!rig.happyEyes && (
          <>
            {/* 신나게 뛰는 동안에는 눈이 > < 로 바뀐다(사용자 그림의 신난 표정). */}
            <Animated.View
              style={[styles.overlay, layer, { opacity: inverted(happy) }]}
            >
              {drawing(
                <FaceParts
                  parts={rig.eyes}
                  stroke={strokeUnits(LINE_PX.face)}
                />,
              )}
            </Animated.View>
            <Animated.View style={[styles.overlay, layer, { opacity: happy }]}>
              {drawing(
                <FaceParts
                  parts={rig.happyEyes}
                  stroke={strokeUnits(LINE_PX.face)}
                />,
              )}
            </Animated.View>
          </>
        )}
        <Animated.View
          style={[
            styles.overlay,
            layer,
            { opacity: follow(clock, tracks?.marks, resting.marks) },
          ]}
        >
          {drawing(
            rig.marks.map((mark) => (
              <Path
                key={mark}
                d={mark}
                fill="none"
                stroke={accentColors[who]}
                strokeWidth={strokeUnits(LINE_PX.mark)}
                strokeLinecap="round"
              />
            )),
          )}
        </Animated.View>
        {who === "square" && (
          // 네모가 삐끗할 때 머리 옆에 톡 튀어나오는 빨간 느낌표
          <Animated.View
            style={[
              styles.overlay,
              layer,
              {
                opacity: alarm,
                transform: scaleAround(
                  { x: ALARM.pop.x * unit, y: ALARM.pop.y * unit },
                  alarmPop,
                ),
              },
            ]}
          >
            {drawing(
              <>
                <Path
                  d={ALARM.stroke}
                  fill="none"
                  stroke={accentColors.square}
                  strokeWidth={strokeUnits(LINE_PX.alarm)}
                  strokeLinecap="round"
                />
                <Path d={ALARM.dot} fill={accentColors.square} />
              </>,
            )}
          </Animated.View>
        )}
      </Animated.View>
    </Animated.View>
  );
});

const styles = StyleSheet.create({
  // 발바닥 가운데를 원점으로 두는 크기 없는 뷰. 다리·몸은 이 점에서 떨어진 자리에 그린다.
  origin: { position: "absolute", left: 0, top: 0, width: 0, height: 0 },
  ink: { position: "absolute", backgroundColor: colors.castInk },
  layer: { position: "absolute" },
  overlay: { position: "absolute", left: 0, top: 0 },
});
