import { useInfiniteQuery } from "@tanstack/react-query";
import { novels } from "../../api/novels";
import { demoStories } from "../../api/demo";
import { useSession } from "../../state/session";

// 내 작품. 마이 맨 위의 "내 작품" 숫자(전체 편수)와 책장이 같은 쿼리를 쓴다.
// 둘러보기에서는 서버에 묻지 않고 예시 작품 가운데 내 작품을 쓴다.
export function useMyStories() {
  const { mode } = useSession();
  const isDemo = mode === "demo";
  const query = useInfiniteQuery({
    queryKey: ["novels", "mine", mode],
    initialPageParam: 0,
    queryFn: ({ pageParam }) => novels.mine(pageParam),
    getNextPageParam: (last) => (last.hasNext ? last.page + 1 : undefined),
    enabled: mode === "authenticated",
  });
  if (isDemo) {
    const stories = demoStories.filter((story) => story.mine);
    return { query, isDemo, stories, total: stories.length };
  }
  const stories = query.data?.pages.flatMap((page) => page.content) ?? [];
  return { query, isDemo, stories, total: query.data?.pages[0]?.totalElements };
}
