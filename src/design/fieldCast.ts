import type { BranchGroup } from "./canopy";
import { rigs, type FacePart } from "./canopyCast";
import { sampleTimes, simplifyTrack, type Track } from "./canopyShow";
import type { Point } from "./fruitShapes";

// 홈 풀밭에서 노는 캐릭터 셋(사용자가 고른 6차 시안 "캐릭터 놀이터", 옆모습은 B안).
// 가만히 서 있을 때는 정면을 보고, 움직일 때는 옆으로 돌아서서 사람처럼 걷고 뛴다. 열매를 누르거나 옮기면
// 정면을 보고 "!" 하고 움찔한 뒤 돌아서서 화면 밖으로 달아나고, 잠시 뒤 하나씩 화면 가장자리에서 허리를 숙여
// 빼꼼 고개를 내밀고 눈치를 보다가 다시 들어와 논다.
// 몸 그림은 나무 위 캐릭터(canopyCast)와 같고 다리만 길게 늘렸다. 옆모습은 눈을 앞쪽으로 옮기고(먼 눈은 좁게)
// 등 쪽에 어두운 면을 두며, 두 다리가 몸 밑에 앞뒤로 겹쳐 서서 무릎이 앞으로 굽는다(두 마디 IK).
// 정면에서는 다리가 곧게 짧아졌다 늘어난다(무릎이 보는 쪽으로 굽는 것처럼).
// 길이는 캐릭터 단위(몸 높이 100)이고, 땅 위 자리와 빠르기는 너비 390 화면의 px다(그리는 쪽이 열매 밭 배율을 곱한다).
// 몸짓 하나마다 움직임을 미리 계산해 시각(ms)별 값으로 내보내고, 그리는 쪽은 Animated 보간으로 따라간다(canopyShow와 같은 방식).
// React·Expo 의존성이 없어서 node 테스트가 가능하다.

export const CAST: BranchGroup[] = ["circle", "triangle", "square"];
// 캐릭터 단위 하나가 너비 390 화면에서 차지하는 px. 몸 높이 100단위가 31px쯤이다.
export const CAST_UNIT_PX = 38 / 121;
// 다리를 나무 위 캐릭터보다 이만큼(단위) 길게 늘린다. 서 있을 때 몸 기준점 높이도 그만큼 올라간다.
export const LEG_EXTRA = 21;
export const ANCHOR_Y = -20.4 - LEG_EXTRA;
// 서 있을 때 다리가 곧게 펴지도록 마디를 엉덩이~발목 거리의 딱 반쯤으로 둔다.
const SEGMENT_SHARE = 0.503;
// 디딘 다리는 거의 편 채 몸을 받친다. 몸이 들리거나 기울어 발이 닿지 않으면 다리를 쭉 편 채 발이 떨어진다.
const STANCE_STRETCH = 0.985;
const REACH_LIMIT = 0.985;
// 발 타원이 발목보다 나온 거리: 정면은 바깥쪽으로, 옆모습은 발끝이 앞으로
const FOOT_OUTSET = 2.8;
const TOE_FORWARD = 4;
// 옆모습: 두 다리가 몸 한가운데 밑에 앞뒤로 겹쳐 선다(0이 먼 다리, 1이 가까운 다리).
const SIDE_HIPS: Point[] = [
  { x: -4, y: -3 },
  { x: 4, y: -3 },
];
const SIDE_FEET: Point[] = [
  { x: -3, y: -2.4 },
  { x: 5, y: -2.4 },
];
// 정면과 옆모습이 바뀌거나 방향을 틀 때 몸이 살짝 좁아졌다 펴지며 돌아서는 시간
export const TURN_MS = 180;
// 걷듯이 뛰기: 디딘 발은 제자리에 붙어 있도록 디디는 동안 몸이 나아간 만큼 발을 뒤로 민다.
export const JOG_SPEED = 58;
const JOG_CYCLE_MS = 420;
const JOG_STANCE = 0.5;
const JOG_LIFT = 16;
// 도망: 무릎을 높이 차올리며 크게 기울어 달린다(너무 빨라 발이 조금 미끄러진다).
export const RUN_SPEED = 280;
const RUN_CYCLE_MS = 260;
const RUN_STANCE = 0.36;
const RUN_REACH = 26;
const RUN_LIFT = 26;
// 토끼뜀: 땅에서 무릎을 굽혔다 펴며 튀어 오르고, 공중에 떠 있는 동안에만 앞으로 나아간다.
export const HOP_MS = 600;
export const HOP_DIST = 40;
const HOP_HEIGHT = 42;
export const HOP_GROUND = 0.34;
export const JUMP_MS = 1150;
const JUMP_HEIGHT = 115;
export const STARTLE_MS = 380;
// "!"가 떠 있는 시간
const ALARM_MS = 1000;
export const PEEK_MS = 2800;
const PEEK_LEAN = 30;
// 빼꼼할 때 처음 이만큼 동안 가장자리로 다가서며 허리를 숙인다.
const PEEK_APPROACH = 0.22;

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));
const lerp = (from: number, to: number, k: number) => from + (to - from) * k;
const smooth = (k: number) => k * k * (3 - 2 * k);
const RAD = Math.PI / 180;
function rotate(point: Point, degrees: number): Point {
  const cos = Math.cos(degrees * RAD);
  const sin = Math.sin(degrees * RAD);
  return {
    x: point.x * cos - point.y * sin,
    y: point.x * sin + point.y * cos,
  };
}

