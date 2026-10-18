import type { Point } from "./fruitShapes";
import type { BranchGroup } from "./canopy";

// 홈 나무 위의 캐릭터 셋. 사용자가 직접 그린 동그라미·세모·네모(reference/sian/tree-refresh/ref-characters.png)로,
// 테두리·팔 없이 색 면이고 검은 막대 다리에 바깥을 향한 작은 발이 있다.
// 몸은 "몸 기준점(몸 바닥 가운데)"에서, 발은 "발바닥(y=0)"에서 잰 단위로 그린다. 발바닥에서 머리 꼭대기까지 121단위다.
// 다리는 엉덩이-무릎-발 두 마디라, 웅크리거나 착지해 엉덩이가 발에 가까워지면 무릎이 바깥으로 굽는다.
// React·Expo 의존성이 없어서 node 테스트가 가능하다.

export const CHARACTER_HEIGHT_UNITS = 121;
// 발 타원 가운데 높이(발바닥 0에서 반 두께 위)와, 서 있을 때 몸 기준점이 그보다 높은 거리
const FOOT_LINE = -2.4;
const LEG_REST = 18;
export const FOOT_SIZE = { rx: 5, ry: 2.4 };
// 발 타원은 발목보다 바깥쪽으로 이만큼 나와 있다.
const FOOT_OUTSET = 2.8;

// 그림 조각. fill이면 면으로 칠하고, stroke면 선으로 긋는다(굵기는 그리는 쪽이 화면 픽셀로 정한다).
export interface FacePart {
  d: string;
  paint: "fill" | "stroke";
}

export interface CharacterRig {
  kind: BranchGroup;
  name: string;
  body: string;
  // 공중에서 몸을 돌릴 때의 가운데(몸 기준)
  bodyCenter: Point;
  hips: [Point, Point];
  feet: [Point, Point];
  eyes: FacePart[];
  // 신날 때 눈(사용자 그림의 > < 표정). 없으면 늘 같은 눈이다.
  happyEyes?: FacePart[];
  // 신나게 뛸 때 머리 옆에 뜨는 강조 빗금 두 줄
  marks: string[];
  eyeCenterY: number;
  // 크게 뛸 때 공중에서 하는 몸짓: 한 바퀴 구르기, 다리 활짝(별), 뒤로 기우뚱
  flair: "roll" | "star" | "tilt";
}

const fmt = (value: number) => Number(value.toFixed(2)).toString();
const line = (from: Point, to: Point) =>
  `M ${fmt(from.x)} ${fmt(from.y)} L ${fmt(to.x)} ${fmt(to.y)}`;
const polyline = (points: Point[]) =>
  `M ${points.map((point) => `${fmt(point.x)} ${fmt(point.y)}`).join(" L ")}`;
const ellipse = (cx: number, cy: number, rx: number, ry: number) =>
  `M ${fmt(cx - rx)} ${fmt(cy)} A ${fmt(rx)} ${fmt(ry)} 0 1 0 ${fmt(cx + rx)} ${fmt(cy)} ` +
  `A ${fmt(rx)} ${fmt(ry)} 0 1 0 ${fmt(cx - rx)} ${fmt(cy)} Z`;

// 꼭짓점마다 양옆 변에서 radius만큼 떨어진 점을 잇고, 꼭짓점을 조절점으로 둥글린다.
function roundedPolygon(corners: Point[], radius: number) {
  const pieces = corners.map((corner, index) => {
    const previous = corners[(index - 1 + corners.length) % corners.length];
    const next = corners[(index + 1) % corners.length];
    const toward = (target: Point) => {
      const length = Math.hypot(target.x - corner.x, target.y - corner.y);
      return {
        x: corner.x + ((target.x - corner.x) / length) * radius,
        y: corner.y + ((target.y - corner.y) / length) * radius,
      };
    };
    const enter = toward(previous);
    const leave = toward(next);
    const move = index === 0 ? "M" : "L";
    return `${move} ${fmt(enter.x)} ${fmt(enter.y)} Q ${fmt(corner.x)} ${fmt(corner.y)} ${fmt(leave.x)} ${fmt(leave.y)}`;
  });
  return `${pieces.join(" ")} Z`;
}

