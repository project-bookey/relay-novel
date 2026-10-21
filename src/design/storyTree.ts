// 소설 하나의 "이야기 나무" 모양을 계산한다. React·Expo 의존성이 없어서 node 테스트가 가능하다.
// 회차 하나가 가지 하나다. 첫 작가의 줄기(없으면 먼저 쓴 가지)를 따라 이어지는 큰 줄기는 몸통에 붙고,
// 한 회차를 여러 사람이 이어 써서 갈라진 가지는 부모 가지에서 뻗는다. 아직 아무도 잇지 않은 끝 가지에는 열매가 맺힌다.
import {
  straightChain,
  type ChapterLink,
  compareSiblings,
} from "./chapterTree";

export const TREE_WIDTH = 300;
export const TREE_HEIGHT = 260;
const GROUND_Y = 240;
const CENTER_X = TREE_WIDTH / 2;
// 회차가 아주 많아도 그림이 뭉개지지 않도록 그리는 가지 수에 상한을 둔다.
export const MAX_DRAWN_BRANCHES = 24;
// 갈라진 가지도 너무 많으면 먼저 쓴 것부터 이만큼만 그린다.
export const MAX_DRAWN_SIDE_BRANCHES = 24;
// 가지는 모두 같은 굵기다(사용자 결정). 몸통만 더 굵다.
export const BRANCH_THICKNESS = 4;
// 가지는 바닥 쪽으로 뻗지 않고 위로 뻗는다(사용자 결정). 수평보다 적어도 이만큼(라디안, 약 34°) 위를 향한다.
const MIN_RISE_ANGLE = 0.6;
// 갈라진 가지는 부모 가지 방향과 바로 위쪽 사이로 뻗는다. 1이면 바로 위, 0이면 부모 방향 그대로.
const SIDE_UPWARD_PULL = 0.55;
// 갈라진 가지의 길이. 부모보다 계속 짧아지면 깊은 가지가 한곳에 뭉치므로 깊이와 상관없이 이 범위에서 고른다.
const SIDE_BRANCH_LENGTH = { min: 18, max: 26 };
// 가지 중간에서 갈라져 나가는 가지 하나마다 그 가지를 이만큼 더 길게 해 자리를 마련한다(사용자 결정).
const FORK_SPACING = 12;
// 몸통도 큰 줄기 가지 하나마다 이만큼 자란다. 너무 커지면 마지막에 나무 전체를 그림 칸에 맞게 줄인다.
const TRUNK_SPACING = 13;
// 나무를 그림 칸에 맞출 때 가장자리에 남기는 여백
const FIT_MARGIN = 6;

export interface Point {
  x: number;
  y: number;
}

export interface Branch {
  // 회차 id (회차 수만 알 때는 1부터 매긴 순번)
  id: number;
  chapterNumber: number;
  start: Point;
  control: Point;
  end: Point;
  thickness: number;
}

export interface Leaf extends Point {
  radius: number;
  tone: "light" | "base" | "deep";
}

// 끝 가지에 맺힌 열매
export interface BranchFruit extends Point {
  id: number;
  radius: number;
}

export interface StoryTreeShape {
  trunk: { start: Point; control: Point; end: Point; thickness: number };
  branches: Branch[];
  leaves: Leaf[];
  fruits: BranchFruit[];
  // 다음 회차가 돋아날 자리. 이어 쓰는 중일 때만 있다.
  bud?: Point;
}

export interface StoryTreeInput {
  seed: number;
  chapterCount: number;
  memberCount: number;
  growing: boolean;
  // 회차 나무. 없으면 chapterCount만큼 한 줄기로 이어진 것으로 본다.
  nodes?: ChapterLink[];
}

// 뿌리에서 첫 작가의 줄기를(줄기가 없으면 먼저 쓴 가지를) 따라 올라간 큰 줄기. 줄기를 쓸수록 나무가 위로 자란다.
function mainLineOf(
  nodes: ChapterLink[],
  childrenOf: Map<number, ChapterLink[]>,
) {
  const ids = new Set(nodes.map((node) => node.id));
  const roots = nodes
    .filter(
      (node) => node.parentChapterId == null || !ids.has(node.parentChapterId),
    )
    .sort((first, second) => first.id - second.id);
  const line: ChapterLink[] = [];
  let current = roots[0];
  while (current) {
    line.push(current);
    current = (childrenOf.get(current.id) ?? [])[0];
  }
  return line;
}

function childrenMap(nodes: ChapterLink[]) {
  const map = new Map<number, ChapterLink[]>();
  for (const node of [...nodes].sort(compareSiblings)) {
    if (node.parentChapterId == null) continue;
    const siblings = map.get(node.parentChapterId) ?? [];
    siblings.push(node);
    map.set(node.parentChapterId, siblings);
  }
  return map;
}