// 옆모습 그림(오른쪽을 볼 때): 등 쪽 어두운 면과, 앞쪽으로 옮긴 눈(먼 눈은 좁다). 몸 기준 좌표다.
export const SIDE_ART: Record<
  BranchGroup,
  { shade: string; eyes: FacePart[] }
> = {
  circle: {
    shade: "M 0 -100 A 52.5 50 0 0 0 0 0 A 38 50 0 0 1 0 -100 Z",
    eyes: [
      {
        d: "M 8.1 -54.6 A 1.9 7 0 1 0 11.9 -54.6 A 1.9 7 0 1 0 8.1 -54.6 Z",
        paint: "fill",
      },
      {
        d: "M 21.3 -55 A 2.7 7.3 0 1 0 26.7 -55 A 2.7 7.3 0 1 0 21.3 -55 Z",
        paint: "fill",
      },
    ],
  },
  triangle: {
    shade: "M -2.4 -95.6 L -55.07 -7.72 Q -59.7 0 -50.7 0 L -32 0 Z",
    eyes: [
      {
        d: "M 2.1 -47.1 A 1.9 7 0 1 0 5.9 -47.1 A 1.9 7 0 1 0 2.1 -47.1 Z",
        paint: "fill",
      },
      {
        d: "M 14.3 -47.1 A 2.7 7.3 0 1 0 19.7 -47.1 A 2.7 7.3 0 1 0 14.3 -47.1 Z",
        paint: "fill",
      },
    ],
  },
  square: {
    shade:
      "M -39.5 -88.37 Q -38.4 -97.3 -29.41 -96.82 L -24 -96.5 L -33 -1.8 L -41.02 -2.4 Q -50 -3 -48.9 -11.93 Z",
    eyes: [
      {
        d: "M 4.1 -55 A 1.9 7 0 1 0 7.9 -55 A 1.9 7 0 1 0 4.1 -55 Z",
        paint: "fill",
      },
      {
        d: "M 18.3 -54.2 A 2.7 7.3 0 1 0 23.7 -54.2 A 2.7 7.3 0 1 0 18.3 -54.2 Z",
        paint: "fill",
      },
    ],
  },
};

export type CastView = "front" | "side";

export interface LegGeometry {
  hips: Point[];
  feet: Point[];
  // 서 있을 때 엉덩이에서 발목까지(몸 기준). 공중에서는 이 다리를 몸과 함께 돌리고 접는다.
  vecs: Point[];
  // 허벅지·정강이 한 마디 길이
  lengths: number[];
}

export interface CastGeometry {
  who: BranchGroup;
  flair: "roll" | "star" | "tilt";
  eyeY: number;
  front: LegGeometry;
  side: LegGeometry;
}

function legGeometry(hips: Point[], feet: Point[]): LegGeometry {
  const vecs = hips.map((hip, leg) => ({
    x: feet[leg].x - hip.x,
    y: feet[leg].y - (hip.y + ANCHOR_Y),
  }));
  return {
    hips,
    feet,
    vecs,
    lengths: vecs.map((vec) => SEGMENT_SHARE * Math.hypot(vec.x, vec.y)),
  };
}

