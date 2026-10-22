import { useId } from "react";
import { StyleSheet, View } from "react-native";
import Svg, { Defs, LinearGradient, Rect, Stop } from "react-native-svg";
import { useColors } from "../../theme/themed";

// 열매 탭 바탕: 위쪽은 바탕색 그대로, 아래로 갈수록 옅은 종이색(fieldBottom)이 되는 세로 그라데이션
// (사용자가 고른 시안 reference/sian/fruits-detail 3번 "빛과 깊이"). 화면 전체 뒤에 깐다.
export function FieldBackground() {
  const colors = useColors();
  // 화면에 그라데이션이 여러 개 있어도 섞이지 않도록 이름을 따로 붙인다.
  const gradientId = `field-${useId().replace(/[^\w-]/g, "")}`;
  return (
    <View style={styles.fill}>
      <Svg width="100%" height="100%">
        <Defs>
          <LinearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={colors.background} />
            <Stop offset="0.3" stopColor={colors.background} />
            <Stop offset="1" stopColor={colors.fieldBottom} />
          </LinearGradient>
        </Defs>
        <Rect width="100%" height="100%" fill={`url(#${gradientId})`} />
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { ...StyleSheet.absoluteFill, pointerEvents: "none" },
});
