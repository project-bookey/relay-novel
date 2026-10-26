import { useCallback, useEffect, useRef, useState } from "react";
import {
  AccessibilityInfo,
  Animated,
  Easing,
  Platform,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Text } from "./text";
import { themedStyles } from "../theme/themed";
import { nativeDriverEnabled, useReducedMotion } from "./fruitMotion";

// 알림이 떠 있는 시간과 나타나고 사라지는 시간
const SHOW_MS = 1800;
const FADE_IN_MS = 180;
const FADE_OUT_MS = 220;

// 화면 아래에 잠깐 떴다 사라지는 한 줄 알림(예: "즐겨찾기에 담았어요").
// 스크롤과 함께 밀려 올라가지 않도록 화면 틀(스크롤 밖)에 element를 둔다.
// 화면 읽기는 새로고침 말풍선과 같다: iOS는 직접 읽어 주고, 안드로이드는 accessibilityLiveRegion이,
// 웹은 alert 역할이 읽는다(웹의 announceForAccessibility는 아무것도 하지 않는다).
export function useToast() {
  const [toast, setToast] = useState<{ id: number; message: string } | null>(
    null,
  );
  const show = useCallback((message: string) => {
    // 같은 말을 다시 띄워도 처음부터 다시 보이도록 매번 새 id로 그린다.
    setToast((current) => ({ id: (current?.id ?? 0) + 1, message }));
    if (Platform.OS === "ios")
      AccessibilityInfo.announceForAccessibility(message);
  }, []);
  const hide = useCallback(() => setToast(null), []);
  const element = toast ? (
    <Toast key={toast.id} message={toast.message} onDone={hide} />
  ) : null;
  return { show, element };
}

function Toast({ message, onDone }: { message: string; onDone: () => void }) {
  const styles = useStyles();
  const insets = useSafeAreaInsets();
  const reduced = useReducedMotion();
  const opacity = useRef(new Animated.Value(reduced ? 1 : 0)).current;
  useEffect(() => {
    // 동작 줄이기면 서서히 나타나지 않고 그대로 있다가 사라진다.
    if (reduced) {
      opacity.setValue(1);
      const timer = setTimeout(onDone, SHOW_MS);
      return () => clearTimeout(timer);
    }
    const motion = Animated.sequence([
      Animated.timing(opacity, {
        toValue: 1,
        duration: FADE_IN_MS,
        easing: Easing.out(Easing.quad),
        useNativeDriver: nativeDriverEnabled,
      }),
      Animated.delay(SHOW_MS),
      Animated.timing(opacity, {
        toValue: 0,
        duration: FADE_OUT_MS,
        easing: Easing.in(Easing.quad),
        useNativeDriver: nativeDriverEnabled,
      }),
    ]);
    motion.start(({ finished }) => {
      if (finished) onDone();
    });
    return () => motion.stop();
  }, [reduced, opacity, onDone]);
  return (
    <Animated.View
      pointerEvents="none"
      accessibilityLiveRegion="polite"
      style={[styles.place, { bottom: insets.bottom + 24, opacity }]}
    >
      <View style={styles.toast}>
        <Text accessibilityRole="alert" style={styles.text}>
          {message}
        </Text>
      </View>
    </Animated.View>
  );
}

const useStyles = themedStyles((colors) => ({
  // 넓은 화면(웹)에서도 가운데에 두고 화면 글 너비(680)를 넘지 않는다.
  place: {
    position: "absolute",
    left: 0,
    right: 0,
    paddingHorizontal: 24,
    alignItems: "center",
  },
  toast: {
    width: "100%",
    maxWidth: 632,
    minHeight: 48,
    paddingHorizontal: 18,
    paddingVertical: 13,
    borderRadius: 24,
    justifyContent: "center",
    backgroundColor: colors.ink,
    boxShadow: `0 8px 20px ${colors.cardShadow}`,
  },
  text: { fontSize: 14, lineHeight: 22, color: colors.onInk },
}));
