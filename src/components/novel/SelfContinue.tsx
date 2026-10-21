import { useState } from "react";
import { Text, View } from "react-native";
import { router } from "expo-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { novels } from "../../api/novels";
import type { Chapter, NovelDetail } from "../../api/types";
import { useSession } from "../../state/session";
import { themedStyles } from "../../theme/themed";
import { Button, ErrorBox, useUi } from "../ui";
import { SunlightShop } from "../sunlight/SunlightShop";
import { isSunlightShort } from "../sunlight/useSunlight";

// 내가 쓴 회차 끝의 "햇살로 다음 회차 쓰기". 보일지는 서버의 canSelfContinue만 따른다.
// 맡은 열매 이어 쓰기가 화면의 주요 동작이라 이 버튼은 테두리만 있는 차분한 모양으로 둔다.
export function SelfContinue({ chapter }: { chapter: Chapter }) {
  const ui = useUi();
  const styles = useStyles();
  const client = useQueryClient();
  const { mode } = useSession();
  const [confirming, setConfirming] = useState(false);
  const [shortOfSunlight, setShortOfSunlight] = useState(false);
  const cost = chapter.selfContinueCost;
  const send = useMutation({
    mutationFn: () => novels.selfDelivery(chapter.novelId, chapter.id),
    onSuccess: (delivery) => {
      setConfirming(false);
      // 쓰기 화면이 예전 상세(맡은 열매 없음)로 먼저 그려져 "이어 쓸 수 없어요"가 비치지 않게 바로 고쳐 둔다.
      client.setQueryData<NovelDetail>(
        ["novel", chapter.novelId, mode],
        (before) => before && { ...before, myDeliveryId: delivery.deliveryId },
      );
      void client.invalidateQueries({ queryKey: ["novel", chapter.novelId] });
      void client.invalidateQueries({ queryKey: ["deliveries"] });
      void client.invalidateQueries({ queryKey: ["sunlight"] });
      void client.invalidateQueries({ queryKey: ["chapter"] });
      router.push({
        pathname: "/novel/write",
        params: { id: chapter.novelId, deliveryId: delivery.deliveryId },
      });
    },
    onError: (error) => {
      if (isSunlightShort(error)) setShortOfSunlight(true);
      // 자리가 찼거나 다른 열매를 들고 있으면 서버의 canSelfContinue가 바뀌었을 수 있다.
      else
        void client.invalidateQueries({
          queryKey: ["chapter", chapter.novelId],
        });
    },
  });
  const start = () => {
    if (mode === "demo") router.push("/login");
    else setConfirming(true);
  };
  const shownError = isSunlightShort(send.error) ? null : send.error;

  return (
    <View style={styles.area}>
      {confirming ? (
        <>
          <Text style={ui.hint}>
            {`햇살 ${cost}개를 내고 이 회차 다음을 직접 이어 써요. 다 쓰지 않고 그만두면 햇살을 돌려받아요.`}
          </Text>
          <Button disabled={send.isPending} onPress={() => send.mutate()}>
            {send.isPending ? "준비하는 중…" : `햇살 ${cost}개 내고 이어 쓰기`}
          </Button>
          <Button
            outline
            disabled={send.isPending}
            onPress={() => setConfirming(false)}
          >
            그만두기
          </Button>
        </>
      ) : (
        <Button outline onPress={start}>
          {`햇살 ${cost}개로 다음 회차 쓰기`}
        </Button>
      )}
      {!!shownError && <ErrorBox error={shownError} />}
      {shortOfSunlight && (
        <SunlightShop
          reason={`다음 회차를 이어 쓰려면 햇살 ${cost}개가 필요해요.`}
          onClose={() => setShortOfSunlight(false)}
        />
      )}
    </View>
  );
}

const useStyles = themedStyles(() => ({
  area: { marginTop: 18 },
}));
