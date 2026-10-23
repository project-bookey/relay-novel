import { useCallback, useEffect, useState } from "react";
import { BackHandler, View } from "react-native";
import { Redirect, useFocusEffect } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { useSession } from "../../src/state/session";
import { novels } from "../../src/api/novels";
import { demoGenres } from "../../src/api/demo";
import type { NovelStatus } from "../../src/api/types";
import { searchableQuery, toggleGenre } from "../../src/design/fruitList";
import { FruitsTop } from "../../src/components/fruits/FruitsTop";
import { GenreTabs } from "../../src/components/fruits/GenreTabs";
import { StatusTabs } from "../../src/components/fruits/StatusTabs";
import { BottomFade } from "../../src/components/fruits/BottomFade";
import { FruitsHome } from "../../src/components/fruits/FruitsHome";
import { useRecentSearches } from "../../src/state/recentSearches";
import {
  DemoFruitList,
  ServerFruitList,
} from "../../src/components/fruits/FruitLists";
import { ErrorBox, Loading, Screen } from "../../src/components/ui";
import { themedStyles } from "../../src/theme/themed";

// 칠 때마다 아래 결과가 바로 바뀌게 하되, 손가락이 이만큼 멈출 때까지는 기다려 서버에 너무 자주 묻지 않는다.
const SEARCH_DELAY_MS = 200;

// 열매 탭 = 찾기 탭(2026-10-23 사용자 결정, 시안 reference/sian/fruits-search B "두 단").
// 첫 화면은 표지 없이 최근 찾은 말과 이번 주 많이 이어 쓴 이야기 순위(장르 탭으로 거름)이고,
// 돋보기를 누르면 입력줄·장르·상태로 찾아 작은 표지 결과 목록을 본다. 상태는 찾을 때만 고른다.
export default function FruitsPage() {
  const styles = useStyles();
  const { mode } = useSession();
  const [genres, setGenres] = useState<string[]>([]);
  const [status, setStatus] = useState<NovelStatus>();
  const [searching, setSearching] = useState(false);
  const [typed, setTyped] = useState("");
  const query = useSettled(searchableQuery(typed), SEARCH_DELAY_MS);
  const isDemo = mode === "demo";
  const recent = useRecentSearches(mode);

  // 찾기를 닫으면 검색어와 함께 상태도 "모든 상태"로 돌아간다.
  const closeSearch = useCallback(() => {
    setSearching(false);
    setTyped("");
    setStatus(undefined);
  }, []);
  useCloseSearchOnBack(searching, closeSearch);

  if (mode === "loading")
    return (
      <Screen>
        <Loading />
      </Screen>
    );
  if (mode === "guest") return <Redirect href="/login" />;

  const top = (
    <FruitsTop
      searching={searching}
      query={typed}
      onQueryChange={setTyped}
      onSubmit={() => recent.remember(searchableQuery(typed))}
      onOpenSearch={() => setSearching(true)}
      onCloseSearch={closeSearch}
    />
  );
  const tabs = (
    <GenreTabsFromServer
      isDemo={isDemo}
      selected={genres}
      onToggle={(genre) => setGenres((now) => toggleGenre(now, genre))}
      onClear={() => setGenres([])}
    />
  );
  // 찾는 중에는 입력줄·장르 탭·상태 탭이 모두 맨 위에 붙어, 칠 때마다 바로 아래 결과가 바뀐다.
  const listProps = {
    filter: { genres, status, query },
    stickyHead: (
      <>
        {top}
        {tabs}
        <StatusTabs status={status} onChange={setStatus} />
      </>
    ),
    onOpenResult: () => recent.remember(query),
  };
  const searchList = isDemo ? (
    <DemoFruitList {...listProps} />
  ) : (
    <ServerFruitList {...listProps} />
  );
  return (
    <View style={styles.page}>
      <Screen scroll={false}>
        <View style={styles.frame}>
          {searching ? (
            searchList
          ) : (
            <FruitsHome
              top={top}
              tabs={tabs}
              genres={genres}
              recent={{
                words: recent.words,
                // 최근 찾은 말을 누르면 그 말로 찾기를 연다.
                onPick: (word) => {
                  setTyped(word);
                  setSearching(true);
                  recent.remember(word);
                },
                onForget: recent.forget,
                onClear: recent.clear,
              }}
            />
          )}
        </View>
      </Screen>
      {/* 찾는 중에는 키보드가 아래 바를 덮으므로 흐림도 둘 까닭이 없다. */}
      {!searching && <BottomFade />}
    </View>
  );
}

// 찾는 중에 안드로이드 뒤로 버튼을 누르면 화면을 떠나지 않고 찾기만 닫는다.
// 탭 화면은 다른 곳으로 옮겨도 남아 있으므로, 열매 탭이 보이는 동안에만 뒤로 버튼을 가로챈다.
function useCloseSearchOnBack(searching: boolean, closeSearch: () => void) {
  useFocusEffect(
    useCallback(() => {
      if (!searching) return;
      const subscription = BackHandler.addEventListener(
        "hardwareBackPress",
        () => {
          closeSearch();
          return true;
        },
      );
      return () => subscription.remove();
    }, [searching, closeSearch]),
  );
}

// 장르 목록은 서버가 정한다(GET /novels/genres). 둘러보기에서는 같은 목록의 예시를 쓴다.
function GenreTabsFromServer({
  isDemo,
  selected,
  onToggle,
  onClear,
}: {
  isDemo: boolean;
  selected: string[];
  onToggle: (genre: string) => void;
  onClear: () => void;
}) {
  const genres = useQuery({
    queryKey: ["genres"],
    queryFn: novels.genres,
    enabled: !isDemo,
    staleTime: 60 * 60 * 1000,
  });
  if (!isDemo && genres.error)
    return (
      <ErrorBox
        error={genres.error}
        retry={() => {
          void genres.refetch();
        }}
      />
    );
  // 불러오는 동안에도 "전체" 탭은 보여 자리가 흔들리지 않게 한다.
  const names = isDemo ? demoGenres : (genres.data ?? []);
  return (
    <GenreTabs
      genres={names}
      selected={selected}
      onToggle={onToggle}
      onClear={onClear}
    />
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
  // 아래 흐림이 화면 끝(아래 여백까지)에 닿도록 화면 밖 틀에 겹쳐 둔다.
  page: { flex: 1 },
  // 좌우·위 여백은 목록이 갖는다(붙은 머리의 유리가 화면 끝까지 닿게).
  frame: {
    flex: 1,
    width: "100%",
    maxWidth: 680,
    alignSelf: "center",
  },
}));
