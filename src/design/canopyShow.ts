import type { Point } from "./fruitShapes";
import {
  ROOT_PIVOT,
  branchGroupNames,
  branchGroups,
  type BranchGroup,
  type HangSpot,
} from "./canopy";
import {
  characterFrameAt,
  footCenterOf,
  landingOf,
  landingsOf,
  rigs,
  SLIP_MS,
  type CharacterFrame,
  type Jump,
} from "./canopyCast";
import { seededRandom } from "./storyTree";

// 홈 새로고침 연출(사용자가 고른 시안 B "다 같이 쿵쿵"). 새로고침을 누를 때만 돈다.
// 화면 위에 숨어 있던 나무가 새 열매를 달고 툭 떨어져 쿵 하고 튕기고, 셋이 하나·둘·셋 점점 높게 뛰어
// 세 번째 착지에 열매가 우수수 떨어진다. 네모는 세 번째 착지에서 삐끗해 휘청이다 제자리로 돌아온다.
// 열매가 다 내려앉으면 나무는 다시 화면 위로 올라가 홈에는 열매와 땅만 남는다(사용자 결정).
// 움직임은 미리 계산해 시각(ms)별 값으로 내보내고, 그리는 쪽은 Animated 보간으로 따라간다(fruitFlight와 같은 방식).
// 길이는 너비 390 화면의 px(나무 좌표)이고 그리는 쪽이 화면 너비에 맞춰 늘린다.

// 나무를 화면 위로 숨기는 거리와, 툭 떨어질 때의 중력(px/ms²)·제자리보다 더 내려갔다 튕겨 오르는 깊이
export const TREE_HIDE_OFFSET = -230;
const TREE_DROP_GRAVITY = 0.0026;
const DROP_OVERSHOOT = 12;
// 땅의 열매가 굴러 나가기 시작하고 나무가 떨어지기 시작하기까지
const TREE_DROP_AT = 250;
// 나무가 쿵 내려앉고 셋이 첫 번째로 뛰기까지
const FIRST_JUMP_AFTER_IMPACT = 570;
// 착지에서 다음 도약까지. 착지하며 굽힌 무릎으로 바로 다시 뛴다.
const BOUNCE_GAP_MS = 160;
// 하나·둘·셋 점점 높게. 네모는 세 번째에 덜 높이 뛰다 삐끗한다(높이 뛰면 머리가 상태 표시줄에 닿는다).
const JUMP_HEIGHTS = [14, 22, 36];
const SQUARE_LAST_JUMP_HEIGHT = 30;
// 세 번째 착지 뒤 열매가 떨어지기 시작하기까지, 열매 사이 평균 간격과 "톡… 톡톡… 톡" 리듬(FruitField와 같다)
const FIRST_FRUIT_AFTER_LANDING = 30;
const FRUIT_GAP_MS = 70;
const DROP_GAP_RHYTHM = [1, 0.6, 1.5, 0.8, 1.2, 0.7, 1.3];
// 마지막 열매가 가지에서 떨어진 뒤 땅에서 튀고 굴러 멈추기까지 넉넉히 잡은 시간과, 그 뒤 나무가 올라가기까지 쉬는 틈
const FRUIT_SETTLE_ALLOWANCE_MS = 2300;
const PAUSE_BEFORE_EXIT_MS = 200;
// 나무가 다시 화면 위로 올라가는 시간
const EXIT_MS = 650;
// 미리 계산하는 간격(ms). 그 사이는 보간한다.
const SAMPLE_MS = 1000 / 30;

const clamp01 = (value: number) => Math.min(1, Math.max(0, value));
const easeInCubic = (progress: number) => progress * progress * progress;

// 용수철처럼 from에서 to로 가며 출렁이다 멈춘다. velocity는 시작 빠르기(px/ms)다.
function spring(
  elapsedMs: number,
  from: number,
  to: number,
  frequency: number,
  damping: number,
  velocity = 0,
) {
  if (elapsedMs <= 0) return from;
  const seconds = elapsedMs / 1000;
  const omega = 2 * Math.PI * frequency;
  const dampedOmega = omega * Math.sqrt(1 - damping * damping);
  const startGap = from - to;
  const startSpeed = velocity * 1000;
  const decay = Math.exp(-damping * omega * seconds);
  return (
    to +
    decay *
      (startGap * Math.cos(dampedOmega * seconds) +
        ((startSpeed + damping * omega * startGap) / dampedOmega) *
          Math.sin(dampedOmega * seconds))
  );
}

