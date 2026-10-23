import { Pressable, View } from "react-native";
import { Text } from "../text";
import { themedStyles } from "../../theme/themed";

// 열매 탭 첫 화면의 묶음 제목. 오른쪽에 작은 글자 버튼 하나를 둘 수 있다.
export function SectionHead({
  title,
  action,
}: {
  title: string;
  action?: { label: string; onPress: () => void };
}) {
  const styles = useStyles();
  return (
    <View style={styles.row}>
      <Text accessibilityRole="header" style={styles.title}>
        {title}
      </Text>
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
  title: {
    fontSize: 17,
    fontWeight: "800",
    letterSpacing: -0.4,
    color: colors.ink,
  },
  action: { minHeight: 44, justifyContent: "center" },
  actionText: { fontSize: 13, color: colors.muted },
}));
