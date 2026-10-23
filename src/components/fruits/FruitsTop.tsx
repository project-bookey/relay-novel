import { useEffect, useRef, useState } from "react";
import {
  AccessibilityInfo,
  Animated,
  Easing,
  Platform,
  Pressable,
  View,
  type LayoutChangeEvent,
  type TextStyle,
} from "react-native";
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

// 닫힌 검색창은 돋보기 버튼(48칸)이다. 아이콘 오른쪽 끝을 목록 글자의 오른쪽 여백에 맞추려고 바깥으로 12 내민다.
const CLOSED_WIDTH = 48;
const CLOSED_RIGHT = -12;
// 펼친 검색창 오른쪽에 "취소"가 들어설 자리
const OPEN_RIGHT = 52;
// 펼친 칸 안에서 돋보기가 차지하는 너비(글자는 그 뒤에서 시작한다)
const OPEN_GLASS_WIDTH = 40;
// 펼친 칸 안의 돋보기는 24에서 18 크기로 줄어든다.
const OPEN_GLASS_SCALE = 18 / 24;
// 웹 브라우저는 누른 입력칸에 포커스 테두리를 그린다. 크롬은 outline-style이 auto면 굵기 0을 무시하므로
// 테두리 모양을 none으로 바꾼다. React Native 스타일 타입에는 none이 없어 웹에서만 넣는다.
const WEB_NO_FOCUS_RING = (
  Platform.OS === "web" ? { outlineStyle: "none" } : {}
) as TextStyle;
const OPEN_MS = 300;
const CLOSE_MS = 220;

// 열매 탭 맨 위. 평소에는 열매 아이콘 제목 오른쪽에 돋보기만 두고, 누르면 돋보기 자리에서 옅은 칸이
// 왼쪽으로 늘어나며 검색창이 펼쳐진다(사용자가 고른 시안 reference/sian/search-bar B "옅은 칸").
// 첫 화면과 찾기 목록은 서로 다른 화면이라, 찾는 쪽에서 새로 그려질 때 닫힌 모양에서 펼쳐 보이고
// "취소"는 접는 움직임을 마친 뒤 찾기를 닫는다. 동작 줄이기면 움직임 없이 바로 바뀐다.
export function FruitsTop({
  searching,
  query,
  onQueryChange,
  onSubmit,
  onOpenSearch,
  onCloseSearch,
}: {
  searching: boolean;
  query: string;
  onQueryChange: (query: string) => void;
  // 키보드의 찾기를 눌렀을 때(찾은 말을 최근 찾은 말에 남긴다).
  onSubmit: () => void;
  onOpenSearch: () => void;
  onCloseSearch: () => void;
}) {
  const styles = useStyles();
  const colors = useColors();
  const [rowWidth, setRowWidth] = useState(0);
  const openness = useOpenness(searching && rowWidth > 0);

  const closeSearch = () => {
    void AccessibilityInfo.isReduceMotionEnabled().then((reduced) => {
      if (reduced) return onCloseSearch();
      Animated.timing(openness, {
        toValue: 0,
        duration: CLOSE_MS,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: false,
      }).start(() => onCloseSearch());
    });
  };

  // 너비를 재기 전에는 닫힌 너비로 둔다.
  const openWidth = Math.max(CLOSED_WIDTH, rowWidth - OPEN_RIGHT);
  const barStyle = {
    width: openness.interpolate({
      inputRange: [0, 1],
      outputRange: [CLOSED_WIDTH, openWidth],
    }),
    right: openness.interpolate({
      inputRange: [0, 1],
      outputRange: [CLOSED_RIGHT, OPEN_RIGHT],
    }),
  };
  const glassBoxStyle = {
    width: openness.interpolate({
      inputRange: [0, 1],
      outputRange: [CLOSED_WIDTH, OPEN_GLASS_WIDTH],
    }),
  };
  const glassStyle = {
    transform: [
      {
        scale: openness.interpolate({
          inputRange: [0, 1],
          outputRange: [1, OPEN_GLASS_SCALE],
        }),
      },
    ],
  };
  // 칸이 반쯤 늘어난 뒤에야 글자가 보이고, "취소"는 오른쪽에서 들어온다.
  const fadeInLate = openness.interpolate({
    inputRange: [0, 0.4, 1],
    outputRange: [0, 0, 1],
  });
  const cancelStyle = {
    opacity: openness,
    transform: [
      {
        translateX: openness.interpolate({
          inputRange: [0, 1],
          outputRange: [14, 0],
        }),
      },
    ],
  };
  const titleStyle = {
    opacity: openness.interpolate({ inputRange: [0, 1], outputRange: [1, 0] }),
    transform: [
      {
        translateX: openness.interpolate({
          inputRange: [0, 1],
          outputRange: [0, -10],
        }),
      },
    ],
  };

  return (
    <View
      style={styles.row}
      onLayout={(event: LayoutChangeEvent) =>
        setRowWidth(event.nativeEvent.layout.width)
      }
    >
      <Animated.View
        accessible={!searching}
        accessibilityRole="header"
        accessibilityLabel="열매"
        importantForAccessibility={searching ? "no-hide-descendants" : "auto"}
        style={[styles.titleIcon, titleStyle]}
      >
        <FruitsIcon size={TITLE_ICON_SIZE} strokeWidth={TITLE_ICON_STROKE} />
      </Animated.View>

      <Animated.View style={[styles.bar, barStyle]}>
        <Animated.View
          style={[styles.fieldBackground, { opacity: openness }]}
        />
        {searching ? (
          <>
            <Animated.View style={[styles.glassBox, glassBoxStyle]}>
              <Animated.View style={glassStyle}>
                <Search size={24} strokeWidth={2.2} color={colors.muted} />
              </Animated.View>
            </Animated.View>
            <Animated.View style={[styles.inputBox, { opacity: fadeInLate }]}>
              <TextInput
                value={query}
                onChangeText={onQueryChange}
                onSubmitEditing={onSubmit}
                placeholder="제목이나 작가로 찾기"
                placeholderTextColor={colors.muted}
                accessibilityLabel="열매 찾기"
                autoFocus
                autoCorrect={false}
                // 서버도 검색어를 50자까지만 쓴다(SEARCH_QUERY_MAX).
                maxLength={50}
                returnKeyType="search"
                clearButtonMode="while-editing"
                style={[styles.input, WEB_NO_FOCUS_RING]}
              />
            </Animated.View>
          </>
        ) : (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="열매 찾기"
            onPress={onOpenSearch}
            style={styles.searchButton}
          >
            <Search size={24} strokeWidth={2.2} color={colors.ink} />
          </Pressable>
        )}
      </Animated.View>

      {searching && (
        <Animated.View style={[styles.cancel, cancelStyle]}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="찾기 닫기"
            onPress={closeSearch}
            style={styles.cancelButton}
          >
            <Text style={styles.cancelText}>취소</Text>
          </Pressable>
        </Animated.View>
      )}
    </View>
  );
}

