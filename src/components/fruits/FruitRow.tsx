import { Pressable, Text, View } from "react-native";
import { router } from "expo-router";
import type { NovelSummary } from "../../api/types";
import { progressLine, writersLine } from "../../design/fruitList";
import { statusLabel } from "../../theme";
import { themedStyles } from "../../theme/themed";
import { CoverThumb } from "../CoverThumb";
import { LikeMark } from "./LikeMark";

const COVER_WIDTH = 90;

// 열매 탭 목록 한 줄: 각진 표지(위쪽 왼편에 좋아요) 옆에 제목·작가·진행 세 줄.
// 장르는 위쪽 장르 탭이 알려 주므로 줄에서는 뺀다(사용자 결정).
export function FruitRow({ story }: { story: NovelSummary }) {
  const styles = useStyles();
  const writers = writersLine(story);
  const progress = progressLine(story);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${story.title}, ${statusLabel[story.status]}`}
      accessibilityHint={`${writers}, ${progress}, 좋아요 ${story.likeCount}개`}
      onPress={() => router.push(`/novel/${story.id}`)}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
    >
      <View>
        <CoverThumb novel={story} width={COVER_WIDTH} square />
        <LikeMark count={story.likeCount} />
      </View>
      <View style={styles.text}>
        <Text style={styles.title} numberOfLines={2}>
          {story.title}
        </Text>
        <Text style={styles.writers} numberOfLines={1}>
          {writers}
        </Text>
        <Text style={styles.progress} numberOfLines={1}>
          {progress}
        </Text>
      </View>
    </Pressable>
  );
}

const useStyles = themedStyles((colors) => ({
  row: { flexDirection: "row", gap: 16, paddingVertical: 14 },
  pressed: { opacity: 0.6 },
  text: { flex: 1, minWidth: 0, paddingTop: 6 },
  title: {
    fontSize: 20,
    lineHeight: 26,
    fontWeight: "800",
    letterSpacing: -0.5,
    color: colors.ink,
  },
  writers: { fontSize: 14, color: colors.muted, marginTop: 4 },
  progress: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.ink,
    marginTop: 10,
  },
}));
