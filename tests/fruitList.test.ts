import { test } from "node:test";
import assert from "node:assert/strict";
import {
  demoRankingOf,
  filterStories,
  likeCountLabel,
  rankingColumnsOf,
  rememberWord,
  splitByKeyword,
  progressLine,
  searchableQuery,
  shelfCoverWidth,
  shelfRowsOf,
  toggleGenre,
  writersLine,
} from "../src/design/fruitList";
import { demoStories } from "../src/api/demo";

test("genre tabs keep only one pick and the same tab goes back to all", () => {
  assert.deepEqual(toggleGenre([], "무협"), ["무협"]);
  assert.deepEqual(toggleGenre(["무협"], "공포"), ["공포"]);
  assert.deepEqual(toggleGenre(["무협"], "무협"), []);
});

test("like counts shrink to one decimal of 천 and 만, rounded down", () => {
  assert.equal(likeCountLabel(0), "0");
  assert.equal(likeCountLabel(999), "999");
  assert.equal(likeCountLabel(1000), "1.0천");
  assert.equal(likeCountLabel(1024), "1.0천");
  assert.equal(likeCountLabel(2990), "2.9천");
  assert.equal(likeCountLabel(10000), "1.0만");
  assert.equal(likeCountLabel(125_900), "12.5만");
});

test("writers show the maker and how many others joined", () => {
  assert.equal(
    writersLine({ ownerNickname: "달조각", memberCount: 4 }),
    "달조각 외 3명",
  );
  assert.equal(
    writersLine({ ownerNickname: "달조각", memberCount: 1 }),
    "달조각",
  );
});

test("progress divides by the target only for one-line relays", () => {
  const circle = { mode: "CIRCLE" as const, chapterLimit: 20 };
  const open = { mode: "OPEN" as const, chapterLimit: 20 };
  assert.equal(
    progressLine({ ...circle, status: "ONGOING", chapterCount: 9 }),
    "9/20장 · 10장 쓰는 중",
  );
  assert.equal(
    progressLine({ ...circle, status: "COMPLETED", chapterCount: 20 }),
    "20장 완결",
  );
  assert.equal(
    progressLine({ ...circle, status: "RECRUITING", chapterCount: 0 }),
    "작가 모집 중",
  );
  // 갈라진 가지를 모두 더한 회차 수는 목표 회차(한 가지의 깊이)를 넘을 수 있다.
  assert.equal(
    progressLine({ ...open, status: "ONGOING", chapterCount: 31 }),
    "31개의 장 · 자라는 중",
  );
  assert.equal(
    progressLine({ ...open, status: "COMPLETED", chapterCount: 31 }),
    "31개의 장 · 완결",
  );
});

test("the shelf puts three stories on a row and leaves the last row short", () => {
  assert.deepEqual(shelfRowsOf([1, 2, 3, 4, 5, 6, 7]), [
    [1, 2, 3],
    [4, 5, 6],
    [7],
  ]);
  assert.deepEqual(shelfRowsOf([]), []);
});

test("shelf covers split the row width after the gaps and never overflow it", () => {
  // 390 화면의 줄 너비 342는 칸 사이 12 둘을 빼고 셋으로 딱 나뉜다.
  assert.equal(shelfCoverWidth(342), 106);
  // 나누어떨어지지 않으면 버려서 세 칸과 칸 사이가 줄 너비를 넘지 않는다.
  const width = shelfCoverWidth(353);
  assert.equal(width, 109);
  assert.ok(width * 3 + 12 * 2 <= 353);
});

test("search drops the half-typed hangul jamo at the end", () => {
  assert.equal(searchableQuery("도서ㄱ"), "도서");
  assert.equal(searchableQuery("ㄷ"), "");
  assert.equal(searchableQuery("고양이 ㄷㅗ"), "고양이");
  assert.equal(searchableQuery("  별빛 "), "별빛");
  // 글자 사이의 낱자는 그대로 둔다(일부러 친 것일 수 있다).
  assert.equal(searchableQuery("ㅋㅋ웃음"), "ㅋㅋ웃음");
});

