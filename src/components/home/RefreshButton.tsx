import { useEffect } from "react";
import {
  AccessibilityInfo,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { colors, ICON_LINE_PX } from "../../theme";
import type { ScreenPoint } from "../../design/fruitFlight";
import { RefreshIcon } from "../BarIcons";
import { GlassSurface } from "../Glass";

// 보이는 유리 동그라미 크기. 아래 바(56)보다 작게 두어 씨앗주머니보다 눈에 덜 띈다.
export const REFRESH_BUTTON_SIZE = 36;
// 누르는 칸. 안드로이드 최소 크기(48dp)에 맞추고, 유리 동그라미는 그 가운데에 그린다.
const TOUCH_SIZE = 48;
const GLASS_INSET = (TOUCH_SIZE - REFRESH_BUTTON_SIZE) / 2;
const ICON_SIZE = 24;

function labelOf(left: number | undefined) {
  if (left === undefined) return "새 열매 받기";
  if (left > 0) return `새 열매 받기, 오늘 ${left}번 남았어요`;
  return "새 열매 받기, 오늘은 다 썼어요";
}

// 홈 오른쪽 위, 나무 위에 뜨는 새로고침 버튼(사용자 결정). 하루 무료 횟수(서버가 정함) 안에서
// 열매 밭을 새 묶음으로 바꾼다. 남은 횟수는 오른쪽 아래 작은 숫자로 보이고, 다 쓰면 숫자가 0이 되고 흐려진다.
// 알릴 말(notice)이 있으면 버튼 아래에 말풍선으로 띄우고 화면 읽기 프로그램에도 알린다.
export function RefreshButton({
  center,
  left,
  busy,
  notice,
  onPress,
}: {
  // 버튼 가운데 자리(버튼을 그리는 부모 뷰 기준)
  center: ScreenPoint;
  // 오늘 남은 무료 새로고침. 아직 모르면 비어 있다.
  left: number | undefined;
  // 새 묶음을 받는 중이거나 나무 연출이 끝나지 않았으면 누를 수 없다.
  busy: boolean;
  notice: string | undefined;
  onPress: () => void;
}) {
  const usedUp = left === 0;
  // 안드로이드는 말풍선의 accessibilityLiveRegion이, 웹은 alert 역할이 알아서 읽어 준다.
  useEffect(() => {
    if (notice && Platform.OS === "ios")
      AccessibilityInfo.announceForAccessibility(notice);
  }, [notice]);

  return (
    <View
      style={[
        styles.anchor,
        { left: center.x - TOUCH_SIZE / 2, top: center.y - TOUCH_SIZE / 2 },
      ]}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={labelOf(left)}
        accessibilityState={{ disabled: busy, busy }}
        disabled={busy}
        onPress={onPress}
        style={({ pressed }) => [
          styles.press,
          (busy || usedUp || pressed) && styles.dim,
        ]}
      >
        <GlassSurface style={styles.glass}>
          <RefreshIcon
            size={ICON_SIZE}
            strokeWidth={(ICON_LINE_PX * 24) / ICON_SIZE}
          />
        </GlassSurface>
      </Pressable>
      {left !== undefined && (
        // 남은 횟수는 버튼 이름에 이미 있으므로 화면 읽기 프로그램에는 숨긴다.
        <View style={styles.badge} aria-hidden>
          <Text style={styles.badgeText}>{left}</Text>
        </View>
      )}
      {!!notice && (
        <View style={styles.notice} accessibilityLiveRegion="polite">
          <Text accessibilityRole="alert" style={styles.noticeText}>
            {notice}
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  anchor: { position: "absolute", width: TOUCH_SIZE, height: TOUCH_SIZE },
  press: {
    width: TOUCH_SIZE,
    height: TOUCH_SIZE,
    alignItems: "center",
    justifyContent: "center",
  },
  glass: {
    width: REFRESH_BUTTON_SIZE,
    height: REFRESH_BUTTON_SIZE,
    borderRadius: REFRESH_BUTTON_SIZE / 2,
    alignItems: "center",
    justifyContent: "center",
  },
  dim: { opacity: 0.45 },
  // 남은 횟수. 유리 동그라미 오른쪽 아래(네모 반대쪽)에 걸친 작은 흰 동그라미
  badge: {
    position: "absolute",
    pointerEvents: "none",
    right: GLASS_INSET - 4,
    bottom: GLASS_INSET - 4,
    minWidth: 18,
    height: 18,
    paddingHorizontal: 4,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.paper,
    borderWidth: 1,
    borderColor: colors.black,
  },
  badgeText: {
    fontSize: 11,
    lineHeight: 13,
    fontWeight: "700",
    color: colors.black,
  },
  // 버튼 아래, 오른쪽 끝을 유리 동그라미에 맞춘 말풍선
  notice: {
    position: "absolute",
    pointerEvents: "none",
    top: TOUCH_SIZE + 4,
    right: GLASS_INSET,
    width: 220,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 14,
    backgroundColor: colors.paper,
    boxShadow: `0 6px 18px ${colors.cardShadow}`,
  },
  noticeText: { fontSize: 13, lineHeight: 19, color: colors.ink },
});
