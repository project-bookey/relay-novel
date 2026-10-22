import { useMemo, useRef, useState, type ReactElement } from "react";
import { Animated, RefreshControl, StyleSheet, View } from "react-native";
import { Text } from "../text";
import { keepPreviousData, useInfiniteQuery } from "@tanstack/react-query";
import { novels } from "../../api/novels";
import { demoStories } from "../../api/demo";
import type { NovelStatus, NovelSummary } from "../../api/types";
import { filterStories, shelfRowsOf } from "../../design/fruitList";
import { useSession } from "../../state/session";
import { themedStyles, useColors } from "../../theme/themed";
import { nativeDriverEnabled } from "../fruitMotion";
import { GlassSurface } from "../Glass";
import { ErrorBox, Loading, useUi } from "../ui";
import { ShelfRow, useShelfCoverWidth } from "./FruitShelf";

// 목록 위쪽 여백. 내리면 이만큼과 제목 줄이 올라간 뒤 머리가 맨 위에 붙는다.
const LIST_TOP = 12;
// 머리가 붙은 뒤 이만큼 더 내리는 동안 유리가 서서히 깔린다.
const GLASS_FADE = 12;

export interface FruitListProps {
  filter: { genres: string[]; status?: NovelStatus; query: string };
  // 목록과 함께 위로 올라가는 머리(평소의 열매 아이콘 제목 줄). 찾는 중에는 없다.
  head?: ReactElement;
  // 내려도 맨 위에 붙어 있는 머리(장르 탭, 찾는 중에는 입력줄·상태 탭까지). 붙으면 유리가 깔린다.
  stickyHead: ReactElement;
}

// 둘러보기에서는 서버에 묻지 않고 예시 작품을 서버와 같은 기준으로 거른다.
export function DemoFruitList({ filter, head, stickyHead }: FruitListProps) {
  return (
    <StoryList
      head={head}
      stickyHead={stickyHead}
      stories={filterStories(demoStories, filter)}
      emptyMessage={emptyMessageOf(filter)}
    />
  );
}

export function ServerFruitList({ filter, head, stickyHead }: FruitListProps) {
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
  const retry = () => {
    if (feed.isFetchNextPageError) void feed.fetchNextPage();
    else void feed.refetch();
  };
  // 머리(찾기 입력줄 포함)가 다시 그려지며 키보드가 닫히지 않도록, 불러오는 중이나 실패했을 때도 같은 목록에
  // 아래 표시만 바꿔 둔다. 읽던 목록이 있으면 그대로 두고 아래에 알린다.
  let footer: ReactElement | undefined;
  if (feed.isPending || feed.isFetchingNextPage) footer = <Loading />;
  else if (feed.error) footer = <ErrorBox error={feed.error} retry={retry} />;
  return (
    <StoryList
      head={head}
      stickyHead={stickyHead}
      stories={feed.data?.pages.flatMap((page) => page.content) ?? []}
      // 아직 한 번도 받지 못했으면 "없어요" 대신 아래 표시(불러오는 중·오류)만 둔다.
      emptyMessage={feed.data ? emptyMessageOf(filter) : undefined}
      footer={footer}
      refreshing={pulling}
      onRefresh={() => {
        setPulling(true);
        void feed.refetch().finally(() => setPulling(false));
      }}
      onEndReached={() => {
        if (feed.hasNextPage && !feed.isFetchingNextPage && !feed.error)
          void feed.fetchNextPage();
      }}
    />
  );
}

// 한 묶음짜리 SectionList: 묶음 머리(stickyHead)가 맨 위에 붙고, 목록 머리(head)는 함께 올라간다.
function StoryList({
  head,
  stickyHead,
  stories,
  emptyMessage,
  footer,
  refreshing = false,
  onRefresh,
  onEndReached,
}: {
  head?: ReactElement;
  stickyHead: ReactElement;
  stories: NovelSummary[];
  emptyMessage?: string;
  footer?: ReactElement;
  refreshing?: boolean;
  onRefresh?: () => void;
  onEndReached?: () => void;
}) {
  const ui = useUi();
  const styles = useStyles();
  const colors = useColors();
  const scrollY = useRef(new Animated.Value(0)).current;
  const [headHeight, setHeadHeight] = useState(0);
  const onScroll = useMemo(
    () =>
      Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], {
        useNativeDriver: nativeDriverEnabled,
      }),
    [scrollY],
  );
  // 제목 줄이 다 올라가 머리가 맨 위에 붙는 순간부터 유리가 깔린다(찾는 중에는 위 여백만 올라가면 붙는다).
  const stuckAt = LIST_TOP + (head ? headHeight : 0);
  const glassOpacity = scrollY.interpolate({
    inputRange: [stuckAt, stuckAt + GLASS_FADE],
    outputRange: [0, 1],
    extrapolate: "clamp",
  });
  const { coverWidth, measureRow } = useShelfCoverWidth();
  // 서가 한 줄(세 작품)이 목록의 한 칸이다.
  const sections = useMemo(
    () => [{ key: "stories", data: shelfRowsOf(stories) }],
    [stories],
  );
  return (
    <Animated.SectionList
      sections={sections}
      // 줄의 첫 작품으로 이름을 붙여, 덜 찬 마지막 줄이 다음 쪽을 받아 채워져도 다시 만들지 않는다.
      keyExtractor={(row: NovelSummary[]) => String(row[0].id)}
      renderItem={({
        item,
        index,
      }: {
        item: NovelSummary[];
        index: number;
      }) => (
        <ShelfRow stories={item} coverWidth={coverWidth} first={index === 0} />
      )}
      ListHeaderComponent={
        head ? (
          <View
            onLayout={(event) => setHeadHeight(event.nativeEvent.layout.height)}
          >
            {head}
          </View>
        ) : null
      }
      renderSectionHeader={() => (
        <View style={styles.sticky}>
          <Animated.View style={[styles.glass, { opacity: glassOpacity }]}>
            <GlassSurface
              bare
              interactive={false}
              style={StyleSheet.absoluteFill}
            />
          </Animated.View>
          {/* 붙는 머리의 안쪽 폭이 서가 줄 폭과 같아서 여기서 잰다. */}
          <View onLayout={measureRow}>{stickyHead}</View>
        </View>
      )}
      renderSectionFooter={() =>
        stories.length === 0 && emptyMessage ? (
          <Text style={[ui.hint, styles.empty]}>{emptyMessage}</Text>
        ) : null
      }
      // 안드로이드는 기본으로 붙지 않는다.
      stickySectionHeadersEnabled
      ListFooterComponent={footer ?? null}
      onScroll={onScroll}
      scrollEventThrottle={16}
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

const useStyles = themedStyles((colors) => ({
  // 아래쪽 바에 마지막 줄이 가리지 않도록 여유를 둔다.
  list: { paddingTop: LIST_TOP, paddingHorizontal: 24, paddingBottom: 120 },
  // 붙은 머리의 유리가 화면 끝까지 닿도록 목록 여백(24)만큼 넓힌다.
  sticky: { marginHorizontal: -24, paddingHorizontal: 24 },
  // 아래 가장자리에 짧고 옅은 그늘 한 줄(시안 C "유리 머리")
  glass: {
    ...StyleSheet.absoluteFill,
    boxShadow: `0 10px 18px -16px ${colors.cardShadow}`,
    pointerEvents: "none",
  },
  empty: { marginTop: 24 },
}));
