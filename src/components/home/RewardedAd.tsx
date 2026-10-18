import { useEffect, useState } from "react";
import { Modal, Pressable, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { X } from "lucide-react-native";
import { themedStyles, useColors } from "../../theme/themed";

// 광고를 끝까지 봐야 하는 시간(초)
const AD_SECONDS = 5;

// 보상형 광고 자리. 아직 광고 SDK를 붙이지 않아, 정해진 시간 동안 광고 화면을 흉내 낸다.
// 실제 광고(AdMob 보상형 등)를 붙이면 이 화면 대신 광고를 띄우고, 끝까지 봤는지만 onDone으로 알린다.
// 그때는 서버도 광고 회사의 보상 확인을 받아 광고 새로고침을 내주게 바꾼다.
export function RewardedAd({
  visible,
  onDone,
}: {
  visible: boolean;
  // 끝까지 보고 닫으면 true, 중간에 닫으면 false
  onDone: (rewarded: boolean) => void;
}) {
  const styles = useStyles();
  const colors = useColors();
  const [left, setLeft] = useState(AD_SECONDS);
  useEffect(() => {
    if (!visible) return;
    setLeft(AD_SECONDS);
    const timer = setInterval(
      () => setLeft((seconds) => Math.max(0, seconds - 1)),
      1000,
    );
    return () => clearInterval(timer);
  }, [visible]);
  const watched = left === 0;
  const close = () => onDone(watched);

  return (
    <Modal
      visible={visible}
      animationType="fade"
      onRequestClose={close}
      statusBarTranslucent
    >
      <SafeAreaView style={styles.screen}>
        <View style={styles.top}>
          <Text style={styles.badge}>광고</Text>
          <Text style={styles.countdown} accessibilityLiveRegion="polite">
            {watched ? "새 열매를 받을 수 있어요" : `${left}초 뒤에 새 열매`}
          </Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={
              watched ? "광고 닫고 새 열매 받기" : "광고 닫기"
            }
            onPress={close}
            hitSlop={12}
          >
            <X size={22} color={colors.ink} />
          </Pressable>
        </View>
        <View style={styles.stage}>
          <Text style={styles.title}>광고가 나오는 자리예요</Text>
          <Text style={styles.body}>
            {watched
              ? "다 봤어요. 닫으면 새 열매가 떨어져요."
              : "끝까지 보면 새 열매를 한 번 더 받을 수 있어요."}
          </Text>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const useStyles = themedStyles((colors) => ({
  screen: { flex: 1, backgroundColor: colors.background },
  top: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  badge: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.muted,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  countdown: { flex: 1, fontSize: 13, color: colors.muted },
  stage: {
    flex: 1,
    margin: 20,
    borderRadius: 18,
    backgroundColor: colors.ground,
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    padding: 24,
  },
  title: { fontSize: 18, fontWeight: "700", color: colors.ink },
  body: {
    fontSize: 14,
    lineHeight: 21,
    color: colors.ink,
    textAlign: "center",
  },
}));
