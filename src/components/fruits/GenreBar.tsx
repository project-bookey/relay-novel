import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import { Text } from "../text";
import { themedStyles } from "../../theme/themed";
import { GlassSurface } from "../Glass";
import { GENRE_BAR_HEIGHT } from "./fruitsLayout";

// 바 안쪽 여백. 장르 칸은 남은 높이(44)를 다 누르는 칸으로 쓰고, 고른 장르의 방울은 위아래로 조금 줄여 그린다.
const BAR_PADDING = 3;
const LENS_INSET = 2;
// 사용자 요청 "조금 더 네모나게" — 검색칸(14)과 같은 정도로 둥근 바, 그 안의 방울은 한 단계 덜 둥글게.
const BAR_RADIUS = 14;
const LENS_RADIUS = 10;

// 열매 탭 모든 이야기의 장르 바(시안 reference/sian/fruits-glass-b2). 유리 바 안에서 장르를 옆으로 넘겨 보고,
// 고른 장르에는 아래 바 '지금 있는 곳'과 같은 유리 방울이 깔리고 글자가 굵어진다(색만으로 구분하지 않음).
// 장르는 하나만 고르고(toggleGenre), 고르지 않으면 "전체"가 켜진다.
export function GenreBar({
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
  const chip = (
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
      style={styles.chip}
    >
      {isSelected && <View style={styles.lens} />}
      <Text style={[styles.label, isSelected && styles.selectedLabel]}>
        {label}
      </Text>
    </Pressable>
  );
  return (
    <View style={styles.bar}>
      <GlassSurface
        interactive={false}
        style={[StyleSheet.absoluteFill, styles.corner]}
      />
      {/* 옆으로 넘기는 장르가 둥근 모서리 밖으로 나오지 않게 안쪽만 자른다(바깥 그림자는 그대로). */}
      <View style={[styles.clip, styles.corner]}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chips}
        >
          {chip("all", "전체", selected.length === 0, onClear)}
          {genres.map((genre) =>
            chip(genre, genre, selected.includes(genre), () => onToggle(genre)),
          )}
        </ScrollView>
      </View>
    </View>
  );
}

const useStyles = themedStyles((colors) => ({
  // 세로로 쌓인 화면에서 아래 목록에 밀려 줄어들지 않게 한다.
  bar: { height: GENRE_BAR_HEIGHT, flexShrink: 0 },
  corner: { borderRadius: BAR_RADIUS },
  clip: { flex: 1, overflow: "hidden" },
  chips: { padding: BAR_PADDING, gap: 2 },
  // "SF"처럼 짧은 장르도 누르는 칸이 44 이상이 되게 한다.
  chip: {
    height: GENRE_BAR_HEIGHT - BAR_PADDING * 2,
    minWidth: 44,
    paddingHorizontal: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  lens: {
    position: "absolute",
    left: 0,
    right: 0,
    top: LENS_INSET,
    bottom: LENS_INSET,
    borderRadius: LENS_RADIUS,
    backgroundColor: colors.lensFill,
    borderWidth: 1,
    borderColor: colors.lensEdge,
    boxShadow: colors.lensShadow,
  },
  label: { fontSize: 14.5, color: colors.muted },
  selectedLabel: { color: colors.ink, fontWeight: "800" },
}));