// 쿵 하고 받은 충격이 남기는 흔들림. amplitude 쪽으로 먼저 움직였다가 잦아든다.
function ring(
  elapsedMs: number,
  amplitude: number,
  periodMs: number,
  decayMs: number,
) {
  if (elapsedMs < 0 || amplitude === 0) return 0;
  return (
    amplitude *
    Math.exp(-elapsedMs / decayMs) *
    Math.sin((2 * Math.PI * elapsedMs) / periodMs)
  );
}

// 화면에서 시계 방향이 +인 회전
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

// ---------- 시간표 ----------

interface Landing {
  who: BranchGroup;
  at: number;
  height: number;
}

export interface ShowSchedule {
  // 나무가 떨어지기 시작하는 때와 쿵 내려앉는 때
  dropAt: number;
  impactAt: number;
  jumps: Record<BranchGroup, Jump[]>;
  landings: Landing[];
  // 열매마다 가지에서 떨어지는 때
  fruitDrops: number[];
  // 나무가 다시 화면 위로 올라가기 시작하는 때. 열매가 다 내려앉고 네모도 제자리로 돌아온 뒤다.
  exitAt: number;
  durationMs: number;
}

const bounceAfter = (jump: Jump) => Math.round(landingOf(jump) + BOUNCE_GAP_MS);

// 같은 seed면 늘 같은 순서로 섞는다.
function seededOrder(count: number, seed: number) {
  const random = seededRandom(seed);
  const order = Array.from({ length: count }, (_, index) => index);
  for (let index = count - 1; index > 0; index--) {
    const swap = Math.floor(random() * (index + 1));
    [order[index], order[swap]] = [order[swap], order[index]];
  }
  return order;
}

export function planShowSchedule(fruitCount: number): ShowSchedule {
  const dropAt = TREE_DROP_AT;
  const fallMs = Math.sqrt(
    (2 * (DROP_OVERSHOOT - TREE_HIDE_OFFSET)) / TREE_DROP_GRAVITY,
  );
  const impactAt = dropAt + fallMs;

  // 셋이 한꺼번에 뛴다. 다음 뛰기는 가장 늦게 내려온 캐릭터를 기다리지 않고 같은 박자로 이어진다.
  const jumps: Record<BranchGroup, Jump[]> = {
    circle: [],
    triangle: [],
    square: [],
  };
  let at = Math.round(impactAt + FIRST_JUMP_AFTER_IMPACT);
  JUMP_HEIGHTS.forEach((height, order) => {
    const last = order === JUMP_HEIGHTS.length - 1;
    for (const who of branchGroupNames) {
      const squareLast = last && who === "square";
      jumps[who].push({
        at,
        height: squareLast ? SQUARE_LAST_JUMP_HEIGHT : height,
        flair: last,
        slip: squareLast,
      });
    }
    at = bounceAfter({ at, height });
  });
  const thirdLanding = Math.max(
    ...branchGroupNames.map((who) => landingOf(jumps[who][2])),
  );

  const fruitDrops = new Array<number>(fruitCount).fill(0);
  let dropTime = thirdLanding + FIRST_FRUIT_AFTER_LANDING;
  seededOrder(fruitCount, 7).forEach((fruitIndex, step) => {
    fruitDrops[fruitIndex] = Math.round(dropTime);
    dropTime += FRUIT_GAP_MS * DROP_GAP_RHYTHM[step % DROP_GAP_RHYTHM.length];
  });

  const landings = branchGroupNames.flatMap((who) =>
    landingsOf(jumps[who]).map((landing) => ({ who, ...landing })),
  );
  const lastFruitDrop = Math.max(thirdLanding, ...fruitDrops);
  const slipEnd = landingOf(jumps.square[2]) + SLIP_MS;
  const exitAt = Math.round(
    Math.max(slipEnd, lastFruitDrop + FRUIT_SETTLE_ALLOWANCE_MS) +
      PAUSE_BEFORE_EXIT_MS,
  );
  return {
    dropAt,
    impactAt,
    jumps,
    landings,
    fruitDrops,
    exitAt,
    durationMs: exitAt + EXIT_MS,
  };
}

