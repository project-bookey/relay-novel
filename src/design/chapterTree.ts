// 회차 나무를 목록으로 펼친다. React·Expo 의존성이 없어서 node 테스트가 가능하다.
// 한 회차를 여러 사람이 이어 쓰면 그 회차에서 가지가 갈라진다. 뿌리 회차가 "1"이고,
// 그 회차에서 뻗은 가지는 "1_1", "1_2", …, "1_1"에서 다시 뻗으면 "1_1_1"이 된다.
// 형제 가운데 첫 작가의 줄기 회차가 맨 앞이고, 나머지는 쓴 순서다 — 나무의 큰 줄기와 "열매 1"이 줄기를 따라간다.

export interface ChapterLink {
  id: number;
  // 뿌리 회차는 비어 있다(서버는 null로 보낸다).
  parentChapterId?: number | null;
  // 첫 작가의 줄기 회차. 예전 서버와 회차 수만 아는 자리에서는 비어 있다.
  trunk?: boolean;
}

// 형제 순서 — 줄기 회차가 먼저, 그다음 먼저 쓴(id가 작은) 회차.
export function compareSiblings(first: ChapterLink, second: ChapterLink) {
  const trunkFirst = Number(!!second.trunk) - Number(!!first.trunk);
  return trunkFirst || first.id - second.id;
}

export interface BranchRow<Node extends ChapterLink> {
  node: Node;
  // 형제 순서로 이은 가지 이름 (예: "1_2")
  label: string;
  // 뿌리 = 1
  depth: number;
  // 깊이만큼 이어 붙인 들여쓰기 표식 (예: 깊이 2 → "--")
  indent: string;
  // 아직 아무도 잇지 않은 끝 회차. 그 가지에 열매가 맺힌다.
  isTip: boolean;
}

// 부모 id → 자식 회차들(줄기 먼저, 그다음 쓴 순서). 부모를 찾을 수 없는 회차는 뿌리로 본다.
function childrenByParent<Node extends ChapterLink>(nodes: Node[]) {
  const ids = new Set(nodes.map((node) => node.id));
  const byParent = new Map<number | undefined, Node[]>();
  const sorted = [...nodes].sort(compareSiblings);
  for (const node of sorted) {
    const parentId =
      node.parentChapterId != null && ids.has(node.parentChapterId)
        ? node.parentChapterId
        : undefined;
    const siblings = byParent.get(parentId) ?? [];
    siblings.push(node);
    byParent.set(parentId, siblings);
  }
  return byParent;
}

// 뿌리부터 가지를 따라 내려가며(줄기, 그다음 먼저 쓴 가지부터) 한 줄씩 늘어놓는다.
export function arrangeChapterTree<Node extends ChapterLink>(
  nodes: Node[],
): BranchRow<Node>[] {
  const byParent = childrenByParent(nodes);
  const rows: BranchRow<Node>[] = [];
  const visit = (
    parentId: number | undefined,
    prefix: string,
    depth: number,
  ) => {
    const children = byParent.get(parentId) ?? [];
    children.forEach((node, index) => {
      const label = prefix ? `${prefix}_${index + 1}` : String(index + 1);
      const hasChildren = (byParent.get(node.id) ?? []).length > 0;
      rows.push({
        node,
        label,
        depth,
        indent: "-".repeat(depth),
        isTip: !hasChildren,
      });
      visit(node.id, label, depth + 1);
    });
  };
  visit(undefined, "", 1);
  return rows;
}

// 이 회차에서 뻗은 가지들(줄기 먼저, 그다음 쓴 순서). 읽기 화면의 "다음 장" 고르기에 쓴다.
export function branchesFrom<Node extends ChapterLink>(
  nodes: Node[],
  chapterId: number,
) {
  return childrenByParent(nodes).get(chapterId) ?? [];
}

// 회차 수만 알 때(목록 카드 등) 한 줄기로 이어진 마디를 만든다.
export function straightChain(chapterCount: number): ChapterLink[] {
  return Array.from({ length: Math.max(chapterCount, 0) }, (_, index) => ({
    id: index + 1,
    parentChapterId: index === 0 ? undefined : index,
  }));
}
