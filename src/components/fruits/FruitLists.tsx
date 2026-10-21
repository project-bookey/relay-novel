import { useState, type ReactElement } from "react";
import { FlatList, RefreshControl, Text } from "react-native";
import { keepPreviousData, useInfiniteQuery } from "@tanstack/react-query";
import { novels } from "../../api/novels";
import { demoStories } from "../../api/demo";
import type { NovelStatus, NovelSummary } from "../../api/types";
import { filterStories } from "../../design/fruitList";
import { useSession } from "../../state/session";
import { themedStyles, useColors } from "../../theme/themed";
import { ErrorBox, Loading, useUi } from "../ui";
import { FruitRow } from "./FruitRow";
import { ListHead } from "./ListHead";

export interface FruitListProps {
  filter: { genres: string[]; status?: NovelStatus; query: string };
  onStatusChange: (status?: NovelStatus) => void;
}

// 둘러보기에서는 서버에 묻지 않고 예시 작품을 서버와 같은 기준으로 거른다.
export function DemoFruitList({ filter, onStatusChange }: FruitListProps) {
  const stories = filterStories(demoStories, filter);
  return (
    <StoryList
      head={
        <ListHead
          genres={filter.genres}
          total={stories.length}
          status={filter.status}
          onStatusChange={onStatusChange}
        />
      }
      stories={stories}
      emptyMessage={emptyMessageOf(filter)}
    />
  );
}

export function ServerFruitList({ filter, onStatusChange }: FruitListProps) {
  const { mode } = useSession();
  // 당겨서 새로고침할 때만 위쪽 동그라미를 돌린다(다른 화면이 목록을 새로 읽게 할 때는 조용히).
  const [pulling, setPulling] = useState(false);
  const query = filter.query.trim();
  const feed = useInfiniteQuery({
    queryKey: [
      "novels",
      "all",
      filter.status ?? "ALL",
      filter.genres,
      query,
      mode,
    ],
    initialPageParam: 0,
    queryFn: ({ pageParam }) => novels.feed({ ...filter, query }, pageParam),
    getNextPageParam: (last) => (last.hasNext ? last.page + 1 : undefined),
    // 장르·검색어를 바꾸는 동안 새 결과가 올 때까지 앞 목록을 그대로 둔다(깜빡이거나 맨 위로 튀지 않게).
    placeholderData: keepPreviousData,
  });
  const head = (
    <ListHead
      genres={filter.genres}
      // 앞 조건의 결과를 보여 주는 동안에는 편수를 비운다.
      total={
        feed.isPlaceholderData ? undefined : feed.data?.pages[0]?.totalElements
      }
      status={filter.status}
      onStatusChange={onStatusChange}
    />
  );
  if (feed.isPending)
    return (
      <>
        {head}
        <Loading />
      </>
    );
  // 처음 불러오다 실패했을 때만 목록 자리를 오류로 바꾼다. 읽던 목록이 있으면 그대로 두고 아래에 알린다.
  if (feed.error && !feed.data)
    return (
      <>
        {head}
        <ErrorBox
          error={feed.error}
          retry={() => {
            void feed.refetch();
          }}
        />
      </>
    );
  const retry = () => {
    if (feed.isFetchNextPageError) void feed.fetchNextPage();
    else void feed.refetch();
  };
  return (
    <StoryList
      head={head}
      stories={feed.data.pages.flatMap((page) => page.content)}
      emptyMessage={emptyMessageOf(filter)}
      footer={
        feed.error ? <ErrorBox error={feed.error} retry={retry} /> : undefined
      }
      refreshing={pulling}
      onRefresh={() => {
        setPulling(true);
        void feed.refetch().finally(() => setPulling(false));
      }}
      loadingMore={feed.isFetchingNextPage}
      onEndReached={() => {
        if (feed.hasNextPage && !feed.isFetchingNextPage && !feed.error)
          void feed.fetchNextPage();
      }}
    />
  );
}

function StoryList({
  head,
  stories,
  emptyMessage,
  footer,
  refreshing = false,
  onRefresh,
  loadingMore = false,
  onEndReached,
}: {
  head: ReactElement;
  stories: NovelSummary[];
  emptyMessage: string;
  footer?: ReactElement;
  refreshing?: boolean;
  onRefresh?: () => void;
  loadingMore?: boolean;
  onEndReached?: () => void;
}) {
  const ui = useUi();
  const styles = useStyles();
  const colors = useColors();
  return (
    <FlatList
      data={stories}
      keyExtractor={(story) => String(story.id)}
      renderItem={({ item }) => <FruitRow story={item} />}
      ListHeaderComponent={head}
      ListEmptyComponent={
        <Text style={[ui.hint, styles.empty]}>{emptyMessage}</Text>
      }
      ListFooterComponent={loadingMore ? <Loading /> : (footer ?? null)}
      onEndReached={onEndReached}
      onEndReachedThreshold={0.5}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="on-drag"
      refreshControl={
        onRefresh ? (
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.muted}
          />
        ) : undefined
      }
      contentContainerStyle={styles.list}
    />
  );
}

function emptyMessageOf(filter: FruitListProps["filter"]) {
  if (filter.query.trim()) return "찾는 열매가 없어요. 다른 말로 찾아보세요.";
  if (filter.genres.length > 0 || filter.status)
    return "고른 조건에 맞는 열매가 아직 없어요.";
  return "아직 여기에 열린 열매가 없어요.";
}

const useStyles = themedStyles(() => ({
  // 아래쪽 바에 마지막 줄이 가리지 않도록 여유를 둔다.
  list: { paddingTop: 6, paddingBottom: 120 },
  empty: { marginTop: 24 },
}));