export function castGeometryOf(who: BranchGroup): CastGeometry {
  const rig = rigs[who];
  return {
    who,
    flair: rig.flair,
    eyeY: rig.eyeCenterY,
    front: legGeometry(rig.hips, rig.feet),
    side: legGeometry(SIDE_HIPS, SIDE_FEET),
  };
}

// 몸짓. 자리는 땅 위 발바닥 가운데(열매 밭 px)이고, flip이면 왼쪽을 본다.
export type CastActType =
  "idle" | "jog" | "hop" | "jump" | "startle" | "run" | "peek" | "hide";

export interface CastAct {
  type: CastActType;
  durationMs: number;
  from: Point;
  to: Point;
  flip: boolean;
  // 토끼뜀 횟수
  hops?: number;
  // 움찔한 뒤 달아날 곳
  escape?: Point;
  // 이 몸짓 시작에서 잰 "!"가 뜬 때(ms)
  alarmAt?: number;
}

// 몸짓마다 보는 쪽. 움직일 때는 옆으로 돌아서고, 서 있거나 놀랄 때는 정면을 본다.
const VIEW_OF: Record<CastActType, CastView> = {
  idle: "front",
  jump: "front",
  startle: "front",
  jog: "side",
  hop: "side",
  run: "side",
  peek: "side",
  hide: "side",
};
export const viewOf = (type: CastActType) => VIEW_OF[type];

const facing = (from: Point, to: Point, flip: boolean) =>
  Math.abs(to.x - from.x) > 2 ? to.x < from.x : flip;

export function idleAct(at: Point, flip: boolean, durationMs: number): CastAct {
  return { type: "idle", durationMs, from: at, to: at, flip };
}
export function jumpAct(at: Point, flip: boolean): CastAct {
  return { type: "jump", durationMs: JUMP_MS, from: at, to: at, flip };
}
export function hideAct(at: Point, flip: boolean): CastAct {
  return { type: "hide", durationMs: Infinity, from: at, to: at, flip };
}
export function jogAct(
  from: Point,
  to: Point,
  flip: boolean,
  scale: number,
): CastAct {
  const distance = Math.hypot(to.x - from.x, to.y - from.y);
  return {
    type: "jog",
    durationMs: Math.max(400, (distance / (JOG_SPEED * scale)) * 1000),
    from,
    to,
    flip: facing(from, to, flip),
  };
}
export function hopAct(
  from: Point,
  to: Point,
  flip: boolean,
  scale: number,
): CastAct {
  const distance = Math.hypot(to.x - from.x, to.y - from.y);
  const hops = Math.max(1, Math.round(distance / (HOP_DIST * scale)));
  return {
    type: "hop",
    durationMs: hops * HOP_MS,
    from,
    to,
    flip: facing(from, to, flip),
    hops,
  };
}
// 놀라서 움찔할 때는 달아날 쪽을 미리 보고 있어서, 돌아설 때 보는 쪽(정면→옆)만 바뀐다.
export function startleAct(at: Point, escape: Point): CastAct {
  return {
    type: "startle",
    durationMs: STARTLE_MS,
    from: at,
    to: at,
    flip: escape.x < at.x,
    escape,
    alarmAt: 0,
  };
}
export function runAct(
  from: Point,
  to: Point,
  scale: number,
  alarmAt?: number,
): CastAct {
  return {
    type: "run",
    durationMs: Math.max(
      1,
      (Math.abs(to.x - from.x) / (RUN_SPEED * scale)) * 1000,
    ),
    from,
    to,
    flip: to.x < from.x,
    alarmAt,
  };
}
// 화면 밖 from에서 가장자리 가까이 to까지 다가서며 허리를 숙여 고개를 내민다. 화면 안쪽을 본다.
export function peekAct(from: Point, to: Point): CastAct {
  return {
    type: "peek",
    durationMs: PEEK_MS,
    from,
    to,
    flip: to.x > from.x ? false : true,
  };
}

