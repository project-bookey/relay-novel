import { Pressable, View } from "react-native";
import { router } from "expo-router";
import { ChevronLeft } from "lucide-react-native";
import { Text } from "../text";
import { GlassSurface } from "../Glass";
import { themedStyles, useColors } from "../../theme/themed";

export const TOP_BAR_HEIGHT = 56;

// 이어 쓰기 화면 맨 위 한 줄: 뒤로 · 어디를 쓰는지와 글자 수·저장 상태 · 발행.
// 화면에서 강조하는 동작은 발행 하나라 발행만 잉크색으로 칠한다.
export function WriteTopBar({
  place,
  saveLine,
  saveError,
  onRetrySave,
  onPublish,
  publishDisabled,
}: {
  place: string;
  saveLine: { text: string; failed: boolean };
  // 저장하지 못한 까닭(서버 문구). 다시 저장 버튼의 도움말로 읽어 준다.
  saveError: unknown;
  onRetrySave: () => void;
  onPublish: () => void;
  publishDisabled: boolean;
}) {
  const styles = useStyles();
  const colors = useColors();
  return (
    <View style={styles.bar}>
      <GlassSurface style={styles.backGlass}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="뒤로"
          onPress={() =>
            router.canGoBack() ? router.back() : router.replace("/")
          }
          style={({ pressed }) => [styles.back, pressed && styles.pressed]}
        >
          <ChevronLeft size={22} color={colors.ink} strokeWidth={2.2} />
        </Pressable>
      </GlassSurface>
      <View style={styles.where}>
        <Text numberOfLines={1} style={styles.place}>
          {place}
        </Text>
        {saveLine.failed ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="저장하지 못했어요. 다시 저장"
            accessibilityHint={
              saveError instanceof Error ? saveError.message : undefined
            }
            onPress={onRetrySave}
            hitSlop={{ top: 14, bottom: 14, left: 8, right: 8 }}
          >
            <Text style={[styles.save, styles.saveFailed]}>
              {saveLine.text}
            </Text>
          </Pressable>
        ) : (
          <Text numberOfLines={1} style={styles.save}>
            {saveLine.text}
          </Text>
        )}
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="회차 발행"
        accessibilityState={{ disabled: publishDisabled }}
        disabled={publishDisabled}
        onPress={onPublish}
        style={({ pressed }) => [
          styles.publish,
          (publishDisabled || pressed) && styles.dimmed,
        ]}
      >
        <Text style={styles.publishText}>발행</Text>
      </Pressable>
    </View>
  );
}

const useStyles = themedStyles((colors) => ({
  bar: {
    height: TOP_BAR_HEIGHT,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  backGlass: { width: 44, height: 44, borderRadius: 22 },
  back: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  // 줄 높이를 다 채워, 다시 저장 버튼의 넓힌 누르는 영역이 이 칸 밖으로 나가지 않게 한다(안드로이드).
  where: {
    flex: 1,
    minWidth: 0,
    alignSelf: "stretch",
    alignItems: "center",
    justifyContent: "center",
  },
  place: { fontSize: 13.5, fontWeight: "700", color: colors.ink },
  save: { fontSize: 12, color: colors.muted, marginTop: 1 },
  saveFailed: { color: colors.errorInk, fontWeight: "600" },
  publish: {
    height: 44,
    paddingHorizontal: 18,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.ink,
  },
  publishText: { fontSize: 15, fontWeight: "800", color: colors.onInk },
  pressed: { opacity: 0.5 },
  dimmed: { opacity: 0.4 },
}));
