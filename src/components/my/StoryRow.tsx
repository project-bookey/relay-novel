import { Pressable, Text, View } from "react-native";
import { router } from "expo-router";
import { ChevronRight } from "lucide-react-native";
import type { NovelSummary } from "../../api/types";
import {
  chaptersLabel,
  genresLabel,
  statusLabel,
  writersLabel,
} from "../../theme";
import { themedStyles, useColors } from "../../theme/themed";
import { CoverThumb } from "../CoverThumb";

// 마이의 내 작품 한 줄. 책장처럼 왼쪽에 표지(없으면 작은 나무), 오른쪽에 상태와 제목.
export function StoryRow({ story }: { story: NovelSummary }) {
  const styles = useStyles();
  const colors = useColors();
  const meta = `${writersLabel(story)} · ${chaptersLabel(story)} · 좋아요 ${story.likeCount}`;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${story.title}, ${statusLabel[story.status]}`}
      accessibilityHint={`${genresLabel(story)}, ${meta}`}
      onPress={() => router.push(`/novel/${story.id}`)}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
    >
      <CoverThumb novel={story} width={60} />
      <View style={styles.text}>
        <Text style={styles.status} numberOfLines={1}>
          {`${statusLabel[story.status]} · ${genresLabel(story)}`}
        </Text>
        <Text style={styles.title} numberOfLines={2}>
          {story.title}
        </Text>
        <Text style={styles.meta} numberOfLines={2}>
          {meta}
        </Text>
      </View>
      <ChevronRight size={18} color={colors.green} />
    </Pressable>
  );
}

const useStyles = themedStyles((colors) => ({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingVertical: 12,
  },
  pressed: { opacity: 0.6 },
  text: { flex: 1, gap: 3 },
  status: { fontSize: 11, color: colors.green },
  title: { fontSize: 16, fontWeight: "700", color: colors.ink },
  meta: { fontSize: 12, color: colors.muted },
}));