// 같은 seed면 항상 같은 수열을 돌려주는 난수 생성기(mulberry32).
export function seededRandom(seed: number) {
  let state = seed >>> 0 || 1;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let mixed = state;
    mixed = Math.imul(mixed ^ (mixed >>> 15), mixed | 1);
    mixed ^= mixed + Math.imul(mixed ^ (mixed >>> 7), mixed | 61);
    return ((mixed ^ (mixed >>> 14)) >>> 0) / 4294967296;
  };
}

function between(random: () => number, min: number, max: number) {
  return min + random() * (max - min);
}

// 2차 베지어 곡선 위의 한 점.
// progress는 곡선 시작(0)부터 끝(1)까지의 위치다.
function pointOnCurve(
  start: Point,
  control: Point,
  end: Point,
  progress: number,
) {
  const remaining = 1 - progress;
  const startWeight = remaining * remaining;
  const controlWeight = 2 * remaining * progress;
  const endWeight = progress * progress;
  return {
    x: startWeight * start.x + controlWeight * control.x + endWeight * end.x,
    y: startWeight * start.y + controlWeight * control.y + endWeight * end.y,
  };
}

function trunkHeightFor(chapterCount: number) {
  // 큰 줄기 가지가 늘수록 몸통이 그만큼 자라 가지 사이 간격이 유지된다.
  return 64 + TRUNK_SPACING * chapterCount;
}

function leafClusterAt(
  random: () => number,
  center: Point,
  size: number,
): Leaf[] {
  const tones: Leaf["tone"][] = ["light", "base", "deep"];
  return Array.from({ length: 3 }, (_, index) => {
    const radius = between(random, size * 0.7, size * 1.15);
    return {
      x: center.x + between(random, -size, size),
      y: center.y + between(random, -size, size * 0.6),
      radius,
      tone: tones[index],
    };
  });
}

export function growStoryTree(input: StoryTreeInput): StoryTreeShape {
  const random = seededRandom(input.seed * 9973 + 17);
  const nodes = input.nodes ?? straightChain(input.chapterCount);
  const childrenOf = childrenMap(nodes);
  const mainLine = mainLineOf(nodes, childrenOf);
  const drawnBranchCount = Math.min(mainLine.length, MAX_DRAWN_BRANCHES);
  // 큰 줄기의 회차는 상한을 넘어 그리지 않은 것도 곁가지로 돌리지 않는다.
  const mainIds = new Set(mainLine.map((node) => node.id));

  const trunkHeight = trunkHeightFor(drawnBranchCount);
  const lean = between(random, -18, 18);
  const trunk = {
    start: { x: CENTER_X, y: GROUND_Y },
    control: { x: CENTER_X + lean, y: GROUND_Y - trunkHeight * 0.55 },
    end: { x: CENTER_X - lean * 0.4, y: GROUND_Y - trunkHeight },
    thickness: 9 + Math.min(drawnBranchCount, 12) * 0.5,
  };

  // 첫 가지가 어느 쪽으로 뻗을지도 소설마다 다르다.
  let side = random() < 0.5 ? -1 : 1;
  const branches: Branch[] = [];
  const leaves: Leaf[] = [];

  for (let index = 0; index < drawnBranchCount; index++) {
    const chapterNumber = index + 1;
    // 오래된 회차는 아래쪽, 최근 회차는 꼭대기 쪽에 붙는다.
    const heightRatio = 0.3 + (0.62 * (index + 1)) / (drawnBranchCount + 1);
    const start = pointOnCurve(
      trunk.start,
      trunk.control,
      trunk.end,
      heightRatio,
    );
    const forks = forkCountOf(mainLine[index].id, childrenOf);
    const length =
      between(random, 34, 54) * (1.1 - heightRatio * 0.35) +
      FORK_SPACING * forks;
    // 가로 길이에 대한 오르는 높이. 1이면 45°로 오른다.
    const rise = between(random, 0.7, 1.25);
    const end = {
      x: start.x + side * length,
      y: start.y - length * rise,
    };
    const control = {
      x: start.x + side * length * 0.45,
      y: start.y - length * rise * 0.15 + between(random, -6, 4),
    };
    branches.push({
      id: mainLine[index].id,
      chapterNumber,
      start,
      control,
      end,
      thickness: BRANCH_THICKNESS,
    });

    // 참여 작가가 많을수록 잎이 풍성해진다.
    const leafSize = 9 + Math.min(input.memberCount, 8) * 0.9;
    leaves.push(...leafClusterAt(random, end, leafSize));

    // 큰 줄기 가지는 몸통 양쪽을 꼭 번갈아 가며 뻗는다(사용자 결정).
    side = -side;
  }

  // 꼭대기 잎 뭉치. 막 싹튼 나무에도 잎이 보이도록 항상 둔다.
  const crownSize = 10 + Math.min(drawnBranchCount, 10) * 1.1;
  leaves.push(...leafClusterAt(random, trunk.end, crownSize));

  branches.push(
    ...sideBranches(
      random,
      branches,
      nodes.filter((node) => !mainIds.has(node.id)),
      childrenOf,
      input.memberCount,
      leaves,
    ),
  );

  const fruits = branches
    .filter((branch) => (childrenOf.get(branch.id) ?? []).length === 0)
    .map((branch) => ({
      id: branch.id,
      x: branch.end.x,
      y: branch.end.y + 3,
      radius: 5,
    }));

  const topOfCrown = { x: trunk.end.x, y: trunk.end.y - crownSize * 0.9 };
  return fitInside({
    trunk,
    branches,
    leaves,
    fruits,
    bud: input.growing ? topOfCrown : undefined,
  });
}

