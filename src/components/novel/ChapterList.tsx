import { Pressable, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { ArrowUpRight } from "lucide-react-native";
import type { ChapterSummary } from "../../api/types";
import { colors } from "../../theme";
import { Card, Label, ui } from "../ui";

export type ChapterListItem = Pick<
  ChapterSummary,
  "id" | "chapterNumber" | "title" | "authorNickname"
>;

// 첫 장부터 차례로 읽는 회차 목록.
export function ChapterList({
  novelId,
  chapters,
}: {
  novelId: number;
  chapters: ChapterListItem[];
}) {
  return (
    <>
      {chapters.map((chapter) => (
        <Pressable
          key={chapter.id}
          accessibilityRole="button"
          accessibilityLabel={`CHAPTER ${String(chapter.chapterNumber).padStart(2, "0")} ${chapter.title}, ${chapter.authorNickname}`}
          onPress={() =>
            router.push({
              pathname: "/novel/read",
              params: { id: novelId, chapter: chapter.chapterNumber },
            })
          }
        >
          <Card>
            <View style={ui.row}>
              <Label>
                CHAPTER {String(chapter.chapterNumber).padStart(2, "0")}
              </Label>
              <ArrowUpRight size={16} color={colors.green} />
            </View>
            <Text style={[ui.sectionTitle, styles.title]}>{chapter.title}</Text>
            <Text style={ui.body}>{chapter.authorNickname}</Text>
          </Card>
        </Pressable>
      ))}
    </>
  );
}

const styles = StyleSheet.create({
  title: { marginTop: 10, marginBottom: 6 },
});
