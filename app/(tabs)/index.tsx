import { useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";
import { Redirect, router } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { useSession } from "../../src/state/session";
import { novels } from "../../src/api/novels";
import { demoStories } from "../../src/api/demo";
import type { NovelSummary } from "../../src/api/types";
import { FruitField } from "../../src/components/FruitField";
import { ErrorBox, Loading, Screen, ui } from "../../src/components/ui";

// 열매 자리는 몇 개뿐이라, 내가 이어 쓸 차례인 소설을 먼저 놓고 나머지를 피드 순서대로 채운다.
function fruitOrder(myTurns: NovelSummary[], feed: NovelSummary[]) {
  const seen = new Set<number>();
  return [...myTurns, ...feed].filter((story) => {
    if (seen.has(story.id)) return false;
    seen.add(story.id);
    return true;
  });
}

// 홈에는 오로지 열매와 땅만 있다. 열매 하나가 소설 하나이고, 누르면 그 소설로 간다.
export default function Home() {
  const { mode } = useSession();
  const feed = useQuery({
    queryKey: ["novels", "feed", mode],
    queryFn: () => novels.feed(undefined, 0),
    enabled: mode === "authenticated",
  });
  const turns = useQuery({
    queryKey: ["my-turns", mode],
    queryFn: novels.turns,
    enabled: mode === "authenticated",
  });
  // 홈이 다시 그려질 때마다 새 목록을 만들면 열매 밭이 처음 배치로 돌아가, 손으로 옮긴 열매가 제자리로 튄다.
  // 서버 응답이 바뀔 때만 목록을 새로 만든다.
  const stories = useMemo(
    () =>
      mode === "demo"
        ? demoStories
        : fruitOrder(turns.data ?? [], feed.data?.content ?? []),
    [mode, turns.data, feed.data],
  );

  if (mode === "loading")
    return (
      <Screen>
        <Loading />
      </Screen>
    );
  if (mode === "guest") return <Redirect href="/login" />;

  // 데모 모드에서는 쿼리가 꺼져 있어 isPending이 계속 true이므로 로딩으로 보지 않는다.
  // 두 목록이 다 온 뒤에 열매를 떨어뜨려야 순서가 바뀌며 다시 떨어지는 일이 없다.
  const isLoading = mode !== "demo" && (feed.isPending || turns.isPending);
  const error = feed.error ?? turns.error;
  const showFruits = !isLoading && stories.length > 0;
  const isEmpty = !isLoading && !error && stories.length === 0;
  const openStory = (story: NovelSummary) => router.push(`/novel/${story.id}`);
  const retry = () => {
    void Promise.all([feed.refetch(), turns.refetch()]);
  };

  return (
    <Screen scroll={false}>
      <View style={styles.frame}>
        <View style={styles.stage}>
          {isLoading && <Loading />}
          {isEmpty && (
            <Text style={[ui.hint, styles.empty]}>
              아직 떨어진 열매가 없어요.
            </Text>
          )}
          {showFruits && <FruitField stories={stories} onOpen={openStory} />}
          {!!error && (
            // 열매가 있을 때는 열매 자리가 흔들리지 않도록 오류 안내를 위에 띄운다.
            <View style={showFruits ? styles.errorOverlay : undefined}>
              <ErrorBox error={error} retry={retry} />
            </View>
          )}
        </View>
      </View>
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
  stage: { flex: 1, justifyContent: "center" },
  empty: { textAlign: "center" },
  errorOverlay: { position: "absolute", top: 0, left: 0, right: 0 },
});
