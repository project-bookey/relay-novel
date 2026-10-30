import { View } from "react-native";
import { Text } from "../text";
import Svg, { Path } from "react-native-svg";
import { likeCountLabel, likeMarkToneOf } from "../../design/fruitList";
import { themedStyles, useColors } from "../../theme/themed";

const HEART_PATH =
  "M7 12.2C2 8.6 0.4 6.4 0.4 4C0.4 1.9 2 0.5 3.8 0.5C5.2 0.5 6.3 1.3 7 2.5C7.7 1.3 8.8 0.5 10.2 0.5C12 0.5 13.6 1.9 13.6 4C13.6 6.4 12 8.6 7 12.2Z";

// 표지 왼쪽 위 귀퉁이에 붙는 좋아요 꼬리표: 짙은 칸에 흰 하트와 수를 한 줄로 넣는다
// (사용자가 고른 시안 reference/sian/like-mark A "짙은 꼬리표"). 밝은 표지·어두운 표지 어디서도 같은 대비로 보인다.
// 표지 귀퉁이에 닿는 모서리만 표지만큼 둥글리고(coverRadius) 나머지 모서리는 각지다.
// 모양은 그대로 두고 색으로 홈 열매처럼 여문 정도를 보인다(시안 reference/sian/fruits-polish):
// 인기작(100개 이상)은 하트만 반짝이 노랑, 다 여문 작품(1000개 이상)은 꼬리표가 금빛이다. 수는 늘 함께 보인다.
export function LikeMark({
  count,
  coverRadius,
}: {
  count: number;
  coverRadius: number;
}) {
  const styles = useStyles();
  const colors = useColors();
  const tone = likeMarkToneOf(count);
  const ripe = tone === "ripe";
  let heartColor = colors.likeTagInk;
  if (ripe) heartColor = colors.likeTagRipeInk;
  else if (tone === "popular") heartColor = colors.sparkle;
  return (
    <View
      style={[
        styles.tag,
        ripe && styles.ripeTag,
        { borderTopLeftRadius: coverRadius },
      ]}
    >
      <Svg width={9} height={8} viewBox="0 0 14 12.6">
        <Path d={HEART_PATH} fill={heartColor} />
      </Svg>
      <Text
        style={[styles.count, ripe && styles.ripeCount]}
        maxFontSizeMultiplier={1.5}
      >
        {likeCountLabel(count)}
      </Text>
    </View>
  );
}

const useStyles = themedStyles((colors) => ({
  // 누르기는 서가 칸 전체가 받으므로 꼬리표는 손가락을 가로채지 않는다.
  tag: {
    position: "absolute",
    left: 0,
    top: 0,
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    paddingVertical: 3,
    paddingLeft: 5,
    paddingRight: 6,
    backgroundColor: colors.likeTag,
    pointerEvents: "none",
  },
  ripeTag: { backgroundColor: colors.sparkle },
  // 기기 글자 크기를 키우면 따라 커지되, 표지 그림을 다 가리지 않게 1.5배까지만.
  count: {
    fontSize: 10,
    lineHeight: 12,
    fontWeight: "700",
    color: colors.likeTagInk,
  },
  ripeCount: { color: colors.likeTagRipeInk },
}));