// ---------- 나무 상태 ----------

export interface TreeState {
  // 제자리에서 위아래로 비켜 있는 거리(음수면 화면 위)
  offsetY: number;
  // 나무 전체가 기운 각도(ROOT_PIVOT을 축으로)
  rootAngle: number;
  // 가지 묶음(붙은 잎 포함)마다 휜 각도
  groupAngles: Record<BranchGroup, number>;
}

// 나무가 툭 떨어져 쿵 하고 튕긴 뒤의 높이(제자리 0)
function droppedOffsetAt(schedule: ShowSchedule, atMs: number) {
  const elapsed = atMs - schedule.dropAt;
  if (elapsed < 0) return TREE_HIDE_OFFSET;
  const fallMs = schedule.impactAt - schedule.dropAt;
  if (elapsed < fallMs)
    return TREE_HIDE_OFFSET + 0.5 * TREE_DROP_GRAVITY * elapsed * elapsed;
  return spring(elapsed - fallMs, DROP_OVERSHOOT, 0, 2.4, 0.32, -0.15);
}

// 나무가 제자리에서 위아래로 비켜 있는 거리. 끝에는 점점 빨라지며 화면 위로 올라간다.
function treeOffsetAt(schedule: ShowSchedule, atMs: number) {
  const offset = droppedOffsetAt(schedule, atMs);
  if (atMs < schedule.exitAt) return offset;
  const leaving = easeInCubic(clamp01((atMs - schedule.exitAt) / EXIT_MS));
  return offset + (TREE_HIDE_OFFSET - offset) * leaving;
}

// 캐릭터가 착지하면 선 가지가 가장 크게 휘고, 바로 옆 가지 묶음은 조금, 먼 가지는 아주 조금 휜다.
// 가지에 붙은 잎까지 함께 도는 만큼, 잎이 너무 크게 출렁이지 않도록 각도를 작게 잡는다.
function dipShareOf(standsOn: BranchGroup, group: BranchGroup) {
  if (standsOn === group) return 0.12;
  if (branchGroups[standsOn].neighbors.includes(group)) return 0.06;
  return 0.02;
}

// 나무가 쿵 내려앉을 때의 흔들림(나무 전체 기울기와 가지 휨)
const IMPACT = { root: 1.1, branch: 3.4 };

export function treeStateAt(schedule: ShowSchedule, atMs: number): TreeState {
  let bob = 0;
  let rootAngle = 0;
  const groupAngles: Record<BranchGroup, number> = {
    circle: 0,
    triangle: 0,
    square: 0,
  };
  for (const landing of schedule.landings) {
    const elapsed = atMs - landing.at;
    if (elapsed < 0 || elapsed > 2600) continue;
    // 무게가 실린 쪽으로 나무 전체가 살짝 기운다.
    const side = landing.who === "circle" ? -1 : 1;
    rootAngle += side * ring(elapsed, 0.035 * landing.height, 900, 750);
    bob += ring(elapsed, 0.12 * landing.height, 420, 360);
    for (const group of branchGroupNames) {
      groupAngles[group] +=
        branchGroups[group].dipSign *
        ring(
          elapsed,
          dipShareOf(landing.who, group) * landing.height,
          340,
          320,
        );
    }
  }
  const sinceImpact = atMs - schedule.impactAt;
  if (sinceImpact >= 0 && sinceImpact <= 3000) {
    rootAngle += ring(sinceImpact, IMPACT.root, 900, 800);
    for (const group of branchGroupNames) {
      groupAngles[group] +=
        branchGroups[group].dipSign *
        ring(sinceImpact, IMPACT.branch, 380, 380);
    }
  }
  return {
    offsetY: treeOffsetAt(schedule, atMs) + bob,
    rootAngle,
    groupAngles,
  };
}

// 가지에 붙은 점(나무 좌표)이 시각 t에 화면 어디에 있는지
export function pointOnTree(
  state: TreeState,
  group: BranchGroup,
  point: Point,
): Point {
  const onBranch = rotateAround(
    point,
    state.groupAngles[group],
    branchGroups[group].pivot,
  );
  const turned = rotateAround(onBranch, state.rootAngle, ROOT_PIVOT);
  return { x: turned.x, y: turned.y + state.offsetY };
}

