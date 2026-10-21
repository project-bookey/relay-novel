import { Pressable, Text, View } from "react-native";
import { router } from "expo-router";
import type { NovelSummary } from "../../api/types";
import { progressLine, writersLine } from "../../design/fruitList";
import { statusLabel } from "../../theme";
import { themedStyles } from "../../theme/themed";
import { CoverThumb } from "../CoverThumb";
import { LikeMark } from "./LikeMark";

// 390×844 화면에 다섯 줄이 들어가도록 표지를 가로로 눕히고 글자를 줄였다(사용자 요청).
// 표지 높이는 81이고, 제목이 두 줄이어도 글(78)이 표지보다 낮아 줄 높이는 늘 97, 사이 선까지 98이다.
const COVER_WIDTH = 108;
const COVER_TEXT_GAP = 12;

// 열매 탭 목록 한 줄: 가로로 긴 각진 표지(위쪽 왼편에 좋아요) 옆 가운데에 제목·작가·진행 세 줄.
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
        <CoverThumb novel={story} width={COVER_WIDTH} square landscape />
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

// 줄과 줄 사이의 가는 회색 선. 표지 아래는 비우고 글 쪽에만 긋는다(사용자가 그려 준 자리).
export function FruitRowDivider() {
  const styles = useStyles();
  return <View style={styles.divider} />;
}

const useStyles = themedStyles((colors) => ({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: COVER_TEXT_GAP,
    paddingVertical: 8,
  },
  pressed: { opacity: 0.6 },
  text: { flex: 1, minWidth: 0 },
  title: {
    fontSize: 16,
    lineHeight: 20,
    fontWeight: "600",
    letterSpacing: -0.4,
    color: colors.ink,
  },
  // 제목·진행보다 살짝 들여 쓴다(사용자 요청).
  writers: {
    fontSize: 12,
    lineHeight: 16,
    color: colors.muted,
    marginTop: 2,
    marginLeft: 4,
  },
  progress: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "700",
    color: colors.ink,
    marginTop: 4,
  },
  divider: {
    height: 1,
    marginLeft: COVER_WIDTH + COVER_TEXT_GAP,
    backgroundColor: colors.line,
  },
}));
