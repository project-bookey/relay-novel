import { Pressable, Text, TextInput, View } from "react-native";
import { Search } from "lucide-react-native";
import { themedStyles, useColors } from "../../theme/themed";

// 열매 탭 맨 위. 평소에는 "열매" 제목 오른쪽에 검색 아이콘만 두고,
// 아이콘을 누르면 그 자리가 검색 입력줄과 "취소"로 바뀐다.
export function FruitsTop({
  searching,
  query,
  onQueryChange,
  onOpenSearch,
  onCloseSearch,
}: {
  searching: boolean;
  query: string;
  onQueryChange: (query: string) => void;
  onOpenSearch: () => void;
  onCloseSearch: () => void;
}) {
  const styles = useStyles();
  const colors = useColors();
  if (searching)
    return (
      <View style={styles.row}>
        <TextInput
          value={query}
          onChangeText={onQueryChange}
          placeholder="제목이나 작가로 찾기"
          placeholderTextColor={colors.muted}
          accessibilityLabel="열매 찾기"
          autoFocus
          autoCorrect={false}
          // 서버도 검색어를 50자까지만 쓴다(SEARCH_QUERY_MAX).
          maxLength={50}
          returnKeyType="search"
          clearButtonMode="while-editing"
          style={styles.input}
        />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="찾기 닫기"
          onPress={onCloseSearch}
          style={styles.cancel}
        >
          <Text style={styles.cancelText}>취소</Text>
        </Pressable>
      </View>
    );
  return (
    <View style={styles.row}>
      <Text style={styles.title} accessibilityRole="header">
        열매
      </Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="열매 찾기"
        onPress={onOpenSearch}
        style={styles.searchButton}
      >
        <Search size={24} strokeWidth={2.2} color={colors.ink} />
      </Pressable>
    </View>
  );
}

const useStyles = themedStyles((colors) => ({
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    minHeight: 48,
    gap: 12,
  },
  title: {
    fontSize: 30,
    fontWeight: "800",
    letterSpacing: -0.8,
    color: colors.ink,
  },
  // 아이콘은 24지만 누르는 칸은 48로 잡고, 아이콘 오른쪽 끝을 목록 글자의 오른쪽 여백에 맞춘다.
  searchButton: {
    width: 48,
    height: 48,
    marginRight: -12,
    alignItems: "center",
    justifyContent: "center",
  },
  // 둥근 상자 대신 굵은 밑줄 하나
  input: {
    flex: 1,
    height: 48,
    fontSize: 16,
    color: colors.ink,
    borderBottomWidth: 2,
    borderColor: colors.ink,
    paddingVertical: 0,
  },
  cancel: {
    height: 48,
    minWidth: 48,
    alignItems: "center",
    justifyContent: "center",
  },
  cancelText: { fontSize: 16, color: colors.ink },
}));