// 매달린 열매는 가지가 흔들리면 진자처럼 흔들린다. 자기 가지 캐릭터가 뛸 때 가장 크게 흔들린다.
// 열매마다 흔들리는 쪽을 번갈아 둬서 한꺼번에 같은 쪽으로 쏠리지 않게 한다.
export function swingAt(
  schedule: ShowSchedule,
  hang: HangSpot,
  fruitIndex: number,
  atMs: number,
) {
  const direction = fruitIndex % 2 === 0 ? 1 : -1;
  let swing = 0;
  for (const landing of schedule.landings) {
    const amplitude =
      (hang.group === landing.who ? 10 : 3.5) * (landing.height / 22);
    swing += ring(atMs - landing.at, amplitude, 560, 520);
  }
  swing += ring(atMs - schedule.impactAt, 7, 560, 560);
  return direction * swing;
}

// ---------- 시각별 값 ----------

// 보간할 값. times는 ms이고 늘어나는 순서다.
export interface Track {
  times: number[];
  values: number[];
}

// 앞뒤 값 사이를 곧게 이어도 tolerance 안에 드는 점은 빼서, 오래 가만히 있는 값의 점 수를 줄인다.
export function simplifyTrack(track: Track, tolerance: number): Track {
  const { times, values } = track;
  if (times.length <= 2) return track;
  const keptTimes = [times[0]];
  const keptValues = [values[0]];
  let anchor = 0;
  for (let index = 1; index < times.length - 1; index++) {
    const next = index + 1;
    const span = times[next] - times[anchor];
    let fits = true;
    for (let inner = anchor + 1; inner <= index; inner++) {
      const share = (times[inner] - times[anchor]) / span;
      const straight = values[anchor] + (values[next] - values[anchor]) * share;
      if (Math.abs(straight - values[inner]) > tolerance) {
        fits = false;
        break;
      }
    }
    if (!fits) {
      keptTimes.push(times[index]);
      keptValues.push(values[index]);
      anchor = index;
    }
  }
  keptTimes.push(times[times.length - 1]);
  keptValues.push(values[values.length - 1]);
  return { times: keptTimes, values: keptValues };
}

// 각도가 -180°와 180° 사이를 넘나들며 튀지 않게 이어 붙인다.
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

export function sampleTimes(durationMs: number) {
  const count = Math.ceil(durationMs / SAMPLE_MS);
  return Array.from({ length: count + 1 }, (_, index) =>
    Math.min(durationMs, Math.round(index * SAMPLE_MS * 10) / 10),
  );
}

function trackOf(
  times: number[],
  values: number[],
  tolerance: number,
  angle = false,
): Track {
  const continuous = angle ? unwrapDegrees(values) : values;
  return simplifyTrack({ times, values: continuous }, tolerance);
}

// 막대 하나(다리 한 마디)를 놓는 값. 세로 막대를 가운데에서 angle만큼 돌리고 length만큼 늘인다.
export interface SegmentTracks {
  midX: Track;
  midY: Track;
  angle: Track;
  length: Track;
}

export interface LegTracks {
  thigh: SegmentTracks;
  shin: SegmentTracks;
  footX: Track;
  footY: Track;
  footAngle: Track;
}

export interface CastTracks {
  lift: Track;
  lean: Track;
  shiftX: Track;
  anchorY: Track;
  angle: Track;
  scaleX: Track;
  scaleY: Track;
  happy: Track;
  marks: Track;
  alarm: Track;
  legs: [LegTracks, LegTracks];
}

export interface TreeTracks {
  offsetY: Track;
  rootAngle: Track;
  groupAngles: Record<BranchGroup, Track>;
}

// 세로로 선 막대(아래쪽이 +y)를 from→to 방향으로 돌리는 각도(도, 시계 방향 +)
function barAngleOf(from: Point, to: Point) {
  return (Math.atan2(-(to.x - from.x), to.y - from.y) * 180) / Math.PI;
}

