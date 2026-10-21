// 갈라진 이야기를 "열매(끝 회차)마다 한 줄기"로 묶는다. React·Expo 의존성이 없어서 node 테스트가 가능하다.
// 줄기 하나는 뿌리 회차부터 아무도 잇지 않은 끝 회차까지 이어진 회차들이다.
import {
  arrangeChapterTree,
  branchesFrom,
  type ChapterLink,
} from "./chapterTree";

export interface StoryLine<Node extends ChapterLink> {
  // 1부터. 목차에서 첫 작가의 줄기, 그다음 먼저 쓴 가지를 따라 내려간 순서다.
  number: number;
  tip: Node;
  // 뿌리부터 끝 회차까지
  path: Node[];
  // path의 회차마다, 그 회차를 처음 지나간 줄기 번호. 앞 줄기와 같이 지나는 회차는 앞 줄기 번호다.
  ownerOf: number[];
  // 앞 줄기와 마지막으로 같이 지나는 회차와 그 줄기 번호. 첫 줄기는 없다.
  fork?: { chapter: Node; fromLine: number };
}

// 그 회차까지 뿌리부터 이어진 회차들. 부모를 찾을 수 없으면 거기서 멈춘다.
export function pathTo<Node extends ChapterLink>(
  nodes: Node[],
  chapterId: number,
): Node[] {
  const byId = new Map(nodes.map((node) => [node.id, node]));
  const path: Node[] = [];
  const visited = new Set<number>();
  let current = byId.get(chapterId);
  while (current && !visited.has(current.id)) {
    visited.add(current.id);
    path.unshift(current);
    const parentId = current.parentChapterId;
    current = parentId != null ? byId.get(parentId) : undefined;
  }
  return path;
}

export function storyLines<Node extends ChapterLink>(
  nodes: Node[],
): StoryLine<Node>[] {
  const ownerById = new Map<number, number>();
  const tips = arrangeChapterTree(nodes).filter((row) => row.isTip);
  return tips.map((row, index) => {
    const number = index + 1;
    const path = pathTo(nodes, row.node.id);
    const sharedUntil = path.findLastIndex((node) => ownerById.has(node.id));
    const fork =
      sharedUntil >= 0
        ? {
            chapter: path[sharedUntil],
            fromLine: ownerById.get(path[sharedUntil].id) as number,
          }
        : undefined;
    for (const node of path)
      if (!ownerById.has(node.id)) ownerById.set(node.id, number);
    const ownerOf = path.map((node) => ownerById.get(node.id) as number);
    return { number, tip: row.node, path, ownerOf, fork };
  });
}

// 그 회차에서 첫 작가의 줄기(없으면 먼저 쓴 가지)만 따라 내려가 닿는 끝 회차.
export function firstTipUnder<Node extends ChapterLink>(
  nodes: Node[],
  chapterId: number,
): Node | undefined {
  let current = nodes.find((node) => node.id === chapterId);
  const visited = new Set<number>();
  while (current && !visited.has(current.id)) {
    visited.add(current.id);
    const next = branchesFrom(nodes, current.id)[0];
    if (!next) return current;
    current = next;
  }
  return current;
}

// 같은 회차에서 갈라진 회차들(쓴 순서)과 그중 이 회차의 자리(0부터).
export function siblingsOf<Node extends ChapterLink>(
  nodes: Node[],
  chapterId: number,
) {
  const chapter = nodes.find((node) => node.id === chapterId);
  if (!chapter) return { siblings: [] as Node[], index: -1 };
  const parentId = chapter.parentChapterId;
  const hasParent =
    parentId != null && nodes.some((node) => node.id === parentId);
  const siblings = hasParent
    ? branchesFrom(nodes, parentId)
    : arrangeChapterTree(nodes)
        .filter((row) => row.depth === 1)
        .map((row) => row.node);
  return {
    siblings,
    index: siblings.findIndex((node) => node.id === chapterId),
  };
}

// 읽고 있는 회차가 지나는 줄기. 고른 열매(tipId)의 줄기 위라면 그 줄기, 아니면 첫 작가의 줄기·먼저 쓴 가지를 따라간 줄기.
export function lineThrough<Node extends ChapterLink>(
  lines: StoryLine<Node>[],
  nodes: Node[],
  chapterId: number,
  tipId?: number,
) {
  const chosen = lines.find((line) => line.tip.id === tipId);
  if (chosen?.path.some((node) => node.id === chapterId)) return chosen;
  const tip = firstTipUnder(nodes, chapterId);
  return lines.find((line) => line.tip.id === tip?.id);
}

// 줄기를 그 줄기에서 처음 지나간 열매마다 한 토막으로 묶는다(장 번호는 깊이 = 뿌리 1).
// 토막이 maxRuns개를 넘으면 앞쪽 조상 토막들을 owner -1인 한 토막으로 합친다.
export interface LineRun {
  owner: number;
  from: number;
  to: number;
}

export function lineRuns<Node extends ChapterLink>(
  line: StoryLine<Node>,
  maxRuns = 3,
): { runs: LineRun[]; mergedLines: number } {
  const runs: LineRun[] = [];
  line.ownerOf.forEach((owner, index) => {
    const depth = index + 1;
    const last = runs.at(-1);
    if (last && last.owner === owner) last.to = depth;
    else runs.push({ owner, from: depth, to: depth });
  });
  if (runs.length <= maxRuns) return { runs, mergedLines: 0 };
  // 합친 한 토막까지 세어 maxRuns개가 되게 한다.
  const mergedLines = runs.length - maxRuns + 1;
  const merged = { owner: -1, from: 1, to: runs[mergedLines].from - 1 };
  return { runs: [merged, ...runs.slice(mergedLines)], mergedLines };
}
