import { Pressable, StyleSheet, Text, View } from "react-native";
import {
  useAppearance,
  type AppearancePreference,
} from "../../state/appearance";
import { useUi } from "../ui";

const options: { value: AppearancePreference; label: string }[] = [
  { value: "system", label: "기기 설정" },
  { value: "light", label: "밝게" },
  { value: "dark", label: "어둡게" },
];

// 마이의 화면 모드 고르기. 기기 설정을 따르거나 밝게·어둡게로 고정한다.
export function AppearancePicker() {
  const ui = useUi();
  const { preference, setPreference } = useAppearance();

  return (
    <>
      <Text style={ui.sectionTitle}>화면 모드</Text>
      <View
        accessibilityRole="radiogroup"
        accessibilityLabel="화면 모드"
        style={styles.row}
      >
        {options.map((option) => {
          const selected = preference === option.value;
          return (
            <Pressable
              key={option.value}
              accessibilityRole="radio"
              aria-checked={selected}
              accessibilityLabel={option.label}
              onPress={() => setPreference(option.value)}
              style={[ui.pill, styles.option, selected && ui.pillSelected]}
            >
              <Text style={[ui.pillText, selected && ui.pillTextSelected]}>
                {selected ? `✓ ${option.label}` : option.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", gap: 8 },
  // 세 칸을 같은 너비로 나누고, 누르는 높이는 44를 지킨다.
  option: {
    flex: 1,
    minHeight: 44,
    alignItems: "center",
    justifyContent: "center",
  },
});
