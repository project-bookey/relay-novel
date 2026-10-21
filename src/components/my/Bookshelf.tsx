import { Pressable, Text, useWindowDimensions, View } from "react-native";
import { router } from "expo-router";
import type { NovelSummary } from "../../api/types";
import { statusLabel } from "../../theme";
import { themedStyles } from "../../theme/themed";
import { CoverThumb } from "../CoverThumb";

const COLUMNS = 3;
const GAP = 16;
// 마이 화면의 바깥 여백(24 × 2)과 가장 넓은 폭(680)
const PAGE_PADDING = 48;
const PAGE_MAX_WIDTH = 680;

const shortStatus = {
  RECRUITING: "모집",
  ONGOING: "연재",
  COMPLETED: "완결",
} as const;

// 마이의 내 작품 책장: 각진 표지를 세 칸으로 세우고 제목과 "상태 · 회차"를 아래에 짧게.
// 카드·테두리 없이 간격으로만 묶는다(사용자가 고른 시안 A "책장").
export function Bookshelf({ stories }: { stories: NovelSummary[] }) {
  const styles = useStyles();
  const { width } = useWindowDimensions();
  const shelfWidth = Math.min(width, PAGE_MAX_WIDTH) - PAGE_PADDING;
  const bookWidth = Math.floor((shelfWidth - GAP * (COLUMNS - 1)) / COLUMNS);
  return (
    <View style={styles.shelf}>
      {stories.map((story) => (
        <Pressable
          key={story.id}
          accessibilityRole="button"
          accessibilityLabel={`${story.title}, ${statusLabel[story.status]}`}
          onPress={() => router.push(`/novel/${story.id}`)}
          style={({ pressed }) => [
            { width: bookWidth },
            pressed && styles.pressed,
          ]}
        >
          <CoverThumb novel={story} width={bookWidth} square />
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
  shelf: { flexDirection: "row", flexWrap: "wrap", columnGap: GAP, rowGap: 22 },
  pressed: { opacity: 0.6 },
  title: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "700",
    color: colors.ink,
    marginTop: 10,
  },
  meta: { fontSize: 11, color: colors.muted, marginTop: 2 },
}));
