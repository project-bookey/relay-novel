import { StyleSheet } from "react-native";
import { Text } from "../text";
import { router } from "expo-router";
import type { NovelDetail } from "../../api/types";
import { Button, Card, Label, useUi } from "../ui";

// 이어 쓰는 중인 소설의 차례 안내. 누가 쓸 수 있는지는 서버의 canWrite만 따른다.
export function TurnCard({ detail }: { detail: NovelDetail }) {
  const ui = useUi();
  const writerName = detail.currentWriterNickname || "다음 작가";
  const message = detail.canWrite
    ? "다음 장은 당신의 차례."
    : `${writerName} 님이 이어 쓰고 있어요.`;
  const dueAt = detail.novel.turnDueAt;

  return (
    <Card>
      <Label>{detail.canWrite ? "YOUR TURN" : "THE STORY CONTINUES"}</Label>
      <Text style={[ui.sectionTitle, styles.message]}>{message}</Text>
      {!!dueAt && (
        <Text style={ui.body}>
          {`이번 차례 마감 · ${new Date(dueAt).toLocaleString("ko-KR")}`}
        </Text>
      )}
      {detail.canWrite && (
        <Button
          onPress={() =>
            router.push({
              pathname: "/novel/write",
              params: { id: detail.novel.id },
            })
          }
        >
          다음 장 이어 쓰기
        </Button>
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  message: { marginTop: 12 },
});
