import { test } from "node:test";
import assert from "node:assert/strict";
import {
  arrangeChapterTree,
  branchesFrom,
  straightChain,
} from "../src/design/chapterTree";

// 뿌리(10)를 셋이 이어 쓰고(11, 12, 14), 11을 다시 한 사람이 이어 썼다(13).
const nodes = [
  { id: 10 },
  { id: 11, parentChapterId: 10 },
  { id: 12, parentChapterId: 10 },
  { id: 13, parentChapterId: 11 },
  { id: 14, parentChapterId: 10 },
];

test("branches are named by sibling order under their parent", () => {
  const rows = arrangeChapterTree(nodes);
  assert.deepEqual(
    rows.map((row) => [row.node.id, row.label]),
    [
      [10, "1"],
      [11, "1_1"],
      [13, "1_1_1"],
      [12, "1_2"],
      [14, "1_3"],
    ],
  );
});

test("indent marks grow one dash per depth", () => {
  const rows = arrangeChapterTree(nodes);
  const byId = new Map(rows.map((row) => [row.node.id, row]));
  assert.equal(byId.get(10)?.indent, "-");
  assert.equal(byId.get(11)?.indent, "--");
  assert.equal(byId.get(13)?.indent, "---");
  assert.equal(byId.get(13)?.depth, 3);
});

test("only chapters nobody continued yet bear fruit", () => {
  const tips = arrangeChapterTree(nodes)
    .filter((row) => row.isTip)
    .map((row) => row.node.id);
  assert.deepEqual(tips, [13, 12, 14]);
});

test("siblings follow writing order even when given out of order", () => {
  const shuffled = [nodes[4], nodes[2], nodes[0], nodes[3], nodes[1]];
  assert.deepEqual(
    arrangeChapterTree(shuffled).map((row) => row.label),
    ["1", "1_1", "1_1_1", "1_2", "1_3"],
  );
});

test("a chapter whose parent is missing is treated as a root", () => {
  const rows = arrangeChapterTree([{ id: 20, parentChapterId: 999 }]);
  assert.equal(rows[0].label, "1");
  assert.equal(rows[0].depth, 1);
});

test("branchesFrom lists the next chapters to choose from", () => {
  assert.deepEqual(
    branchesFrom(nodes, 10).map((node) => node.id),
    [11, 12, 14],
  );
  assert.deepEqual(branchesFrom(nodes, 13), []);
});

test("a straight chain has a single tip at its end", () => {
  const rows = arrangeChapterTree(straightChain(3));
  assert.deepEqual(
    rows.map((row) => row.label),
    ["1", "1_1", "1_1_1"],
  );
  assert.deepEqual(
    rows.filter((row) => row.isTip).map((row) => row.node.id),
    [3],
  );
  assert.deepEqual(straightChain(0), []);
});

test("the first writer's trunk comes first among siblings even when written later", () => {
  const withTrunk = [
    { id: 10, trunk: true },
    { id: 11, parentChapterId: 10 },
    { id: 12, parentChapterId: 10, trunk: true },
    { id: 13, parentChapterId: 12, trunk: true },
  ];
  assert.deepEqual(
    arrangeChapterTree(withTrunk).map((row) => [row.node.id, row.label]),
    [
      [10, "1"],
      [12, "1_1"],
      [13, "1_1_1"],
      [11, "1_2"],
    ],
  );
  assert.deepEqual(
    branchesFrom(withTrunk, 10).map((node) => node.id),
    [12, 11],
  );
});