export const rigs: Record<BranchGroup, CharacterRig> = {
  circle: {
    kind: "circle",
    name: "동그라미",
    body: ellipse(0, -50, 52.5, 50),
    bodyCenter: { x: 0, y: -50 },
    hips: [
      { x: -13, y: -3 },
      { x: 13, y: -3 },
    ],
    feet: [
      { x: -15, y: FOOT_LINE },
      { x: 15, y: FOOT_LINE },
    ],
    eyes: [
      { d: ellipse(-8, -54.6, 2.7, 7.3), paint: "fill" },
      { d: ellipse(9.8, -55.2, 2.7, 7.3), paint: "fill" },
    ],
    happyEyes: [
      {
        d: polyline([
          { x: -12.8, y: -60.2 },
          { x: -5, y: -54.6 },
          { x: -12.8, y: -49 },
        ]),
        paint: "stroke",
      },
      {
        d: polyline([
          { x: 14.8, y: -60.2 },
          { x: 7, y: -54.6 },
          { x: 14.8, y: -49 },
        ]),
        paint: "stroke",
      },
    ],
    marks: [
      line({ x: -70.4, y: -82.5 }, { x: -60.7, y: -70 }),
      line({ x: -80.4, y: -66.7 }, { x: -67.4, y: -60.2 }),
    ],
    eyeCenterY: -54.6,
    flair: "roll",
  },
  triangle: {
    kind: "triangle",
    name: "세모",
    body: roundedPolygon(
      [
        { x: 0, y: -99.4 },
        { x: 59.7, y: 0 },
        { x: -59.7, y: 0 },
      ],
      9,
    ),
    bodyCenter: { x: 0, y: -38 },
    hips: [
      { x: -19, y: -1.5 },
      { x: 19, y: -1.5 },
    ],
    feet: [
      { x: -27.6, y: FOOT_LINE },
      { x: 27.6, y: FOOT_LINE },
    ],
    // 세 캐릭터 모두 동그라미와 같은 세로로 긴 점 눈이고, 신날 때 > < 로 바뀐다(사용자 요청).
    eyes: [
      { d: ellipse(-8.9, -47.1, 2.7, 7.3), paint: "fill" },
      { d: ellipse(8.9, -47.1, 2.7, 7.3), paint: "fill" },
    ],
    happyEyes: [
      {
        d: polyline([
          { x: -12.8, y: -52.7 },
          { x: -5, y: -47.1 },
          { x: -12.8, y: -41.5 },
        ]),
        paint: "stroke",
      },
      {
        d: polyline([
          { x: 12.8, y: -52.7 },
          { x: 5, y: -47.1 },
          { x: 12.8, y: -41.5 },
        ]),
        paint: "stroke",
      },
    ],
    marks: [
      line({ x: 37.4, y: -82.3 }, { x: 45.8, y: -95.3 }),
      line({ x: 45.8, y: -74.9 }, { x: 57.4, y: -83.7 }),
    ],
    eyeCenterY: -47.1,
    flair: "star",
  },
  square: {
    kind: "square",
    name: "네모",
    body: roundedPolygon(
      [
        { x: -38.4, y: -97.3 },
        { x: 59.3, y: -92.1 },
        { x: 50.5, y: 3.7 },
        { x: -50, y: -3 },
      ],
      9,
    ),
    bodyCenter: { x: 5, y: -47 },
    hips: [
      { x: -21, y: -1.5 },
      { x: 22.6, y: 1.5 },
    ],
    feet: [
      { x: -30.5, y: FOOT_LINE },
      { x: 30, y: FOOT_LINE },
    ],
    // 기울어진 몸을 따라 오른쪽 눈이 조금 낮다.
    eyes: [
      { d: ellipse(-5.7, -55, 2.7, 7.3), paint: "fill" },
      { d: ellipse(12.1, -54, 2.7, 7.3), paint: "fill" },
    ],
    happyEyes: [
      {
        d: polyline([
          { x: -9.6, y: -60.6 },
          { x: -1.8, y: -55 },
          { x: -9.6, y: -49.4 },
        ]),
        paint: "stroke",
      },
      {
        d: polyline([
          { x: 16, y: -59.6 },
          { x: 8.2, y: -54 },
          { x: 16, y: -48.4 },
        ]),
        paint: "stroke",
      },
    ],
    marks: [
      line({ x: 71.8, y: -93.3 }, { x: 81.1, y: -104 }),
      line({ x: 78.4, y: -85 }, { x: 91.4, y: -92 }),
    ],
    eyeCenterY: -54.3,
    flair: "tilt",
  },
};

