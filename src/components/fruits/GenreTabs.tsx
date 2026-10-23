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
// 고른 탭은 굵은 글자 + 글자 폭만큼의 노란 굵은 밑줄(색만으로 구분하지 않음, 시안 fruits-anew A "서가").
// 탭 줄 아래에 가는 선은 긋지 않는다. 세 개가 차면 남은 탭은 흐려지고 눌러도 바뀌지 않는다
// (안내 문구는 사용자가 빼서 두지 않는다).
export function GenreTabs({
  genres,
  selected,
  onToggle,
  onClear,
  onGlass = false,
}: {
  genres: string[];
  selected: string[];
  onToggle: (genre: string) => void;
  onClear: () => void;
  // 검색 유리막 위에서는 바탕색으로 칠하는 끝 흐림이 네모 띠로 드러나서 두지 않는다(탭은 화면 끝에서 잘린다).
  onGlass?: boolean;
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
      style={[styles.tab, isDisabled && styles.disabledTab]}
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
      {!onGlass && <EdgeFade />}
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
    // 세로로 쌓인 화면에서 아래 목록에 밀려 줄어들면 노란 밑줄과 글자 아래가 잘린다.
    flexGrow: 0,
    flexShrink: 0,
    marginTop: 8,
    marginRight: -24,
  },
  scroller: { flexGrow: 0 },
  tabs: { gap: 20, paddingRight: EDGE_FADE_WIDTH },
  // 손가락은 흐림 아래 탭에 그대로 닿는다.
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
    // 예전 탭 줄(44 + 밑선 1)과 같은 높이라, 맨 위에 붙는 머리와 유리 높이가 그대로다.
    minHeight: 45,
    minWidth: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  disabledTab: { opacity: 0.4 },
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
