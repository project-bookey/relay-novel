import { Pressable, ScrollView, View } from "react-native";
import { keepWords, Text } from "./text";
import { router } from "expo-router";
import type { NovelSummary } from "../api/types";
import { likeHintOf, progressLine } from "../design/fruitList";
import { statusLabel } from "../theme";
import { themedStyles } from "../theme/themed";
import { CoverThumb } from "./CoverThumb";
import { LikeMark } from "./fruits/LikeMark";

// 상자에서 옆으로 넘겨 보는 작품 수. 마이 책장은 나머지를 "모두 보기"로 책장 화면(app/my-stories.tsx)에서 본다.
const STRIP_COUNT = 10;
const COVER_WIDTH = 92;
const GAP = 12;
// 상자 안쪽 여백. 표지 줄은 상자 오른쪽 끝에서 잘려 옆에 더 있다는 걸 보인다.
const BOX_PADDING = 16;
// 열매 탭 서가와 같은 말투: 사진 모서리만 아주 조금 둥글고, 왼쪽 위 귀퉁이에 좋아요 꼬리표.
const COVER_RADIUS = 4;

// 상자 안에서 옆으로 넘겨 보는 표지 한 줄(마이 책장 — 시안 reference/sian/my-redesign A′, 열매 탭의 나를 위한 이야기).
// 제목과 진행(열매 탭 서가와 같은 문구)을 표지 아래에 둔다. 열매 탭은 첫 화면에 서가가 보이도록 표지를 줄이고
// 제목만 둔다(coverWidth·showProgress, 시안 reference/sian/fruits-polish C — 진행은 작품 화면에서 본다).
export function StoryStrip({
  stories,
  coverWidth = COVER_WIDTH,
  showProgress = true,
}: {
  stories: NovelSummary[];
  coverWidth?: number;
  showProgress?: boolean;
}) {
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
          accessibilityHint={`${progressLine(story)}, ${likeHintOf(story.likeCount)}`}
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
            style={[
              styles.title,
              keepWords.style,
              !showProgress && styles.twoLineTitle,
            ]}
            lineBreakStrategyIOS={keepWords.lineBreakStrategyIOS}
            numberOfLines={2}
          >
            {story.title}
          </Text>
          {showProgress && (
            <Text
              style={[
                styles.progress,
                story.status === "COMPLETED" && styles.finished,
              ]}
              numberOfLines={1}
            >
              {progressLine(story)}
            </Text>
          )}
        </Pressable>
      ))}
    </ScrollView>
  );
}

// 불러오는 중에 표지 줄 자리에 두는 빈 칸. 제목만 두는 줄(showProgress 없음, 제목 두 줄 높이를 늘 잡음)과 높이가 같다 —
// 표지 + 제목 두 줄(위 여백 8 + 17 × 2 = 42)을 글줄 자리 둘(10 + 12 + 8 + 12)로 채운다. 화면 읽기에서는 숨긴다.
// 추천이 세 편 이하라 표지 줄이 없으면 작품이 왔을 때 그만큼 줄어든다(미리 알 수 없음).
const PLACEHOLDER_COUNT = 4;
export function StoryStripPlaceholder({
  coverWidth = COVER_WIDTH,
}: {
  coverWidth?: number;
}) {
  const styles = useStyles();
  const coverHeight = Math.round((coverWidth * 4) / 3);
  return (
    <View
      style={[styles.strip, styles.placeholderStrip]}
      aria-hidden
      importantForAccessibility="no-hide-descendants"
    >
      {Array.from({ length: PLACEHOLDER_COUNT }, (_, index) => (
        <View key={index} style={{ width: coverWidth }}>
          <View style={[styles.block, { height: coverHeight }]} />
          <View style={[styles.block, styles.titleBlock]} />
          <View style={[styles.block, styles.shortTitleBlock]} />
        </View>
      ))}
    </View>
  );
}

const useStyles = themedStyles((colors) => ({
  strip: { gap: GAP, padding: BOX_PADDING },
  placeholderStrip: { flexDirection: "row", overflow: "hidden" },
  block: {
    borderRadius: COVER_RADIUS,
    backgroundColor: colors.placeholderBlock,
  },
  titleBlock: { width: "80%", height: 12, marginTop: 10 },
  shortTitleBlock: { width: "56%", height: 12, marginTop: 8 },
  pressed: { opacity: 0.6 },
  title: {
    fontSize: 13,
    lineHeight: 17,
    fontWeight: "700",
    letterSpacing: -0.3,
    color: colors.ink,
    marginTop: 8,
  },
  // 제목만 두는 줄은 한 줄 제목도 두 줄 높이(17 × 2)를 잡는다.
  twoLineTitle: { minHeight: 34 },
  progress: {
    fontSize: 11,
    lineHeight: 15,
    color: colors.progressInk,
    marginTop: 3,
  },
  // 다 끝난 작품은 자라는 초록 대신 차분한 회색
  finished: { color: colors.progressDoneInk },
}));