// 지금 서 있는(또는 지나가는) 땅 위 자리
export function positionAt(act: CastAct, t: number): Point {
  const along = (k: number) => ({
    x: lerp(act.from.x, act.to.x, k),
    y: lerp(act.from.y, act.to.y, k),
  });
  if (!Number.isFinite(act.durationMs)) return act.to;
  const time = clamp(t, 0, act.durationMs);
  if (act.type === "hop") {
    const hops = act.hops ?? 1;
    const hop = Math.min(hops - 1, Math.floor(time / HOP_MS));
    const p = (time - hop * HOP_MS) / HOP_MS;
    const air =
      p < HOP_GROUND ? 0 : smooth((p - HOP_GROUND) / (1 - HOP_GROUND));
    return along(time >= act.durationMs ? 1 : (hop + air) / hops);
  }
  if (act.type === "jog" || act.type === "run")
    return along(time / act.durationMs);
  if (act.type === "peek")
    return along(smooth(clamp(time / act.durationMs / PEEK_APPROACH, 0, 1)));
  return act.to;
}

// 엉덩이와 발목을 잇는 두 마디 다리에서 무릎 자리. 무릎은 앞(+x)으로 굽는다.
export function kneeForward(hip: Point, foot: Point, length: number): Point {
  const dx = foot.x - hip.x;
  const dy = foot.y - hip.y;
  const reach = clamp(Math.hypot(dx, dy), 0.01, length * 2 - 0.01);
  const spread = Math.acos(clamp(reach / (2 * length), -1, 1));
  const base = Math.atan2(dy, dx);
  const knees = [base + spread, base - spread].map((angle) => ({
    x: hip.x + Math.cos(angle) * length,
    y: hip.y + Math.sin(angle) * length,
  }));
  return knees[0].x >= knees[1].x ? knees[0] : knees[1];
}

// 두 발을 번갈아 내딛는다. 디디는 동안(stance)에는 앞에서 뒤로 밀리고, 드는 동안에는 들려 앞으로 나간다.
function strideFeet(
  rest: Point[],
  p: number,
  stance: number,
  reach: number,
  lift: number,
) {
  return rest.map((foot, leg) => {
    const phase = (p + leg * 0.5) % 1;
    if (phase < stance)
      return { x: foot.x + reach * (1 - (2 * phase) / stance), y: foot.y };
    const k = (phase - stance) / (1 - stance);
    return {
      x: foot.x + reach * (2 * smooth(k) - 1),
      y: foot.y - lift * Math.sin(Math.PI * k),
    };
  });
}

export interface CastLeg {
  hip: Point;
  knee: Point;
  foot: Point;
}

// 그릴 때 쓰는 값. 몸·다리는 캐릭터 단위, x·y는 땅 위 자리(px), air는 공중 높이(단위)다.
// 몸은 몸 기준점(몸 바닥 가운데)을 축으로 "늘림 → 기울임 → (x, y)로 옮김" 순서로 놓는다.
export interface CastPose {
  x: number;
  y: number;
  air: number;
  body: { x: number; y: number; angle: number; sx: number; sy: number };
  legs: CastLeg[];
  // 발 타원 가운데
  feet: Point[];
  eyesX: number;
  marks: number;
  alarm: number;
  alarmScale: number;
}

interface Shape {
  offX: number;
  offY: number;
  sx: number;
  sy: number;
  lean: number;
  air: number;
  eyesX: number;
  marks: number;
  // 땅 위 발 자리. legs가 있으면 엉덩이에서 잰 다리(몸 기준)라 몸과 함께 돈다(공중 몸짓).
  feet: Point[];
  legs?: Point[];
}

