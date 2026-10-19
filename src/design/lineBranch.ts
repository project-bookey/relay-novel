// 줄기 카드와 읽기 화면에 그리는 작은 나뭇가지의 모양. React·Expo 의존성이 없어서 node 테스트가 가능하다.
// 열매마다 한 토막(lineRuns)을 왼쪽에서 오른쪽으로 잇고, 갈라질 때마다 한 칸씩 내려간다.
// 밑동 쪽은 굵고 끝으로 갈수록 가늘다. 갈라진 자리에는 다른 가지가 계속 뻗어 간 그루터기를 남긴다.
import type { LineRun } from "./storyLines";

export const LINE_BRANCH_WIDTH = 290;
const START_X = 8;
// 끝 열매·봉오리를 그릴 자리
const TIP_ROOM = 20;
const MIN_RUN_WIDTH = 48;
const STEP_Y = 16;
const FIRST_Y = 18;
// 한 칸 내려가는 굽은 길의 가로 길이
const BEND = 14;
const LEAF_GAP = 22;

export type RunKind = "own" | "shared" | "merged";

export interface BranchRun {
  kind: RunKind;
  // 굽은 길이 끝나고 곧게 뻗기 시작하는 곳과 끝
  startX: number;
  endX: number;
  y: number;
  thickness: number;
  // 앞 토막에서 내려오는 굽은 길(첫 토막은 없음)
  bendFromX?: number;
  bendFromY?: number;
  from: number;
  to: number;
}

export interface BranchLeaf {
  x: number;
  y: number;
  // 위로 붙은 잎은 1, 아래는 -1
  side: 1 | -1;
}

export interface LineBranchShape {
  runs: BranchRun[];
  // 다른 가지가 계속 뻗어 간 그루터기: 갈라진 자리에서 앞 토막 높이로 짧게 뻗는다
  stubs: { x: number; y: number; thickness: number }[];
  leaves: BranchLeaf[];
  tip: { x: number; y: number };
  // 읽는 중 표시 자리(readingAt을 준 때만)
  reading?: { x: number; y: number };
  height: number;
}

function runKindOf(owner: number, ownLine: number): RunKind {
  if (owner === -1) return "merged";
  if (owner === ownLine) return "own";
  return "shared";
}

export function lineBranchShape(
  runs: LineRun[],
  ownLine: number,
  chapterCount: number,
  readingAt?: number,
): LineBranchShape {
  const usable = LINE_BRANCH_WIDTH - START_X - TIP_ROOM;
  const flexible = Math.max(usable - MIN_RUN_WIDTH * runs.length, 0);
  const total = Math.max(chapterCount, 1);
  const shaped: BranchRun[] = [];
  const stubs: LineBranchShape["stubs"] = [];
  const leaves: BranchLeaf[] = [];
  let reading: LineBranchShape["reading"];
  let x = START_X;

  runs.forEach((run, index) => {
    const length = run.to - run.from + 1;
    const width = MIN_RUN_WIDTH + (flexible * length) / total;
    const y = FIRST_Y + index * STEP_Y;
    const thickness = Math.max(3, 8 - index * 2);
    const kind = runKindOf(run.owner, ownLine);
    const runEnd = x + width;
    const previous = shaped.at(-1);
    let startX = x;
    if (previous) {
      stubs.push({ x, y: previous.y, thickness: previous.thickness });
      startX = x + BEND;
    }
    shaped.push({
      kind,
      startX,
      endX: runEnd,
      y,
      thickness,
      bendFromX: previous ? x : undefined,
      bendFromY: previous?.y,
      from: run.from,
      to: run.to,
    });
    if (kind === "own") {
      let side: 1 | -1 = 1;
      for (let leafX = startX + 14; leafX < runEnd - 12; leafX += LEAF_GAP) {
        leaves.push({ x: leafX, y: y - side * (thickness / 2 + 3), side });
        side = side === 1 ? -1 : 1;
      }
    }
    if (readingAt != null && readingAt >= run.from && readingAt <= run.to) {
      const ratio = (readingAt - run.from + 0.5) / length;
      reading = { x: startX + (runEnd - startX) * ratio, y };
    }
    x = runEnd;
  });

  const last = shaped.at(-1);
  const tip = { x, y: last?.y ?? FIRST_Y };
  // 장 번호 글씨가 가지 아래에 붙고, 끝 열매가 아래로 매달린다.
  const height = FIRST_Y + Math.max(runs.length - 1, 0) * STEP_Y + 26;
  return { runs: shaped, stubs, leaves, tip, reading, height };
}

export function runLabel(run: BranchRun, mergedLines: number) {
  if (run.kind === "merged") return `1–${run.to}장 · 앞 열매 ${mergedLines}개`;
  if (run.from === run.to) return `${run.from}장`;
  return `${run.from}–${run.to}장`;
}
