import { useInfiniteQuery } from "@tanstack/react-query";
import { novels } from "../../api/novels";
import { demoStories } from "../../api/demo";
import { useSession } from "../../state/session";

// 마이의 두 책장: 내 작품(내가 만들었거나 참가한 모여 만들기)과 내가 이어 쓴 이야기(남의 작품에 가지를 뻗은 작품).
export type MyShelf = "mine" | "continued";

const fetchers = { mine: novels.mine, continued: novels.continued };

// 둘러보기에는 이어 쓴 기록이 없어서, 내 작품이 아닌 열매로 퍼뜨린 예시 작품을 이어 쓴 이야기로 보인다.
function demoShelf(shelf: MyShelf) {
  if (shelf === "mine") return demoStories.filter((story) => story.mine);
  return demoStories.filter((story) => !story.mine && story.mode === "OPEN");
}

// 마이 맨 위의 "내 작품" 숫자(전체 편수)와 책장이 같은 쿼리를 쓴다.
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