// 몸짓마다 몸(웅크림·늘임·기울기), 두 발 자리, 공중 높이를 정한다.
function shapeAt(
  geo: CastGeometry,
  act: CastAct,
  t: number,
  view: CastView,
  now: number,
): Shape {
  const legGeo = geo[view];
  const rest = legGeo.feet;
  const shape: Shape = {
    offX: 0,
    offY: 0,
    sx: 1,
    sy: 1,
    lean: 0,
    air: 0,
    eyesX: 0,
    marks: 0,
    feet: rest,
  };
  // 돌아서는 사이 아직 앞 몸짓의 그림일 때는 가만히 선 자세로 둔다.
  if (view !== viewOf(act.type)) return shape;
  const spread = (degrees: number) =>
    legGeo.vecs.map((vec, leg) => rotate(vec, leg === 0 ? degrees : -degrees));
  if (act.type === "jog") {
    const p = (t % JOG_CYCLE_MS) / JOG_CYCLE_MS;
    const reach =
      ((JOG_SPEED / CAST_UNIT_PX) * (JOG_CYCLE_MS / 1000) * JOG_STANCE) / 2;
    const feet = strideFeet(rest, p, JOG_STANCE, reach, JOG_LIFT);
    // 디딘 발에 닿을 만큼만 엉덩이를 낮춘다: 발이 몸 바로 밑일 때 가장 높고, 앞뒤로 벌어질수록 조금 내려간다.
    let offY = 0;
    feet.forEach((foot, leg) => {
      if ((p + leg * 0.5) % 1 >= JOG_STANCE) return;
      const hip = legGeo.hips[leg];
      const length = legGeo.lengths[leg] * 2 * STANCE_STRETCH;
      const dx = foot.x - hip.x;
      const below = Math.sqrt(Math.max(0, length * length - dx * dx));
      offY = Math.max(offY, foot.y - below - (hip.y + ANCHOR_Y));
    });
    return { ...shape, offY, lean: 6, feet };
  }
  if (act.type === "run") {
    const p = (t % RUN_CYCLE_MS) / RUN_CYCLE_MS;
    const bob = Math.cos(2 * Math.PI * (2 * p - RUN_STANCE));
    return {
      ...shape,
      offY: 6 + 3 * bob,
      sy: 1 - 0.03 * bob,
      sx: 1 + 0.02 * bob,
      lean: 16,
      feet: strideFeet(rest, p, RUN_STANCE, RUN_REACH, RUN_LIFT),
    };
  }
  if (act.type === "hop") {
    const p = (Math.min(t, act.durationMs - 1) % HOP_MS) / HOP_MS;
    if (p < HOP_GROUND) {
      // 착지하며 무릎을 앞으로 굽혀 받았다가 다리를 쭉 펴며 튀어 오른다.
      const bend = Math.sin((Math.PI * p) / HOP_GROUND);
      return {
        ...shape,
        offY: -2 + 14 * bend,
        sx: 1 + 0.07 * bend,
        sy: 1 - 0.09 * bend,
        lean: 8 * bend,
      };
    }
    // 공중에서는 무릎을 접어 발이 뒤로 올라간다.
    const k = (p - HOP_GROUND) / (1 - HOP_GROUND);
    const tuck = Math.sin(Math.PI * k);
    return {
      ...shape,
      offY: -2,
      air: 4 * HOP_HEIGHT * k * (1 - k),
      sx: 0.97 + 0.03 * k,
      sy: 1.05 - 0.05 * k,
      lean: 6 * tuck,
      legs: legGeo.vecs.map((vec) => ({
        x: vec.x - 10 * tuck,
        y: vec.y * (1 - 0.4 * tuck),
      })),
    };
  }
  if (act.type === "jump") {
    // 크게 뛰기(정면): 깊이 웅크렸다 높이 솟아, 동그라미는 한 바퀴 구르고 세모는 다리를 활짝 벌리고
    // 네모는 뒤로 젖히며 다리를 찬다.
    const p = t / act.durationMs;
    if (p < 0.22) {
      const k = smooth(p / 0.22);
      return { ...shape, offY: 14 * k, sx: 1 + 0.12 * k, sy: 1 - 0.16 * k };
    }
    if (p < 0.28) {
      const k = (p - 0.22) / 0.06;
      return {
        ...shape,
        offY: lerp(14, -3, k),
        sx: lerp(1.12, 0.94, k),
        sy: lerp(0.84, 1.1, k),
      };
    }
    if (p < 0.82) {
      const k = (p - 0.28) / 0.54;
      const tuck = Math.sin(Math.PI * k);
      const flying = {
        ...shape,
        offY: -3,
        air: 4 * JUMP_HEIGHT * k * (1 - k),
        sx: lerp(0.94, 1, k),
        sy: lerp(1.1, 1, k),
        marks: tuck,
      };
      if (geo.flair === "roll")
        return {
          ...flying,
          lean: 360 * smooth(k),
          legs: legGeo.vecs.map((vec) => ({
            x: vec.x,
            y: vec.y * (1 - 0.5 * tuck),
          })),
        };
      if (geo.flair === "star") return { ...flying, legs: spread(50 * tuck) };
      return {
        ...flying,
        lean: -24 * tuck,
        legs: legGeo.vecs.map((vec) => ({
          x: vec.x + 20 * tuck,
          y: vec.y * (1 - 0.3 * tuck),
        })),
      };
    }
    const bend = Math.sin((Math.PI * (p - 0.82)) / 0.18);
    return {
      ...shape,
      offY: 12 * bend,
      sx: 1 + 0.1 * bend,
      sy: 1 - 0.12 * bend,
    };
  }
  if (act.type === "startle") {
    // 움찔(정면): 다리를 쫙 벌리며 뛰어오르고 몸은 뒤로 젖힌다.
    const up = Math.sin((Math.PI * t) / act.durationMs);
    return {
      ...shape,
      offY: -3,
      air: 34 * up,
      sy: 1 + 0.1 * up,
      sx: 1 - 0.06 * up,
      lean: -12 * up,
      legs: spread(30 * up),
    };
  }
  if (act.type === "peek") {
    // 화면 밖에 선 채 허리를 숙여 고개를 내밀고, 두리번거리다 한 번 움찔 숨었다가 다시 내민다.
    const p = t / act.durationMs;
    const dart = 5 * clamp(3 * Math.sin((2 * Math.PI * t) / 1500), -1, 1);
    if (p < PEEK_APPROACH) {
      const k = smooth(p / PEEK_APPROACH);
      return { ...shape, lean: PEEK_LEAN * k, offY: 3 * k };
    }
    if (p < 0.5) return { ...shape, lean: PEEK_LEAN, offY: 3, eyesX: dart };
    if (p < 0.6) {
      const k = Math.sin((Math.PI * (p - 0.5)) / 0.1);
      return { ...shape, lean: PEEK_LEAN - 24 * k, offY: 3 + 4 * k };
    }
    if (p < 0.86) return { ...shape, lean: PEEK_LEAN, offY: 3, eyesX: -dart };
    const k = smooth((p - 0.86) / 0.14);
    return { ...shape, lean: PEEK_LEAN * (1 - k), offY: 3 * (1 - k) };
  }
  if (act.type === "idle") {
    // 가만히 서 있을 때는 다리를 곧게 펴고, 몸통만 숨 쉬듯 살짝 부풀었다 가라앉는다.
    const breath = Math.sin((2 * Math.PI * now) / 2400);
    return {
      ...shape,
      offY: 0.3 + 0.3 * breath,
      sx: 1 + 0.012 * breath,
      sy: 1 - 0.015 * breath,
    };
  }
  return shape;
}

