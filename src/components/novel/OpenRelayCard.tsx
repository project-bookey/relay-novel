import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import type { NovelDelivery, NovelDetail } from "../../api/types";
import { Button, Card, Label, useUi } from "../ui";

// 열매로 퍼뜨리는 작품의 이어 쓰기 안내. 누가 무엇을 쓸 수 있는지는 서버가 준 myDeliveryId·canWrite만 따른다.
// 자리를 맡은 열매가 있으면 그 회차에서 가지를 뻗는 것이, 첫 작가면 줄기를 잇는 것이 이 화면의 단 하나의 주요 동작이다.
export function OpenRelayCard({
  detail,
  delivery,
  busy,
  onDecline,
}: {
  detail: NovelDetail;
  // 홈의 내가 쓰는 중인 열매 목록. 어느 회차에서 이어 쓰는지 보여 주는 데만 쓴다.
  delivery?: NovelDelivery;
  busy: boolean;
  onDecline: () => void;
}) {
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
  if (detail.canWrite) return <TrunkCard novelId={novel.id} />;
  if (novel.mine) return <TrunkGrownCard />;
  return <GrowingCard branchLimit={novel.branchLimit} />;
}

// 첫 작가는 자기 회차로만 이어지는 줄기를 마감 없이 계속 쓴다. 줄기는 나무를 위로 키우고 떨어지지 않는다.
function TrunkCard({ novelId }: { novelId: number }) {
  const ui = useUi();
  return (
    <Card>
      <Label>YOUR TRUNK</Label>
      <Text style={[ui.sectionTitle, styles.message]}>
        내 줄기를 이어 써요.
      </Text>
      <Text style={ui.body}>
        내가 쓴 마지막 회차에서 위로 이어 써요. 줄기는 떨어지지 않고, 다른
        작가들은 회차마다 가지를 뻗어요.
      </Text>
      <Button
        onPress={() =>
          router.push({ pathname: "/novel/write", params: { id: novelId } })
        }
      >
        줄기 이어 쓰기
      </Button>
    </Card>
  );
}

function TrunkGrownCard() {
  const ui = useUi();
  return (
    <Card>
      <Label>YOUR TRUNK</Label>
      <Text style={[ui.sectionTitle, styles.message]}>
        내 줄기가 목표 회차까지 자랐어요.
      </Text>
      <Text style={ui.body}>
        다른 작가들은 자리가 남은 회차에서 계속 가지를 뻗어요. 다 자라면 작품을
        완결할 수 있어요.
      </Text>
    </Card>
  );
}

function GrowingCard({ branchLimit }: { branchLimit?: number }) {
  const ui = useUi();
  const limit = branchLimit
    ? ` 한 회차에 가지는 ${branchLimit}개까지 뻗어요.`
    : "";
  return (
    <Card>
      <Label>THE BRANCHES GROW</Label>
      <Text style={[ui.sectionTitle, styles.message]}>
        회차마다 가지가 자라고 있어요.
      </Text>
      <Text style={ui.body}>
        {`마음에 드는 회차를 읽고 그 회차에서 이어 써 보세요.${limit}`}
      </Text>
    </Card>
  );
}

// 열매가 온 길마다 내려놓을 때 결과가 달라 문구를 나눈다.
function deliveryCopy(delivery?: NovelDelivery) {
  if (delivery?.source === "SELF")
    return {
      label: "MY OWN BRANCH",
      title: "내가 이어 쓰는 가지예요.",
      declineHint: "그만두면 낸 햇살을 돌려받아요. 맡은 자리는 다시 비어요.",
      declineAction: "그만두고 햇살 돌려받기",
      declineOpen: "그만두기",
    };
  if (delivery?.source === "CLAIM")
    return {
      label: "YOUR BRANCH",
      title: "자리를 맡은 열매예요.",
      declineHint:
        "내려놓으면 맡은 자리가 비어 다른 사람이 이 회차에서 이어 쓸 수 있어요.",
      declineAction: "자리 내려놓기",
      declineOpen: "내려놓기",
    };
  // 예전에 무작위로 온 열매이거나, 홈의 목록이 아직 없어 어떤 열매인지 모르는 경우
  return {
    label: "A FRUIT FOR YOU",
    title: "이어 쓰는 중인 열매예요.",
    declineHint: "내려놓으면 이 열매로는 더 이어 쓸 수 없어요.",
    declineAction: "열매 내려놓기",
    declineOpen: "내려놓기",
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
    ? `${delivery.chapterNumber}장 「${delivery.chapterTitle}」에서 가지를 뻗어 이어 써요.`
    : "맡은 회차에서 가지를 뻗어 이어 써요.";
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
        가지 이어 쓰기
      </Button>
      {/* 내려놓기는 되돌릴 수 없어 주요 버튼과 떨어뜨리고, 한 번 더 묻는다. */}
      <View style={styles.declineArea}>
        {confirmingDecline ? (
          <>
            <Text style={ui.hint}>{copy.declineHint}</Text>
            <Button outline disabled={busy} onPress={onDecline}>
              {busy ? "내려놓는 중…" : copy.declineAction}
            </Button>
            <Button
              outline
              disabled={busy}
              onPress={() => setConfirmingDecline(false)}
            >
              계속 쓰기
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
