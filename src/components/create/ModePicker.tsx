import { Pressable, View } from "react-native";
import { Text } from "../text";
import { Minus, Plus } from "lucide-react-native";
import type { NovelMode } from "../../api/types";
import { themedStyles, useColors } from "../../theme/themed";
import { useUi } from "../ui";

const modes: { mode: NovelMode; title: string; description: string }[] = [
  {
    mode: "OPEN",
    title: "열매로 퍼뜨리기",
    description:
      "회차가 홈에 열매로 놓여 누구나 골라 새 가지를 뻗어 이어 써요. 나는 내 줄기를 계속 위로 이어 써요.",
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
  const ui = useUi();
  const styles = useStyles();
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

// 서버도 2~5로 막는다. 첫 작가의 줄기는 이 수와 따로 센다.
export const BRANCH_LIMIT_MIN = 2;
export const BRANCH_LIMIT_MAX = 5;
export const BRANCH_LIMIT_DEFAULT = 3;

// 한 회차에 뻗을 수 있는 가지 수. 숫자를 직접 치지 않고 44pt 버튼으로 하나씩 바꾼다.
export function BranchLimitStepper({
  value,
  onChange,
}: {
  value: number;
  onChange: (limit: number) => void;
}) {
  const ui = useUi();
  const styles = useStyles();
  const colors = useColors();
  const atMin = value <= BRANCH_LIMIT_MIN;
  const atMax = value >= BRANCH_LIMIT_MAX;
  return (
    <View style={styles.stepperBlock}>
      <Text style={ui.label}>한 회차에 뻗을 수 있는 가지</Text>
      <View style={styles.stepper}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="가지 하나 줄이기"
          accessibilityState={{ disabled: atMin }}
          disabled={atMin}
          onPress={() => onChange(value - 1)}
          style={[styles.step, atMin && styles.stepDisabled]}
        >
          <Minus size={18} color={colors.ink} />
        </Pressable>
        <Text
          style={styles.count}
          accessibilityLabel={`가지 ${value}개`}
        >{`${value}개`}</Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="가지 하나 늘리기"
          accessibilityState={{ disabled: atMax }}
          disabled={atMax}
          onPress={() => onChange(value + 1)}
          style={[styles.step, atMax && styles.stepDisabled]}
        >
          <Plus size={18} color={colors.ink} />
        </Pressable>
      </View>
      <Text style={ui.hint}>
        회차마다 다른 작가가 이만큼 가지를 뻗을 수 있어요. 자리가 남은 회차는
        홈에 열매로 놓이고, 내 줄기는 따로 이어 써요.
      </Text>
    </View>
  );
}

const useStyles = themedStyles((colors) => ({
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
}));