// 몸짓을 시작하고 t(ms) 지났을 때의 자세. view를 주면 그쪽 그림으로 그린다(돌아서는 사이).
export function poseAt(
  geo: CastGeometry,
  act: CastAct,
  t: number,
  view: CastView = viewOf(act.type),
): CastPose {
  const time = Number.isFinite(act.durationMs)
    ? clamp(t, 0, act.durationMs)
    : 0;
  const shape = shapeAt(geo, act, time, view, time);
  const legGeo = geo[view];
  const where = positionAt(act, time);
  const body = {
    x: shape.offX,
    y: ANCHOR_Y + shape.offY,
    angle: shape.lean,
    sx: shape.sx,
    sy: shape.sy,
  };
  const side = view === "side";
  const legs = legGeo.hips.map((hipInBody, leg) => {
    const turned = rotate(
      { x: hipInBody.x * body.sx, y: hipInBody.y * body.sy },
      body.angle,
    );
    const hip = { x: body.x + turned.x, y: body.y + turned.y };
    let foot = shape.feet[leg];
    if (shape.legs) {
      const out = rotate(shape.legs[leg], body.angle);
      foot = { x: hip.x + out.x, y: hip.y + out.y };
    }
    const reach = Math.hypot(foot.x - hip.x, foot.y - hip.y);
    const longest = legGeo.lengths[leg] * 2 * REACH_LIMIT;
    if (reach > longest)
      foot = {
        x: hip.x + ((foot.x - hip.x) * longest) / reach,
        y: hip.y + ((foot.y - hip.y) * longest) / reach,
      };
    const knee = side
      ? kneeForward(hip, foot, legGeo.lengths[leg])
      : { x: (hip.x + foot.x) / 2, y: (hip.y + foot.y) / 2 };
    return { hip, knee, foot };
  });
  const since = act.alarmAt === undefined ? Infinity : time - act.alarmAt;
  const alarmOn = since >= 0 && since < ALARM_MS;
  return {
    x: where.x,
    y: where.y,
    air: shape.air,
    body,
    legs,
    feet: legs.map(({ foot }, leg) => ({
      x: foot.x + (side ? TOE_FORWARD : (leg === 0 ? -1 : 1) * FOOT_OUTSET),
      y: foot.y,
    })),
    eyesX: shape.eyesX,
    marks: shape.marks,
    alarm: alarmOn ? (since < 800 ? 1 : 1 - (since - 800) / 200) : 0,
    alarmScale: !alarmOn
      ? 1
      : since < 180
        ? lerp(0.3, 1.25, since / 180)
        : since < 300
          ? lerp(1.25, 1, (since - 180) / 120)
          : 1,
  };
}

