import { Pressable, Text, useWindowDimensions, View } from "react-native";
import { router } from "expo-router";
import type { NovelSummary } from "../../api/types";
import { statusLabel } from "../../theme";
import { themedStyles } from "../../theme/themed";
import { CoverThumb } from "../CoverThumb";

// 마이에서 한 줄에 보이는 내 작품 수. 나머지는 "더 보기"로 내 작품 화면(app/my-stories.tsx)에서 본다.
export const STRIP_COUNT = 4;
const GAP = 12;
// 마이 화면의 바깥 여백(24 × 2)과 가장 넓은 폭(680)
const PAGE_PADDING = 48;
const PAGE_MAX_WIDTH = 680;

const shortStatus = {
  RECRUITING: "모집",
  ONGOING: "연재",
  COMPLETED: "완결",
} as const;

// 마이의 내 작품: 각진 표지 네 권을 가로 한 줄로 세우고, 제목과 "상태 · 회차"를 아래에 짧게.
export function MyStoryStrip({ stories }: { stories: NovelSummary[] }) {
  const styles = useStyles();
  const { width } = useWindowDimensions();
  const stripWidth = Math.min(width, PAGE_MAX_WIDTH) - PAGE_PADDING;
  const coverWidth = Math.floor(
    (stripWidth - GAP * (STRIP_COUNT - 1)) / STRIP_COUNT,
  );
  return (
    <View style={styles.strip}>
      {stories.slice(0, STRIP_COUNT).map((story) => (
        <Pressable
          key={story.id}
          accessibilityRole="button"
          accessibilityLabel={`${story.title}, ${statusLabel[story.status]}`}
          onPress={() => router.push(`/novel/${story.id}`)}
          style={({ pressed }) => [
            { width: coverWidth },
            pressed && styles.pressed,
          ]}
        >
          <CoverThumb novel={story} width={coverWidth} square />
          <Text style={styles.title} numberOfLines={2}>
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
  strip: { flexDirection: "row", gap: GAP },
  pressed: { opacity: 0.6 },
  title: {
    fontSize: 13,
    lineHeight: 17,
    fontWeight: "700",
    color: colors.ink,
    marginTop: 8,
  },
  meta: { fontSize: 11, color: colors.muted, marginTop: 2 },
}));
