import type { NovelStatus, NovelSummary } from "../api/types";
import { isPopular } from "./fruitGlow";
import { isFullyRipe } from "./fruitRipeness";

// 열매 탭(전체 작품 목록)에 쓰는 계산. 화면 없이 테스트한다(tests/fruitList.test.ts).

// 장르 탭을 누를 때. 장르는 하나만 고른다(2026-10-27 사용자 결정, 예전엔 세 개까지).
// 다른 장르를 누르면 그 장르로 바꾸고, 고른 장르를 다시 누르면 빼서 "전체"로 돌아간다.
export function toggleGenre(selected: string[], genre: string) {
  if (selected.includes(genre)) return [];
  return [genre];
}

// 표지 위에 얹는 좋아요 수. 자리가 좁아 천·만 단위는 한 자리 소수로 줄인다(버림).
export function likeCountLabel(count: number) {
  if (count < 1000) return String(count);
  if (count < 10000) return `${roundDownToTenth(count / 1000)}천`;
  return `${roundDownToTenth(count / 10000)}만`;
}

// 1.08 → "1.0", 2.99 → "2.9"
function roundDownToTenth(value: number) {
  return (Math.floor(value * 10) / 10).toFixed(1);
}

// "달조각 외 3명". 혼자 쓴 작품은 이름만.
export function writersLine(
  story: Pick<NovelSummary, "ownerNickname" | "memberCount">,
) {
  const others = story.memberCount - 1;
  if (others <= 0) return story.ownerNickname;
  return `${story.ownerNickname} 외 ${others}명`;
}

// 작품 제목 아래 진행. "얼마나 · 어떤 상태" 한 모양이다(시안 reference/sian/fruits-polish). 아직 쓴 회차가 없는
// "작가 모집 중"만 상태 하나다.
// 모여 만들기는 한 줄기라 "몇 장 중 몇 장"이 맞지만, 열매로 퍼뜨린 작품의 회차 수는 갈라진 가지를 모두 더한 값이라
// 목표 회차와 나누지 않고, 읽기 화면의 "n장"(가지 깊이)과 헷갈리지 않게 "n개의 장"이라 쓴다.
export function progressLine(
  story: Pick<
    NovelSummary,
    "mode" | "status" | "chapterCount" | "chapterLimit"
  >,
) {
  const branching = story.mode === "OPEN";
  const amount = branching
    ? `${story.chapterCount}개의 장`
    : `${story.chapterCount}장`;
  if (story.status === "COMPLETED") return `${amount} · 완결`;
  if (story.status === "RECRUITING") return "작가 모집 중";
  if (branching) return `${amount} · 자라는 중`;
  return `${story.chapterCount}/${story.chapterLimit}장 · 쓰는 중`;
}

// 좋아요 꼬리표의 모습. 홈 열매와 같은 기준이다 — 100개부터 반짝이는 인기 열매, 1000개면 다 여문 금빛 열매.
export type LikeMarkTone = "plain" | "popular" | "ripe";
export function likeMarkToneOf(likeCount: number): LikeMarkTone {
  if (isFullyRipe(likeCount)) return "ripe";
  if (isPopular(likeCount)) return "popular";
  return "plain";
}

// 화면 읽기에 들려줄 좋아요. 꼬리표는 색으로 여문 정도를 보이므로, 홈 열매 이름처럼 "인기"·"다 여문 열매"를 말로도 붙인다.
export function likeHintOf(likeCount: number) {
  const tone = likeMarkToneOf(likeCount);
  const count = `좋아요 ${likeCount}개`;
  if (tone === "ripe") return `다 여문 열매, ${count}`;
  if (tone === "popular") return `인기, ${count}`;
  return count;
}

// 서가 한 줄의 칸 수와 칸 사이(사용자가 고른 시안 reference/sian/fruits-anew A "서가").
export const SHELF_COLUMNS = 3;
export const SHELF_GAP = 12;

// 작품을 서가 한 줄씩 묶는다. 마지막 줄은 덜 찰 수 있다.
export function shelfRowsOf<T>(items: T[], columns = SHELF_COLUMNS) {
  const rows: T[][] = [];
  for (let start = 0; start < items.length; start += columns)
    rows.push(items.slice(start, start + columns));
  return rows;
}

// 서가 칸 하나(표지)의 너비. 줄 너비에서 칸 사이를 빼고 나누며, 줄을 넘지 않게 버린다.
export function shelfCoverWidth(
  rowWidth: number,
  columns = SHELF_COLUMNS,
  gap = SHELF_GAP,
) {
  return Math.floor((rowWidth - gap * (columns - 1)) / columns);
}

