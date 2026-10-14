import { Pressable, StyleSheet, Text, View } from "react-native";
import { Minus, Plus } from "lucide-react-native";
import type { NovelMode } from "../../api/types";
import { colors } from "../../theme";
import { ui } from "../ui";

const modes: { mode: NovelMode; title: string; description: string }[] = [
  {
    mode: "OPEN",
    title: "열매로 퍼뜨리기",
    description:
      "모르는 사람들에게 열매로 배달돼요. 받은 사람마다 새 가지를 뻗어 이어 써요.",
  },
  {
    mode: "CIRCLE",
    title: "모여 만들기",
    description: "팔로우한 작가를 골라 최대 10명이 차례대로 한 줄기로 써요.",
  },
];

// 만드는 방식 두 가지. 고른 쪽은 테두리와 글씨 굵기, "선택됨" 표시로 함께 알린다.
export function ModePicker({
  value,
  onChange,
}: {
  value: NovelMode;
  onChange: (mode: NovelMode) => void;
}) {
  return (
    <View accessibilityRole="radiogroup" style={styles.group}>
      {modes.map((option) => {
        const selected = option.mode === value;
        return (
          <Pressable
            key={option.mode}
            accessibilityRole="radio"
            accessibilityState={{ checked: selected }}
            accessibilityLabel={option.title}
            onPress={() => onChange(option.mode)}
            style={[styles.option, selected && styles.selected]}
          >
            <View style={ui.row}>
              <Text style={[styles.title, selected && styles.selectedTitle]}>
                {option.title}
              </Text>
              {selected && <Text style={styles.mark}>선택됨</Text>}
            </View>
            <Text style={styles.description}>{option.description}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export const DELIVERY_MIN = 1;
export const DELIVERY_MAX = 10;

// 한 번에 배달할 사람 수. 숫자를 직접 치지 않고 44pt 버튼으로 하나씩 바꾼다.
export function DeliveryCountStepper({
  value,
  onChange,
}: {
  value: number;
  onChange: (count: number) => void;
}) {
  return (
    <View style={styles.stepperBlock}>
      <Text style={ui.label}>한 번에 배달할 사람 수</Text>
      <View style={styles.stepper}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="배달할 사람 한 명 줄이기"
          accessibilityState={{ disabled: value <= DELIVERY_MIN }}
          disabled={value <= DELIVERY_MIN}
          onPress={() => onChange(value - 1)}
          style={[styles.step, value <= DELIVERY_MIN && styles.stepDisabled]}
        >
          <Minus size={18} color={colors.ink} />
        </Pressable>
        <Text
          style={styles.count}
          accessibilityLabel={`배달할 사람 ${value}명`}
        >{`${value}명`}</Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="배달할 사람 한 명 늘리기"
          accessibilityState={{ disabled: value >= DELIVERY_MAX }}
          disabled={value >= DELIVERY_MAX}
          onPress={() => onChange(value + 1)}
          style={[styles.step, value >= DELIVERY_MAX && styles.stepDisabled]}
        >
          <Plus size={18} color={colors.ink} />
        </Pressable>
      </View>
      <Text style={ui.hint}>
        회차가 올라올 때마다 관심 장르가 맞는 사람부터 무작위로 골라 배달해요.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  group: { gap: 10, marginVertical: 8 },
  option: {
    padding: 16,
    gap: 6,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.line,
  },
  selected: { borderColor: colors.ink, borderWidth: 2 },
  title: { fontSize: 15, color: colors.ink, fontWeight: "500" },
  selectedTitle: { fontWeight: "700" },
  mark: { fontSize: 11, color: colors.green, fontWeight: "600" },
  description: { fontSize: 12, lineHeight: 19, color: colors.muted },
  stepperBlock: { marginTop: 10 },
  stepper: {
    flexDirection: "row",
    alignItems: "center",
    gap: 18,
    marginTop: 10,
  },
  step: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: colors.line,
    alignItems: "center",
    justifyContent: "center",
  },
  stepDisabled: { opacity: 0.35 },
  count: { fontSize: 17, fontWeight: "700", color: colors.ink, minWidth: 44 },
});
