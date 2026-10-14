import { Animated, StyleSheet, Text } from "react-native";
import type { NovelSummary } from "../api/types";
import { colors, ICON_LINE_PX, statusLabel } from "../theme";

// 집어 든 열매 위에 뜨는 말풍선. 그 소설을 열지 않고도 무엇인지 알 수 있게 제목과 상태만 짧게 보여준다.
// 하단 아이콘·씨앗주머니처럼 흰 바탕에 검은 선으로만 그린다.

const BUBBLE_WIDTH = 176;
// 말풍선이 화면 양옆에 붙지 않게 띄우는 거리
const SIDE_MARGIN = 12;
// 말풍선 꼬리와 열매 사이 간격
const GAP_ABOVE_FRUIT = 6;
const TAIL_SIZE = 10;
// 꼬리가 둥근 모서리까지 밀려나지 않게 말풍선 양 끝에서 띄우는 거리
const TAIL_INSET = 12;
// 떠오를 때 아래에서 올라오는 거리
const RISE = 6;

export function FruitBubble({
  story,
  fruitX,
  fruitTop,
  screenWidth,
  panX,
  liftY,
  appear,
}: {
  story: NovelSummary;
  // 멈춰 있던 열매의 가운데 x와 위쪽 y
  fruitX: number;
  fruitTop: number;
  screenWidth: number;
  // 손으로 옮긴 가로 거리와, 들어 올린 높이까지 더한 세로 움직임
  panX: Animated.Value | Animated.AnimatedInterpolation<number>;
  liftY: Animated.AnimatedNode;
  // 0이면 숨고 1이면 다 보인다. 열매를 들어 올리는 만큼 떠오른다.
  appear: Animated.AnimatedInterpolation<number> | number;
}) {
  // 말풍선은 열매를 따라가되 화면 밖으로 나가지 않는다. 꼬리는 늘 열매를 가리킨다.
  const minLeft = SIDE_MARGIN;
  // 화면이 말풍선보다 좁아도 범위가 뒤집히지 않게 한다.
  const maxLeft = Math.max(minLeft, screenWidth - SIDE_MARGIN - BUBBLE_WIDTH);
  const bubbleLeft = Animated.add(panX, fruitX - BUBBLE_WIDTH / 2).interpolate({
    inputRange: [minLeft, maxLeft],
    outputRange: [minLeft, maxLeft],
    extrapolate: "clamp",
  });
  const tailRange = [TAIL_INSET, BUBBLE_WIDTH - TAIL_INSET - TAIL_SIZE * 2];
  const tailLeft = Animated.subtract(
    // 꼬리 자리는 말풍선 테두리 안쪽에서 재므로 테두리 굵기만큼 뺀다.
    Animated.add(panX, fruitX - TAIL_SIZE - ICON_LINE_PX),
    bubbleLeft,
  ).interpolate({
    inputRange: tailRange,
    outputRange: tailRange,
    extrapolate: "clamp",
  });
  const rise =
    typeof appear === "number"
      ? 0
      : appear.interpolate({ inputRange: [0, 1], outputRange: [RISE, 0] });

  return (
    <Animated.View
      style={[
        styles.anchor,
        {
          top: fruitTop - GAP_ABOVE_FRUIT,
          opacity: appear,
          transform: [{ translateY: liftY }, { translateY: rise }],
        },
      ]}
    >
      {/* 네이티브 드라이버는 left 같은 배치 값을 움직이지 못하므로 transform으로 옮긴다. */}
      <Animated.View
        style={[styles.bubble, { transform: [{ translateX: bubbleLeft }] }]}
      >
        <Text style={styles.title} numberOfLines={1}>
          {story.title}
        </Text>
        <Text style={styles.status} numberOfLines={1}>
          {story.myTurn ? "내 차례예요" : statusLabel[story.status]}
        </Text>
        {/* 아래 두 변만 선을 그은 마름모를 말풍선 테두리에 겹쳐 꼬리로 쓴다. */}
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
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  // 높이 0인 기준선. 말풍선은 이 선 위로 쌓여서 열매를 가리지 않는다.
  anchor: {
    position: "absolute",
    left: 0,
    right: 0,
    height: 0,
    pointerEvents: "none",
  },
  bubble: {
    position: "absolute",
    left: 0,
    bottom: TAIL_SIZE,
    width: BUBBLE_WIDTH,
    paddingHorizontal: 14,
    paddingTop: 10,
    // 꼬리 마름모의 윗부분이 말풍선 안으로 들어오므로 글자와 겹치지 않게 아래를 넉넉히 둔다.
    paddingBottom: TAIL_SIZE + 2,
    gap: 3,
    backgroundColor: colors.paper,
    borderWidth: ICON_LINE_PX,
    borderColor: colors.black,
    borderRadius: 14,
  },
  tail: {
    position: "absolute",
    left: 0,
    bottom: -TAIL_SIZE + 1,
    width: TAIL_SIZE * 2,
    height: TAIL_SIZE * 2,
    backgroundColor: colors.paper,
    borderRightWidth: ICON_LINE_PX,
    borderBottomWidth: ICON_LINE_PX,
    borderColor: colors.black,
  },
  title: { fontSize: 14, fontWeight: "700", color: colors.black },
  status: { fontSize: 12, color: colors.muted },
});
