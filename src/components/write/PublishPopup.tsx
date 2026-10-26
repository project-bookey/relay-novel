import { useEffect, useRef, useState } from "react";
import {
  Animated,
  Easing,
  Pressable,
  StyleSheet,
  View,
  useWindowDimensions,
} from "react-native";
import { Text } from "../text";
import { ErrorBox } from "../ui";
import { useReducedMotion } from "../fruitMotion";
import {
  PANE_RADIUS,
  PaneButton,
  PaneGlass,
  PaneHead,
  usePaneStyles,
} from "./pane";
import { TOP_BAR_HEIGHT } from "./WriteTopBar";

const OPEN_MS = 340;
const CLOSE_MS = 220;
const SIDE_GAP = 12;
const MAX_WIDTH = 380;
// 판이 펼쳐지기 시작하는 곳: 오른쪽 위 발행 버튼의 가운데쯤
const ORIGIN_FROM_RIGHT = 46;
const ORIGIN_ABOVE = 28;

// 발행 확인. 맨 위 발행 버튼 자리에서 유리 판이 아래로 펼쳐진다(시안 write-focus 공통 줄).
// 크기 대신 크기 배율과 투명도만 바꾸어 네이티브 드라이버로 움직인다.
export function PublishPopup({
  open,
  copy,
  publishing,
  disabled,
  error,
  onPublish,
  onClose,
}: {
  open: boolean;
  copy: { hint: string; action: string };
  publishing: boolean;
  disabled: boolean;
  error: unknown;
  onPublish: () => void;
  onClose: () => void;
}) {
  const pane = usePaneStyles();
  const window = useWindowDimensions();
  const { shown, openness } = useUnfold(open);
  if (!shown) return null;
  const width = Math.min(window.width - SIDE_GAP * 2, MAX_WIDTH);
  const close = () => {
    if (!publishing) onClose();
  };
  const unfold = {
    opacity: openness.interpolate({
      inputRange: [0, 0.5, 1],
      outputRange: [0, 1, 1],
    }),
    transform: [
      {
        scale: openness.interpolate({
          inputRange: [0, 1],
          outputRange: [0.14, 1],
        }),
      },
    ],
  };
  const content = {
    opacity: openness.interpolate({
      inputRange: [0, 0.6, 1],
      outputRange: [0, 0, 1],
    }),
  };
  return (
    <View
      pointerEvents={open ? "box-none" : "none"}
      style={StyleSheet.absoluteFill}
    >
      <Pressable
        accessible={false}
        importantForAccessibility="no"
        focusable={false}
        onPress={close}
        style={StyleSheet.absoluteFill}
      />
      <Animated.View
        accessibilityViewIsModal
        style={[
          styles.card,
          {
            width,
            transformOrigin: [width - ORIGIN_FROM_RIGHT, -ORIGIN_ABOVE, 0],
          },
          unfold,
        ]}
      >
        <PaneGlass />
        <Animated.View style={[styles.body, content]}>
          <PaneHead title="이 장을 발행할까요?" onClose={close} />
          <Text style={pane.hint}>{copy.hint}</Text>
          {!!error && <ErrorBox error={error} />}
          <View style={pane.stack}>
            <PaneButton disabled={disabled || publishing} onPress={onPublish}>
              {publishing ? "발행 중…" : copy.action}
            </PaneButton>
            <PaneButton quiet disabled={publishing} onPress={close}>
              계속 다듬기
            </PaneButton>
          </View>
        </Animated.View>
      </Animated.View>
    </View>
  );
}

// 열면 그려 두고 펼치며, 닫으면 다 접힌 뒤에 치운다. 동작 줄이기면 바로 나타나고 사라진다.
function useUnfold(open: boolean) {
  const reduced = useReducedMotion();
  const [shown, setShown] = useState(open);
  const openness = useRef(new Animated.Value(open ? 1 : 0)).current;
  useEffect(() => {
    if (open) setShown(true);
    if (reduced) {
      openness.setValue(open ? 1 : 0);
      if (!open) setShown(false);
      return;
    }
    const motion = Animated.timing(openness, {
      toValue: open ? 1 : 0,
      duration: open ? OPEN_MS : CLOSE_MS,
      easing: open ? Easing.bezier(0.2, 0.8, 0.2, 1) : Easing.in(Easing.cubic),
      useNativeDriver: true,
    });
    motion.start(({ finished }) => {
      if (finished && !open) setShown(false);
    });
    return () => motion.stop();
  }, [open, reduced, openness]);
  return { shown: shown || open, openness };
}

const styles = StyleSheet.create({
  card: {
    position: "absolute",
    top: TOP_BAR_HEIGHT + 6,
    right: SIDE_GAP,
    borderRadius: PANE_RADIUS,
  },
  body: { padding: 20 },
});
