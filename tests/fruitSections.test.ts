import { test } from "node:test";
import assert from "node:assert/strict";
import {
  demoForMe,
  dueLabel,
  forMeChoice,
  forMeGenres,
  newsByUrgency,
  newsLine,
  nextFeatured,
  splitForMe,
} from "../src/design/fruitSections";
import { demoStories } from "../src/api/demo";
import type { NovelDelivery } from "../src/api/types";

const now = Date.parse("2026-10-23T12:00:00Z");
const hoursLater = (hours: number) =>
  new Date(now + hours * 3600000).toISOString();
const delivery = (dueAt: string): NovelDelivery => ({
  deliveryId: 9,
  novel: demoStories[5],
  chapterId: 70,
  chapterNumber: 7,
  chapterTitle: "서가 맨 위 칸",
  dueAt,
  source: "CLAIM",
});

test("deadline labels count down in minutes, hours and days", () => {
  assert.equal(dueLabel(hoursLater(11.5), now), "마감 11시간");
  assert.equal(dueLabel(hoursLater(49), now), "마감 2일");
  assert.equal(dueLabel(hoursLater(0.5), now), "마감 30분");
  assert.equal(dueLabel(hoursLater(-1), now), "곧 마감");
});

test("the news line names the chapter and what the reader has to do", () => {
  const story = {
    ...demoStories[0],
    chapterCount: 3,
    turnDueAt: hoursLater(11),
  };
  assert.equal(
    newsLine({ kind: "turn", story, dueAt: story.turnDueAt }, now),
    "4장 · 내 차례예요 · 마감 11시간",
  );
  assert.equal(
    newsLine({ kind: "turn", story: { ...story, turnDueAt: undefined } }, now),
    "4장 · 내 차례예요",
  );
  const claim = delivery(hoursLater(49));
  assert.equal(
    newsLine({ kind: "claim", delivery: claim, dueAt: claim.dueAt }, now),
    "7장에서 맡은 자리 · 마감 2일",
  );
});

test("stories for me use up to three of my genres and the demo shows the most liked", () => {
  assert.deepEqual(forMeGenres(["판타지", "SF", "공포", "일상"]), [
    "판타지",
    "SF",
    "공포",
  ]);
  const picks = demoForMe(demoStories);
  assert.equal(picks.length, demoStories.length);
  picks
    .slice(1)
    .forEach((story, index) =>
      assert.ok(picks[index].likeCount >= story.likeCount),
    );
});

test("stories for me fall back to the latest stories when my genres give nothing", () => {
  const picks = demoStories.slice(0, 4);
  const recent = demoStories.slice(3);
  assert.deepEqual(forMeChoice(["판타지", "SF"], picks, recent), {
    stories: picks,
    hint: "판타지 · SF",
  });
  assert.deepEqual(forMeChoice([], picks, recent), {
    stories: recent,
    hint: "최근에 심은 이야기",
  });
  assert.deepEqual(
    forMeChoice(["공포"], [], recent).hint,
    "최근에 심은 이야기",
  );
  assert.deepEqual(forMeChoice([], [], []).stories, []);
});

test("stories for me rotate the first three in the big card and line up the rest below", () => {
  const { featured, rest } = splitForMe(demoStories);
  assert.deepEqual(featured, demoStories.slice(0, 3));
  assert.deepEqual(rest, demoStories.slice(3));
  assert.deepEqual(splitForMe(demoStories.slice(0, 2)), {
    featured: demoStories.slice(0, 2),
    rest: [],
  });
});

test("the big card steps to the next story and wraps around", () => {
  assert.equal(nextFeatured(0, 3), 1);
  assert.equal(nextFeatured(2, 3), 0);
  assert.equal(nextFeatured(0, 1), 0);
  assert.equal(nextFeatured(0, 0), 0);
  // 작품이 줄어 차례가 넘쳤으면 처음부터
  assert.equal(nextFeatured(4, 2), 0);
});

test("my to-do lists every turn and claim, closest deadline first", () => {
  const turn = { ...demoStories[0], turnDueAt: hoursLater(11) };
  const openTurn = { ...demoStories[1], turnDueAt: undefined };
  const kinds = newsByUrgency([openTurn, turn], [delivery(hoursLater(2))]).map(
    (news) => news.kind,
  );
  assert.deepEqual(kinds, ["claim", "turn", "turn"]);
  assert.deepEqual(newsByUrgency([], []), []);
});
