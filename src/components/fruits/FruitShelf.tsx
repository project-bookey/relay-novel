import { memo, useCallback, useState } from "react";
import {
  Pressable,
  View,
  useWindowDimensions,
  type LayoutChangeEvent,
} from "react-native";
import { Text } from "../text";
import { router } from "expo-router";
import type { NovelSummary } from "../../api/types";
import {
  SHELF_GAP,
  progressLine,
  shelfCoverWidth,
  writersLine,
} from "../../design/fruitList";
import { statusLabel } from "../../theme";
import { themedStyles } from "../../theme/themed";
import { CoverThumb } from "../CoverThumb";
import { LikeMark } from "./LikeMark";

// 서가 줄 너비를 재기 전에 어림할 때 쓰는 목록의 가장 넓은 너비와 양옆 여백(열매 탭·내 작품 화면이 같다).
const LIST_MAX_WIDTH = 680;
const LIST_SIDE_PADDING = 24;
// 사진 모서리는 아주 조금만 둥글게(사용자 요청). 열매 탭의 다른 칸은 그대로 각지다.
// 표지 귀퉁이에 붙는 좋아요 꼬리표도 그 모서리만 이만큼 둥글린다.
const COVER_RADIUS = 4;
// 서가 줄 사이. 탭 바로 아래 첫 줄은 이만큼 띄워 탭과 붙어 보이지 않게 한다.
const ROW_GAP = 22;
const FIRST_ROW_TOP = 14;

// 표지 너비. 세 칸과 칸 사이가 서가 줄 너비를 꽉 채운다. 줄 너비는 목록 안에서 서가와 같은 폭으로 놓인 칸을
// measureRow로 재서 쓴다 — 데스크톱 웹은 세로 스크롤바가 목록 안쪽을 차지해 창 너비로 어림하면 셋째 칸이 여백을 파고든다.
// 재기 전(첫 그림)에는 창 너비로 어림한다. 휴대폰은 스크롤바가 없어 어림과 잰 값이 같다.
export function useShelfCoverWidth() {
  const { width } = useWindowDimensions();
  const [rowWidth, setRowWidth] = useState<number>();
  const measureRow = useCallback((event: LayoutChangeEvent) => {
    setRowWidth(event.nativeEvent.layout.width);
  }, []);
  const estimated = Math.min(width, LIST_MAX_WIDTH) - LIST_SIDE_PADDING * 2;
  return { coverWidth: shelfCoverWidth(rowWidth ?? estimated), measureRow };
}

// 서가 한 줄: 표지 세 칸(사용자가 고른 시안 reference/sian/fruits-anew A "서가"). 마지막 줄이 덜 차도 칸 너비는 같다.
// 열매 탭은 큰 추천 카드가 넘어갈 때마다 다시 그려지므로, 줄이 같으면 다시 그리지 않는다.
export const ShelfRow = memo(function ShelfRow({
  stories,
  coverWidth,
  first = false,
}: {
  stories: NovelSummary[];
  coverWidth: number;
  first?: boolean;
}) {
  const styles = useStyles();
  return (
    <View style={[styles.row, first && styles.firstRow]}>
      {stories.map((story) => (
        <ShelfBook key={story.id} story={story} coverWidth={coverWidth} />
      ))}
    </View>
  );
});

// 서가 칸 하나: 잘리지 않은 3:4 표지(왼쪽 위 귀퉁이에 좋아요 꼬리표) 아래 굵은 제목 두 줄까지와 진행 한 줄.
// 작가와 장르는 칸에 쓰지 않는다 — 작가는 작품 화면에서, 장르는 위쪽 탭이 알려 준다.
function ShelfBook({
  story,
  coverWidth,
}: {
  story: NovelSummary;
  coverWidth: number;
}) {
  const styles = useStyles();
  const progress = progressLine(story);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${story.title}, ${statusLabel[story.status]}`}
      accessibilityHint={`${writersLine(story)}, ${progress}, 좋아요 ${story.likeCount}개`}
      onPress={() => router.push(`/novel/${story.id}`)}
      style={({ pressed }) => [
        { width: coverWidth },
        pressed && styles.pressed,
      ]}
    >
      <View>
        <CoverThumb novel={story} width={coverWidth} radius={COVER_RADIUS} />
        <LikeMark count={story.likeCount} coverRadius={COVER_RADIUS} />
      </View>
      <Text style={styles.title} numberOfLines={2}>
        {story.title}
      </Text>
      {/* 좁은 안드로이드 화면(칸 96)에서는 "9/20장 · 10장 쓰는 중"이 넘쳐서, 잘리기 전에 조금 줄여 한 줄에 넣는다(웹은 말줄임). */}
      <Text
        style={styles.progress}
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.85}
      >
        {progress}
      </Text>
    </Pressable>
  );
}

const useStyles = themedStyles((colors) => ({
  row: { flexDirection: "row", gap: SHELF_GAP, marginBottom: ROW_GAP },
  firstRow: { marginTop: FIRST_ROW_TOP },
  pressed: { opacity: 0.6 },
  // 제목은 굵게, 진행은 한 단계 작게 초록으로(마이 책장의 제목·글과 같은 크기 짜임).
  title: {
    marginTop: 8,
    fontSize: 13,
    lineHeight: 17,
    fontWeight: "700",
    letterSpacing: -0.3,
    color: colors.ink,
  },
  progress: {
    marginTop: 3,
    fontSize: 11.5,
    lineHeight: 15,
    color: colors.progressInk,
  },
}));
