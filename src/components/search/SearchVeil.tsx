import { useCallback, useEffect, useRef, useState } from "react";
import {
  AccessibilityInfo,
  Animated,
  BackHandler,
  Easing,
  Platform,
  StyleSheet,
  View,
  type ViewStyle,
} from "react-native";
import { useFocusEffect } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { NovelStatus } from "../../api/types";
import { searchableQuery, toggleGenre } from "../../design/fruitList";
import { useRecentSearches } from "../../state/recentSearches";
import { useSession } from "../../state/session";
import { themedStyles, useColors } from "../../theme/themed";
import { GlassSurface } from "../Glass";
import { GenreTabsFromServer } from "../fruits/GenreTabsFromServer";
import { LIST_SIDE, LIST_TOP } from "../fruits/fruitsLayout";
import { StatusTabs } from "../fruits/StatusTabs";
import { SearchField } from "./SearchField";
import { DemoSearchResults, ServerSearchResults } from "./SearchResults";
import { SearchStart } from "./SearchStart";

// 칠 때마다 아래 결과가 바로 바뀌게 하되, 손가락이 이만큼 멈출 때까지는 기다려 서버에 너무 자주 묻지 않는다.
const SEARCH_DELAY_MS = 200;
const OPEN_MS = 300;
const CLOSE_MS = 220;
// 막 위의 순위·결과는 유리가 어느 정도 깔린 뒤에 떠오른다.
const CONTENT_FROM = 0.35;

// 열매 서가 위로 덮이는 검색 유리막(2026-10-23 사용자 결정, 시안 reference/sian/search-veil A "옅은 막").
// 뒤의 서가가 흐릿하게 비치고, 그 위에 검색칸·최근 찾은 말·이번 주 순위가 뜬다. 말을 치면 순위 자리가
// 장르·상태로 거르는 결과 목록으로 바뀐다. 열 때 막이 서서히 깔리며 돋보기 자리에서 검색칸이 펼쳐지고,
// 닫을 때는 거꾸로 접힌 뒤 사라진다. 동작 줄이기면 움직임 없이 바로 바뀐다.
export function SearchVeil({ onClose }: { onClose: () => void }) {
  const styles = useStyles();
  const insets = useSafeAreaInsets();
  const { mode } = useSession();
  const isDemo = mode === "demo";
  const recent = useRecentSearches(mode);
  const [typed, setTyped] = useState("");
  const query = useSettled(searchableQuery(typed), SEARCH_DELAY_MS);
  const [genres, setGenres] = useState<string[]>([]);
  const [status, setStatus] = useState<NovelStatus>();
  const openness = useOpenOnMount();

  const close = useCallback(() => {
    void AccessibilityInfo.isReduceMotionEnabled().then((reduced) => {
      if (reduced) return onClose();
      Animated.timing(openness, {
        toValue: 0,
        duration: CLOSE_MS,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: false,
      }).start(() => onClose());
    });
  }, [onClose, openness]);
  useCloseOnBack(close);

  const tabs = (
    <GenreTabsFromServer
      isDemo={isDemo}
      selected={genres}
      onToggle={(genre) => setGenres((now) => toggleGenre(now, genre))}
      onClear={() => setGenres([])}
    />
  );
  const resultsProps = {
    filter: { genres, status, query },
    stickyHead: (
      <>
        {tabs}
        <StatusTabs status={status} onChange={setStatus} />
      </>
    ),
    onOpenResult: () => recent.remember(query),
  };
  let body;
  if (query === "")
    body = (
      <SearchStart
        tabs={tabs}
        genres={genres}
        recent={{
          words: recent.words,
          // 최근 찾은 말을 누르면 그 말로 찾는다.
          onPick: (word) => {
            setTyped(word);
            recent.remember(word);
          },
          onForget: recent.forget,
          onClear: recent.clear,
        }}
      />
    );
  else if (isDemo) body = <DemoSearchResults {...resultsProps} />;
  else body = <ServerSearchResults {...resultsProps} />;

  const contentStyle = {
    opacity: openness.interpolate({
      inputRange: [0, CONTENT_FROM, 1],
      outputRange: [0, 0, 1],
    }),
    transform: [
      {
        translateY: openness.interpolate({
          inputRange: [0, 1],
          outputRange: [8, 0],
        }),
      },
    ],
  };
  return (
    <View accessibilityViewIsModal style={styles.veil}>
      <VeilGlass openness={openness} />
      <View style={[styles.frame, { paddingTop: insets.top }]}>
        <View style={styles.fieldRow}>
          <SearchField
            openness={openness}
            query={typed}
            onQueryChange={setTyped}
            onSubmit={() => recent.remember(searchableQuery(typed))}
            onCancel={close}
          />
        </View>
        <Animated.View style={[styles.body, contentStyle]}>
          {body}
        </Animated.View>
      </View>
    </View>
  );
}

