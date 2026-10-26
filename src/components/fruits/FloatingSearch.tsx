import { Pressable, StyleSheet, View } from "react-native";
import { Search } from "lucide-react-native";
import { themedStyles, useColors } from "../../theme/themed";
import { GlassSurface } from "../Glass";
import { SEARCH_SIZE } from "./fruitsLayout";

// 열매 탭 오른쪽 위에 떠 있는 검색 유리 동그라미. 목록과 함께 올라가지 않아 어디까지 내려도 바로 누를 수 있고
// (사용자 요청 "검색 버튼은 계속 따라다니게"), 누르면 서가 위로 검색 유리막이 덮인다(SearchVeil).
// 자리는 부르는 쪽이 정한다(fruitsLayout의 SEARCH_TOP).
export function FloatingSearch({ onPress }: { onPress: () => void }) {
  const styles = useStyles();
  const colors = useColors();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="열매 찾기"
      onPress={onPress}
      // 보이는 동그라미는 44, 누르는 칸은 48
      hitSlop={2}
      style={({ pressed }) => [styles.button, pressed && styles.pressed]}
    >
      <GlassSurface style={[StyleSheet.absoluteFill, styles.circle]} />
      {/* 웹에서 맨 그림은 위에 겹친 유리 밑에 그려져서 칸으로 감싸 유리 위에 올린다. */}
      <View>
        <Search size={24} strokeWidth={2.2} color={colors.ink} />
      </View>
    </Pressable>
  );
}

const useStyles = themedStyles(() => ({
  button: {
    width: SEARCH_SIZE,
    height: SEARCH_SIZE,
    alignItems: "center",
    justifyContent: "center",
  },
  circle: { borderRadius: SEARCH_SIZE / 2 },
  pressed: { opacity: 0.7 },
}));
