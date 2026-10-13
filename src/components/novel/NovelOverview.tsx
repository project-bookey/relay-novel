import { StyleSheet, Text, View } from "react-native";
import type { NovelSummary } from "../../api/types";
import { statusLabel } from "../../theme";
import { StoryTree } from "../StoryTree";
import { Label, ui } from "../ui";

// 소설의 나무와 제목·소개·진행 현황.
export function NovelOverview({ novel }: { novel: NovelSummary }) {
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
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  header: { alignItems: "center" },
  title: { textAlign: "center", fontSize: 27 },
  centered: { textAlign: "center" },
  stats: { marginVertical: 25, justifyContent: "center", gap: 25 },
});
