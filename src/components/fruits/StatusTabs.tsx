import { Pressable, View } from "react-native";
import { Text } from "../text";
import type { NovelStatus } from "../../api/types";
import { statusLabel } from "../../theme";
import { themedStyles } from "../../theme/themed";

// 찾을 때만 장르 탭 아래에 나오는 상태 고르기(사용자 결정: 평소 화면에서는 뺐다, 시안 fruits-detail-4 S2).
// 줄이 좁아 짧게 쓰고, 화면 읽기에는 원래 이름(statusLabel)을 쓴다.
const options: { status?: NovelStatus; label: string }[] = [
  { label: "모든 상태" },
  { status: "RECRUITING", label: "작가 모집 중" },
  { status: "ONGOING", label: "이어가는 중" },
  { status: "COMPLETED", label: "완결" },
];

// 장르 탭보다 작은 글자 탭. 고른 것은 굵은 글자 + 밑줄이다(색만으로 구분하지 않음).
export function StatusTabs({
  status,
  onChange,
}: {
  status?: NovelStatus;
  onChange: (status?: NovelStatus) => void;
}) {
  const styles = useStyles();
  return (
    <View style={styles.bar}>
      {options.map((option) => {
        const isSelected = option.status === status;
        return (
          <Pressable
            key={option.label}
            accessibilityRole="button"
            accessibilityLabel={
              option.status ? statusLabel[option.status] : option.label
            }
            accessibilityState={{ selected: isSelected }}
            onPress={() => onChange(option.status)}
            // 칸은 40이지만 위아래로 넓혀 누르는 높이 44를 지킨다.
            hitSlop={{ top: 2, bottom: 2 }}
            style={[styles.tab, isSelected && styles.selectedTab]}
          >
            <Text style={[styles.label, isSelected && styles.selectedLabel]}>
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const useStyles = themedStyles((colors) => ({
  // 장르 탭처럼 화면 오른쪽 끝까지 이어지는 가는 선 위에 둔다.
  bar: {
    flexDirection: "row",
    gap: 16,
    marginTop: 4,
    marginRight: -24,
    paddingRight: 24,
    borderBottomWidth: 1,
    borderColor: colors.line,
  },
  // "완결"처럼 짧은 것도 누르는 너비가 44가 되게 한다.
  tab: {
    minHeight: 40,
    minWidth: 44,
    alignItems: "center",
    justifyContent: "center",
    borderBottomWidth: 2,
    borderColor: "transparent",
  },
  selectedTab: { borderColor: colors.ink },
  label: { fontSize: 13, color: colors.muted },
  selectedLabel: { color: colors.ink, fontWeight: "700" },
}));