// 네모가 삐끗할 때 머리 옆에 톡 튀어나오는 빨간 느낌표. pop은 이 점을 축으로 커진다.
export const ALARM = {
  stroke: line({ x: 87, y: -130 }, { x: 82.5, y: -102 }),
  dot: ellipse(80.8, -91, 4.4, 4.4),
  pop: { x: 82, y: -100 },
};

// ---------- 뛰기 ----------

// 캐릭터가 뛰는 중력(px/ms², 너비 390 화면 기준)
export const CHARACTER_GRAVITY = 0.0021;
// 무릎을 굽혀 웅크리는 시간, 착지해 무릎으로 받는 시간, 네모가 삐끗해 휘청이다 제자리로 오기까지의 시간
export const CROUCH_MS = 150;
export const LAND_MS = 280;
export const SLIP_MS = 1000;
// 네모가 삐끗한 뒤 다시 폴짝 뛰는 때(착지 뒤 ms)와 그 높이(px)
export const SLIP_HOP_AT = 700;
export const SLIP_HOP_HEIGHT = 8;

export interface Jump {
  at: number;
  // 뛰어오르는 높이(px, 너비 390 화면 기준)
  height: number;
  // 크게 뛸 때 공중 몸짓(구르기·별·기우뚱)을 한다.
  flair?: boolean;
  // 착지하다 삐끗해 휘청인 뒤 다시 제자리로 온다(네모).
  slip?: boolean;
}

const launchSpeedOf = (height: number) =>
  Math.sqrt(2 * CHARACTER_GRAVITY * height);
export const airtimeOf = (height: number) =>
  (2 * launchSpeedOf(height)) / CHARACTER_GRAVITY;
export const landingOf = (jump: Jump) => jump.at + airtimeOf(jump.height);

const clamp01 = (value: number) => Math.min(1, Math.max(0, value));
const easeOutQuad = (progress: number) => 1 - (1 - progress) * (1 - progress);
const easeOutCubic = (progress: number) => 1 - Math.pow(1 - progress, 3);
const easeInOutSine = (progress: number) =>
  -(Math.cos(Math.PI * progress) - 1) / 2;
const easeInOutCubic = (progress: number) =>
  progress < 0.5
    ? 4 * progress * progress * progress
    : 1 - Math.pow(-2 * progress + 2, 3) / 2;
const smoothstep = (progress: number) =>
  progress * progress * (3 - 2 * progress);

// 한 순간의 몸짓. drop은 무릎을 굽혀 몸이 내려간 정도(다리 길이에 대한 비율), squash·stretch는 납작·길쭉한 정도다.
interface Pose {
  lift: number;
  drop: number;
  squash: number;
  stretch: number;
  // 공중 몸짓의 회전, 삐끗해 버티는 왼발을 축으로 휘청이는 각도(도)
  angle: number;
  lean: number;
  shift: number;
  // 공중에서 다리를 접은 정도와 별처럼 벌린 정도(0~1)
  tuck: number;
  spread: number;
  airborne: boolean;
  // 삐끗해 가지에서 미끄러진 오른발이 빠진 거리
  slip: Point | null;
  happy: boolean;
  marks: number;
  alarm: number;
}

function restingPose(): Pose {
  return {
    lift: 0,
    drop: 0,
    squash: 0,
    stretch: 0,
    angle: 0,
    lean: 0,
    shift: 0,
    tuck: 0,
    spread: 0,
    airborne: false,
    slip: null,
    happy: false,
    marks: 0,
    alarm: 0,
  };
}

// 공중 몸짓: 동그라미는 한 바퀴 구르고, 세모는 다리를 활짝 펴며 살짝 비틀고, 네모는 뒤로 기우뚱한다.
function applyFlair(
  pose: Pose,
  flair: CharacterRig["flair"],
  progress: number,
) {
  if (flair === "roll") pose.angle = 360 * easeInOutCubic(progress);
  if (flair === "star") {
    pose.angle = 10 * Math.sin(2 * Math.PI * progress);
    pose.spread = pose.tuck;
  }
  if (flair === "tilt") pose.angle = -11 * Math.sin(Math.PI * progress);
}

