import type { NovelStatus, NovelSummary } from "../api/types";

// 열매 탭(전체 작품 목록)에 쓰는 계산. 화면 없이 테스트한다(tests/fruitList.test.ts).

// 서버도 장르를 세 개까지만 받는다(GET /novels 의 genres).
export const FILTER_GENRES_MAX = 3;

// 장르 탭을 누를 때. 고른 장르를 다시 누르면 빼고, 세 개가 차 있으면 더 고르지 않는다.
export function toggleGenre(selected: string[], genre: string) {
  if (selected.includes(genre))
    return selected.filter((picked) => picked !== genre);
  if (selected.length >= FILTER_GENRES_MAX) return selected;
  return [...selected, genre];
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

// 목록 줄의 진행. 모여 만들기는 한 줄기라 "몇 장 중 몇 장"이 맞지만,
// 열매로 퍼뜨린 작품의 회차 수는 갈라진 가지를 모두 더한 값이라 목표 회차와 나누지 않는다.
export function progressLine(
  story: Pick<
    NovelSummary,
    "mode" | "status" | "chapterCount" | "chapterLimit"
  >,
) {
  const branching = story.mode === "OPEN";
  if (story.status === "COMPLETED")
    return branching
      ? `${story.chapterCount}개의 장 · 완결`
      : `${story.chapterCount}장 완결`;
  if (story.status === "RECRUITING") return "작가 모집 중";
  if (branching) return `${story.chapterCount}개의 장 · 자라는 중`;
  return `${story.chapterCount}/${story.chapterLimit}장 · ${story.chapterCount + 1}장 쓰는 중`;
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
