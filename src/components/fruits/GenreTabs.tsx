import { Pressable, ScrollView, View } from "react-native";
import { Text } from "../text";
import { themedStyles } from "../../theme/themed";

// 검색 유리막의 장르 글자 탭(열매 서가는 유리 장르 바 GenreBar). 장르는 하나만 고르고(toggleGenre),
// 고르지 않으면 "전체"가 켜진다. 고른 탭은 굵은 글자 + 글자 폭만큼의 노란 굵은 밑줄
// (색만으로 구분하지 않음, 시안 fruits-anew A "서가"). 탭 줄 아래에 가는 선은 긋지 않는다.
export function GenreTabs({
  genres,
  selected,
  onToggle,
  onClear,
}: {
  genres: string[];
  selected: string[];
  onToggle: (genre: string) => void;
  onClear: () => void;
}) {
  const styles = useStyles();
  const tab = (
    key: string,
    label: string,
    isSelected: boolean,
    onPress: () => void,
  ) => (
    <Pressable
      key={key}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected: isSelected }}
      onPress={onPress}
      style={styles.tab}
    >
      <View>
        {isSelected && <View style={styles.mark} />}
        <Text style={[styles.label, isSelected && styles.selectedLabel]}>
          {label}
        </Text>
      </View>
    </Pressable>
  );
  return (
    <View style={styles.bar}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.scroller}
        contentContainerStyle={styles.tabs}
      >
        {tab("all", "전체", selected.length === 0, onClear)}
        {genres.map((genre) =>
          tab(genre, genre, selected.includes(genre), () => onToggle(genre)),
        )}
      </ScrollView>
    </View>
  );
}

const useStyles = themedStyles((colors) => ({
  // 화면 오른쪽 끝까지 이어지도록 바깥 여백(24)만큼 넓힌다.
  bar: {
    // 세로로 쌓인 화면에서 아래 목록에 밀려 줄어들면 노란 밑줄과 글자 아래가 잘린다.
    flexGrow: 0,
    flexShrink: 0,
    marginTop: 8,
    marginRight: -24,
  },
  scroller: { flexGrow: 0 },
  // 유리막 위라 끝 흐림 없이 화면 끝에서 잘리고, 마지막 탭 뒤로는 옆 여백만큼 띄운다.
  tabs: { gap: 20, paddingRight: 24 },
  // "SF"처럼 짧은 장르도 누르는 너비가 44가 되게 한다.
  tab: {
    // 예전 탭 줄(44 + 밑선 1)과 같은 높이라, 맨 위에 붙는 머리와 유리 높이가 그대로다.
    minHeight: 45,
    minWidth: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  // 글자 바로 아래(2만큼 띄워) 글자 폭만큼 긋는 굵은 밑줄
  mark: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: -7,
    height: 5,
    backgroundColor: colors.tabMark,
  },
  label: { fontSize: 16, color: colors.muted },
  selectedLabel: { color: colors.ink, fontWeight: "800" },
}));
