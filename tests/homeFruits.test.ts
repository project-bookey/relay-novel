import { test } from "node:test";
import assert from "node:assert/strict";
import type {
  HomeFruitView,
  NovelDelivery,
  NovelSummary,
} from "../src/api/types";
import { fruitNameOf, homeFruitsOf } from "../src/design/homeFruits";

const story = (id: number, extra: Partial<NovelSummary> = {}) =>
  ({ id, title: `작품 ${id}`, mine: false, ...extra }) as NovelSummary;
const fruit = (chapterId: number, novel: NovelSummary): HomeFruitView => ({
  chapterId,
  chapterNumber: 2,
  chapterTitle: `회차 ${chapterId}`,
  excerpt: "",
  authorNickname: "작가",
  createdAt: "2026-10-21T00:00:00Z",
  slotsLeft: 2,
  novel,
});
const held = (chapterId: number, novel: NovelSummary): NovelDelivery => ({
  deliveryId: 900 + chapterId,
  novel,
  chapterId,
  chapterNumber: 3,
  chapterTitle: `맡은 회차 ${chapterId}`,
  dueAt: "2026-10-22T00:00:00Z",
  source: "CLAIM",
});

test("fruits I am writing come first, then my turns, then open chapters in feed order", () => {
  const fruits = homeFruitsOf(
    [held(31, story(3))],
    [story(4)],
    [fruit(51, story(5)), fruit(61, story(6))],
  );
  assert.deepEqual(
    fruits.map((each) => [each.kind, each.key]),
    [
      ["writing", 31],
      ["turn", -4],
      ["open", 51],
      ["open", 61],
    ],
  );
});

test("chapters of one novel drop as separate fruits that share the novel's look", () => {
  const novel = story(5);
  const fruits = homeFruitsOf([], [], [fruit(51, novel), fruit(52, novel)]);
  assert.deepEqual(
    fruits.map((each) => each.key),
    [51, 52],
  );
  assert.equal(fruits[0].story, fruits[1].story);
  assert.deepEqual(fruits[1].chapter, {
    id: 52,
    number: 2,
    title: "회차 52",
    slotsLeft: 2,
  });
});

test("my own novels and other chapters of the novel I am writing are not dropped", () => {
  const writingIn = story(3);
  const fruits = homeFruitsOf(
    [held(31, writingIn)],
    [story(7, { mine: true })],
    [
      fruit(32, writingIn),
      fruit(81, story(8, { mine: true })),
      fruit(91, story(9)),
    ],
  );
  assert.deepEqual(
    fruits.map((each) => each.key),
    [31, 91],
  );
});

test("a chapter fruit is named with its chapter and title, a turn fruit with the novel title", () => {
  const [writing, turn, open] = homeFruitsOf(
    [held(31, story(3))],
    [story(4)],
    [fruit(51, story(5))],
  );
  assert.equal(fruitNameOf(writing), "작품 3 3장 「맡은 회차 31」");
  assert.equal(fruitNameOf(turn), "작품 4");
  assert.equal(fruitNameOf(open), "작품 5 2장 「회차 51」");
});

test("an older server without chapter fruits drops its novels as novel fruits", () => {
  const fruits = homeFruitsOf([], [story(4)], undefined, [story(4), story(5)]);
  assert.deepEqual(
    fruits.map((each) => [each.kind, each.key, each.chapter]),
    [
      ["turn", -4, undefined],
      ["open", -5, undefined],
    ],
  );
  assert.equal(fruitNameOf(fruits[1]), "작품 5");
});