function segmentTracks(
  times: number[],
  ends: { from: Point; to: Point }[],
): SegmentTracks {
  return {
    midX: trackOf(
      times,
      ends.map(({ from, to }) => (from.x + to.x) / 2),
      0.05,
    ),
    midY: trackOf(
      times,
      ends.map(({ from, to }) => (from.y + to.y) / 2),
      0.05,
    ),
    angle: trackOf(
      times,
      ends.map(({ from, to }) => barAngleOf(from, to)),
      0.3,
      true,
    ),
    length: trackOf(
      times,
      ends.map(({ from, to }) => Math.hypot(to.x - from.x, to.y - from.y)),
      0.05,
    ),
  };
}

// 캐릭터 하나의 움직임. 길이는 캐릭터 단위(키 121), lift만 나무 좌표 px다.
function castTracks(times: number[], frames: CharacterFrame[]): CastTracks {
  const channel = (
    read: (frame: CharacterFrame) => number,
    tolerance: number,
    angle = false,
  ) => trackOf(times, frames.map(read), tolerance, angle);
  const legTracks = (index: 0 | 1): LegTracks => {
    const legs = frames.map((frame) => frame.legs[index]);
    const feet = legs.map(footCenterOf);
    return {
      thigh: segmentTracks(
        times,
        legs.map((leg) => ({ from: leg.hip, to: leg.knee })),
      ),
      shin: segmentTracks(
        times,
        legs.map((leg) => ({ from: leg.knee, to: leg.foot })),
      ),
      footX: trackOf(
        times,
        feet.map((foot) => foot.x),
        0.05,
      ),
      footY: trackOf(
        times,
        feet.map((foot) => foot.y),
        0.05,
      ),
      footAngle: trackOf(
        times,
        legs.map((leg) => leg.footAngle),
        0.3,
        true,
      ),
    };
  };
  return {
    lift: channel((frame) => frame.lift, 0.05),
    lean: channel((frame) => frame.lean, 0.1),
    shiftX: channel((frame) => frame.shiftX, 0.05),
    anchorY: channel((frame) => frame.anchorY, 0.05),
    // 동그라미는 한 바퀴(360도) 구른 뒤 0도로 돌아오므로, 이어 붙이지 않으면 착지하는 순간 거꾸로 한 바퀴 돈다.
    angle: channel((frame) => frame.angle, 0.2, true),
    scaleX: channel((frame) => frame.scaleX, 0.002),
    scaleY: channel((frame) => frame.scaleY, 0.002),
    happy: channel((frame) => frame.happy, 0.01),
    marks: channel((frame) => frame.marks, 0.01),
    alarm: channel((frame) => frame.alarm, 0.01),
    legs: [legTracks(0), legTracks(1)],
  };
}

export interface CanopyShow {
  schedule: ShowSchedule;
  durationMs: number;
  tree: TreeTracks;
  cast: Record<BranchGroup, CastTracks>;
}

// 연출 전체를 시각별 값으로 계산한다. 열매가 매달려 있다 떨어지는 길은 열매 밭이 자기 좌표로 따로 계산한다
// (pointOnTree·swingAt·fruitDrops를 쓴다).
export function planCanopyShow(fruitCount: number): CanopyShow {
  const schedule = planShowSchedule(fruitCount);
  const times = sampleTimes(schedule.durationMs);
  const states = times.map((atMs) => treeStateAt(schedule, atMs));
  const tree: TreeTracks = {
    offsetY: trackOf(
      times,
      states.map((state) => state.offsetY),
      0.1,
    ),
    rootAngle: trackOf(
      times,
      states.map((state) => state.rootAngle),
      0.01,
    ),
    groupAngles: Object.fromEntries(
      branchGroupNames.map((group) => [
        group,
        trackOf(
          times,
          states.map((state) => state.groupAngles[group]),
          0.02,
        ),
      ]),
    ) as Record<BranchGroup, Track>,
  };
  const cast = Object.fromEntries(
    branchGroupNames.map((who) => [
      who,
      castTracks(
        times,
        times.map((atMs) =>
          characterFrameAt(rigs[who], schedule.jumps[who], atMs),
        ),
      ),
    ]),
  ) as Record<BranchGroup, CastTracks>;
  return { schedule, durationMs: schedule.durationMs, tree, cast };
}

// 가만히 서 있을 때(연출 전·동작 줄이기)의 캐릭터 자세
export function restingFrameOf(who: BranchGroup) {
  return characterFrameAt(rigs[who], [], 0);
}
