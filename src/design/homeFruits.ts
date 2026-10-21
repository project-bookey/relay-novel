import type { HomeFruitView, NovelDelivery, NovelSummary } from "../api/types";

// 홈 열매 하나. React·Expo 의존성이 없어 node 테스트가 가능하다.
// writing: 내가 자리를 맡고 쓰는 중인 회차, turn: 내 차례인 모여 만들기 작품, open: 지금 이어 쓸 수 있는 회차.
export type HomeFruitKind = "writing" | "turn" | "open";

export interface HomeFruitChapter {
  id: number;
  // 가지의 깊이(뿌리 = 1)
  number: number;
  title: string;
  // 남은 가지 자리. 내가 쓰는 중인 열매는 모른다.
  slotsLeft?: number;
}

export interface HomeFruit {
  // 열매 밭 안에서 열매를 가르는 값. 회차 열매는 회차 id, 내 차례 열매는 작품 id를 음수로 둔다(서로 겹치지 않게).
  key: number;
  kind: HomeFruitKind;
  // 열매의 모양·색·좋아요는 작품을 따른다. 같은 작품의 회차 열매는 같은 모양이다.
  story: NovelSummary;
  chapter?: HomeFruitChapter;
}

// 열매 자리는 몇 개뿐이라, 내가 쓰는 중인 열매와 내가 이어 쓸 차례인 소설을 먼저 놓고 나머지를 홈 묶음 순서대로 채운다.
// 내가 만든 이야기는 열매로 떨어뜨리지 않는다(마이의 내 작품에서 연다). 쓰는 중인 작품의 다른 회차는 놓지 않는다 —
// 한 작품에서는 자리를 하나만 맡을 수 있다.
export function homeFruitsOf(
  writing: NovelDelivery[],
  turns: NovelSummary[],
  feed: HomeFruitView[] | undefined,
  // 회차 열매(fruits)를 모르는 예전 서버의 작품 묶음. feed가 없을 때만 작품 열매로 놓는다.
  olderFeed: NovelSummary[] = [],
): HomeFruit[] {
  const writingNovels = new Set(writing.map((held) => held.novel.id));
  const fruits: HomeFruit[] = [
    ...writing.map((held) => ({
      key: held.chapterId,
      kind: "writing" as const,
      story: held.novel,
      chapter: {
        id: held.chapterId,
        number: held.chapterNumber,
        title: held.chapterTitle,
      },
    })),
    ...turns.map((story) => ({
      key: -story.id,
      kind: "turn" as const,
      story,
    })),
    ...(feed ? chapterFruits(feed) : novelFruits(olderFeed)).filter(
      (fruit) => !writingNovels.has(fruit.story.id),
    ),
  ];
  const placed = new Set<number>();
  return fruits.filter((fruit) => {
    if (fruit.story.mine || placed.has(fruit.key)) return false;
    placed.add(fruit.key);
    return true;
  });
}

function chapterFruits(feed: HomeFruitView[]): HomeFruit[] {
  return feed.map((fruit) => ({
    key: fruit.chapterId,
    kind: "open",
    story: fruit.novel,
    chapter: {
      id: fruit.chapterId,
      number: fruit.chapterNumber,
      title: fruit.chapterTitle,
      slotsLeft: fruit.slotsLeft,
    },
  }));
}

// 회차를 모르는 작품 열매. 누르면 작품 화면으로 간다. 같은 작품이 내 차례 열매로도 놓이면 하나만 남는다.
function novelFruits(novels: NovelSummary[]): HomeFruit[] {
  return novels.map((story) => ({ key: -story.id, kind: "open", story }));
}

// 접근성 이름에 쓰는 열매 이름. 회차 열매는 몇 장 무슨 회차인지 붙인다(예: "고양이 도서관 3장 「같은 꿈」") —
// 같은 작품에서 깊이가 같은 회차가 여럿 떨어질 수 있어 회차 제목까지 붙여야 서로 구별된다.
export function fruitNameOf(fruit: HomeFruit) {
  if (!fruit.chapter) return fruit.story.title;
  return `${fruit.story.title} ${fruit.chapter.number}장 「${fruit.chapter.title}」`;
}
