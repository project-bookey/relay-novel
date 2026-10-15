import { Animated, Text, View } from "react-native";
import type { NovelSummary } from "../api/types";
import { statusLabel, storyColorOf, writersLabel } from "../theme";
import { themedStyles } from "../theme/themed";

// 집어 든 열매 위에 뜨는 말풍선. 그 소설을 열지 않고도 무엇인지 알 수 있게
// 장르·제목·상태·회차·작가 수를 흰 카드에 짧게 보여준다. 나에게 배달된 열매면 그것도 알려 준다.

const BUBBLE_WIDTH = 200;
// 말풍선이 화면 양옆에 붙지 않게 띄우는 거리
const SIDE_MARGIN = 12;
// 말풍선 꼬리와 열매 사이 간격
const GAP_ABOVE_FRUIT = 4;
const TAIL_SIZE = 10;
// 꼬리가 둥근 모서리까지 밀려나지 않게 말풍선 양 끝에서 띄우는 거리
const TAIL_INSET = 14;
// 떠오를 때 아래에서 올라오는 거리
const RISE = 6;

export function FruitBubble({
  story,
  delivered,
  centerX,
  top,
  appear,
  screenWidth,
}: {
  story: NovelSummary;
  // 나에게 배달돼 이어 쓸 수 있는 열매인지
  delivered: boolean;
  // 든 열매의 가운데 x와 위쪽 끝 y(열매 밭 기준)
  centerX: Animated.Value;
  top: Animated.Value;
  // 0이면 숨고 1이면 다 보인다.
  appear: Animated.Value;
  screenWidth: number;
}) {
  const styles = useStyles();
  // 말풍선은 열매를 따라가되 화면 밖으로 나가지 않는다. 꼬리는 늘 열매를 가리킨다.
  const minLeft = SIDE_MARGIN;
  // 화면이 말풍선보다 좁아도 범위가 뒤집히지 않게 한다.
  const maxLeft = Math.max(minLeft, screenWidth - SIDE_MARGIN - BUBBLE_WIDTH);
  const bubbleLeft = Animated.subtract(centerX, BUBBLE_WIDTH / 2).interpolate({
    inputRange: [minLeft, maxLeft],
    outputRange: [minLeft, maxLeft],
    extrapolate: "clamp",
  });
  const tailRange = [TAIL_INSET, BUBBLE_WIDTH - TAIL_INSET - TAIL_SIZE * 2];
  const tailLeft = Animated.subtract(
    Animated.subtract(centerX, TAIL_SIZE),
    bubbleLeft,
  ).interpolate({
    inputRange: tailRange,
    outputRange: tailRange,
    extrapolate: "clamp",
  });
  const rise = appear.interpolate({
    inputRange: [0, 1],
    outputRange: [RISE, 0],
  });
  const chapters = `${story.chapterCount}화`;
  const writers = writersLabel(story);

  return (
    <Animated.View
      style={[
        styles.anchor,
        {
          opacity: appear,
          transform: [
            { translateY: Animated.subtract(top, GAP_ABOVE_FRUIT) },
            { translateY: rise },
          ],
        },
      ]}
    >
      <Animated.View
        style={[styles.bubble, { transform: [{ translateX: bubbleLeft }] }]}
      >
        {/* 꼬리를 글자보다 먼저 그려서, 말풍선 안으로 들어온 꼬리 윗부분이 글자를 가리지 않게 한다. */}
        <Animated.View
          style={[
            styles.tail,
            {
              transform: [
                { translateX: tailLeft },
                { scaleY: 0.7 },
                { rotate: "45deg" },
              ],
            },
          ]}
        />
        <View style={styles.head}>
          <View
            style={[styles.dot, { backgroundColor: storyColorOf(story.id) }]}
          />
          <Text style={styles.genre}>{story.genre}</Text>
        </View>
        <Text style={styles.title} numberOfLines={2}>
          {story.title}
        </Text>
        <Text style={styles.meta} numberOfLines={1}>
          {`${statusLabel[story.status]} · ${chapters} · ${writers}`}
        </Text>
        {delivered && (
          <View style={styles.turnBadge}>
            <Text style={styles.turnText}>나에게 온 열매예요</Text>
          </View>
        )}
        {!delivered && story.myTurn && (
          <View style={styles.turnBadge}>
            <Text style={styles.turnText}>내 차례예요</Text>
          </View>
        )}
      </Animated.View>
    </Animated.View>
  );
}

const useStyles = themedStyles((colors) => ({
  // 높이 0인 기준선을 열매 위쪽 끝에 둔다. 말풍선은 이 선 위로 쌓여서 열매를 가리지 않는다.
  anchor: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 0,
    pointerEvents: "none",
  },
  // 말풍선 자리는 네이티브에서 움직이는 값인데, 네이티브 애니메이션은 left 같은 배치 값을 바꾸지 못해 transform으로 옮긴다.
  bubble: {
    position: "absolute",
    left: 0,
    bottom: TAIL_SIZE,
    width: BUBBLE_WIDTH,
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 3,
    backgroundColor: colors.paper,
    borderRadius: 16,
    boxShadow: `0 6px 18px ${colors.cardShadow}`,
  },
  tail: {
    position: "absolute",
    left: 0,
    bottom: -TAIL_SIZE + 1,
    width: TAIL_SIZE * 2,
    height: TAIL_SIZE * 2,
    backgroundColor: colors.paper,
  },
  head: { flexDirection: "row", alignItems: "center", gap: 6 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  genre: { fontSize: 11, color: colors.muted },
  title: {
    fontSize: 15,
    fontWeight: "700",
    color: colors.ink,
    lineHeight: 21,
  },
  meta: { fontSize: 11, color: colors.muted },
  turnBadge: {
    alignSelf: "flex-start",
    marginTop: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    backgroundColor: colors.green,
  },
  turnText: { fontSize: 11, fontWeight: "600", color: colors.paper },
}));
