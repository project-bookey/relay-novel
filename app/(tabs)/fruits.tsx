import { useCallback, useEffect, useState } from "react";
import { BackHandler, View } from "react-native";
import { Redirect, useFocusEffect } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { useSession } from "../../src/state/session";
import { novels } from "../../src/api/novels";
import { demoGenres } from "../../src/api/demo";
import type { NovelStatus } from "../../src/api/types";
import { toggleGenre } from "../../src/design/fruitList";
import { FruitsTop } from "../../src/components/fruits/FruitsTop";
import { GenreTabs } from "../../src/components/fruits/GenreTabs";
import {
  DemoFruitList,
  ServerFruitList,
} from "../../src/components/fruits/FruitLists";
import { ErrorBox, Loading, Screen } from "../../src/components/ui";
import { themedStyles } from "../../src/theme/themed";

// 검색어를 칠 때마다 서버에 묻지 않도록, 입력이 이만큼 멈추면 찾는다.
const SEARCH_DELAY_MS = 300;

// 열매 탭. 홈에는 열매가 몇 개만 떨어지므로, 여기서 모든 이야기를 장르(세 개까지)·상태·검색어로 골라 본다.
export default function FruitsPage() {
  const styles = useStyles();
  const { mode } = useSession();
  const [genres, setGenres] = useState<string[]>([]);
  const [status, setStatus] = useState<NovelStatus>();
  const [searching, setSearching] = useState(false);
  const [typed, setTyped] = useState("");
  const query = useSettled(typed, SEARCH_DELAY_MS);
  const isDemo = mode === "demo";

  const closeSearch = useCallback(() => {
    setSearching(false);
    setTyped("");
  }, []);
  useCloseSearchOnBack(searching, closeSearch);

  if (mode === "loading")
    return (
      <Screen>
        <Loading />
      </Screen>
    );
  if (mode === "guest") return <Redirect href="/login" />;

  const filter = { genres, status, query };
  return (
    <Screen scroll={false}>
      <View style={styles.frame}>
        <FruitsTop
          searching={searching}
          query={typed}
          onQueryChange={setTyped}
          onOpenSearch={() => setSearching(true)}
          onCloseSearch={closeSearch}
        />
        <GenreTabsFromServer
          isDemo={isDemo}
          selected={genres}
          onToggle={(genre) => setGenres((now) => toggleGenre(now, genre))}
          onClear={() => setGenres([])}
        />
        {isDemo ? (
          <DemoFruitList filter={filter} onStatusChange={setStatus} />
        ) : (
          <ServerFruitList filter={filter} onStatusChange={setStatus} />
        )}
      </View>
    </Screen>
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
  frame: {
    flex: 1,
    width: "100%",
    maxWidth: 680,
    alignSelf: "center",
    paddingHorizontal: 24,
    paddingTop: 12,
  },
}));
