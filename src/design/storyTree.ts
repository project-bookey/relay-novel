// 소설 하나의 "이야기 나무" 모양을 계산한다. React·Expo 의존성이 없어서 node 테스트가 가능하다.
// 지금 백엔드의 회차는 한 줄로만 이어지므로, 회차 하나를 가지 하나로 그린다.

export const TREE_WIDTH = 300;
export const TREE_HEIGHT = 260;
const GROUND_Y = 240;
const CENTER_X = TREE_WIDTH / 2;
// 회차가 아주 많아도 그림이 뭉개지지 않도록 그리는 가지 수에 상한을 둔다.
export const MAX_DRAWN_BRANCHES = 24;

export interface Point {
  x: number;
  y: number;
}

export interface Branch {
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

export interface StoryTreeShape {
  trunk: { start: Point; control: Point; end: Point; thickness: number };
  branches: Branch[];
  leaves: Leaf[];
  // 다음 회차가 돋아날 자리. 이어 쓰는 중일 때만 있다.
  bud?: Point;
}

export interface StoryTreeInput {
  seed: number;
  chapterCount: number;
  memberCount: number;
  growing: boolean;
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
  // 회차가 늘수록 자라지만 점점 천천히 자라서 화면을 넘지 않는다.
  return 64 + 116 * (1 - Math.pow(0.86, chapterCount));
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

// 잎이 그림 영역 밖으로 나가지 않도록 중심을 안쪽으로 당긴다.
function insideCanvas(center: Point, margin: number): Point {
  return {
    x: clamp(center.x, margin, TREE_WIDTH - margin),
    y: clamp(center.y, margin, TREE_HEIGHT - margin),
  };
}

function leafClusterAt(
  random: () => number,
  center: Point,
  size: number,
): Leaf[] {
  const tones: Leaf["tone"][] = ["light", "base", "deep"];
  return Array.from({ length: 3 }, (_, index) => {
    const radius = between(random, size * 0.7, size * 1.15);
    const position = insideCanvas(
      {
        x: center.x + between(random, -size, size),
        y: center.y + between(random, -size, size * 0.6),
      },
      radius,
    );
    return { ...position, radius, tone: tones[index] };
  });
}

export function growStoryTree(input: StoryTreeInput): StoryTreeShape {
  const random = seededRandom(input.seed * 9973 + 17);
  const drawnBranchCount = Math.min(
    Math.max(input.chapterCount, 0),
    MAX_DRAWN_BRANCHES,
  );

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
    const length = between(random, 38, 68) * (1.1 - heightRatio * 0.35);
    const rise = between(random, 0.35, 0.85);
    const end = {
      x: start.x + side * length,
      y: start.y - length * rise,
    };
    const control = {
      x: start.x + side * length * 0.45,
      y: start.y - length * rise * 0.15 + between(random, -6, 4),
    };
    branches.push({
      chapterNumber,
      start,
      control,
      end,
      thickness: Math.max(2.5, trunk.thickness * (0.55 - heightRatio * 0.25)),
    });

    // 참여 작가가 많을수록 잎이 풍성해진다.
    const leafSize = 9 + Math.min(input.memberCount, 8) * 0.9;
    leaves.push(...leafClusterAt(random, end, leafSize));

    // 대부분은 번갈아 뻗지만, 가끔 같은 쪽으로 연달아 뻗어 모양이 제각각이 된다.
    if (random() < 0.75) side = -side;
  }

  // 꼭대기 잎 뭉치. 막 싹튼 나무에도 잎이 보이도록 항상 둔다.
  const crownSize = 10 + Math.min(drawnBranchCount, 10) * 1.1;
  leaves.push(...leafClusterAt(random, trunk.end, crownSize));

  const topOfCrown = { x: trunk.end.x, y: trunk.end.y - crownSize * 0.9 };
  return {
    trunk,
    branches,
    leaves,
    bud: input.growing ? topOfCrown : undefined,
  };
}

export function curvePath(start: Point, control: Point, end: Point) {
  return `M ${start.x} ${start.y} Q ${control.x} ${control.y} ${end.x} ${end.y}`;
}
