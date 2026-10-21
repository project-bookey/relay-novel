import { test } from "node:test";
import assert from "node:assert/strict";
import {
  filterStories,
  likeCountLabel,
  progressLine,
  toggleGenre,
  writersLine,
} from "../src/design/fruitList";
import { demoStories } from "../src/api/demo";

test("genre tabs toggle and stop at three picks", () => {
  assert.deepEqual(toggleGenre([], "무협"), ["무협"]);
  assert.deepEqual(toggleGenre(["무협", "공포"], "무협"), ["공포"]);
  const full = ["무협", "공포", "SF"];
  assert.equal(toggleGenre(full, "일상"), full);
  assert.deepEqual(toggleGenre(full, "공포"), ["무협", "SF"]);
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