// 유리막 바탕. 웹은 흐림(0 → 16px)과 채도(100% → 180%)를 직접 키우고 옅은 바탕색을 따로 짙게 해서
// 유리가 서서히 깔린다. 흐림을 감싼 상자의 투명도를 움직이면 브라우저가 그동안 흐림을 그리지 않다가
// 마지막에 툭 켜기 때문이다. 앱은 시스템 유리(iOS 26)나 불투명한 바탕(GlassSurface)이 서서히 나타난다.
function VeilGlass({ openness }: { openness: Animated.Value }) {
  const colors = useColors();
  if (Platform.OS !== "web")
    return (
      <Animated.View style={[StyleSheet.absoluteFill, { opacity: openness }]}>
        <GlassSurface
          bare
          interactive={false}
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>
    );
  // React Native 스타일 타입에는 없는 웹 전용 속성이라 타입을 맞춘다(Glass.tsx의 webGlass와 같은 값까지).
  const blur = {
    backdropFilter: openness.interpolate({
      inputRange: [0, 1],
      outputRange: ["blur(0px) saturate(100%)", "blur(16px) saturate(180%)"],
    }),
  } as unknown as ViewStyle;
  return (
    <>
      <Animated.View style={[StyleSheet.absoluteFill, blur]} />
      <Animated.View
        style={[
          StyleSheet.absoluteFill,
          { backgroundColor: colors.glassTint, opacity: openness },
        ]}
      />
    </>
  );
}

// 0 = 닫힘, 1 = 열림. 처음 그려질 때 한 번 연다. 검색칸 너비가 같이 움직여 네이티브 드라이버를 쓰지 않는다.
function useOpenOnMount() {
  const openness = useRef(new Animated.Value(0)).current;
  useEffect(() => {
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
  }, [openness]);
  return openness;
}

// 유리막이 열려 있을 때 안드로이드 뒤로 버튼을 누르면 화면을 떠나지 않고 유리막만 닫는다.
// 탭 화면은 다른 곳으로 옮겨도 남아 있으므로, 열매 탭이 보이는 동안에만 뒤로 버튼을 가로챈다.
function useCloseOnBack(close: () => void) {
  useFocusEffect(
    useCallback(() => {
      const subscription = BackHandler.addEventListener(
        "hardwareBackPress",
        () => {
          close();
          return true;
        },
      );
      return () => subscription.remove();
    }, [close]),
  );
}

// 값이 delay 동안 바뀌지 않으면 그 값을 돌려준다.
function useSettled(value: string, delay: number) {
  const [settled, setSettled] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setSettled(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return settled;
}

const useStyles = themedStyles(() => ({
  // 열매 서가 화면 전체(상태 표시줄 자리까지)를 덮는다. 아래 바는 그 위에 그대로 있다.
  veil: { ...StyleSheet.absoluteFill },
  frame: { flex: 1, width: "100%", maxWidth: 680, alignSelf: "center" },
  // 열매 탭 맨 위 줄과 같은 높이·여백에 검색칸이 와서 떠 있는 검색 동그라미 자리에서 펼쳐진다.
  fieldRow: { paddingTop: LIST_TOP, paddingHorizontal: LIST_SIDE },
  body: { flex: 1 },
}));