// 이 회차에서 가지 중간에 갈라져 나가는 가지 수. 큰 줄기 회차는 그다음 장이 몸통으로, 갈라진 줄기의 회차는
// 첫 가지가 끝에서 위로 이어지므로 어느 쪽이든 나머지 가지들이 중간에서 갈라진다.
function forkCountOf(id: number, childrenOf: Map<number, ChapterLink[]>) {
  return Math.max((childrenOf.get(id) ?? []).length - 1, 0);
}

// 나무가 그림 칸보다 커지면 밑동(몸통 아래 가운데)을 축으로 전체를 줄여 칸 안에 넣는다. 작으면 그대로 둔다.
// 가지 굵기는 줄이지 않아 모든 가지가 늘 같은 굵기로 보인다.
function fitInside(shape: StoryTreeShape): StoryTreeShape {
  const points: { x: number; y: number; radius: number }[] = [
    { ...shape.trunk.end, radius: 0 },
    ...shape.branches.flatMap((branch) => [
      { ...branch.end, radius: 0 },
      { ...branch.control, radius: 0 },
    ]),
    ...shape.leaves,
    ...(shape.bud ? [{ ...shape.bud, radius: 10 }] : []),
  ];
  const left = Math.min(...points.map((point) => point.x - point.radius));
  const right = Math.max(...points.map((point) => point.x + point.radius));
  const top = Math.min(...points.map((point) => point.y - point.radius));
  const ratios = [
    1,
    (CENTER_X - FIT_MARGIN) / Math.max(CENTER_X - left, 1),
    (TREE_WIDTH - FIT_MARGIN - CENTER_X) / Math.max(right - CENTER_X, 1),
    (GROUND_Y - FIT_MARGIN) / Math.max(GROUND_Y - top, 1),
  ];
  const scale = Math.min(...ratios);
  if (scale >= 1) return shape;
  const move = (point: Point): Point => ({
    x: CENTER_X + (point.x - CENTER_X) * scale,
    y: GROUND_Y + (point.y - GROUND_Y) * scale,
  });
  const moveCurve = <
    Curve extends { start: Point; control: Point; end: Point },
  >(
    curve: Curve,
  ): Curve => ({
    ...curve,
    start: move(curve.start),
    control: move(curve.control),
    end: move(curve.end),
  });
  return {
    trunk: moveCurve(shape.trunk),
    branches: shape.branches.map(moveCurve),
    leaves: shape.leaves.map((leaf) => ({
      ...leaf,
      ...move(leaf),
      radius: leaf.radius * scale,
    })),
    fruits: shape.fruits.map((fruit) => ({ ...fruit, ...move(fruit) })),
    bud: shape.bud ? move(shape.bud) : undefined,
  };
}

