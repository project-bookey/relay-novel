import { useId } from "react";
import { StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Defs, LinearGradient, Rect, Stop } from "react-native-svg";
import { useColors } from "../../theme/themed";

// 아래 유리 바와 같은 자리(BottomBar: 아래 여백 + 24 위에 높이 56)
const BAR_GAP = 24;
const BAR_HEIGHT = 56;
// 바 위로 이만큼 앞에서부터 흐려지기 시작한다.
const FADE_ABOVE_BAR = 42;

// 아래 유리 바 뒤로 서가가 바탕에 스며들듯 흐려진다(시안 fruits-detail 3번 "빛과 깊이"에서 남긴 것).
// 바 위쪽 표지는 그대로 보이고, 바 가운데쯤부터 바탕색이 된다. 손가락은 그대로 목록에 닿는다.
export function BottomFade() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const gradientId = `bottom-fade-${useId().replace(/[^\w-]/g, "")}`;
  const height = insets.bottom + BAR_GAP + BAR_HEIGHT + FADE_ABOVE_BAR;
  return (
    <View style={[styles.fade, { height }]}>
      <Svg width="100%" height="100%">
        <Defs>
          <LinearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={colors.background} stopOpacity={0} />
            <Stop
              offset="0.26"
              stopColor={colors.background}
              stopOpacity={0.35}
            />
            <Stop
              offset="0.5"
              stopColor={colors.background}
              stopOpacity={0.82}
            />
            <Stop offset="0.72" stopColor={colors.background} />
          </LinearGradient>
        </Defs>
        <Rect width="100%" height="100%" fill={`url(#${gradientId})`} />
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  fade: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    pointerEvents: "none",
  },
});
