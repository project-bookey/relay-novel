import { useState } from "react";
import { View } from "react-native";
import { Redirect } from "expo-router";
import { useSession } from "../../src/state/session";
import { toggleGenre } from "../../src/design/fruitList";
import { FruitsTop } from "../../src/components/fruits/FruitsTop";
import { GenreTabsFromServer } from "../../src/components/fruits/GenreTabsFromServer";
import { BottomFade } from "../../src/components/fruits/BottomFade";
import {
  DemoFruitList,
  ServerFruitList,
} from "../../src/components/fruits/FruitLists";
import { MyNewsSection } from "../../src/components/fruits/MyNews";
import { ForMeSection } from "../../src/components/fruits/ForMe";
import { SectionHead } from "../../src/components/search/SectionHead";
import { SearchVeil } from "../../src/components/search/SearchVeil";
import { Loading, Screen } from "../../src/components/ui";
import { themedStyles } from "../../src/theme/themed";

// 열매 탭. 위에서부터 내 이야기 소식(마감이 가장 가까운 한 줄) → 나를 위한 이야기(관심 장르, 큰 칸 하나 + 두 칸)
// → 모든 이야기(표지 서가, 장르 세 개까지)로 나눈다(2026-10-23 사용자가 시안 reference/sian/fruits-redesign D를 고름).
// 돋보기를 누르면 서가 위로 검색 유리막이 덮인다(2026-10-23 사용자 결정 — 찾기는 서가와 따로 유리막에서).
export default function FruitsPage() {
  const styles = useStyles();
  const { mode } = useSession();
  const [genres, setGenres] = useState<string[]>([]);
  const [searchOpen, setSearchOpen] = useState(false);
  const isDemo = mode === "demo";

  if (mode === "loading")
    return (
      <Screen>
        <Loading />
      </Screen>
    );
  if (mode === "guest") return <Redirect href="/login" />;

  // 제목 줄과 위쪽 묶음은 서가와 함께 올라가고, 모든 이야기의 장르 탭만 맨 위에 붙는다(유리 머리, 사용자가 시안 C를 고름).
  const listProps = {
    filter: { genres, query: "" },
    head: (
      <>
        <FruitsTop onOpenSearch={() => setSearchOpen(true)} />
        <MyNewsSection />
        <ForMeSection />
        <View style={styles.allHead}>
          <SectionHead title="모든 이야기" />
        </View>
      </>
    ),
    stickyHead: (
      <GenreTabsFromServer
        isDemo={isDemo}
        selected={genres}
        onToggle={(genre) => setGenres((now) => toggleGenre(now, genre))}
        onClear={() => setGenres([])}
      />
    ),
  };
  return (
    <View style={styles.page}>
      <Screen scroll={false}>
        {/* 검색 유리막이 덮여 있는 동안 뒤의 서가는 화면 읽기에서 숨긴다(유리막만 읽힌다). */}
        <View
          style={styles.frame}
          aria-hidden={searchOpen}
          importantForAccessibility={
            searchOpen ? "no-hide-descendants" : "auto"
          }
        >
          {isDemo ? (
            <DemoFruitList {...listProps} />
          ) : (
            <ServerFruitList {...listProps} />
          )}
        </View>
      </Screen>
      {/* 찾는 중에는 키보드가 아래 바를 덮으므로 흐림도 둘 까닭이 없다. */}
      {!searchOpen && <BottomFade />}
      {searchOpen && <SearchVeil onClose={() => setSearchOpen(false)} />}
    </View>
  );
}

const useStyles = themedStyles(() => ({
  // 아래 흐림과 검색 유리막이 화면 끝(아래 여백까지)에 닿도록 화면 밖 틀에 겹쳐 둔다.
  page: { flex: 1 },
  allHead: { marginTop: 26 },
  // 좌우·위 여백은 목록이 갖는다(붙은 머리의 유리가 화면 끝까지 닿게).
  frame: {
    flex: 1,
    width: "100%",
    maxWidth: 680,
    alignSelf: "center",
  },
}));
