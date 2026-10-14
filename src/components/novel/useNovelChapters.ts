import { useQuery } from "@tanstack/react-query";
import { novels } from "../../api/novels";
import { demoChapterTreeOf } from "../../api/demo";
import type { NovelDetail } from "../../api/types";
import { useSession } from "../../state/session";

// 소설의 회차 나무. 상세·읽기 화면이 같은 캐시를 쓴다.
// 비공개 작품은 참가한 사람만 회차를 읽을 수 있어 그때만 묻는다.
export function useChapterTree(novelId: number, detail?: NovelDetail) {
  const { mode } = useSession();
  const canRead =
    !!detail && (detail.novel.isPublic || detail.myMembership === "ACTIVE");
  return useQuery({
    // 상세가 30초마다 새 회차 수를 받아 오면 나무도 함께 다시 받는다.
    queryKey: ["chapter-tree", novelId, mode, detail?.novel.chapterCount],
    queryFn: () =>
      mode === "demo"
        ? Promise.resolve(demoChapterTreeOf(novelId))
        : novels.chapterTree(novelId),
    enabled: mode === "demo" || (mode === "authenticated" && canRead),
  });
}

// 이 소설에서 내가 들고 있는 열매. 홈이 불러 둔 받은 열매 목록을 같이 쓴다.
// 이어 쓸 수 있는지는 상세의 myDeliveryId가 정하고, 이것은 어느 회차에서 받았는지 보여 주는 데만 쓴다.
export function useMyDelivery(novelId: number, deliveryId?: number) {
  const { mode } = useSession();
  const deliveries = useQuery({
    queryKey: ["deliveries", mode],
    queryFn: novels.deliveries,
    enabled: mode === "authenticated",
  });
  return deliveries.data?.find((delivery) =>
    deliveryId === undefined
      ? delivery.novel.id === novelId
      : delivery.deliveryId === deliveryId,
  );
}
