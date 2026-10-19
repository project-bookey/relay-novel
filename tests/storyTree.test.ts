import { test } from "node:test";
import assert from "node:assert/strict";
import {
  growStoryTree,
  MAX_DRAWN_BRANCHES,
  seededRandom,
  TREE_HEIGHT,
  TREE_WIDTH,
  BRANCH_THICKNESS,
} from "../src/design/storyTree";

const baseInput = {
  seed: 1,
  chapterCount: 5,
  memberCount: 4,
  growing: true,
};

test("same seed produces the same random sequence", () => {
  const first = seededRandom(42);
  const second = seededRandom(42);
  for (let index = 0; index < 5; index++) {
    assert.equal(first(), second());
  }
});

test("same novel always grows the same tree", () => {
  assert.deepEqual(growStoryTree(baseInput), growStoryTree(baseInput));
});

test("different novels grow differently shaped trees", () => {
  const first = growStoryTree(baseInput);
  const second = growStoryTree({ ...baseInput, seed: 2 });
  assert.notDeepEqual(first.branches, second.branches);
});

test("each chapter becomes one branch in order", () => {
  const tree = growStoryTree(baseInput);
  assert.equal(tree.branches.length, 5);
  assert.deepEqual(
    tree.branches.map((branch) => branch.chapterNumber),
    [1, 2, 3, 4, 5],
  );
});

test("very many chapters are capped at the drawable branch limit", () => {
  const tree = growStoryTree({ ...baseInput, chapterCount: 200 });
  assert.equal(tree.branches.length, MAX_DRAWN_BRANCHES);
});

test("more chapters make the trunk taller", () => {
  const sapling = growStoryTree({ ...baseInput, chapterCount: 0 });
  const grown = growStoryTree({ ...baseInput, chapterCount: 10 });
  assert.ok(grown.trunk.end.y < sapling.trunk.end.y);
});

test("a tree without chapters still shows leaves and a bud", () => {
  const tree = growStoryTree({ ...baseInput, chapterCount: 0 });
  assert.equal(tree.branches.length, 0);
  assert.ok(tree.leaves.length > 0);
  assert.ok(tree.bud);
});

test("a tree that stopped growing has no bud", () => {
  const tree = growStoryTree({ ...baseInput, growing: false });
  assert.equal(tree.bud, undefined);
});

test("leaves always stay inside the drawing area", () => {
  for (let seed = 1; seed <= 40; seed++) {
    const tree = growStoryTree({
      ...baseInput,
      seed,
      chapterCount: MAX_DRAWN_BRANCHES,
      memberCount: 8,
    });
    for (const leaf of tree.leaves) {
      assert.ok(leaf.x - leaf.radius >= 0, `seed ${seed} 왼쪽 넘침`);
      assert.ok(leaf.x + leaf.radius <= TREE_WIDTH, `seed ${seed} 오른쪽 넘침`);
      assert.ok(leaf.y - leaf.radius >= 0, `seed ${seed} 위쪽 넘침`);
      assert.ok(leaf.y + leaf.radius <= TREE_HEIGHT, `seed ${seed} 아래 넘침`);
    }
  }
});

// 뿌리(1)를 셋이 이어 쓰고(2, 3, 5), 2를 다시 한 사람이 이어 썼다(4).
const branchingNodes = [
  { id: 1 },
  { id: 2, parentChapterId: 1 },
  { id: 3, parentChapterId: 1 },
  { id: 4, parentChapterId: 2 },
  { id: 5, parentChapterId: 1 },
];

test("every chapter of a branching story becomes a branch", () => {
  const tree = growStoryTree({ ...baseInput, nodes: branchingNodes });
  assert.deepEqual(
    tree.branches.map((branch) => branch.id).sort(),
    [1, 2, 3, 4, 5],
  );
});

test("a split branch grows out of its parent branch", () => {
  const tree = growStoryTree({ ...baseInput, nodes: branchingNodes });
  const byId = new Map(tree.branches.map((branch) => [branch.id, branch]));
  const root = byId.get(1)!;
  const split = byId.get(3)!;
  const near = (value: number, min: number, max: number) =>
    value >= Math.min(min, max) - 0.5 && value <= Math.max(min, max) + 0.5;
  assert.ok(near(split.start.x, root.start.x, root.end.x));
  assert.ok(near(split.start.y, root.start.y, root.end.y));
  assert.equal(split.thickness, root.thickness);
});

