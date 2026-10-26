import type { NovelDelivery, NovelSummary } from "../api/types";

// 열매 탭 위쪽 묶음(시안 reference/sian/fruits-redesign D "정리 + 크기")에 쓰는 계산. 화면 없이 테스트한다
// (tests/fruitSections.test.ts).

// 내 이야기 소식 한 줄: 내 차례인 작품이나 내가 자리를 맡은 열매 가운데 마감이 가장 가까운 하나.
export type MyNews =
  | { kind: "turn"; story: NovelSummary; dueAt?: string }
  | { kind: "claim"; delivery: NovelDelivery; dueAt: string };

// 내 할 일(마이): 내 차례와 맡은 자리를 마감이 가까운 순으로 모두.
// 마감이 없는 내 차례는 마감이 있는 것들 뒤에 둔다. 마감이 같으면 내 차례를 먼저.
export function newsByUrgency(
  turns: NovelSummary[],
  deliveries: NovelDelivery[],
): MyNews[] {
  const news: MyNews[] = [
    ...turns.map((story) => ({
      kind: "turn" as const,
      story,
      dueAt: story.turnDueAt,
    })),
    ...deliveries.map((delivery) => ({
      kind: "claim" as const,
      delivery,
      dueAt: delivery.dueAt,
    })),
  ];
  const dueTime = (item: MyNews) =>
    item.dueAt ? Date.parse(item.dueAt) : Number.POSITIVE_INFINITY;
  return [...news].sort((left, right) => dueTime(left) - dueTime(right));
}

// 열매 탭의 내 이야기 소식은 가장 급한 한 줄만.
export function mostUrgentNews(
  turns: NovelSummary[],
  deliveries: NovelDelivery[],
): MyNews | undefined {
  return newsByUrgency(turns, deliveries)[0];
}

// "마감 11시간", "마감 2일", "마감 40분". 서버가 지난 것은 보내지 않지만, 시계가 어긋나면 "곧 마감".
export function dueLabel(dueAt: string, now = Date.now()) {
  const minutes = Math.floor((Date.parse(dueAt) - now) / 60000);
  if (minutes < 1) return "곧 마감";
  if (minutes < 60) return `마감 ${minutes}분`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `마감 ${hours}시간`;
  return `마감 ${Math.floor(hours / 24)}일`;
}

// 소식 한 줄의 작은 글: "4장 · 내 차례예요 · 마감 11시간", "7장에서 맡은 자리 · 마감 2일".
// 내 차례의 장 번호는 다음에 쓸 회차다(모여 만들기는 한 줄기라 지금 회차 수 + 1).
export function newsLine(news: MyNews, now = Date.now()) {
  const due = news.dueAt ? ` · ${dueLabel(news.dueAt, now)}` : "";
  if (news.kind === "turn")
    return `${news.story.chapterCount + 1}장 · 내 차례예요${due}`;
  return `${news.delivery.chapterNumber}장에서 맡은 자리${due}`;
}

// 나를 위한 이야기는 큰 칸 하나 + 두 칸, 세 편이다.
export const FOR_ME_COUNT = 3;

// 관심 장르는 1~5개를 고를 수 있지만 목록 서버는 세 개까지 받는다(앞의 세 개, 고른 순서).
export const FOR_ME_GENRES_MAX = 3;
export function forMeGenres(myGenres: string[]) {
  return myGenres.slice(0, FOR_ME_GENRES_MAX);
}

// 나를 위한 이야기에 놓을 세 편과 제목 옆 설명. 관심 장르로 고른 작품이 있으면 그것을, 관심 장르가 없거나
// 맞는 작품이 없으면 최근에 심은 이야기를 놓는다(묶음이 통째로 빠지면 열매 탭이 예전 서가와 같아 보여서).
export function forMeChoice(
  genres: string[],
  genrePicks: NovelSummary[],
  recent: NovelSummary[],
) {
  if (genres.length > 0 && genrePicks.length > 0)
    return {
      stories: genrePicks.slice(0, FOR_ME_COUNT),
      hint: genres.join(" · "),
    };
  return { stories: recent.slice(0, FOR_ME_COUNT), hint: "최근에 심은 이야기" };
}

// 둘러보기에는 관심 장르가 없어서 좋아요가 많은 예시 세 편을 보인다.
export function demoForMe(stories: NovelSummary[]) {
  return [...stories]
    .sort((left, right) => right.likeCount - left.likeCount)
    .slice(0, FOR_ME_COUNT);
}
