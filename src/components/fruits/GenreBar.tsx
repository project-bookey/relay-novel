import { useState } from "react";
import {
  Animated,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
  type LayoutChangeEvent,
} from "react-native";
import { Text } from "../text";
import { themedStyles } from "../../theme/themed";
import { GlassSurface } from "../Glass";
import { useLiquidLens } from "../liquidLens";
import { GENRE_BAR_HEIGHT } from "./fruitsLayout";

// 바 안쪽 여백. 장르 칸은 남은 높이(44)를 다 누르는 칸으로 쓰고, 고른 장르의 방울은 위아래로 조금 줄여 그린다.
const BAR_PADDING = 3;
const CHIP_HEIGHT = GENRE_BAR_HEIGHT - BAR_PADDING * 2;
const LENS_INSET = 2;
// 사용자 요청 "조금 더 네모나게" — 검색칸(14)과 같은 정도로 둥근 바, 그 안의 방울은 한 단계 덜 둥글게.
const BAR_RADIUS = 14;
const LENS_RADIUS = 10;
const ALL_KEY = "all";

// 열매 탭 모든 이야기의 장르 바(시안 reference/sian/fruits-glass-b2). 유리 바 안에서 장르를 옆으로 넘겨 보고,
// 고른 장르에는 아래 바 '지금 있는 곳'과 같은 유리 방울이 깔리고 글자가 굵어진다(색만으로 구분하지 않음).
// 장르는 하나만 고르고(toggleGenre), 고르지 않으면 "전체"가 켜진다. 다른 장르를 고르면 방울이 아래 바처럼
// 물방울같이 늘어나며 그 장르로 옮겨 간다(사용자 요청 "하단 탭처럼 자연스럽게").
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
  const chipSpots = useChipSpots();
  const pickedKey = selected[0] ?? ALL_KEY;
  const pickedSpot = chipSpots.spots[pickedKey];
  const lens = useLiquidLens(pickedSpot && { key: pickedKey, ...pickedSpot });
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
      onLayout={chipSpots.measure(key)}
      style={styles.chip}
    >
      {/* 굵은 글자 폭만큼 칸을 미리 잡아 둔다. 고르면서 글자가 굵어져도 칸 너비가 그대로라 옆 장르가 밀리지 않는다. */}
      <View>
        <Text
          aria-hidden
          style={[styles.label, styles.selectedLabel, styles.widthKeeper]}
        >
          {label}
        </Text>
        <Text
          style={[
            styles.label,
            styles.shownLabel,
            isSelected && styles.selectedLabel,
          ]}
        >
          {label}
        </Text>
      </View>
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
          {/* 칸 자리를 재기 전에는 방울을 그리지 않는다(굵은 글자만으로도 고른 장르가 보인다). */}
          {!!pickedSpot && <Animated.View style={[styles.lens, lens]} />}
          {chip(ALL_KEY, "전체", selected.length === 0, onClear)}
          {genres.map((genre) =>
            chip(genre, genre, selected.includes(genre), () => onToggle(genre)),
          )}
        </ScrollView>
      </View>
    </View>
  );
}

// 장르 칸마다 바 안에서의 왼쪽·오른쪽 끝. 유리 방울을 고른 칸으로 옮길 때 쓴다.
function useChipSpots() {
  // 아직 재지 않은 칸은 없다.
  const [spots, setSpots] = useState<
    Partial<Record<string, { left: number; right: number }>>
  >({});
  const measure = (key: string) => (event: LayoutChangeEvent) => {
    const { x, width } = event.nativeEvent.layout;
    setSpots((now) => {
      const known = now[key];
      if (known?.left === x && known.right === x + width) return now;
      return { ...now, [key]: { left: x, right: x + width } };
    });
  };
  return { spots, measure };
}

const useStyles = themedStyles((colors) => ({
  // 세로로 쌓인 화면에서 아래 목록에 밀려 줄어들지 않게 한다.
  bar: { height: GENRE_BAR_HEIGHT, flexShrink: 0 },
  corner: { borderRadius: BAR_RADIUS },
  clip: { flex: 1, overflow: "hidden" },
  chips: { padding: BAR_PADDING, gap: 2 },
  // "SF"처럼 짧은 장르도 누르는 칸이 44 이상이 되게 한다.
  chip: {
    height: CHIP_HEIGHT,
    minWidth: 44,
    paddingHorizontal: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  // 왼쪽 자리와 너비는 useLiquidLens가 움직인다.
  lens: {
    position: "absolute",
    top: BAR_PADDING + LENS_INSET,
    height: CHIP_HEIGHT - LENS_INSET * 2,
    borderRadius: LENS_RADIUS,
    backgroundColor: colors.lensFill,
    borderWidth: 1,
    borderColor: colors.lensEdge,
    boxShadow: colors.lensShadow,
  },
  label: { fontSize: 14.5, color: colors.muted },
  selectedLabel: { color: colors.ink, fontWeight: "800" },
  widthKeeper: { opacity: 0 },
  // 숨긴 굵은 글자와 같은 자리에 겹치되, 기기마다 글자 폭 반올림이 달라도 긴 장르가 다음 줄로 넘어가지 않게 양옆을 조금 넓힌다.
  shownLabel: {
    position: "absolute",
    top: 0,
    bottom: 0,
    left: -6,
    right: -6,
    textAlign: "center",
  },
}));