// 칠 때마다 바로 찾을 검색어. 한글을 치는 도중 끝에 붙은 낱자(ㄷ·ㅅ·ㅏ처럼 아직 글자가 되지 않은 것)는 빼서,
// "도서ㄱ" 같은 반쪽 글자로 찾아 결과가 비었다가 다시 차는 깜빡임을 막는다.
export function searchableQuery(typed: string) {
  return typed.replace(/[ㄱ-ㆎ]+$/u, "").trim();
}

export interface FruitFilter {
  genres: string[];
  query: string;
  status?: NovelStatus;
}

// 둘러보기에서는 서버에 묻지 않으므로 서버와 같은 기준으로 예시 작품을 거른다:
// 고른 장르 중 하나라도 작품 장르에 있고, 제목이나 만든 사람 닉네임에 검색어가 들어 있는 작품.
export function filterStories(stories: NovelSummary[], filter: FruitFilter) {
  const keyword = filter.query.trim().toLowerCase();
  return stories.filter((story) => {
    const genres = story.genres?.length ? story.genres : [story.genre];
    const genreMatches =
      filter.genres.length === 0 ||
      filter.genres.some((genre) => genres.includes(genre));
    const statusMatches = !filter.status || story.status === filter.status;
    const keywordMatches =
      keyword === "" ||
      story.title.toLowerCase().includes(keyword) ||
      story.ownerNickname.toLowerCase().includes(keyword);
    return genreMatches && statusMatches && keywordMatches;
  });
}

// ---------- 첫 화면: 이번 주 많이 이어 쓴 이야기 · 최근 찾은 말 ----------

// 순위는 열 편을 다섯 편씩 두 단으로 놓는다(사용자가 고른 시안 reference/sian/fruits-search B "두 단").
export const RANKING_COLUMN_SIZE = 5;

export interface RankedStory {
  rank: number;
  story: NovelSummary;
}

// 서버가 준 순서대로 순위를 붙여 1~5위 · 6~10위 두 단으로 나눈다. 다섯 편 이하면 한 단이다.
export function rankingColumnsOf(
  stories: NovelSummary[],
  columnSize = RANKING_COLUMN_SIZE,
): RankedStory[][] {
  const ranked = stories.map((story, index) => ({ rank: index + 1, story }));
  return shelfRowsOf(ranked, columnSize);
}

// 서버 순위도 열 편이다.
export const RANKING_SIZE = 10;

// 둘러보기 순위. 예시 작품에는 "이번 주"가 없어서 이어 쓴 회차가 많은 순으로 서버처럼 열 편까지 고른다.
// 1회차뿐인 작품은 아직 아무도 이어 쓰지 않았으니 넣지 않는다.
export function demoRankingOf(stories: NovelSummary[], genres: string[]) {
  return filterStories(stories, { genres, query: "" })
    .filter((story) => story.chapterCount > 1)
    .sort(
      (left, right) =>
        right.chapterCount - left.chapterCount || left.id - right.id,
    )
    .slice(0, RANKING_SIZE);
}

// 최근 찾은 말은 기기에 이만큼 두고, 첫 화면에는 앞의 세 개만 보인다.
export const RECENT_WORDS_MAX = 10;
export const RECENT_WORDS_SHOWN = 3;

// 찾은 말을 맨 앞에 둔다. 같은 말은 하나만 남기고(대소문자 무시), 빈 말은 넣지 않는다.
export function rememberWord(words: string[], word: string) {
  const trimmed = word.trim();
  if (!trimmed) return words;
  const others = words.filter(
    (each) => each.toLowerCase() !== trimmed.toLowerCase(),
  );
  return [trimmed, ...others].slice(0, RECENT_WORDS_MAX);
}

// 검색 결과 제목에서 찾은 말을 굵게 보이려고 나눈다. 대소문자는 가리지 않고 처음 맞는 곳 하나만.
export function splitByKeyword(title: string, keyword: string) {
  const trimmed = keyword.trim();
  const at = trimmed ? title.toLowerCase().indexOf(trimmed.toLowerCase()) : -1;
  if (at < 0) return [{ text: title, matched: false }];
  const end = at + trimmed.length;
  return [
    { text: title.slice(0, at), matched: false },
    { text: title.slice(at, end), matched: true },
    { text: title.slice(end), matched: false },
  ].filter((part) => part.text !== "");
}
