import { StyleSheet, View } from "react-native";
import { Text } from "../text";
import type { NovelMode } from "../../api/types";
import { Field, useUi } from "../ui";

// 목표 회차와 한 차례 제한 시간 입력, 그리고 방식별 안내
export function RelayLimits({
  mode,
  chapterLimit,
  turnHours,
  onChange,
}: {
  mode: NovelMode;
  chapterLimit: string;
  turnHours: string;
  onChange: (changes: { chapterLimit?: string; turnHours?: string }) => void;
}) {
  const ui = useUi();
  return (
    <>
      <View style={styles.numbers}>
        <View style={styles.number}>
          <Field
            label="목표 회차 수"
            value={chapterLimit}
            onChangeText={(value) => onChange({ chapterLimit: value })}
            keyboardType="number-pad"
            maxLength={2}
          />
        </View>
        <View style={styles.number}>
          <Field
            label="한 차례 제한 시간 (시간)"
            value={turnHours}
            onChangeText={(value) => onChange({ turnHours: value })}
            keyboardType="number-pad"
            maxLength={3}
          />
        </View>
      </View>
      <Text style={ui.hint}>
        {mode === "OPEN"
          ? "목표 회차에 닿은 가지는 더 뻗지 않아요. 열매를 고른 사람이 제한 시간 안에 쓰지 않으면 맡은 자리가 다시 비어요."
          : "고른 작가들은 승인 없이 바로 참가해요. 제한 시간이 지나면 다음 작가에게 차례가 넘어가요."}
      </Text>
    </>
  );
}

const styles = StyleSheet.create({
  numbers: { flexDirection: "row", gap: 10 },
  number: { flex: 1 },
});
