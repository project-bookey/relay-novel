import { StyleSheet, Text, View } from "react-native";
import type { NovelMode } from "../../api/types";
import { Field, ui } from "../ui";

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
          ? "목표 회차에 닿은 가지는 더 배달되지 않아요. 열매를 받은 사람이 제한 시간 안에 쓰지 않으면 다른 사람에게 다시 배달돼요."
          : "고른 작가들은 승인 없이 바로 참가해요. 제한 시간이 지나면 다음 작가에게 차례가 넘어가요."}
      </Text>
    </>
  );
}

const styles = StyleSheet.create({
  numbers: { flexDirection: "row", gap: 10 },
  number: { flex: 1 },
});
