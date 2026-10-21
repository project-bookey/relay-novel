import { Text, View } from "react-native";
import { router } from "expo-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { novels } from "../../api/novels";
import type { Chapter, NovelDetail } from "../../api/types";
import { useSession } from "../../state/session";
import { themedStyles } from "../../theme/themed";
import { Button, useUi } from "../ui";

// 읽던 회차에서 "이 회차에서 이어 쓰기". 보일지는 서버의 canClaim만 따른다.
// 누르면 자리를 하나 맡고 쓰기 화면으로 간다. 자리가 찼거나 다른 열매를 맡고 있으면 서버가 거절하고,
// 그 까닭은 부르는 쪽(ContinueActions)이 이 버튼이 사라져도 보이게 남긴다.
export function ClaimBranch({
  chapter,
  onRefused,
}: {
  chapter: Chapter;
  onRefused: (error: unknown) => void;
}) {
  const ui = useUi();
  const styles = useStyles();
  const client = useQueryClient();
  const { mode } = useSession();
  const claim = useMutation({
    mutationFn: () => novels.claim(chapter.novelId, chapter.id),
    onSuccess: (held) => {
      // 쓰기 화면이 예전 상세(맡은 열매 없음)로 먼저 그려져 "이어 쓸 수 없어요"가 비치지 않게 바로 고쳐 둔다.
      client.setQueryData<NovelDetail>(
        ["novel", chapter.novelId, mode],
        (before) => before && { ...before, myDeliveryId: held.deliveryId },
      );
      void client.invalidateQueries({ queryKey: ["novel", chapter.novelId] });
      void client.invalidateQueries({ queryKey: ["deliveries"] });
      void client.invalidateQueries({ queryKey: ["chapter"] });
      void client.invalidateQueries({ queryKey: ["novels"] });
      router.push({
        pathname: "/novel/write",
        params: { id: chapter.novelId, deliveryId: held.deliveryId },
      });
    },
    onError: (error) => {
      onRefused(error);
      // 그사이 자리가 찼을 수 있으니 서버의 canClaim을 다시 받는다.
      void client.invalidateQueries({
        queryKey: ["chapter", chapter.novelId],
      });
    },
  });
  const start = () => {
    if (mode === "demo") {
      router.push("/login");
      return;
    }
    onRefused(undefined);
    claim.mutate();
  };

  return (
    <View style={styles.area}>
      <Text style={ui.hint}>
        {`이어 쓸 자리가 ${chapter.slotsLeft}개 남았어요. 쓰기 시작하면 정해진 시간 동안 자리를 맡아요.`}
      </Text>
      <Button disabled={claim.isPending} onPress={start}>
        {claim.isPending ? "자리 맡는 중…" : "이 회차에서 이어 쓰기"}
      </Button>
    </View>
  );
}

const useStyles = themedStyles(() => ({
  area: { marginTop: 18 },
}));
