import { StyleSheet, Text, View } from "react-native";
import type { NovelSummary } from "../../api/types";
import { statusLabel } from "../../theme";
import { StoryTree } from "../StoryTree";
import { ErrorBox, Label, ui } from "../ui";
import { LikeButton, useNovelLike } from "./LikeButton";

// 소설의 나무와 제목·소개·진행 현황, 좋아요.
export function NovelOverview({ novel }: { novel: NovelSummary }) {
  const like = useNovelLike(novel);
  return (
    <>
      <View style={styles.header}>
        <StoryTree novel={novel} />
        <Label>
          {novel.genre} · {statusLabel[novel.status]}
        </Label>
        <Text style={[ui.heading, styles.title]}>{novel.title}</Text>
        <Text style={[ui.body, styles.centered]}>{novel.description}</Text>
      </View>
      <View style={[ui.row, styles.stats]}>
        <Text style={ui.body}>
          {novel.memberCount}/{novel.memberLimit}명의 작가
        </Text>
        <Text style={ui.body}>
          {novel.chapterCount}/{novel.chapterLimit}개의 장
        </Text>
        <LikeButton novel={novel} busy={like.busy} onPress={like.press} />
      </View>
      {!!like.error && <ErrorBox error={like.error} />}
    </>
  );
}

const styles = StyleSheet.create({
  header: { alignItems: "center" },
  title: { textAlign: "center", fontSize: 27 },
  centered: { textAlign: "center" },
  // 좋아요 버튼의 누르는 영역(44pt)만큼 줄이 높아지므로, 위아래 여백을 줄여 글씨 사이 간격은 그대로 둔다.
  stats: { marginVertical: 15, justifyContent: "center", gap: 25 },
});
