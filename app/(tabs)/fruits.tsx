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
import { SearchVeil } from "../../src/components/search/SearchVeil";
import { Loading, Screen } from "../../src/components/ui";
import { themedStyles } from "../../src/theme/themed";

// 열매 탭. 홈에는 열매가 몇 개만 떨어지므로, 여기서 모든 이야기를 표지 서가(세 칸)로 펼쳐 장르(세 개까지)로 골라 본다.
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

  // 제목 줄은 서가와 함께 올라가고 장르 탭만 맨 위에 붙는다(유리 머리, 사용자가 시안 C를 고름).
  const listProps = {
    filter: { genres, query: "" },
    head: <FruitsTop onOpenSearch={() => setSearchOpen(true)} />,
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
  // 좌우·위 여백은 목록이 갖는다(붙은 머리의 유리가 화면 끝까지 닿게).
  frame: {
    flex: 1,
    width: "100%",
    maxWidth: 680,
    alignSelf: "center",
  },
}));
