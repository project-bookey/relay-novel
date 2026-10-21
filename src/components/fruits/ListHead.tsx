import { useState } from "react";
import { Modal, Pressable, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { ChevronDown } from "lucide-react-native";
import type { NovelStatus } from "../../api/types";
import { FILTER_GENRES_MAX } from "../../design/fruitList";
import { statusLabel } from "../../theme";
import { themedStyles, useColors } from "../../theme/themed";

const statusOptions: { value?: NovelStatus; label: string }[] = [
  { value: undefined, label: "모든 상태" },
  { value: "RECRUITING", label: statusLabel.RECRUITING },
  { value: "ONGOING", label: statusLabel.ONGOING },
  { value: "COMPLETED", label: statusLabel.COMPLETED },
];

const labelOf = (status?: NovelStatus) =>
  statusOptions.find((option) => option.value === status)?.label ?? "모든 상태";

// 목록 바로 위 한 줄: 왼쪽에 고른 장르와 편수(고른 개수 n/3), 오른쪽에 상태 고르기.
// 상태는 자주 바꾸지 않아 작은 글자 하나로 두고, 누르면 아래에서 고르는 창이 올라온다.
export function ListHead({
  genres,
  total,
  status,
  onStatusChange,
}: {
  genres: string[];
  // 아직 모르면(불러오는 중) 비운다.
  total?: number;
  status?: NovelStatus;
  onStatusChange: (status?: NovelStatus) => void;
}) {
  const styles = useStyles();
  const colors = useColors();
  const [choosing, setChoosing] = useState(false);
  const totalText = total === undefined ? "" : `${total}편`;
  return (
    <View style={styles.row}>
      <Text style={styles.summary} numberOfLines={1}>
        {genres.length > 0 && (
          <Text style={styles.genres}>{`${genres.join(" · ")} `}</Text>
        )}
        {totalText}
        {genres.length > 0 && (
          <Text>{`  ${genres.length}/${FILTER_GENRES_MAX}`}</Text>
        )}
      </Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`상태 고르기, 지금 ${labelOf(status)}`}
        onPress={() => setChoosing(true)}
        style={styles.statusButton}
      >
        <Text style={styles.statusText}>{labelOf(status)}</Text>
        <ChevronDown size={14} strokeWidth={2.4} color={colors.ink} />
      </Pressable>
      {choosing && (
        <StatusSheet
          status={status}
          onPick={(picked) => {
            setChoosing(false);
            onStatusChange(picked);
          }}
          onClose={() => setChoosing(false)}
        />
      )}
    </View>
  );
}

function StatusSheet({
  status,
  onPick,
  onClose,
}: {
  status?: NovelStatus;
  onPick: (status?: NovelStatus) => void;
  onClose: () => void;
}) {
  const styles = useStyles();
  return (
    <Modal
      visible
      transparent
      animationType="slide"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="상태 고르기 닫기"
        style={styles.scrim}
        onPress={onClose}
      />
      <SafeAreaView edges={["bottom"]} style={styles.sheet}>
        {statusOptions.map((option) => {
          const isSelected = option.value === status;
          return (
            <Pressable
              key={option.label}
              accessibilityRole="button"
              accessibilityLabel={option.label}
              accessibilityState={{ selected: isSelected }}
              onPress={() => onPick(option.value)}
              style={styles.option}
            >
              <Text
                style={[styles.optionText, isSelected && styles.selectedText]}
              >
                {isSelected ? `✓ ${option.label}` : option.label}
              </Text>
            </Pressable>
          );
        })}
      </SafeAreaView>
    </Modal>
  );
}

const useStyles = themedStyles((colors) => ({
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    marginTop: 8,
  },
  summary: { flex: 1, fontSize: 14, color: colors.muted },
  genres: { color: colors.ink, fontWeight: "700" },
  statusButton: {
    minHeight: 44,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  statusText: { fontSize: 14, fontWeight: "600", color: colors.ink },
  scrim: { flex: 1, backgroundColor: colors.scrim },
  // 열매 탭은 둥근 모서리를 쓰지 않는다(사용자 결정).
  sheet: {
    backgroundColor: colors.background,
    paddingHorizontal: 24,
    paddingTop: 8,
    paddingBottom: 16,
  },
  option: {
    minHeight: 52,
    justifyContent: "center",
    borderBottomWidth: 1,
    borderColor: colors.line,
  },
  optionText: { fontSize: 16, color: colors.ink },
  selectedText: { fontWeight: "800" },
}));
