import {
  memo,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { Animated, Easing, StyleSheet } from "react-native";
import Svg, { Circle, Ellipse, Path } from "react-native-svg";
import type { Palette } from "../../theme";
import { useColors } from "../../theme/themed";
import type { BranchGroup } from "../../design/canopy";
import { rigs, type FacePart } from "../../design/canopyCast";
import type { Track } from "../../design/canopyShow";
import {
  CAST,
  CAST_UNIT_PX,
  SIDE_ART,
  castGeometryOf,
  facingOf,
  hideAct,
  idleAct,
  jogAct,
  peekAct,
  playAct,
  positionAt,
  runAct,
  startleAct,
  trackOf,
  STARTLE_MS,
  type CastAct,
  type CastArea,
  type CastGeometry,
  type CastTracks,
  type SegmentTracks,
} from "../../design/fieldCast";
import type { Point } from "../../design/fruitShapes";
import { follow, followAngle } from "../canopy/canopyMotion";
import { nativeDriverEnabled, nativeValue } from "../fruitMotion";

// 숨은 뒤 다시 빼꼼하기까지, 캐릭터마다 빼꼼하는 사이, 열매가 다 내려앉은 뒤 처음 빼꼼하기까지(ms)
const HIDE_MS = 2200;
const PEEK_GAP_MS = 800;
const ARRIVE_MS = 500;
// 빼꼼: 화면 밖 이만큼(px, 너비 390 기준)에 서 있다가 가장자리 가까이 다가서며 고개를 내민다.
const PEEK_FROM = 24;
const PEEK_AT = 4;
// 동작 줄이기에서 서 있는 자리(노는 땅에 대한 비율)
const STAND_SPOTS = [
  { x: 0.12, y: 0.55 },
  { x: 0.5, y: 0.9 },
  { x: 0.88, y: 0.5 },
];
// 같은 쪽에서 둘이 겹쳐 내밀지 않도록 차례마다 높이를 위·가운데·아래로 나눈다(첫째와 셋째가 같은 쪽).
const PEEK_BANDS = [0, 0.4, 0.8];
// 몸 그림 칸의 반(캐릭터 단위). 몸 기준점이 칸 가운데에 오고, 위로 "!"까지 들어간다.
const BODY_HALF = 150;
// 다리 한 마디를 그리는 막대의 처음 길이와 굵기, 발 타원 크기(캐릭터 단위)
const BAR_LENGTH = 10;
const LEG_WIDTH = 6;
const FOOT_SIZE = { rx: 7.2, ry: 3.6 };
// 눈 선 굵기(캐릭터 단위). 네모의 일자 눈은 조금 굵다.
const EYE_STROKE = { circle: 4.73, triangle: 4.73, square: 5.1 };
const MARK_STROKE = 5.29;
const ALARM_STROKE = 7;
// 땅 위 그림자 크기(px, 너비 390 기준)
const SHADOW = { width: 28, height: 8 };
// 눈 깜빡임: 감았다 뜨는 시간과 다음 깜빡임까지의 사이
const BLINK_MS = 70;
const BLINK_GAP_MS = { min: 2200, spread: 3500 };

// 캐릭터가 노는 땅과 달아나 숨는 곳(열매 밭 px). edge는 화면 가장자리, exit은 그보다 바깥이다.
export interface CastBounds extends CastArea {
  edgeLeft: number;
  edgeRight: number;
  exitLeft: number;
  exitRight: number;
}

type Phase = "away" | "play" | "flee" | "hidden";

interface Scene {
  act: CastAct;
  tracks: CastTracks;
  token: number;
}

const flipTrack = (track: Track): Track => ({
  times: track.times,
  values: track.values.map((value) => 1 - value),
});

// 홈 풀밭에서 노는 캐릭터 셋(움직임은 src/design/fieldCast.ts). 열매를 누르고 있거나(scared) 열매가 떨어지고 나무가
// 내려오는 동안(away)에는 화면 밖에 숨고, 그렇지 않으면 빼꼼 들어와 논다. 누르기는 가로채지 않는다.
export function FieldCast({
  bounds,
  scale,
  scared,
  away,
  moving,
  reduced,
}: {
  bounds: CastBounds;
  // 열매 밭 배율(너비 390 화면이면 1쯤)
  scale: number;
  scared: boolean;
  away: boolean;
  // 움직일지. 동작 줄이기거나 홈이 가려져 있으면 멈춘다.
  moving: boolean;
  // 동작 줄이기: 놀지 않고 땅 위 제자리에 정면을 보고 가만히 서 있는다.
  reduced: boolean;
}) {
  const geos = useMemo(() => CAST.map(castGeometryOf), []);
  const clocks = useRef(CAST.map(() => nativeValue(0))).current;
  const latest = useRef({ bounds, scale, scared, away, moving });
  latest.current = { bounds, scale, scared, away, moving };
  // 처음에는 화면 밖에 숨어 있다가 열매가 다 내려앉으면 빼꼼 들어온다.
  const brain = useRef<{
    phase: Phase;
    acts: CastAct[];
    started: number[];
    timers: ReturnType<typeof setTimeout>[];
  }>(undefined);
  if (!brain.current) {
    brain.current = {
      phase: "away",
      acts: CAST.map((_, index) =>
        hideAct(
          {
            x: index === 1 ? bounds.exitRight : bounds.exitLeft,
            y: bounds.top + ((index + 1) / 4) * (bounds.bottom - bounds.top),
          },
          index !== 1,
        ),
      ),
      started: CAST.map(() => 0),
      timers: [],
    };
  }
  const [scenes, setScenes] = useState<Scene[]>(() =>
    brain.current!.acts.map((act, index) => ({
      act,
      tracks: trackOf(geos[index], act, scale),
      token: 0,
    })),
  );

  const controls = useMemo(() => {
    const mind = brain.current!;
    const random = Math.random;
    const later = (run: () => void, ms: number) => {
      const timer = setTimeout(() => {
        mind.timers = mind.timers.filter((other) => other !== timer);
        run();
      }, ms);
      mind.timers.push(timer);
    };
    const clearTimers = () => {
      mind.timers.forEach(clearTimeout);
      mind.timers = [];
    };
    const positionNow = (index: number): Point =>
      positionAt(mind.acts[index], Date.now() - mind.started[index]);
    const start = (index: number, act: CastAct) => {
      const before = facingOf(mind.acts[index]);
      mind.acts[index] = act;
      mind.started[index] = Date.now();
      const tracks = trackOf(geos[index], act, latest.current.scale, before);
      setScenes((current) =>
        current.map((scene, other) =>
          other === index ? { act, tracks, token: scene.token + 1 } : scene,
        ),
      );
    };
    const peek = () => {
      mind.phase = "play";
      const { bounds: area, scale: size } = latest.current;
      const order = [0, 1, 2].sort(() => random() - 0.5);
      const fromLeft = random() < 0.5;
      order.forEach((index, turn) =>
        later(() => {
          const left = turn === 1 ? !fromLeft : fromLeft;
          const span = area.bottom - area.top;
          const y = area.top + (PEEK_BANDS[turn] + random() * 0.2) * span;
          const edge = left ? area.edgeLeft : area.edgeRight;
          const out = left ? -1 : 1;
          start(
            index,
            peekAct(
              { x: edge + out * PEEK_FROM * size, y },
              { x: edge + out * PEEK_AT * size, y },
            ),
          );
        }, turn * PEEK_GAP_MS),
      );
    };
    // 몸짓 하나가 끝나면 다음 몸짓을 고른다.
    const finish = (index: number) => {
      const done = mind.acts[index];
      const {
        bounds: area,
        scale: size,
        scared: touching,
        away: leaving,
      } = latest.current;
      const here = done.to;
      if (done.type === "startle" && done.escape) {
        start(index, runAct(here, done.escape, size, -STARTLE_MS));
      } else if (done.type === "run") {
        start(index, hideAct(here, done.flip));
        if (mind.acts.every((act) => act.type === "hide")) {
          mind.phase = "hidden";
          if (!touching && !leaving) later(peek, HIDE_MS);
        }
      } else if (done.type === "peek") {
        const left = done.to.x < (area.edgeLeft + area.edgeRight) / 2;
        const inward = (60 + random() * 90) * size;
        const target = {
          x: Math.min(
            area.right,
            Math.max(
              area.left,
              left ? area.edgeLeft + inward : area.edgeRight - inward,
            ),
          ),
          y: Math.min(
            area.bottom,
            Math.max(area.top, here.y + (random() - 0.5) * 60 * size),
          ),
        };
        start(index, jogAct(here, target, done.flip, size));
      } else if (done.type !== "hide") {
        start(index, playAct(here, done.flip, area, size, random));
      }
    };
    // 열매를 누르거나 옮기면, 또 열매가 떨어지고 나무가 내려오면 정면을 보고 "!" 하고 움찔한 뒤 돌아서서
    // 가까운 화면 옆으로 달아난다. 이미 숨어 있으면 더 오래 숨는다(빼꼼할 예정이던 것을 미룬다).
    const flee = () => {
      if (mind.phase === "flee") return;
      clearTimers();
      if (mind.phase === "hidden" || mind.phase === "away") return;
      mind.phase = "flee";
      const { bounds: area, scale: size } = latest.current;
      const middle = (area.edgeLeft + area.edgeRight) / 2;
      CAST.forEach((_, index) => {
        clocks[index].stopAnimation();
        if (mind.acts[index].type === "hide") return;
        const here = positionNow(index);
        const escape = {
          x: here.x < middle ? area.exitLeft : area.exitRight,
          y: Math.min(
            area.bottom,
            Math.max(area.top, here.y + (random() - 0.5) * 60 * size),
          ),
        };
        start(index, startleAct(here, escape));
      });
      if (mind.acts.every((act) => act.type === "hide")) mind.phase = "hidden";
    };
    // 다시 보이거나 숨는 이유가 사라졌을 때: 숨어 있었으면 빼꼼하고, 놀던 중이었으면 그 자리에서 이어 논다.
    const resume = () => {
      clearTimers();
      const { scared: touching, away: leaving } = latest.current;
      if (mind.phase === "flee") {
        // 달아나던 중 멈췄으면 그대로 숨은 셈 친다.
        CAST.forEach((_, index) => {
          const act = mind.acts[index];
          if (act.type !== "hide")
            start(index, hideAct(act.escape ?? act.to, act.flip));
        });
        mind.phase = "hidden";
      }
      if (mind.phase === "hidden" || mind.phase === "away") {
        if (!touching && !leaving) later(peek, ARRIVE_MS);
        return;
      }
      CAST.forEach((_, index) => {
        const act = mind.acts[index];
        if (act.type === "hide") return;
        start(
          index,
          playAct(
            positionNow(index),
            act.flip,
            latest.current.bounds,
            latest.current.scale,
            random,
          ),
        );
      });
    };
    const pause = () => {
      clearTimers();
      clocks.forEach((clock) => clock.stopAnimation());
    };
    const calmDown = () => {
      if (mind.phase === "hidden" && !latest.current.away) {
        clearTimers();
        later(peek, HIDE_MS);
      }
    };
    const arrive = () => {
      if (mind.phase === "hidden" || mind.phase === "away") {
        clearTimers();
        if (!latest.current.scared) later(peek, ARRIVE_MS);
      }
    };
    return { finish, flee, resume, pause, calmDown, arrive, clearTimers };
  }, [geos, clocks]);

  useEffect(() => {
    if (!moving) {
      controls.pause();
      return;
    }
    controls.resume();
    return () => controls.pause();
  }, [moving, controls]);
  useEffect(() => {
    if (!latest.current.moving) return;
    if (scared) controls.flee();
    else controls.calmDown();
  }, [scared, controls]);
  useEffect(() => {
    if (!latest.current.moving) return;
    if (away) controls.flee();
    else controls.arrive();
  }, [away, controls]);
  useEffect(() => controls.clearTimers, [controls]);

  const standing = useMemo(
    () =>
      reduced
        ? STAND_SPOTS.map((spot, index) => {
            const act = idleAct(
              {
                x: bounds.left + spot.x * (bounds.right - bounds.left),
                y: bounds.top + spot.y * (bounds.bottom - bounds.top),
              },
              false,
              1,
            );
            return { act, tracks: trackOf(geos[index], act, scale), token: 0 };
          })
        : undefined,
    [reduced, bounds, scale, geos],
  );

  return (
    <>
      {(standing ?? scenes).map((scene, index) => (
        <CastMember
          key={CAST[index]}
          geo={geos[index]}
          scene={scene}
          clock={clocks[index]}
          scale={scale}
          moving={moving}
          onDone={() => controls.finish(index)}
        />
      ))}
    </>
  );
}

function FaceParts({
  parts,
  stroke,
  ink,
}: {
  parts: FacePart[];
  stroke: number;
  ink: string;
}) {
  return parts.map((part) =>
    part.paint === "fill" ? (
      <Path key={part.d} d={part.d} fill={ink} />
    ) : (
      <Path
        key={part.d}
        d={part.d}
        fill="none"
        stroke={ink}
        strokeWidth={stroke}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    ),
  );
}

// 캐릭터마다 몸 색, 등 쪽 어두운 면 색, 신날 때 빗금 색
function castColorsOf(who: BranchGroup, colors: Palette) {
  return {
    circle: {
      body: colors.castCircle,
      shade: colors.castCircleShade,
      accent: colors.castCircleAccent,
    },
    triangle: {
      body: colors.castTriangle,
      shade: colors.castTriangleShade,
      accent: colors.castTriangleAccent,
    },
    square: {
      body: colors.castSquare,
      shade: colors.castSquareShade,
      accent: colors.castSquareAccent,
    },
  }[who];
}

// 캐릭터 하나. 몸짓(scene)이 바뀔 때마다 시계를 0부터 다시 돌려 미리 계산한 움직임을 따라간다.
const CastMember = memo(function CastMember({
  geo,
  scene,
  clock,
  scale,
  moving,
  onDone,
}: {
  geo: CastGeometry;
  scene: Scene;
  clock: Animated.Value;
  scale: number;
  moving: boolean;
  onDone: () => void;
}) {
  const colors = useColors();
  const { act, tracks, token } = scene;
  const unit = CAST_UNIT_PX * scale;
  const doneRef = useRef(onDone);
  doneRef.current = onDone;
  const blink = useRef(nativeValue(1)).current;

  useEffect(() => {
    // 멈춰 있는 동안에는 그 자세 그대로 두고, 새 몸짓을 받으면 처음부터 돈다.
    if (!moving) return;
    clock.setValue(0);
    if (act.type === "hide") return;
    const motion = Animated.timing(clock, {
      toValue: tracks.durationMs,
      duration: tracks.durationMs,
      easing: Easing.linear,
      useNativeDriver: nativeDriverEnabled,
    });
    motion.start(({ finished }) => {
      if (finished) doneRef.current();
    });
    return () => motion.stop();
    // 몸짓이 바뀔 때(token)와 다시 움직일 때만 처음부터 돈다.
  }, [token, moving]);

  // 가끔 눈을 깜빡인다.
  useEffect(() => {
    if (!moving) {
      blink.setValue(1);
      return;
    }
    let timer: ReturnType<typeof setTimeout>;
    const next = () => {
      timer = setTimeout(
        () => {
          const close = (toValue: number) =>
            Animated.timing(blink, {
              toValue,
              duration: BLINK_MS,
              useNativeDriver: nativeDriverEnabled,
            });
          Animated.sequence([close(0.12), close(1)]).start();
          next();
        },
        BLINK_GAP_MS.min + Math.random() * BLINK_GAP_MS.spread,
      );
    };
    next();
    return () => clearTimeout(timer);
  }, [moving, blink]);

  const tint = castColorsOf(geo.who, colors);
  const rig = rigs[geo.who];
  const rest = act.to;
  const at = (track: Track, resting = 0, size = 1) =>
    follow(clock, track, resting, size);
  const front = at(tracks.front, 1);
  const side = follow(clock, flipTrack(tracks.front), 0);
  const box = BODY_HALF * 2 * unit;
  const layer = { width: box, height: box };
  const viewBox = `${-BODY_HALF} ${-BODY_HALF} ${BODY_HALF * 2} ${BODY_HALF * 2}`;
  const drawing = (children: ReactNode) => (
    <Svg width={box} height={box} viewBox={viewBox}>
      {children}
    </Svg>
  );
  // 눈은 두리번거리는 만큼 옆으로 옮기고, 눈 가운데를 축으로 위아래로 감았다 뜬다.
  const eyesTransform = [
    { translateX: at(tracks.eyesX, 0, unit) },
    { translateY: geo.eyeY * unit },
    { scaleY: blink },
    { translateY: -geo.eyeY * unit },
  ];
  const legPieces = (leg: number, color: string) => (
    <>
      <LegBar
        tracks={tracks.legs[leg].thigh}
        clock={clock}
        unit={unit}
        color={color}
      />
      <LegBar
        tracks={tracks.legs[leg].shin}
        clock={clock}
        unit={unit}
        color={color}
      />
      <Animated.View
        style={[
          styles.part,
          {
            left: -FOOT_SIZE.rx * unit,
            top: -FOOT_SIZE.ry * unit,
            width: FOOT_SIZE.rx * 2 * unit,
            height: FOOT_SIZE.ry * 2 * unit,
            borderRadius: FOOT_SIZE.ry * unit,
            backgroundColor: color,
            transform: [
              { translateX: at(tracks.legs[leg].footX, 0, unit) },
              { translateY: at(tracks.legs[leg].footY, 0, unit) },
            ],
          },
        ]}
      />
    </>
  );

  return (
    <Animated.View
      style={[
        styles.origin,
        {
          // 앞쪽 열매가 겹칠 때처럼 땅 위 자리 순서로 쌓는다(열매 쌓기 순서와 같은 값). 지나가는 길 가운데 가장 앞쪽을 쓴다.
          zIndex: Math.round(Math.max(act.from.y, act.to.y)) * 2 + 1,
          transform: [
            { translateX: at(tracks.x, rest.x) },
            { translateY: at(tracks.y, rest.y) },
          ],
        },
      ]}
    >
      {/* 땅 위 그림자. 공중에 뜨면 작고 옅어진다. */}
      <Animated.View
        style={[
          styles.part,
          {
            left: (-SHADOW.width / 2) * scale,
            top: (-SHADOW.height / 2) * scale,
            width: SHADOW.width * scale,
            height: SHADOW.height * scale,
            opacity: colors.fruitShadowOpacity * 0.67,
            transform: [{ scale: at(tracks.shadow, 1) }],
          },
        ]}
      >
        <Svg width={SHADOW.width * scale} height={SHADOW.height * scale}>
          <Ellipse
            cx={(SHADOW.width / 2) * scale}
            cy={(SHADOW.height / 2) * scale}
            rx={(SHADOW.width / 2) * scale}
            ry={(SHADOW.height / 2) * scale}
            fill={colors.fruitShadow}
          />
        </Svg>
      </Animated.View>
      <Animated.View
        style={[
          styles.origin,
          { transform: [{ translateY: at(tracks.lift, 0, -1) }] },
        ]}
      >
        <Animated.View
          style={[
            styles.origin,
            { transform: [{ scaleX: at(tracks.turn, 1) }] },
          ]}
        >
          {/* 옆모습에서 먼 다리(0)는 옅은 색으로, 정면에서는 두 다리가 같은 색으로 보인다. */}
          <Animated.View style={[styles.origin, { opacity: side }]}>
            {legPieces(0, colors.castLegFar)}
          </Animated.View>
          <Animated.View style={[styles.origin, { opacity: front }]}>
            {legPieces(0, colors.castLeg)}
          </Animated.View>
          {legPieces(1, colors.castLeg)}
          <Animated.View
            style={[
              styles.part,
              {
                left: -box / 2,
                top: -box / 2,
                ...layer,
                transform: [
                  { translateX: at(tracks.bodyX, 0, unit) },
                  { translateY: at(tracks.bodyY, 0, unit) },
                  { rotate: followAngle(clock, tracks.bodyAngle, 0) },
                  { scaleX: at(tracks.bodySx, 1) },
                  { scaleY: at(tracks.bodySy, 1) },
                ],
              },
            ]}
          >
            {drawing(
              <Path
                d={rig.body}
                fill={tint.body}
                stroke={geo.who === "circle" ? colors.castCircleEdge : "none"}
                strokeWidth={3.78}
              />,
            )}
            <Animated.View style={[styles.overlay, layer, { opacity: side }]}>
              {drawing(<Path d={SIDE_ART[geo.who].shade} fill={tint.shade} />)}
            </Animated.View>
            <Animated.View
              style={[
                styles.overlay,
                layer,
                { opacity: front, transform: eyesTransform },
              ]}
            >
              {drawing(
                <FaceParts
                  parts={rig.eyes}
                  stroke={EYE_STROKE[geo.who]}
                  ink={colors.castInk}
                />,
              )}
            </Animated.View>
            <Animated.View
              style={[
                styles.overlay,
                layer,
                { opacity: side, transform: eyesTransform },
              ]}
            >
              {drawing(
                <FaceParts
                  parts={SIDE_ART[geo.who].eyes}
                  stroke={EYE_STROKE[geo.who]}
                  ink={colors.castInk}
                />,
              )}
            </Animated.View>
            <Animated.View
              style={[styles.overlay, layer, { opacity: at(tracks.marks, 0) }]}
            >
              {drawing(
                rig.marks.map((mark) => (
                  <Path
                    key={mark}
                    d={mark}
                    fill="none"
                    stroke={tint.accent}
                    strokeWidth={MARK_STROKE}
                    strokeLinecap="round"
                  />
                )),
              )}
            </Animated.View>
            {/* 놀랐을 때 머리 위에 톡 튀어나오는 빨간 느낌표 */}
            <Animated.View
              style={[
                styles.overlay,
                layer,
                {
                  opacity: at(tracks.alarm, 0),
                  transform: [
                    { translateX: 2 * unit },
                    { translateY: -120 * unit },
                    { scale: at(tracks.alarmScale, 1) },
                    { translateX: -2 * unit },
                    { translateY: 120 * unit },
                  ],
                },
              ]}
            >
              {drawing(
                <>
                  <Path
                    d="M7 -145.6L2.5 -123.6"
                    fill="none"
                    stroke={colors.castSquareAccent}
                    strokeWidth={ALARM_STROKE}
                    strokeLinecap="round"
                  />
                  <Circle
                    cx={0.8}
                    cy={-112.6}
                    r={4.6}
                    fill={colors.castSquareAccent}
                  />
                </>,
              )}
            </Animated.View>
          </Animated.View>
        </Animated.View>
      </Animated.View>
    </Animated.View>
  );
});

// 다리 한 마디. 가운데를 축으로 돌리고 마디 길이만큼 늘인 막대다.
function LegBar({
  tracks,
  clock,
  unit,
  color,
}: {
  tracks: SegmentTracks;
  clock: Animated.Value;
  unit: number;
  color: string;
}) {
  const width = LEG_WIDTH * unit;
  return (
    <Animated.View
      style={[
        styles.part,
        {
          left: -width / 2,
          top: (-BAR_LENGTH * unit) / 2,
          width,
          height: BAR_LENGTH * unit,
          borderRadius: width / 2,
          backgroundColor: color,
          transform: [
            { translateX: follow(clock, tracks.midX, 0, unit) },
            { translateY: follow(clock, tracks.midY, 0, unit) },
            { rotate: followAngle(clock, tracks.angle, 0) },
            {
              scaleY: follow(clock, tracks.length, BAR_LENGTH, 1 / BAR_LENGTH),
            },
          ],
        },
      ]}
    />
  );
}

const styles = StyleSheet.create({
  // 발바닥 가운데를 원점으로 두는 크기 없는 뷰. 다리·몸은 이 점에서 떨어진 자리에 그린다.
  origin: {
    position: "absolute",
    left: 0,
    top: 0,
    width: 0,
    height: 0,
    pointerEvents: "none",
  },
  part: { position: "absolute" },
  overlay: { position: "absolute", left: 0, top: 0 },
});
