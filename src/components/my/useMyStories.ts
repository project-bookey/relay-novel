import type { Href } from "expo-router";
import { useInfiniteQuery } from "@tanstack/react-query";
import { novels } from "../../api/novels";
import { demoStories } from "../../api/demo";
import { useSession } from "../../state/session";

// 마이의 책장: 내 작품(내가 만들었거나 참가한 모여 만들기), 내가 이어 쓴 이야기(남의 작품에 가지를 뻗은 작품),
// 즐겨찾기(좋아요와 따로 담은 작품). 마이에는 앞의 둘을 책장으로 두고, 즐겨찾기는 유리 명함의 숫자로 들어간다.
export type MyShelf = "mine" | "continued" | "favorites";

const fetchers = {
  mine: novels.mine,
  continued: novels.continued,
  favorites: novels.favorites,
};

// 책장 이름과 비었을 때의 안내. 마이와 책장 화면(app/my-stories.tsx)이 함께 쓴다.
export const shelfCopy: Record<MyShelf, { title: string; empty: string }> = {
  mine: { title: "내 작품", empty: "아직 함께 쓰는 이야기가 없어요." },
  continued: {
    title: "내가 이어 쓴 이야기",
    empty: "아직 이어 쓴 이야기가 없어요.",
  },
  favorites: {
    title: "즐겨찾기",
    empty: "작품 화면의 하트 옆 책갈피를 누르면 여기에 모여요.",
  },
};

// 책장을 모두 보는 화면(app/my-stories.tsx). 내 작품은 예전 주소 그대로 둔다.
export function shelfHref(shelf: MyShelf): Href {
  if (shelf === "mine") return "/my-stories";
  return { pathname: "/my-stories", params: { shelf } };
}

// 둘러보기에는 이어 쓴 기록과 즐겨찾기가 없어서, 내 작품이 아닌 열매로 퍼뜨린 예시 작품을 이어 쓴 이야기로,
// 좋아요가 많은 예시 작품을 즐겨찾기로 보인다.
function demoShelf(shelf: MyShelf) {
  if (shelf === "mine") return demoStories.filter((story) => story.mine);
  if (shelf === "favorites")
    return demoStories.filter((story) => story.likeCount >= 100);
  return demoStories.filter((story) => !story.mine && story.mode === "OPEN");
}

// 마이 유리 명함의 숫자(전체 편수)와 책장이 같은 쿼리를 쓴다.
// 둘러보기에서는 서버에 묻지 않고 예시 작품을 쓴다.
export function useMyStories(shelf: MyShelf = "mine") {
  const { mode } = useSession();
  const isDemo = mode === "demo";
  const query = useInfiniteQuery({
    queryKey: ["novels", shelf, mode],
    initialPageParam: 0,
    queryFn: ({ pageParam }) => fetchers[shelf](pageParam),
    getNextPageParam: (last) => (last.hasNext ? last.page + 1 : undefined),
    enabled: mode === "authenticated",
  });
  if (isDemo) {
    const stories = demoShelf(shelf);
    return { query, isDemo, stories, total: stories.length };
  }
  const stories = query.data?.pages.flatMap((page) => page.content) ?? [];
  return { query, isDemo, stories, total: query.data?.pages[0]?.totalElements };
}
