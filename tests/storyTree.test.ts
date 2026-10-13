import { test } from "node:test";
import assert from "node:assert/strict";
import {
  growStoryTree,
  MAX_DRAWN_BRANCHES,
  seededRandom,
  TREE_HEIGHT,
  TREE_WIDTH,
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
