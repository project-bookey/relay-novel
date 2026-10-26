import { View } from "react-native";
import { ICON_LINE_PX } from "../../theme";
import { themedStyles } from "../../theme/themed";
import { FruitsIcon } from "../BarIcons";
import { TOP_ROW_HEIGHT } from "./fruitsLayout";

// 제목은 글자 대신 아래 바의 열매 탭과 같은 열매 아이콘이다(사용자 요청).
// 검색 아이콘(24)보다 크게 두어 제목으로 읽히게 한다.
const TITLE_ICON_SIZE = 32;
// 아이콘 그림은 24칸이라, 화면에서 ICON_LINE_PX 굵기로 보이도록 크기에 맞춰 환산한다.
const TITLE_ICON_STROKE = (ICON_LINE_PX * 24) / TITLE_ICON_SIZE;

// 열매 탭 맨 위 줄. 목록과 함께 올라간다. 오른쪽의 검색 동그라미는 이 줄에 있지 않고 따로 떠 있다(FloatingSearch).
export function FruitsTop() {
  const styles = useStyles();
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
    </View>
  );
}

const useStyles = themedStyles(() => ({
  row: {
    flexDirection: "row",
    alignItems: "center",
    minHeight: TOP_ROW_HEIGHT,
  },
  // 그림 칸 안쪽 여백만큼 당겨 그림 왼쪽 끝을 목록의 왼쪽 끝(표지)에 맞춘다.
  titleIcon: { marginLeft: -3 },
}));
