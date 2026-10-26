import { Pressable, ScrollView, View } from "react-native";
import { keepWords, Text } from "../text";
import { router } from "expo-router";
import type { NovelSummary } from "../../api/types";
import { progressLine } from "../../design/fruitList";
import { statusLabel } from "../../theme";
import { themedStyles } from "../../theme/themed";
import { CoverThumb } from "../CoverThumb";
import { LikeMark } from "../fruits/LikeMark";

// 마이 책장 상자에서 옆으로 넘겨 보는 작품 수. 나머지는 "모두 보기"로 책장 화면(app/my-stories.tsx)에서 본다.
const STRIP_COUNT = 10;
const COVER_WIDTH = 92;
const GAP = 12;
// 상자 안쪽 여백. 표지 줄은 상자 오른쪽 끝에서 잘려 옆에 더 있다는 걸 보인다.
const BOX_PADDING = 16;
// 열매 탭 서가와 같은 말투: 사진 모서리만 아주 조금 둥글고, 왼쪽 위 귀퉁이에 좋아요 꼬리표.
const COVER_RADIUS = 4;

// 마이의 책장 한 줄(시안 reference/sian/my-redesign A′): 표지를 옆으로 넘겨 보고, 제목과 진행(열매 탭 서가와 같은 문구)을 아래에.
export function MyStoryStrip({ stories }: { stories: NovelSummary[] }) {
  const styles = useStyles();
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.strip}
    >
      {stories.slice(0, STRIP_COUNT).map((story) => (
        <Pressable
          key={story.id}
          accessibilityRole="button"
          accessibilityLabel={`${story.title}, ${statusLabel[story.status]}`}
          accessibilityHint={progressLine(story)}
          onPress={() => router.push(`/novel/${story.id}`)}
          style={({ pressed }) => [
            { width: COVER_WIDTH },
            pressed && styles.pressed,
          ]}
        >
          <View>
            <CoverThumb
              novel={story}
              width={COVER_WIDTH}
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
    </ScrollView>
  );
}

const useStyles = themedStyles((colors) => ({
  strip: { gap: GAP, padding: BOX_PADDING },
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