// 웅크림: 무릎을 굽혀 몸을 낮추고 납작해진다.
function crouchPose(pose: Pose, jump: Jump, atMs: number) {
  const press = easeOutQuad(
    clamp01((atMs - (jump.at - CROUCH_MS)) / CROUCH_MS),
  );
  pose.drop = 0.45 * press;
  pose.squash = 0.13 * press;
}

// 공중: 무릎을 확 펴며 뜨고, 올라가며 다리를 접었다가 내려오며 다시 뻗는다.
function airPose(pose: Pose, jump: Jump, rig: CharacterRig, atMs: number) {
  const air = airtimeOf(jump.height);
  const flying = atMs - jump.at;
  const progress = flying / air;
  const launch = launchSpeedOf(jump.height);
  pose.airborne = true;
  pose.lift = launch * flying - 0.5 * CHARACTER_GRAVITY * flying * flying;
  const crouchDepth = 0.45;
  const pushed = easeOutCubic(clamp01(flying / 70));
  const settled = clamp01((progress - 0.2) / 0.2);
  pose.drop = (crouchDepth + (-0.12 - crouchDepth) * pushed) * (1 - settled);
  pose.tuck =
    smoothstep(clamp01((progress - 0.08) / 0.27)) *
    smoothstep(clamp01((1 - progress) / 0.3));
  const speed = Math.abs(launch - CHARACTER_GRAVITY * flying) / launch;
  pose.stretch = 0.14 * speed * (1 - 0.5 * pose.tuck);
  if (jump.flair) applyFlair(pose, rig.flair, progress);
  if (jump.height >= 20) {
    pose.marks = Math.max(pose.marks, clamp01((progress - 0.2) / 0.15));
  }
}

// 착지: 무릎을 굽혀 받고 살짝 튕겨 선다. 높이 뛸수록 깊게 굽힌다.
function landPose(pose: Pose, jump: Jump, atMs: number) {
  const since = atMs - landingOf(jump);
  const heavy = Math.min(1, jump.height / 30);
  if (since < 200) {
    const absorb = Math.sin((Math.PI * since) / 200);
    pose.drop = (0.32 + 0.28 * heavy) * absorb;
    pose.squash = (0.1 + 0.1 * heavy) * absorb;
  } else {
    const rebound = Math.sin((Math.PI * (since - 200)) / 80);
    pose.drop = -0.1 * rebound;
    pose.stretch = 0.05 * rebound;
  }
  if (jump.height >= 20) pose.marks = Math.max(pose.marks, 1 - since / LAND_MS);
}

// 삐끗: 세게 내려앉다 오른발이 가지에서 미끄러져, 버티는 왼발을 축으로 휘청인다. 그러다 다시 폴짝 뛰어 제자리에 선다.
function slipPose(pose: Pose, jump: Jump, atMs: number) {
  const since = atMs - landingOf(jump);
  if (since < 220) {
    const absorb = Math.sin((Math.PI * since) / 220);
    pose.drop = 0.62 * absorb;
    pose.squash = 0.2 * absorb;
  }
  const slipIn = easeOutCubic(clamp01(since / 140));
  const wobble = (elapsed: number) =>
    elapsed < 140
      ? 17 * easeOutCubic(clamp01(elapsed / 140))
      : 17 *
        Math.exp(-(elapsed - 140) / 230) *
        Math.cos((2 * Math.PI * (elapsed - 140)) / 300);
  if (since < SLIP_HOP_AT) {
    pose.lean = wobble(since);
    pose.shift = 4 * slipIn;
    const flail =
      Math.sin((2 * Math.PI * since) / 170) * Math.exp(-since / 420);
    pose.slip = { x: 7 * slipIn + 3 * flail, y: 10 * slipIn - 4 * flail };
  } else {
    const hopTime = airtimeOf(SLIP_HOP_HEIGHT);
    const hopping = since - SLIP_HOP_AT;
    if (hopping < hopTime) {
      const progress = hopping / hopTime;
      const launch = launchSpeedOf(SLIP_HOP_HEIGHT);
      pose.airborne = true;
      pose.lift =
        launch * hopping - 0.5 * CHARACTER_GRAVITY * hopping * hopping;
      pose.lean = wobble(SLIP_HOP_AT) * (1 - progress);
      pose.shift = 4 * (1 - easeInOutSine(progress));
      pose.tuck = 0.5 * Math.sin(Math.PI * progress);
    } else {
      const settle = Math.sin(Math.PI * clamp01((hopping - hopTime) / 160));
      pose.drop = 0.25 * settle;
      pose.squash = 0.08 * settle;
    }
  }
  // 빨간 느낌표가 톡 튀어나왔다가 사라진다.
  pose.alarm = Math.max(
    pose.alarm,
    clamp01((since - 40) / 60) * (1 - clamp01((since - 760) / 120)),
  );
}

