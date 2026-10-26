import { Pressable, useWindowDimensions, View } from "react-native";
import { keepWords, Text } from "../text";
import { router } from "expo-router";
import type { NovelSummary } from "../../api/types";
import { progressLine } from "../../design/fruitList";
import { statusLabel } from "../../theme";
import { themedStyles } from "../../theme/themed";
import { CoverThumb } from "../CoverThumb";
import { LikeMark } from "../fruits/LikeMark";

// 마이에서 한 줄에 보이는 작품 수. 나머지는 "더 보기"로 책장 화면(app/my-stories.tsx)에서 본다.
export const STRIP_COUNT = 4;
const GAP = 12;
// 마이 화면의 바깥 여백(24 × 2)과 가장 넓은 폭(680)
const PAGE_PADDING = 48;
const PAGE_MAX_WIDTH = 680;
// 열매 탭 서가와 같은 말투: 사진 모서리만 아주 조금 둥글고, 왼쪽 위 귀퉁이에 좋아요 꼬리표.
const COVER_RADIUS = 4;

// 마이의 책장 한 줄: 표지 네 권을 가로로 세우고, 제목과 진행(열매 탭 서가와 같은 문구)을 아래에.
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
          accessibilityHint={progressLine(story)}
          onPress={() => router.push(`/novel/${story.id}`)}
          style={({ pressed }) => [
            { width: coverWidth },
            pressed && styles.pressed,
          ]}
        >
          <View>
            <CoverThumb
              novel={story}
              width={coverWidth}
              radius={COVER_RADIUS}
            />
            <LikeMark count={story.likeCount} coverRadius={COVER_RADIUS} />
          </View>
          <Text
            style={[styles.title, keepWords.style]}
            lineBreakStrategyIOS={keepWords.lineBreakStrategyIOS}
            numberOfLines={2}
          >
            {story.title}
          </Text>
          <Text style={styles.progress} numberOfLines={1}>
            {progressLine(story)}
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
    letterSpacing: -0.3,
    color: colors.ink,
    marginTop: 8,
  },
  progress: {
    fontSize: 11,
    lineHeight: 15,
    color: colors.progressInk,
    marginTop: 3,
  },
}));
