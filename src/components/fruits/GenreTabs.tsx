import { useId } from "react";
import { Pressable, ScrollView, View } from "react-native";
import Svg, { Defs, LinearGradient, Rect, Stop } from "react-native-svg";
import { Text } from "../text";
import { FILTER_GENRES_MAX } from "../../design/fruitList";
import { themedStyles, useColors } from "../../theme/themed";

// 오른쪽 끝에서 탭이 바탕으로 흐려지는 너비(시안 3번 "빛과 깊이": 옆으로 더 있다는 신호).
// 마지막 탭도 흐림 밖으로 밀어 볼 수 있게 탭 줄 끝을 그만큼 띄운다.
const EDGE_FADE_WIDTH = 72;

// 장르 글자 탭. 세 개까지 함께 고르고, 하나도 고르지 않으면 "전체"가 켜진다.
// 고른 탭은 굵은 글자 + 밑줄(색만으로 구분하지 않음). 세 개가 차면 남은 탭은 흐려지고 눌러도 바뀌지 않는다
// (안내 문구는 사용자가 빼서 두지 않는다).
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
  const full = selected.length >= FILTER_GENRES_MAX;
  const tab = (
    key: string,
    label: string,
    isSelected: boolean,
    onPress: () => void,
    isDisabled = false,
  ) => (
    <Pressable
      key={key}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected: isSelected, disabled: isDisabled }}
      accessibilityHint={
        isDisabled
          ? `장르는 ${FILTER_GENRES_MAX}개까지 고를 수 있어요`
          : undefined
      }
      onPress={onPress}
      style={[
        styles.tab,
        isSelected && styles.selectedTab,
        isDisabled && styles.disabledTab,
      ]}
    >
      <Text style={[styles.label, isSelected && styles.selectedLabel]}>
        {label}
      </Text>
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
        {genres.map((genre) => {
          const isSelected = selected.includes(genre);
          return tab(
            genre,
            genre,
            isSelected,
            () => onToggle(genre),
            full && !isSelected,
          );
        })}
      </ScrollView>
      <EdgeFade />
    </View>
  );
}

function EdgeFade() {
  const styles = useStyles();
  const colors = useColors();
  const gradientId = `tab-fade-${useId().replace(/[^\w-]/g, "")}`;
  return (
    <View style={styles.edgeFade}>
      <Svg width="100%" height="100%">
        <Defs>
          <LinearGradient id={gradientId} x1="0" y1="0" x2="1" y2="0">
            <Stop offset="0" stopColor={colors.background} stopOpacity={0} />
            <Stop offset="1" stopColor={colors.background} />
          </LinearGradient>
        </Defs>
        <Rect width="100%" height="100%" fill={`url(#${gradientId})`} />
      </Svg>
    </View>
  );
}

const useStyles = themedStyles((colors) => ({
  // 화면 오른쪽 끝까지 이어지도록 바깥 여백(24)만큼 넓힌다.
  bar: {
    // 세로로 쌓인 화면에서 아래 목록에 밀려 줄어들면 밑줄이 글자를 가로지른다.
    flexGrow: 0,
    flexShrink: 0,
    marginTop: 8,
    marginRight: -24,
    borderBottomWidth: 1,
    borderColor: colors.line,
  },
  scroller: { flexGrow: 0 },
  tabs: { gap: 20, paddingRight: EDGE_FADE_WIDTH },
  // 흐림은 밑줄 위에서 끝나 줄은 끝까지 이어진다. 손가락은 아래 탭에 그대로 닿는다.
  edgeFade: {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    width: EDGE_FADE_WIDTH,
    pointerEvents: "none",
  },
  // "SF"처럼 짧은 장르도 누르는 너비가 44가 되게 한다.
  tab: {
    minHeight: 44,
    minWidth: 44,
    alignItems: "center",
    justifyContent: "center",
    borderBottomWidth: 3,
    borderColor: "transparent",
  },
  selectedTab: { borderColor: colors.ink },
  disabledTab: { opacity: 0.4 },
  label: { fontSize: 16, color: colors.muted },
  selectedLabel: { color: colors.ink, fontWeight: "800" },
}));
