import { useQuery } from "@tanstack/react-query";
import { novels } from "../../api/novels";
import { demoSunlight } from "../../api/demo";
import { ApiError } from "../../api/transport";
import { useSession } from "../../state/session";

// 햇살이 모자라 서버가 거절했는지(402). 이때는 오류 상자 대신 햇살 채우기 창을 연다.
export function isSunlightShort(error: unknown) {
  return (
    error instanceof ApiError && error.code === "NOVEL_SUNLIGHT_INSUFFICIENT"
  );
}

// 햇살 잔액과 쓰는 값. 둘러보기에서는 서버에 묻지 않고 잔액 0으로 둔다.
export function useSunlight() {
  const { mode } = useSession();
  return useQuery({
    queryKey: ["sunlight", mode],
    queryFn: () =>
      mode === "demo" ? Promise.resolve(demoSunlight) : novels.sunlight(),
    enabled: mode === "demo" || mode === "authenticated",
  });
}
