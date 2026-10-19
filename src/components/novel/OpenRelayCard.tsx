import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import type { NovelDelivery, NovelDetail } from "../../api/types";
import { Button, Card, Label, useUi } from "../ui";

// 열매로 퍼뜨리는 작품의 이어 쓰기 안내. 누가 쓸 수 있는지는 서버가 준 myDeliveryId·canWrite만 따른다.
// 받은 열매가 있으면 그 회차에서 가지를 뻗어 이어 쓰는 것이 이 화면의 단 하나의 주요 동작이다.
export function OpenRelayCard({
  detail,
  delivery,
  busy,
  onDecline,
}: {
  detail: NovelDetail;
  // 홈에서 받은 열매 목록. 어느 회차에서 이어 쓰는지 보여 주는 데만 쓴다.
  delivery?: NovelDelivery;
  busy: boolean;
  onDecline: () => void;
}) {
  const ui = useUi();
  const { novel } = detail;
  if (detail.myDeliveryId)
    return (
      <DeliveryCard
        novelId={novel.id}
        deliveryId={detail.myDeliveryId}
        delivery={delivery}
        busy={busy}
        onDecline={onDecline}
      />
    );
  if (detail.canWrite)
    return (
      <Card>
        <Label>PLANT THE FIRST BRANCH</Label>
        <Text style={[ui.sectionTitle, styles.message]}>
          첫 회차를 써 주세요.
        </Text>
        <Text style={ui.body}>
          첫 회차를 올리면 {novel.deliveryCount ?? 0}명에게 열매로 배달돼요.
        </Text>
        <Button
          onPress={() =>
            router.push({ pathname: "/novel/write", params: { id: novel.id } })
          }
        >
          첫 회차 쓰기
        </Button>
      </Card>
    );
  return (
    <Card>
      <Label>THE BRANCHES GROW</Label>
      <Text style={[ui.sectionTitle, styles.message]}>
        열매가 퍼지며 가지가 자라고 있어요.
      </Text>
      <Text style={ui.body}>{growingMessage(novel)}</Text>
    </Card>
  );
}

function growingMessage(novel: NovelDetail["novel"]) {
  const delivered = `새 회차가 올라올 때마다 ${novel.deliveryCount ?? 0}명에게 열매로 배달돼요.`;
  if (!novel.branchLimit) return delivered;
  return `${delivered} 한 회차에 가지는 ${novel.branchLimit}개까지 뻗어요.`;
}

// 무작위로 온 열매와 햇살을 내고 내 회차에 이어 쓰는 열매는 넘길 때 결과가 달라 문구를 나눈다.
function deliveryCopy(delivery?: NovelDelivery) {
  if (delivery?.source === "SELF")
    return {
      label: "MY OWN BRANCH",
      title: "내가 이어 쓰는 가지예요.",
      declineHint:
        "그만두면 낸 햇살을 돌려받아요. 이 가지는 다른 사람에게 가지 않아요.",
      declineAction: "그만두고 햇살 돌려받기",
      declineOpen: "그만두기",
    };
  // 홈의 받은 열매 목록이 아직 없으면 어떤 열매인지 몰라 결과를 단정하지 않는다.
  if (!delivery)
    return {
      label: "A FRUIT FOR YOU",
      title: "나에게 온 열매예요.",
      declineHint: "내려놓으면 이 열매로는 더 이어 쓸 수 없어요.",
      declineAction: "열매 내려놓기",
      declineOpen: "열매 내려놓기",
    };
  return {
    label: "A FRUIT FOR YOU",
    title: "나에게 온 열매예요.",
    declineHint: "넘기면 이 열매는 다른 사람에게 가요. 다시 받을 수 없어요.",
    declineAction: "열매 넘기기",
    declineOpen: "다른 사람에게 넘기기",
  };
}

function DeliveryCard({
  novelId,
  deliveryId,
  delivery,
  busy,
  onDecline,
}: {
  novelId: number;
  deliveryId: number;
  delivery?: NovelDelivery;
  busy: boolean;
  onDecline: () => void;
}) {
  const ui = useUi();
  const [confirmingDecline, setConfirmingDecline] = useState(false);
  const copy = deliveryCopy(delivery);
  const from = delivery
    ? `${delivery.chapterNumber}화 「${delivery.chapterTitle}」에서 가지를 뻗어 이어 써요.`
    : "받은 회차에서 가지를 뻗어 이어 써요.";
  return (
    <Card>
      <Label>{copy.label}</Label>
      <Text style={[ui.sectionTitle, styles.message]}>{copy.title}</Text>
      <Text style={ui.body}>{from}</Text>
      {!!delivery && (
        <Text style={ui.body}>
          {`이어 쓸 수 있는 시간 · ${new Date(delivery.dueAt).toLocaleString("ko-KR")}까지`}
        </Text>
      )}
      <Button
        onPress={() =>
          router.push({
            pathname: "/novel/write",
            params: { id: novelId, deliveryId },
          })
        }
      >
        받은 가지 이어 쓰기
      </Button>
      {/* 넘기기는 되돌릴 수 없어 주요 버튼과 떨어뜨리고, 한 번 더 묻는다. */}
      <View style={styles.declineArea}>
        {confirmingDecline ? (
          <>
            <Text style={ui.hint}>{copy.declineHint}</Text>
            <Button outline disabled={busy} onPress={onDecline}>
              {busy ? "넘기는 중…" : copy.declineAction}
            </Button>
            <Button
              outline
              disabled={busy}
              onPress={() => setConfirmingDecline(false)}
            >
              계속 들고 있기
            </Button>
          </>
        ) : (
          <Button outline onPress={() => setConfirmingDecline(true)}>
            {copy.declineOpen}
          </Button>
        )}
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  message: { marginTop: 12 },
  declineArea: { marginTop: 18 },
});