// 착지 시각은 가지가 휘고 나무가 흔들리는 신호다. 삐끗하면 한 번 더 쿵, 다시 내려앉을 때 또 한 번 흔들린다.
export function landingsOf(jumps: Jump[]) {
  return jumps.flatMap((jump) => {
    const landing = landingOf(jump);
    const landings = [{ at: landing, height: jump.height }];
    if (jump.slip) {
      landings.push({ at: landing + 150, height: 12 });
      landings.push({
        at: landing + SLIP_HOP_AT + airtimeOf(SLIP_HOP_HEIGHT),
        height: SLIP_HOP_HEIGHT,
      });
    }
    return landings;
  });
}

// 한 캐릭터의 그 시각(atMs) 자세. 서 있는 자세에서 시작해, 뛰기 하나하나가 자기 시간 동안 덮어쓴다(나중 뛰기가 우선).
// 착지하며 굽힌 무릎으로 바로 다시 뛰면, 다음 뛰기의 웅크림이 앞 착지를 이어받는다.
function poseAt(jumps: Jump[], rig: CharacterRig, atMs: number): Pose {
  const pose = restingPose();
  for (const jump of jumps) {
    const landing = landingOf(jump);
    const crouchFrom = jump.at - CROUCH_MS;
    const settleEnd = landing + (jump.slip ? SLIP_MS : LAND_MS);
    if (atMs >= crouchFrom - 40 && atMs <= landing + 520) pose.happy = true;
    if (atMs < crouchFrom || atMs >= settleEnd) continue;
    const { marks, alarm, happy } = pose;
    Object.assign(pose, restingPose(), { marks, alarm, happy });
    if (atMs < jump.at) crouchPose(pose, jump, atMs);
    else if (atMs < landing) airPose(pose, jump, rig, atMs);
    else if (jump.slip) slipPose(pose, jump, atMs);
    else landPose(pose, jump, atMs);
  }
  return pose;
}

// ---------- 그릴 값 ----------

function rotateAround(point: Point, degrees: number, pivot: Point): Point {
  const radians = (degrees * Math.PI) / 180;
  const cos = Math.cos(radians);
  const sin = Math.sin(radians);
  const dx = point.x - pivot.x;
  const dy = point.y - pivot.y;
  return {
    x: pivot.x + dx * cos - dy * sin,
    y: pivot.y + dx * sin + dy * cos,
  };
}

// 엉덩이와 발이 가까워지면 무릎이 바깥(side 쪽)으로 굽는다. 다 뻗으면 곧은 다리다.
function kneeOf(hip: Point, foot: Point, segment: number, side: number) {
  const dx = foot.x - hip.x;
  const dy = foot.y - hip.y;
  const distance = Math.hypot(dx, dy) || 0.001;
  const middle = { x: hip.x + dx / 2, y: hip.y + dy / 2 };
  const half = distance / 2;
  if (half >= segment) return middle;
  const bend = Math.sqrt(segment * segment - half * half);
  let normalX = -dy / distance;
  let normalY = dx / distance;
  if (normalX * side < 0) {
    normalX = -normalX;
    normalY = -normalY;
  }
  return { x: middle.x + normalX * bend, y: middle.y + normalY * bend };
}

// 서 있을 때 엉덩이 자리(캐릭터 좌표)
function restHipOf(rig: CharacterRig, index: number) {
  const hip = rig.hips[index];
  return { x: hip.x, y: FOOT_LINE - LEG_REST + hip.y };
}

// 다리 한 마디 길이: 서 있을 때 엉덩이에서 발까지의 반
const segmentsOf = (rig: CharacterRig) =>
  [0, 1].map((index) => {
    const hip = restHipOf(rig, index);
    const foot = rig.feet[index];
    return Math.hypot(foot.x - hip.x, foot.y - hip.y) / 2;
  });

