import { test } from "node:test";
import assert from "node:assert/strict";
import {
  firstTipUnder,
  lineRuns,
  lineThrough,
  pathTo,
  siblingsOf,
  storyLines,
} from "../src/design/storyLines";
import { lineBranchShape, runLabel } from "../src/design/lineBranch";

// 1 → 2 → 4 → 6 (열매 1)
//          4 → 7 → 9 (열매 2)
//                  9 → 13 (열매 3)
//      1 → 3 (열매 4)
const nodes = [
  { id: 1 },
  { id: 2, parentChapterId: 1 },
  { id: 3, parentChapterId: 1 },
  { id: 4, parentChapterId: 2 },
  { id: 6, parentChapterId: 4 },
  { id: 7, parentChapterId: 4 },
  { id: 9, parentChapterId: 7 },
  { id: 13, parentChapterId: 9 },
];

const ids = (list: { id: number }[]) => list.map((node) => node.id);

test("pathTo walks from the root down to the chapter", () => {
  assert.deepEqual(ids(pathTo(nodes, 13)), [1, 2, 4, 7, 9, 13]);
  assert.deepEqual(ids(pathTo(nodes, 1)), [1]);
  assert.deepEqual(pathTo(nodes, 999), []);
});

test("each tip becomes one story line in table-of-contents order", () => {
  const lines = storyLines(nodes);
  assert.deepEqual(
    lines.map((line) => [line.number, line.tip.id, line.path.length]),
    [
      [1, 6, 4],
      [2, 13, 6],
      [3, 3, 2],
    ],
  );
});

test("a line forks from the last chapter it shares with an earlier line", () => {
  const [first, second, third] = storyLines(nodes);
  assert.equal(first.fork, undefined);
  assert.equal(second.fork?.chapter.id, 4);
  assert.equal(second.fork?.fromLine, 1);
  assert.equal(third.fork?.chapter.id, 1);
  assert.equal(third.fork?.fromLine, 1);
});

test("chapters keep the number of the first line that passed them", () => {
  const second = storyLines(nodes)[1];
  assert.deepEqual(second.ownerOf, [1, 1, 1, 2, 2, 2]);
});

test("a branch of a branch of a branch remembers every line it came through", () => {
  // 열매 2는 13을 지나 15까지, 13에서 갈라진 열매 3은 16 → 18까지, 16에서 다시 갈라진 열매 4는 19.
  const deep = [
    ...nodes,
    { id: 15, parentChapterId: 13 },
    { id: 16, parentChapterId: 13 },
    { id: 18, parentChapterId: 16 },
    { id: 19, parentChapterId: 16 },
  ];
  const lines = storyLines(deep);
  assert.deepEqual(
    lines.map((line) => line.tip.id),
    [6, 15, 18, 19, 3],
  );
  const deepest = lines.find((line) => line.tip.id === 19);
  assert.deepEqual(deepest?.ownerOf, [1, 1, 1, 2, 2, 2, 3, 4]);
  assert.equal(deepest?.fork?.chapter.id, 16);
  assert.equal(deepest?.fork?.fromLine, 3);
});

test("runs group chapters by line and merge old ancestors beyond the limit", () => {
  const line = {
    number: 5,
    tip: { id: 0 },
    path: [],
    ownerOf: [1, 1, 2, 2, 3, 4, 4, 5, 5, 5],
  };
  assert.deepEqual(lineRuns(line, 10).runs, [
    { owner: 1, from: 1, to: 2 },
    { owner: 2, from: 3, to: 4 },
    { owner: 3, from: 5, to: 5 },
    { owner: 4, from: 6, to: 7 },
    { owner: 5, from: 8, to: 10 },
  ]);
  const merged = lineRuns(line, 3);
  assert.equal(merged.mergedLines, 3);
  assert.deepEqual(merged.runs, [
    { owner: -1, from: 1, to: 5 },
    { owner: 4, from: 6, to: 7 },
    { owner: 5, from: 8, to: 10 },
  ]);
});

test("a shallow line is not merged", () => {
  const second = storyLines(nodes)[1];
  assert.deepEqual(lineRuns(second), {
    runs: [
      { owner: 1, from: 1, to: 3 },
      { owner: 2, from: 4, to: 6 },
    ],
    mergedLines: 0,
  });
});

test("siblings are the chapters continuing the same parent", () => {
  assert.deepEqual(siblingsOf(nodes, 7), {
    siblings: [
      { id: 6, parentChapterId: 4 },
      { id: 7, parentChapterId: 4 },
    ],
    index: 1,
  });
  assert.deepEqual(ids(siblingsOf(nodes, 3).siblings), [2, 3]);
  assert.equal(siblingsOf(nodes, 1).siblings.length, 1);
  assert.equal(siblingsOf(nodes, 999).index, -1);
});

test("firstTipUnder follows the earliest-written branch to its end", () => {
  assert.equal(firstTipUnder(nodes, 1)?.id, 6);
  assert.equal(firstTipUnder(nodes, 7)?.id, 13);
  assert.equal(firstTipUnder(nodes, 3)?.id, 3);
});

test("lineThrough keeps the chosen line and falls back to the first-written one", () => {
  const lines = storyLines(nodes);
  assert.equal(lineThrough(lines, nodes, 2, 13)?.number, 2);
  // 고른 열매의 줄기 밖으로 옆 가지를 넘기면 먼저 쓴 가지를 따라간다.
  assert.equal(lineThrough(lines, nodes, 3, 13)?.number, 3);
  assert.equal(lineThrough(lines, nodes, 4)?.number, 1);
});

test("the branch steps down one level per run and stays within its width", () => {
  const shape = lineBranchShape(
    [
      { owner: -1, from: 1, to: 33 },
      { owner: 8, from: 34, to: 38 },
      { owner: 9, from: 39, to: 47 },
    ],
    9,
    47,
    40,
  );
  assert.deepEqual(
    shape.runs.map((run) => run.kind),
    ["merged", "shared", "own"],
  );
  assert.deepEqual(
    shape.runs.map((run) => run.y),
    [18, 34, 50],
  );
  assert.equal(shape.stubs.length, 2);
  assert.ok(shape.tip.x <= 290 - 20 + 0.001);
  assert.ok(shape.runs.every((run) => run.thickness >= 3));
  // 40장은 마지막 토막 안에 있다.
  const last = shape.runs[2];
  assert.ok(shape.reading && shape.reading.x > last.startX);
  assert.equal(shape.reading?.y, last.y);
  assert.ok(shape.leaves.length > 0);
  assert.equal(runLabel(shape.runs[0], 7), "1–33장 · 앞 열매 7개");
  assert.equal(runLabel(shape.runs[2], 0), "39–47장");
});

test("the first story line follows the first writer's trunk", () => {
  const withTrunk = [
    { id: 1, trunk: true },
    { id: 2, parentChapterId: 1 },
    { id: 3, parentChapterId: 1, trunk: true },
    { id: 4, parentChapterId: 3, trunk: true },
  ];
  const [first, second] = storyLines(withTrunk);
  assert.equal(first.tip.id, 4);
  assert.equal(second.tip.id, 2);
});
