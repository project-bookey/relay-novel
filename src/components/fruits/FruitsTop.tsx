import { Pressable, View } from "react-native";
import { Text, TextInput } from "../text";
import { Search } from "lucide-react-native";
import { ICON_LINE_PX } from "../../theme";
import { themedStyles, useColors } from "../../theme/themed";
import { FruitsIcon } from "../BarIcons";

// 제목은 글자 대신 아래 바의 열매 탭과 같은 열매 아이콘이다(사용자 요청).
// 검색 아이콘(24)보다 크게 두어 제목으로 읽히게 한다.
const TITLE_ICON_SIZE = 32;
// 아이콘 그림은 24칸이라, 화면에서 ICON_LINE_PX 굵기로 보이도록 크기에 맞춰 환산한다.
const TITLE_ICON_STROKE = (ICON_LINE_PX * 24) / TITLE_ICON_SIZE;

// 열매 탭 맨 위. 평소에는 열매 아이콘 제목 오른쪽에 검색 아이콘만 두고,
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
      <View
        accessible
        accessibilityRole="header"
        accessibilityLabel="열매"
        style={styles.titleIcon}
      >
        <FruitsIcon size={TITLE_ICON_SIZE} strokeWidth={TITLE_ICON_STROKE} />
      </View>
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
  // 그림 칸 안쪽 여백만큼 당겨 그림 왼쪽 끝을 목록의 왼쪽 끝(표지)에 맞춘다.
  titleIcon: { marginLeft: -3 },
  // 아이콘은 24지만 누르는 칸은 48로 잡고, 아이콘 오른쪽 끝을 목록 글자의 오른쪽 여백에 맞춘다.
  searchButton: {
    width: 48,
    height: 48,
    marginRight: -12,
    alignItems: "center",
    justifyContent: "center",
  },
  // 둥근 상자 대신 굵은 밑줄 하나. 웹에서 누르면 브라우저가 둘레에 둥근 테두리를 그리는데, 밑줄로 충분해 지운다.
  input: {
    flex: 1,
    height: 48,
    fontSize: 16,
    color: colors.ink,
    borderBottomWidth: 2,
    borderColor: colors.ink,
    paddingVertical: 0,
    outlineWidth: 0,
  },
  cancel: {
    height: 48,
    minWidth: 48,
    alignItems: "center",
    justifyContent: "center",
  },
  cancelText: { fontSize: 16, color: colors.ink },
}));
