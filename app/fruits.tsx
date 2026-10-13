import { useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { Redirect } from "expo-router";
import { useInfiniteQuery } from "@tanstack/react-query";
import { useSession } from "../src/state/session";
import { novels } from "../src/api/novels";
import { demoStories } from "../src/api/demo";
import type { NovelStatus } from "../src/api/types";
import { BottomBar } from "../src/components/BottomBar";
import { StatusFilters } from "../src/components/home/HomeSections";
import { StoryCard } from "../src/components/home/StoryCard";
import {
  Button,
  ErrorBox,
  Label,
  Loading,
  Screen,
  ui,
} from "../src/components/ui";

// 열매 페이지. 홈에는 열매가 몇 개만 떨어지므로, 여기서 모든 이야기를 상태별로 골라 본다.
export default function FruitsPage() {
  const { mode } = useSession();
  const [status, setStatus] = useState<NovelStatus>();
  const feed = useInfiniteQuery({
    queryKey: ["novels", "all", status ?? "ALL", mode],
    initialPageParam: 0,
    queryFn: ({ pageParam }) => novels.feed(status, pageParam),
    getNextPageParam: (last) => (last.hasNext ? last.page + 1 : undefined),
    enabled: mode === "authenticated",
  });

  if (mode === "loading")
    return (
      <Screen>
        <Loading />
      </Screen>
    );
  if (mode === "guest") return <Redirect href="/login" />;

  // 둘러보기에서는 서버에 묻지 않고 예시 작품을 상태로만 거른다.
  const isDemo = mode === "demo";
  const stories = isDemo
    ? demoStories.filter((story) => !status || story.status === status)
    : (feed.data?.pages.flatMap((page) => page.content) ?? []);
  const isLoading = !isDemo && feed.isPending;
  const isEmpty = !isLoading && !feed.error && stories.length === 0;

  return (
    <Screen scroll={false}>
      <View style={styles.frame}>
        <View style={styles.stage}>
          <ScrollView contentContainerStyle={styles.content}>
            <Label>ALL STORIES</Label>
            <Text style={ui.heading}>열매</Text>
            <StatusFilters selected={status} onSelect={setStatus} />
            {isLoading && <Loading />}
            {!!feed.error && (
              <ErrorBox
                error={feed.error}
                retry={() => {
                  void feed.refetch();
                }}
              />
            )}
            {isEmpty && (
              <Text style={ui.hint}>아직 여기에 열린 열매가 없어요.</Text>
            )}
            {stories.map((story) => (
              <StoryCard key={story.id} story={story} />
            ))}
            {feed.hasNextPage && (
              <Button
                outline
                disabled={feed.isFetchingNextPage}
                onPress={() => {
                  void feed.fetchNextPage();
                }}
              >
                열매 더 보기
              </Button>
            )}
          </ScrollView>
          <BottomBar current="fruits" />
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
  stage: { flex: 1 },
  // 아래쪽 바에 마지막 내용이 가리지 않도록 여유를 둔다.
  content: { paddingBottom: 120 },
});
