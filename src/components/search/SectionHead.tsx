import { Pressable, View } from "react-native";
import { Text } from "../text";
import { themedStyles } from "../../theme/themed";

// 열매 탭·검색 유리막의 묶음 제목. 제목 옆에 작은 설명(hint), 오른쪽에 작은 글자 버튼 하나를 둘 수 있다.
// large는 열매 탭의 큰 이름(19)이다. 처음엔 마이 책장 이름과 같은 21이었는데, 첫 화면에 서가가 보이도록
// 한 단계 줄였다(시안 reference/sian/fruits-polish C).
export function SectionHead({
  title,
  hint,
  action,
  large = false,
}: {
  title: string;
  hint?: string;
  action?: { label: string; onPress: () => void };
  large?: boolean;
}) {
  const styles = useStyles();
  return (
    <View style={[styles.row, large && styles.largeRow]}>
      <View style={styles.titleLine}>
        <Text
          accessibilityRole="header"
          style={[styles.title, large && styles.largeTitle]}
        >
          {title}
        </Text>
        {hint ? (
          <Text
            style={[styles.hint, large && styles.largeHint]}
            numberOfLines={1}
          >
            {hint}
          </Text>
        ) : null}
      </View>
      {action && (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={action.label}
          onPress={action.onPress}
          hitSlop={8}
          style={styles.action}
        >
          <Text style={styles.actionText}>{action.label}</Text>
        </Pressable>
      )}
    </View>
  );
}

const useStyles = themedStyles((colors) => ({
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    minHeight: 44,
  },
  titleLine: {
    flex: 1,
    flexDirection: "row",
    alignItems: "baseline",
    gap: 8,
    minWidth: 0,
  },
  hint: { flexShrink: 1, fontSize: 12.5, color: colors.muted },
  title: {
    fontSize: 17,
    fontWeight: "800",
    letterSpacing: -0.4,
    color: colors.ink,
  },
  largeRow: { minHeight: 48 },
  largeTitle: { fontSize: 19, letterSpacing: -0.5 },
  largeHint: { fontSize: 13 },
  action: { minHeight: 44, justifyContent: "center" },
  actionText: { fontSize: 13, color: colors.muted },
}));