// 0 = 닫힌 돋보기, 1 = 펼친 검색창. 펼칠 때가 되면(찾는 중이고 줄 너비를 잰 뒤) 한 번 펼친다.
// 너비가 움직이므로 네이티브 드라이버를 쓰지 않는다.
function useOpenness(shouldOpen: boolean) {
  const openness = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (!shouldOpen) return;
    let active = true;
    void AccessibilityInfo.isReduceMotionEnabled().then((reduced) => {
      if (!active) return;
      if (reduced) return openness.setValue(1);
      Animated.timing(openness, {
        toValue: 1,
        duration: OPEN_MS,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: false,
      }).start();
    });
    return () => {
      active = false;
    };
  }, [shouldOpen, openness]);
  return openness;
}

const useStyles = themedStyles((colors) => ({
  row: { minHeight: 48, justifyContent: "center" },
  // 그림 칸 안쪽 여백만큼 당겨 그림 왼쪽 끝을 목록의 왼쪽 끝(표지)에 맞춘다.
  titleIcon: { alignSelf: "flex-start", marginLeft: -3 },
  bar: {
    position: "absolute",
    top: 0,
    height: 48,
    flexDirection: "row",
    alignItems: "center",
  },
  // 선 없이 바탕만 살짝 다른 각진 칸. 위아래 2씩 줄여 44 높이로 보인다.
  fieldBackground: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 2,
    bottom: 2,
    borderRadius: 6,
    backgroundColor: colors.searchField,
  },
  glassBox: { height: 48, alignItems: "center", justifyContent: "center" },
  inputBox: { flex: 1 },
  // 칸 바탕이 이미 자리를 보여 주므로 포커스 테두리는 두지 않는다(WEB_NO_FOCUS_RING).
  input: {
    height: 48,
    fontSize: 16,
    color: colors.ink,
    paddingVertical: 0,
    paddingRight: 10,
    outlineWidth: 0,
  },
  searchButton: {
    width: CLOSED_WIDTH,
    height: 48,
    alignItems: "center",
    justifyContent: "center",
  },
  cancel: { position: "absolute", top: 0, right: -8 },
  cancelButton: {
    height: 48,
    minWidth: 48,
    alignItems: "center",
    justifyContent: "center",
  },
  cancelText: { fontSize: 16, color: colors.ink },
}));