// 큰 줄기 밖의 회차(nodes)는 부모 가지의 끝 쪽에서 비스듬히 뻗는다. 부모를 그리지 않았으면 그 가지도 그리지 않는다.
function sideBranches(
  random: () => number,
  drawn: Branch[],
  nodes: ChapterLink[],
  childrenOf: Map<number, ChapterLink[]>,
  memberCount: number,
  leaves: Leaf[],
): Branch[] {
  const byId = new Map(drawn.map((branch) => [branch.id, branch]));
  // 큰 줄기 회차는 이미 그다음 장이 몸통 쪽으로 이어지므로, 거기서 갈라진 회차는 모두 잔가지로 벌어진다.
  const mainIds = new Set(drawn.map((branch) => branch.id));
  const sides: Branch[] = [];
  const pending = [...nodes]
    .sort((first, second) => first.id - second.id)
    .filter((node) => !byId.has(node.id));
  // 같은 부모에서 갈라진 가지는 번갈아 좌우로 벌어진다.
  const siblingTurn = new Map<number, number>();
  for (const node of pending) {
    if (sides.length >= MAX_DRAWN_SIDE_BRANCHES) break;
    const parent =
      node.parentChapterId == null ? undefined : byId.get(node.parentChapterId);
    if (!parent) continue;
    const turn = siblingTurn.get(parent.id) ?? (mainIds.has(parent.id) ? 1 : 0);
    siblingTurn.set(parent.id, turn + 1);
    // 이어 쓴 회차는 부모 가지 끝에서 이어 뻗는다. 같은 부모에서 갈라진 가지들은 끝에서 갈래가 되어 벌어진다.
    // 이어 쓴 첫 회차는 부모 끝에서 위로 이어 오르고, 갈라진 회차는 부모 줄기 중간에서 잔가지처럼 바깥 위로 뻗는다.
    // 갈라지는 가지는 부모 가지를 따라 고르게 나눈 자리에 붙는다. 갈래가 많을수록 부모 가지가 길어져 간격이 유지된다.
    const forkCount = forkCountOf(parent.id, childrenOf);
    const start =
      turn === 0
        ? { ...parent.end }
        : pointOnCurve(
            parent.start,
            parent.control,
            parent.end,
            forkSpotOf(turn - 1, forkCount),
          );
    const parentAngle = Math.atan2(
      parent.end.y - parent.start.y,
      parent.end.x - parent.start.x,
    );
    const outward = parent.end.x < CENTER_X ? -1 : 1;
    const angle = upward(
      leanUp(parentAngle) + siblingSpread(random, turn, outward),
    );
    const length =
      between(random, SIDE_BRANCH_LENGTH.min, SIDE_BRANCH_LENGTH.max) +
      FORK_SPACING * forkCountOf(node.id, childrenOf);
    const end = {
      x: start.x + Math.cos(angle) * length,
      y: start.y + Math.sin(angle) * length,
    };
    const control = {
      x: (start.x + end.x) / 2 + between(random, -4, 4),
      y: (start.y + end.y) / 2 + between(random, -5, 2),
    };
    const branch: Branch = {
      id: node.id,
      chapterNumber: parent.chapterNumber + 1,
      start,
      control,
      end,
      thickness: BRANCH_THICKNESS,
    };
    sides.push(branch);
    byId.set(node.id, branch);
    const leafSize = 6 + Math.min(memberCount, 8) * 0.5;
    leaves.push(...leafClusterAt(random, end, leafSize));
  }
  return sides;
}

// 부모 가지에 갈래가 여럿 붙을 때 k번째(0부터) 갈래가 붙는 자리(가지 시작 0 ~ 끝 1).
function forkSpotOf(index: number, count: number) {
  return 0.35 + (0.55 * (index + 1)) / (Math.max(count, 1) + 1);
}

// 부모 방향과 바로 위(-π/2) 사이 방향. 깊어질수록 옆으로 눕지 않고 위로 자란다.
function leanUp(angle: number) {
  const x = Math.cos(angle) * (1 - SIDE_UPWARD_PULL);
  const y = Math.sin(angle) * (1 - SIDE_UPWARD_PULL) - SIDE_UPWARD_PULL;
  return Math.atan2(y, x);
}

// outward는 나무 바깥쪽(왼쪽 -1, 오른쪽 1). 첫 갈래는 바깥으로, 그다음은 안쪽으로 번갈아 벌어진다.
function siblingSpread(random: () => number, turn: number, outward: number) {
  if (turn === 0) return between(random, -0.12, 0.12);
  const side = turn % 2 === 1 ? outward : -outward;
  return side * between(random, 0.7, 1);
}

// 화면에서 위쪽은 y가 줄어드는 쪽이라 위를 향하는 각도는 -π~0이다.
// 아래나 수평으로 향하면 가까운 쪽(오른쪽 위·왼쪽 위)의 가장 낮은 오르막으로 돌린다.
function upward(angle: number) {
  const normalized = Math.atan2(Math.sin(angle), Math.cos(angle));
  const lowestRight = -MIN_RISE_ANGLE;
  const lowestLeft = -Math.PI + MIN_RISE_ANGLE;
  if (normalized <= lowestRight && normalized >= lowestLeft) return normalized;
  return Math.cos(normalized) >= 0 ? lowestRight : lowestLeft;
}

export function curvePath(start: Point, control: Point, end: Point) {
  return `M ${start.x} ${start.y} Q ${control.x} ${control.y} ${end.x} ${end.y}`;
}
