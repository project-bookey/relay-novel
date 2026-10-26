import { Pressable, View } from "react-native";
import { X } from "lucide-react-native";
import { Text } from "../text";
import { themedStyles, useColors } from "../../theme/themed";

// 이어 쓰기 화면의 유리 팝업(도구 판·발행 확인)에 함께 쓰는 조각들.
export const PANE_RADIUS = 26;

export function PaneHead({
  kicker,
  title,
  onClose,
}: {
  kicker?: string;
  title: string;
  onClose: () => void;
}) {
  const styles = usePaneStyles();
  const colors = useColors();
  return (
    <View style={styles.head}>
      <View style={styles.headText}>
        {!!kicker && <Text style={styles.kicker}>{kicker}</Text>}
        <Text accessibilityRole="header" style={styles.title}>
          {title}
        </Text>
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="닫기"
        onPress={onClose}
        style={({ pressed }) => [styles.close, pressed && styles.pressed]}
      >
        <X size={20} color={colors.muted} strokeWidth={2} />
      </Pressable>
    </View>
  );
}

// 팝업 안의 버튼. 기본은 잉크색으로 칠한 주요 동작, quiet는 유리 방울 같은 차분한 버튼이다.
export function PaneButton({
  children,
  onPress,
  disabled = false,
  quiet = false,
  grow = false,
}: {
  children: string;
  onPress: () => void;
  disabled?: boolean;
  quiet?: boolean;
  // 옆으로 나란한 버튼끼리 너비를 나눠 갖는다.
  grow?: boolean;
}) {
  const styles = usePaneStyles();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        grow && styles.grow,
        quiet ? styles.quiet : styles.primary,
        (disabled || pressed) && styles.pressed,
      ]}
    >
      <Text style={[styles.buttonText, !quiet && styles.primaryText]}>
        {children}
      </Text>
    </Pressable>
  );
}

// 팝업 맨 아래 작은 안내(AI로 보내는 글 등)
export function PaneNote({ children }: { children: string }) {
  const styles = usePaneStyles();
  return <Text style={styles.note}>{children}</Text>;
}

export const usePaneStyles = themedStyles((colors) => ({
  head: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    minHeight: 40,
  },
  headText: { flex: 1, minWidth: 0, gap: 2 },
  kicker: { fontSize: 12.5, fontWeight: "600", color: colors.muted },
  title: {
    fontSize: 18,
    fontWeight: "800",
    letterSpacing: -0.4,
    color: colors.ink,
  },
  close: {
    width: 44,
    height: 44,
    marginTop: -11,
    marginRight: -12,
    alignItems: "center",
    justifyContent: "center",
  },
  // 작은 이름표(고른 부분, 이렇게 다듬어 봤어요)
  label: {
    fontSize: 12.5,
    fontWeight: "700",
    color: colors.muted,
    marginTop: 14,
    marginBottom: 6,
  },
  // 원고에서 가져온 글
  quote: { fontSize: 15.5, lineHeight: 26, color: colors.muted },
  // AI가 제안한 글. 유리 방울 위에 둔다.
  suggestion: {
    fontSize: 15.5,
    lineHeight: 26,
    color: colors.ink,
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderRadius: 14,
    overflow: "hidden",
    backgroundColor: colors.lensFill,
    borderWidth: 1,
    borderColor: colors.lensEdge,
    boxShadow: colors.lensShadow,
  },
  hint: { fontSize: 14, lineHeight: 22, color: colors.muted, marginTop: 10 },
  warning: {
    fontSize: 13,
    lineHeight: 20,
    color: colors.errorInk,
    marginTop: 10,
  },
  actions: { flexDirection: "row", gap: 10, marginTop: 18 },
  stack: { gap: 10, marginTop: 18 },
  grow: { flex: 1 },
  button: {
    minHeight: 48,
    paddingHorizontal: 16,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  primary: { backgroundColor: colors.ink },
  quiet: {
    backgroundColor: colors.lensFill,
    borderWidth: 1,
    borderColor: colors.lensEdge,
    boxShadow: colors.lensShadow,
  },
  buttonText: { fontSize: 15, fontWeight: "700", color: colors.ink },
  primaryText: { color: colors.onInk },
  pressed: { opacity: 0.5 },
  note: { fontSize: 12, lineHeight: 18, color: colors.muted, marginTop: 14 },
}));
