import { Pressable, Text, View } from "react-native";
import {
  useAppearance,
  type AppearancePreference,
} from "../../state/appearance";
import { themedStyles } from "../../theme/themed";

const options: { value: AppearancePreference; label: string }[] = [
  { value: "system", label: "기기 설정" },
  { value: "light", label: "밝게" },
  { value: "dark", label: "어둡게" },
];

export function appearanceLabel(preference: AppearancePreference) {
  return (
    options.find((option) => option.value === preference)?.label ?? "기기 설정"
  );
}

// 화면 모드 고르기(마이의 "화면 모드" 줄을 누르면 아래 창에 뜨고, 고르면 닫힌다). 기기 설정을 따르거나 밝게·어둡게로 고정한다.
// 고른 줄은 굵은 글자 + ✓(색만으로 구분하지 않음).
export function AppearancePicker({ onPicked }: { onPicked?: () => void }) {
  const styles = useStyles();
  const { preference, setPreference } = useAppearance();

  return (
    <View accessibilityRole="radiogroup" accessibilityLabel="화면 모드">
      {options.map((option) => {
        const selected = preference === option.value;
        return (
          <Pressable
            key={option.value}
            accessibilityRole="radio"
            aria-checked={selected}
            accessibilityLabel={option.label}
            onPress={() => {
              setPreference(option.value);
              onPicked?.();
            }}
            style={styles.option}
          >
            <Text style={[styles.text, selected && styles.selectedText]}>
              {selected ? `✓ ${option.label}` : option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const useStyles = themedStyles((colors) => ({
  option: {
    minHeight: 52,
    justifyContent: "center",
    borderBottomWidth: 1,
    borderColor: colors.line,
  },
  text: { fontSize: 16, color: colors.ink },
  selectedText: { fontWeight: "800" },
}));