// ---------- 미리 계산한 움직임 ----------

// 세로로 선 막대(아래쪽이 +y)를 from→to 방향으로 돌리는 각도(도)
const barAngleOf = (from: Point, to: Point) =>
  (Math.atan2(-(to.x - from.x), to.y - from.y) * 180) / Math.PI;

function unwrapDegrees(values: number[]) {
  const unwrapped = [values[0]];
  for (let index = 1; index < values.length; index++) {
    let value = values[index];
    const previous = unwrapped[index - 1];
    while (value - previous > 180) value -= 360;
    while (value - previous < -180) value += 360;
    unwrapped.push(value);
  }
  return unwrapped;
}

export interface SegmentTracks {
  midX: Track;
  midY: Track;
  angle: Track;
  length: Track;
}

// 몸짓 하나의 움직임. x·y·lift는 열매 밭 px(너비 390 기준), 나머지 길이는 캐릭터 단위다.
// turn은 좌우 뒤집기와 돌아설 때 좁아지는 정도를 함께 담은 가로 배율, front는 정면 그림의 보이는 정도(0~1)다.
export interface CastTracks {
  durationMs: number;
  x: Track;
  y: Track;
  lift: Track;
  turn: Track;
  front: Track;
  bodyX: Track;
  bodyY: Track;
  bodyAngle: Track;
  bodySx: Track;
  bodySy: Track;
  legs: {
    thigh: SegmentTracks;
    shin: SegmentTracks;
    footX: Track;
    footY: Track;
  }[];
  eyesX: Track;
  marks: Track;
  alarm: Track;
  alarmScale: Track;
  shadow: Track;
}

// 앞 몸짓이 끝날 때 보던 쪽과 방향. 이와 다르면 몸짓 처음에 돌아선다.
export interface CastFacing {
  view: CastView;
  flip: boolean;
}

export const facingOf = (act: CastAct): CastFacing => ({
  view: viewOf(act.type),
  flip: act.flip,
});

// 가만히 있는 몸짓(숨어 있기)은 시작 자세 하나만 담는다.
const STILL_MS = 1;