export interface LegFrame {
  hip: Point;
  knee: Point;
  foot: Point;
  // 발 타원이 기운 각도(도)와 발목에서 바깥으로 나온 쪽(-1 왼발, 1 오른발)
  footAngle: number;
  side: number;
}

// 그릴 때 쓰는 값. 길이는 캐릭터 단위, 각도는 도, lift만 화면 px(너비 390 기준)다.
// 몸은 "버티는 왼발을 축으로 lean만큼 돌림 → (shiftX, anchorY)로 옮김 → 몸 가운데를 축으로 angle만큼 돌림 →
// 몸 기준점을 축으로 scaleX·scaleY만큼 늘림" 순서로 놓는다.
export interface CharacterFrame {
  lift: number;
  lean: number;
  leanPivot: Point;
  shiftX: number;
  anchorY: number;
  angle: number;
  scaleX: number;
  scaleY: number;
  legs: [LegFrame, LegFrame];
  happy: number;
  marks: number;
  alarm: number;
}

export function characterFrameAt(
  rig: CharacterRig,
  jumps: Jump[],
  atMs: number,
): CharacterFrame {
  const pose = poseAt(jumps, rig, atMs);
  const segments = segmentsOf(rig);
  const anchorY = FOOT_LINE - LEG_REST + pose.drop * LEG_REST;
  const scaleX = 1 + pose.squash * 0.55 - pose.stretch * 0.45;
  const scaleY = 1 - pose.squash + pose.stretch;
  const leanPivot = { x: rig.feet[0].x, y: FOOT_LINE };
  // 몸 그림과 같은 순서(크기 → 몸짓 회전 → 이동 → 휘청)로 엉덩이 자리를 옮긴다.
  const toCharacter = (point: Point) => {
    const scaled = { x: point.x * scaleX, y: point.y * scaleY };
    const turned = rotateAround(scaled, pose.angle, rig.bodyCenter);
    const moved = { x: turned.x + pose.shift, y: turned.y + anchorY };
    return rotateAround(moved, pose.lean, leanPivot);
  };
  const legs = rig.hips.map((hipInBody, index) => {
    const side = index === 0 ? -1 : 1;
    const hip = toCharacter(hipInBody);
    let foot: Point;
    if (pose.airborne) {
      // 공중에서는 발이 몸을 따라온다. 다리를 접으면 발이 엉덩이 쪽으로 올라오고, 별 몸짓이면 옆으로 벌어진다.
      const restHip = restHipOf(rig, index);
      const restLeg = {
        x: rig.feet[index].x - restHip.x,
        y: rig.feet[index].y - restHip.y,
      };
      const shaped = {
        x: restLeg.x * (1 + 0.9 * pose.spread) + side * 2 * pose.tuck,
        y: restLeg.y * (1 - 0.5 * pose.tuck - 0.2 * pose.spread),
      };
      const turned = rotateAround(shaped, pose.angle + pose.lean, {
        x: 0,
        y: 0,
      });
      foot = { x: hip.x + turned.x, y: hip.y + turned.y };
    } else {
      foot = { ...rig.feet[index] };
      // 삐끗한 오른발은 가지에서 미끄러져 바깥 아래로 빠진다.
      if (index === 1 && pose.slip) {
        foot.x += pose.slip.x;
        foot.y += pose.slip.y;
      }
    }
    return {
      hip,
      knee: kneeOf(hip, foot, segments[index], side),
      foot,
      footAngle: pose.airborne ? pose.angle + pose.lean : 0,
      side,
    };
  }) as [LegFrame, LegFrame];
  return {
    lift: pose.lift,
    lean: pose.lean,
    leanPivot,
    shiftX: pose.shift,
    anchorY,
    angle: pose.angle,
    scaleX,
    scaleY,
    legs,
    happy: pose.happy ? 1 : 0,
    marks: pose.marks,
    alarm: pose.alarm,
  };
}

// 발 타원 가운데. 발목에서 발 방향으로 바깥을 향해 조금 나와 있다.
export function footCenterOf(leg: LegFrame): Point {
  const radians = (leg.footAngle * Math.PI) / 180;
  return {
    x: leg.foot.x + Math.cos(radians) * leg.side * FOOT_OUTSET,
    y: leg.foot.y + Math.sin(radians) * leg.side * FOOT_OUTSET,
  };
}
