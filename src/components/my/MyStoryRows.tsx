import { Pressable, Text, View } from "react-native";
import { router } from "expo-router";
import type { NovelSummary } from "../../api/types";
import { statusLabel } from "../../theme";
import { themedStyles } from "../../theme/themed";
import { CoverThumb } from "../CoverThumb";

const COVER_WIDTH = 30;

const shortStatus = {
  RECRUITING: "모집",
  ONGOING: "연재",
  COMPLETED: "완결",
} as const;

// 마이의 내 작품: 작은 각진 표지·제목·"상태 · 회차"를 한 줄씩. 한눈에 훑어보도록 작게 둔다(사용자 요청).
export function MyStoryRows({ stories }: { stories: NovelSummary[] }) {
  const styles = useStyles();
  return (
    <View>
      {stories.map((story) => (
        <Pressable
          key={story.id}
          accessibilityRole="button"
          accessibilityLabel={`${story.title}, ${statusLabel[story.status]}`}
          onPress={() => router.push(`/novel/${story.id}`)}
          style={({ pressed }) => [styles.row, pressed && styles.pressed]}
        >
          <CoverThumb novel={story} width={COVER_WIDTH} square />
          <Text style={styles.title} numberOfLines={1}>
            {story.title}
          </Text>
          <Text style={styles.meta} numberOfLines={1}>
            {`${shortStatus[story.status]} · ${story.chapterCount}장`}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

const useStyles = themedStyles((colors) => ({
  row: {
    minHeight: 52,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 4,
  },
  pressed: { opacity: 0.6 },
  title: { flex: 1, fontSize: 15, fontWeight: "600", color: colors.ink },
  meta: { fontSize: 12, color: colors.muted },
}));
