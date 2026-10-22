import { useMemo } from "react";
import { StyleSheet, View } from "react-native";
import { Text } from "../../src/components/text";
import { Redirect, router } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { useSession } from "../../src/state/session";
import { novels } from "../../src/api/novels";
import { homeFruitsOf, type HomeFruit } from "../../src/design/homeFruits";
import { FruitField } from "../../src/components/FruitField";
import { RefreshButton } from "../../src/components/home/RefreshButton";
import { RewardedAd } from "../../src/components/home/RewardedAd";
import {
  useHomeRefresh,
  useRefreshButtonCenter,
} from "../../src/components/home/useHomeRefresh";
import { ErrorBox, Loading, Screen, useUi } from "../../src/components/ui";

// 열매를 누르면 이어 쓸 수 있는 회차는 그 회차를 읽는 화면으로, 내가 쓰는 중이거나 내 차례인 열매는 그 작품으로 간다.
// 읽기 화면은 홈에서 왔는지(from) 보고 "작품 보기"와 "다른 열매 보기"를 작품 화면으로 잇는다.
function openFruit(item: HomeFruit) {
  if (item.kind === "open" && item.chapter)
    router.push({
      pathname: "/novel/read",
      params: { id: item.story.id, chapterId: item.chapter.id, from: "home" },
    });
  else router.push(`/novel/${item.story.id}`);
}

// 홈에는 열매와 그 둘레의 풀·꽃이 있다(새로고침할 때만 위쪽 나무가 내려온다). 열매 하나는 지금 이어 쓸 수 있는 회차 하나이고,
// 누르면 그 회차를 읽고 이어 쓸 수 있다. 내가 자리를 맡고 쓰는 중인 열매와 내 차례인 소설이 먼저 놓인다.
// 오른쪽 위 버튼으로 하루 무료 횟수 안에서 열매 밭을 새 묶음으로 바꾸면, 땅의 열매가 굴러 나가고
// 나무가 툭 떨어져 캐릭터들이 방방 뛰며 새 열매를 떨어뜨린다(useHomeRefresh).
export default function Home() {
  const ui = useUi();
  const { mode } = useSession();
  const homeFeed = useQuery({
    queryKey: ["novels", "home-feed", mode],
    queryFn: novels.homeFeed,
    enabled: mode === "authenticated",
  });
  const turns = useQuery({
    queryKey: ["my-turns", mode],
    queryFn: novels.turns,
    enabled: mode === "authenticated",
  });
  // 내가 자리를 맡고 쓰는 중인 열매. 둘러보기에서는 자리를 맡을 수 없다.
  const deliveries = useQuery({
    queryKey: ["deliveries", mode],
    queryFn: novels.deliveries,
    enabled: mode === "authenticated",
  });
  const buttonCenter = useRefreshButtonCenter();
  const refreshing = useHomeRefresh(homeFeed.data);

  // 홈이 다시 그려질 때마다 새 목록을 만들면 열매 밭이 처음 배치로 돌아가, 손으로 옮긴 열매가 제자리로 튄다.
  // 서버 응답이 바뀔 때만 목록을 새로 만든다. 이어 쓴 회차는 서버가 열매에서 뺀다.
  // 회차 열매(fruits)를 모르는 예전 서버면 작품 목록(novels)을 작품 열매로 놓는다.
  const items = useMemo(
    () =>
      mode === "demo"
        ? homeFruitsOf([], [], refreshing.demoFruits)
        : homeFruitsOf(
            deliveries.data ?? [],
            turns.data ?? [],
            homeFeed.data?.fruits,
            homeFeed.data?.novels,
          ),
    [mode, refreshing.demoFruits, deliveries.data, turns.data, homeFeed.data],
  );

  if (mode === "loading")
    return (
      <Screen>
        <Loading />
      </Screen>
    );
  if (mode === "guest") return <Redirect href="/login" />;

  // 데모 모드에서는 쿼리가 꺼져 있어 isPending이 계속 true이므로 로딩으로 보지 않는다.
  // 목록이 다 온 뒤에 열매를 떨어뜨려야 순서가 바뀌며 다시 떨어지는 일이 없다.
  const isLoading =
    mode !== "demo" &&
    (homeFeed.isPending || turns.isPending || deliveries.isPending);
  const error = homeFeed.error ?? turns.error ?? deliveries.error;
  const isEmpty = !isLoading && !error && items.length === 0;
  const retry = () => {
    void Promise.all([
      homeFeed.refetch(),
      turns.refetch(),
      deliveries.refetch(),
    ]);
  };

  return (
    <Screen scroll={false}>
      <View style={styles.frame}>
        <View style={styles.stage}>
          {isLoading && <Loading />}
          {!isLoading && (
            <FruitField
              key={mode}
              items={items}
              round={refreshing.round}
              onOpen={openFruit}
              onShowEnd={refreshing.onShowEnd}
            />
          )}
          {isEmpty && (
            <Text style={[ui.hint, styles.empty]}>
              아직 떨어진 열매가 없어요.
            </Text>
          )}
          {!!error && (
            // 열매 자리가 흔들리지 않도록 오류 안내는 열매 밭 위에 띄운다.
            <View style={styles.errorOverlay}>
              <ErrorBox error={error} retry={retry} />
            </View>
          )}
        </View>
      </View>
      {!isLoading && (
        <RefreshButton center={buttonCenter} {...refreshing.button} />
      )}
      <RewardedAd {...refreshing.ad} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  frame: {
    flex: 1,
    width: "100%",
    maxWidth: 680,
    alignSelf: "center",
    padding: 24,
  },
  // 아래쪽 유리 바는 탭 레이아웃이 이 영역 아래쪽에 겹쳐 띄우므로, 열매 밭이 그 자리를 비워 둔다.
  stage: { flex: 1 },
  // 나무 아래 하늘 가운데쯤에 띄운다.
  empty: {
    position: "absolute",
    top: "45%",
    left: 0,
    right: 0,
    textAlign: "center",
  },
  errorOverlay: { position: "absolute", top: "30%", left: 0, right: 0 },
});
