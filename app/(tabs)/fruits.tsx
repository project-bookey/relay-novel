import { useRef, useState } from "react";
import { Animated, View } from "react-native";
import { Redirect } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useSession } from "../../src/state/session";
import { toggleGenre } from "../../src/design/fruitList";
import { FOR_ME_ROTATING } from "../../src/design/fruitSections";
import { FruitsTop } from "../../src/components/fruits/FruitsTop";
import { FloatingSearch } from "../../src/components/fruits/FloatingSearch";
import { FruitsBackdrop } from "../../src/components/fruits/FruitsBackdrop";
import { GenreTabsFromServer } from "../../src/components/fruits/GenreTabsFromServer";
import { BottomFade } from "../../src/components/fruits/BottomFade";
import {
  DemoFruitList,
  ServerFruitList,
} from "../../src/components/fruits/FruitLists";
import { ForMeSection, useForMe } from "../../src/components/fruits/ForMe";
import {
  LIST_SIDE,
  SEARCH_TOP,
} from "../../src/components/fruits/fruitsLayout";
import { SectionHead } from "../../src/components/search/SectionHead";
import { SearchVeil } from "../../src/components/search/SearchVeil";
import { Loading, Screen } from "../../src/components/ui";
import { themedStyles } from "../../src/theme/themed";

// 맨 위를 물들이는 작품 색 빛의 높이(상태 표시줄 아래부터)
const BACKDROP_HEIGHT = 420;

// 열매 탭(사용자가 고른 시안 reference/sian/fruits-glass-b2, 마이의 유리 명함 말투).
// 맨 위 작품 색 빛 위에 나를 위한 이야기(큰 이름 + 반투명 상자: 6초마다 넘어가는 큰 유리 추천 카드와 나머지 표지 줄)
// → 모든 이야기(유리 장르 바 + 세 칸 표지 서가). 장르 바는 내렸다가 위로 올리면 맨 위에 다시 나타나고,
// 검색 유리 동그라미는 오른쪽 위에 계속 떠 있어 누르면 서가 위로 검색 유리막이 덮인다
// (2026-10-23 사용자 결정 — 찾기는 서가와 따로 유리막에서).
// 맨 위 빛이 상태 표시줄 뒤까지 닿도록 빛은 화면 맨 위에 깔고, 목록은 상태 표시줄 아래에서 시작한다.
export default function FruitsPage() {
  const styles = useStyles();
  const insets = useSafeAreaInsets();
  const { mode } = useSession();
  const [genres, setGenres] = useState<string[]>([]);
  const [searchOpen, setSearchOpen] = useState(false);
  const [shown, setShown] = useState(0);
  // 나를 위한 이야기를 다 지나 내려와 있는 동안에는 큰 추천 카드를 넘기지 않는다(보이지 않는 카드로 화면을 다시 그리지 않게).
  const [pastForMe, setPastForMe] = useState(false);
  const scrollY = useRef(new Animated.Value(0)).current;
  const forMe = useForMe();
  const isDemo = mode === "demo";

  if (mode === "loading")
    return (
      <Screen>
        <Loading />
      </Screen>
    );
  if (mode === "guest") return <Redirect href="/login" />;

  // 추천 작품이 바뀌어 줄었으면 첫 작품부터 보인다.
  const featuredCount = Math.min(forMe.stories.length, FOR_ME_ROTATING);
  const shownIndex = shown < featuredCount ? shown : 0;
  const listProps = {
    filter: { genres, query: "" },
    scrollY,
    onPastHead: setPastForMe,
    head: (
      <>
        <FruitsTop />
        <ForMeSection
          choice={forMe}
          shown={shownIndex}
          onShow={setShown}
          paused={searchOpen || pastForMe}
        />
        <View style={styles.allHead}>
          <SectionHead large title="모든 이야기" />
        </View>
      </>
    ),
    genreBar: (
      <GenreTabsFromServer
        look="bar"
        isDemo={isDemo}
        selected={genres}
        onToggle={(genre) => setGenres((now) => toggleGenre(now, genre))}
        onClear={() => setGenres([])}
      />
    ),
  };
  return (
    <View style={styles.page}>
      <FruitsBackdrop
        stories={forMe.stories}
        shown={shownIndex}
        height={insets.top + BACKDROP_HEIGHT}
        scrollY={scrollY}
      />
      {/* 검색 유리막이 덮여 있는 동안 뒤의 서가는 화면 읽기에서 숨긴다(유리막만 읽힌다). */}
      <View
        style={[styles.frame, { paddingTop: insets.top }]}
        aria-hidden={searchOpen}
        importantForAccessibility={searchOpen ? "no-hide-descendants" : "auto"}
      >
        {/* 목록 위에 떠 있지만 화면 읽기 순서는 목록보다 먼저다. */}
        <View style={[styles.searchSpot, { top: insets.top + SEARCH_TOP }]}>
          <FloatingSearch onPress={() => setSearchOpen(true)} />
        </View>
        {isDemo ? (
          <DemoFruitList {...listProps} />
        ) : (
          <ServerFruitList {...listProps} />
        )}
      </View>
      {/* 찾는 중에는 키보드가 아래 바를 덮으므로 흐림도 둘 까닭이 없다. */}
      {!searchOpen && <BottomFade />}
      {searchOpen && <SearchVeil onClose={() => setSearchOpen(false)} />}
    </View>
  );
}

const useStyles = themedStyles((colors) => ({
  // 아래 흐림과 검색 유리막이 화면 끝(아래 여백까지)에 닿도록 화면 밖 틀에 겹쳐 둔다.
  page: { flex: 1, backgroundColor: colors.background },
  allHead: { marginTop: 26 },
  // 좌우·위 여백은 목록이 갖는다.
  frame: {
    flex: 1,
    width: "100%",
    maxWidth: 680,
    alignSelf: "center",
  },
  searchSpot: { position: "absolute", right: LIST_SIDE, zIndex: 1 },
}));