export function trackOf(
  geo: CastGeometry,
  act: CastAct,
  scale: number,
  before?: CastFacing,
): CastTracks {
  const view = viewOf(act.type);
  const durationMs = Number.isFinite(act.durationMs)
    ? act.durationMs
    : STILL_MS;
  const times = Number.isFinite(act.durationMs)
    ? sampleTimes(durationMs)
    : [0, STILL_MS];
  const turning =
    !!before && (before.view !== view || before.flip !== act.flip);
  const columns: Record<string, number[]> = {};
  const push = (name: string, value: number) =>
    (columns[name] ??= []).push(value);
  for (const t of times) {
    const k = turning ? clamp(t / TURN_MS, 0, 1) : 1;
    const shownView = turning && k < 0.5 ? before!.view : view;
    const shownFlip = turning && k < 0.5 ? before!.flip : act.flip;
    const pose = poseAt(
      geo,
      act,
      Number.isFinite(act.durationMs) ? t : 0,
      shownView,
    );
    push("x", pose.x);
    push("y", pose.y);
    push("lift", pose.air * CAST_UNIT_PX * scale);
    push(
      "turn",
      (shownFlip ? -1 : 1) * (turning ? 1 - 0.45 * Math.sin(Math.PI * k) : 1),
    );
    push("front", shownView === "front" ? 1 : 0);
    push("bodyX", pose.body.x);
    push("bodyY", pose.body.y);
    push("bodyAngle", pose.body.angle);
    push("bodySx", pose.body.sx);
    push("bodySy", pose.body.sy);
    pose.legs.forEach(({ hip, knee, foot }, leg) => {
      const segments: [string, Point, Point][] = [
        ["thigh", hip, knee],
        ["shin", knee, foot],
      ];
      for (const [name, from, to] of segments) {
        push(`${name}${leg}MidX`, (from.x + to.x) / 2);
        push(`${name}${leg}MidY`, (from.y + to.y) / 2);
        push(`${name}${leg}Angle`, barAngleOf(from, to));
        push(`${name}${leg}Length`, Math.hypot(to.x - from.x, to.y - from.y));
      }
      push(`foot${leg}X`, pose.feet[leg].x);
      push(`foot${leg}Y`, pose.feet[leg].y);
    });
    push("eyesX", pose.eyesX);
    push("marks", pose.marks);
    push("alarm", pose.alarm);
    push("alarmScale", pose.alarmScale);
    push("shadow", 1 - 0.5 * Math.min(1, pose.air / 110));
  }
  const track = (name: string, tolerance: number, angle = false): Track =>
    simplifyTrack(
      { times, values: angle ? unwrapDegrees(columns[name]) : columns[name] },
      tolerance,
    );
  const segment = (name: string): SegmentTracks => ({
    midX: track(`${name}MidX`, 0.2),
    midY: track(`${name}MidY`, 0.2),
    angle: track(`${name}Angle`, 0.5, true),
    length: track(`${name}Length`, 0.2),
  });
  return {
    durationMs,
    x: track("x", 0.2),
    y: track("y", 0.2),
    lift: track("lift", 0.2),
    turn: track("turn", 0.01),
    front: track("front", 0.01),
    bodyX: track("bodyX", 0.2),
    bodyY: track("bodyY", 0.2),
    bodyAngle: track("bodyAngle", 0.5, true),
    bodySx: track("bodySx", 0.003),
    bodySy: track("bodySy", 0.003),
    legs: [0, 1].map((leg) => ({
      thigh: segment(`thigh${leg}`),
      shin: segment(`shin${leg}`),
      footX: track(`foot${leg}X`, 0.2),
      footY: track(`foot${leg}Y`, 0.2),
    })),
    eyesX: track("eyesX", 0.2),
    marks: track("marks", 0.02),
    alarm: track("alarm", 0.02),
    alarmScale: track("alarmScale", 0.02),
    shadow: track("shadow", 0.01),
  };
}

// ---------- 놀이 ----------

// 캐릭터가 노는 땅(열매 밭 px)
export interface CastArea {
  left: number;
  right: number;
  top: number;
  bottom: number;
}

// 놀기: 걷듯이 뛰어다니거나, 토끼뜀으로 옮겨 가거나, 신나서 크게 뛰어오르거나, 잠깐 서서 쉰다.
export function playAct(
  at: Point,
  flip: boolean,
  area: CastArea,
  scale: number,
  random: () => number,
): CastAct {
  const somewhere = (near: number, far: number) => {
    const angle = random() * Math.PI * 2;
    const reach = (near + random() * (far - near)) * scale;
    return {
      x: clamp(at.x + Math.cos(angle) * reach, area.left, area.right),
      y: clamp(at.y + Math.sin(angle) * reach * 0.5, area.top, area.bottom),
    };
  };
  const roll = random();
  if (roll < 0.45) return jogAct(at, somewhere(70, 170), flip, scale);
  if (roll < 0.6) return hopAct(at, somewhere(50, 120), flip, scale);
  if (roll < 0.75) return jumpAct(at, flip);
  return idleAct(at, flip, 900 + random() * 1400);
}
