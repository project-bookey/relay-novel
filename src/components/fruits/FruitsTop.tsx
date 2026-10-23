import { Pressable, View } from "react-native";
import { Search } from "lucide-react-native";
import { ICON_LINE_PX } from "../../theme";
import { themedStyles, useColors } from "../../theme/themed";
import { FruitsIcon } from "../BarIcons";

// 제목은 글자 대신 아래 바의 열매 탭과 같은 열매 아이콘이다(사용자 요청).
// 검색 아이콘(24)보다 크게 두어 제목으로 읽히게 한다.
const TITLE_ICON_SIZE = 32;
// 아이콘 그림은 24칸이라, 화면에서 ICON_LINE_PX 굵기로 보이도록 크기에 맞춰 환산한다.
const TITLE_ICON_STROKE = (ICON_LINE_PX * 24) / TITLE_ICON_SIZE;

// 열매 탭 맨 위. 열매 아이콘 제목 오른쪽에 돋보기만 두고, 누르면 서가 위로 검색 유리막이 덮인다(SearchVeil).
export function FruitsTop({ onOpenSearch }: { onOpenSearch: () => void }) {
  const styles = useStyles();
  const colors = useColors();
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

const useStyles = themedStyles(() => ({
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    minHeight: 48,
  },
  // 그림 칸 안쪽 여백만큼 당겨 그림 왼쪽 끝을 목록의 왼쪽 끝(표지)에 맞춘다.
  titleIcon: { marginLeft: -3 },
  // 아이콘은 24지만 누르는 칸은 48로 잡고, 아이콘 오른쪽 끝을 목록 글자의 오른쪽 여백에 맞춘다.
  // 검색 유리막의 검색칸은 이 자리에서 펼쳐진다(SearchField의 CLOSED_RIGHT).
  searchButton: {
    width: 48,
    height: 48,
    marginRight: -12,
    alignItems: "center",
    justifyContent: "center",
  },
}));