// 열매 1 → 2 → 3 → 4로 가지의 가지의 가지가 갈라지는 깊은 나무
const deepNodes = [
  { id: 1 },
  { id: 2, parentChapterId: 1 },
  { id: 3, parentChapterId: 1 },
  { id: 4, parentChapterId: 2 },
  { id: 5, parentChapterId: 3 },
  { id: 6, parentChapterId: 4 },
  { id: 7, parentChapterId: 4 },
  { id: 8, parentChapterId: 6 },
  { id: 9, parentChapterId: 7 },
  { id: 10, parentChapterId: 8 },
  { id: 11, parentChapterId: 9 },
  { id: 12, parentChapterId: 9 },
  { id: 13, parentChapterId: 12 },
  { id: 14, parentChapterId: 12 },
  { id: 15, parentChapterId: 14 },
];

test("every branch grows upward, never toward the ground", () => {
  for (let seed = 1; seed <= 40; seed++) {
    const tree = growStoryTree({ ...baseInput, seed, nodes: deepNodes });
    for (const branch of tree.branches)
      assert.ok(
        branch.end.y <= branch.start.y,
        `seed ${seed} branch ${branch.id}`,
      );
  }
});

test("all branches share one thickness", () => {
  const tree = growStoryTree({ ...baseInput, nodes: deepNodes });
  const thicknesses = new Set(tree.branches.map((branch) => branch.thickness));
  assert.deepEqual([...thicknesses], [BRANCH_THICKNESS]);
});

test("deep split branches keep their length instead of shrinking into a knot", () => {
  const tree = growStoryTree({ ...baseInput, nodes: deepNodes });
  const deepest = tree.branches.find((branch) => branch.id === 15)!;
  const length = Math.hypot(
    deepest.end.x - deepest.start.x,
    deepest.end.y - deepest.start.y,
  );
  // 바깥 가장자리에 걸려 잘리지 않았다면 갈라진 가지 최소 길이만큼 뻗는다.
  assert.ok(length >= 14);
});

test("fruits hang only on branches nobody continued yet", () => {
  const tree = growStoryTree({ ...baseInput, nodes: branchingNodes });
  assert.deepEqual(tree.fruits.map((fruit) => fruit.id).sort(), [3, 4, 5]);
  const straight = growStoryTree(baseInput);
  assert.deepEqual(
    straight.fruits.map((fruit) => fruit.id),
    [5],
  );
});

test("a straight chain grows the same tree with or without nodes", () => {
  const chain = [1, 2, 3, 4, 5].map((id) => ({
    id,
    parentChapterId: id === 1 ? undefined : id - 1,
  }));
  assert.deepEqual(
    growStoryTree({ ...baseInput, nodes: chain }),
    growStoryTree(baseInput),
  );
});

test("split branches stay inside the drawing area", () => {
  const many = [
    { id: 1 },
    ...Array.from({ length: 30 }, (_, index) => ({
      id: index + 2,
      parentChapterId: index < 10 ? 1 : index - 8,
    })),
  ];
  for (let seed = 1; seed <= 20; seed++) {
    const tree = growStoryTree({ ...baseInput, seed, nodes: many });
    for (const branch of tree.branches) {
      assert.ok(branch.end.x >= 0 && branch.end.x <= TREE_WIDTH);
      assert.ok(branch.end.y >= 0 && branch.end.y <= TREE_HEIGHT);
    }
  }
});

test("main branches always alternate between the two sides of the trunk", () => {
  for (let seed = 1; seed <= 20; seed++) {
    const tree = growStoryTree({ ...baseInput, seed, chapterCount: 12 });
    const sides = tree.branches.map((branch) =>
      Math.sign(branch.end.x - branch.start.x),
    );
    for (let index = 1; index < sides.length; index++)
      assert.notEqual(sides[index], sides[index - 1], `seed ${seed}`);
  }
});

test("forks along one branch alternate outward and inward", () => {
  // 1장(큰 줄기)에서 셋이 갈라져 나간다(2는 큰 줄기, 3·4·5는 잔가지).
  const forks = [
    { id: 1 },
    { id: 2, parentChapterId: 1 },
    { id: 3, parentChapterId: 1 },
    { id: 4, parentChapterId: 1 },
    { id: 5, parentChapterId: 1 },
  ];
  const tree = growStoryTree({ ...baseInput, nodes: forks });
  const byId = new Map(tree.branches.map((branch) => [branch.id, branch]));
  const root = byId.get(1)!;
  const rootSide = Math.sign(root.end.x - root.start.x);
  const sideOf = (id: number) => {
    const branch = byId.get(id)!;
    return Math.sign(branch.end.x - branch.start.x);
  };
  // 첫 잔가지는 바깥(큰 줄기 가지가 뻗은 쪽), 둘째는 안쪽, 셋째는 다시 바깥
  assert.equal(sideOf(3), rootSide);
  assert.equal(sideOf(4), -rootSide);
  assert.equal(sideOf(5), rootSide);
});