test("demo filtering matches the server: any picked genre, status, title or maker nickname", () => {
  const titles = (list: typeof demoStories) => list.map((story) => story.title);
  assert.equal(
    filterStories(demoStories, { genres: [], query: "" }).length,
    demoStories.length,
  );
  assert.deepEqual(
    titles(filterStories(demoStories, { genres: ["판타지"], query: "" })),
    titles(demoStories.filter((story) => story.genres.includes("판타지"))),
  );
  assert.deepEqual(
    titles(filterStories(demoStories, { genres: [], query: "고양이" })),
    ["고양이 도서관"],
  );
  // 둘러보기 작품은 모두 "달조각"이 만들었다.
  assert.equal(
    filterStories(demoStories, { genres: [], query: "달조" }).length,
    demoStories.length,
  );
  assert.ok(
    filterStories(demoStories, {
      genres: [],
      query: "",
      status: "COMPLETED",
    }).every((story) => story.status === "COMPLETED"),
  );
});

test("the weekly ranking splits into two columns of five with rank numbers", () => {
  const stories = demoStories.slice(0, 7);
  const columns = rankingColumnsOf(stories);
  assert.equal(columns.length, 2);
  assert.deepEqual(
    columns[0].map((each) => each.rank),
    [1, 2, 3, 4, 5],
  );
  assert.deepEqual(
    columns[1].map((each) => [each.rank, each.story.id]),
    [
      [6, stories[5].id],
      [7, stories[6].id],
    ],
  );
  assert.equal(rankingColumnsOf(stories.slice(0, 3)).length, 1);
  assert.deepEqual(rankingColumnsOf([]), []);
});

test("the demo ranking keeps continued stories, most chapters first, within the picked genres", () => {
  const ranked = demoRankingOf(demoStories, []);
  assert.ok(ranked.length > 0 && ranked.length <= 10);
  assert.ok(ranked.every((story) => story.chapterCount > 1));
  for (let index = 1; index < ranked.length; index++)
    assert.ok(ranked[index - 1].chapterCount >= ranked[index].chapterCount);
  const fantasy = demoRankingOf(demoStories, ["판타지"]);
  assert.ok(fantasy.every((story) => story.genres.includes("판타지")));
});

test("recent search words keep the latest first without repeats or blanks", () => {
  assert.deepEqual(rememberWord([], "  고양이 "), ["고양이"]);
  assert.deepEqual(rememberWord(["회귀", "고양이"], "고양이"), [
    "고양이",
    "회귀",
  ]);
  assert.deepEqual(rememberWord(["SF"], "sf"), ["sf"]);
  const words = ["회귀"];
  assert.equal(rememberWord(words, "   "), words);
  const full = Array.from({ length: 10 }, (_, index) => `말${index}`);
  assert.deepEqual(rememberWord(full, "새 말"), ["새 말", ...full.slice(0, 9)]);
});

test("a search result title is split around the first match, ignoring case", () => {
  assert.deepEqual(splitByKeyword("고양이 도서관", "고양"), [
    { text: "고양", matched: true },
    { text: "이 도서관", matched: false },
  ]);
  assert.deepEqual(splitByKeyword("달빛 고양이의 가게", "고양"), [
    { text: "달빛 ", matched: false },
    { text: "고양", matched: true },
    { text: "이의 가게", matched: false },
  ]);
  assert.deepEqual(splitByKeyword("Last Train", "train"), [
    { text: "Last ", matched: false },
    { text: "Train", matched: true },
  ]);
  assert.deepEqual(splitByKeyword("고양이 도서관", "별빛"), [
    { text: "고양이 도서관", matched: false },
  ]);
  assert.deepEqual(splitByKeyword("고양이 도서관", " "), [
    { text: "고양이 도서관", matched: false },
  ]);
});
