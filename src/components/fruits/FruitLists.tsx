import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactElement,
} from "react";
import { Animated, RefreshControl, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Text } from "../text";
import { keepPreviousData, useInfiniteQuery } from "@tanstack/react-query";
import { novels } from "../../api/novels";
import { demoStories } from "../../api/demo";
import type { NovelStatus, NovelSummary } from "../../api/types";
import { filterStories, shelfRowsOf } from "../../design/fruitList";
import { useSession } from "../../state/session";
import { themedStyles, useColors } from "../../theme/themed";
import { nativeDriverEnabled } from "../fruitMotion";
import { ErrorBox, Loading, useUi } from "../ui";
import { ShelfRow, useShelfCoverWidth } from "./FruitShelf";
import { RevealedBar, useBarReveal } from "./RevealedBar";
import {
  BAR_REVEAL_TOP,
  GENRE_BAR_OUTSET,
  LIST_SIDE,
  LIST_TOP,
} from "./fruitsLayout";

// 아래 유리 바(높이 + 그 위 여유)에 마지막 줄이 가리지 않게 비우는 자리. 기기 아래 여백은 따로 더한다.
const BOTTOM_SPACE = 120;
// 모든 이야기 이름과 그 아래 장르 바 사이
const BAR_GAP = 4;

export interface FruitListProps {
  filter: { genres: string[]; status?: NovelStatus; query: string };
  // 목록과 함께 위로 올라가는 머리(열매 아이콘 제목 줄, 나를 위한 이야기, 모든 이야기 이름).
  head?: ReactElement;
  // 서가 바로 위의 장르 바. 내렸다가 위로 올리면 맨 위에 다시 나타난다.
  genreBar: ReactElement;
  // 목록을 내린 거리. 맨 위 빛(FruitsBackdrop)이 같은 값으로 함께 올라간다.
  scrollY: Animated.Value;
  // 위쪽 묶음(나를 위한 이야기)을 다 지나 내려왔는지. 그동안 큰 추천 카드는 넘기지 않는다.
  onPastHead?: (pastHead: boolean) => void;
}

// 둘러보기에서는 서버에 묻지 않고 예시 작품을 서버와 같은 기준으로 거른다.
export function DemoFruitList({ filter, ...rest }: FruitListProps) {
  const { genres, status, query } = filter;
  // 큰 추천 카드가 넘어갈 때마다 화면이 다시 그려져도 서가 줄은 다시 만들지 않는다.
  const stories = useMemo(
    () => filterStories(demoStories, { genres, status, query }),
    [genres, status, query],
  );
  return (
    <StoryList
      {...rest}
      stories={stories}
      emptyMessage={emptyMessageOf(filter)}
    />
  );
}

export function ServerFruitList({ filter, ...rest }: FruitListProps) {
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
    // 장르를 바꾸는 동안 새 결과가 올 때까지 앞 목록을 그대로 둔다(깜빡이거나 맨 위로 튀지 않게).
    placeholderData: keepPreviousData,
  });
  const stories = useMemo(
    () => feed.data?.pages.flatMap((page) => page.content) ?? [],
    [feed.data],
  );
  const retry = () => {
    if (feed.isFetchNextPageError) void feed.fetchNextPage();
    else void feed.refetch();
  };
  // 불러오는 중이나 실패했을 때도 같은 목록에 아래 표시만 바꿔 둔다. 읽던 목록이 있으면 그대로 두고 아래에 알린다.
  let footer: ReactElement | undefined;
  if (feed.isPending || feed.isFetchingNextPage) footer = <Loading />;
  else if (feed.error) footer = <ErrorBox error={feed.error} retry={retry} />;
  return (
    <StoryList
      {...rest}
      stories={stories}
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

// 한 묶음짜리 SectionList: 목록 머리(head)와 서가 위 장르 바가 함께 올라간다. 장르 바는 맨 위에 붙어 따라다니지 않고,
// 화면 위로 지나간 뒤 손가락으로 위로 올리면 맨 위(검색 동그라미 옆)에 다시 나타난다(사용자 요청). 유리 줄은 깔지 않는다.
function StoryList({
  head,
  genreBar,
  scrollY,
  onPastHead,
  stories,
  emptyMessage,
  footer,
  refreshing = false,
  onRefresh,
  onEndReached,
}: Omit<FruitListProps, "filter"> & {
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
  const insets = useSafeAreaInsets();
  const [headHeight, setHeadHeight] = useState(0);
  const { revealed, pastHead, onScrollMove } = useBarReveal(
    LIST_TOP + headHeight + BAR_GAP - BAR_REVEAL_TOP,
  );
  useEffect(() => onPastHead?.(pastHead), [onPastHead, pastHead]);
  const onScroll = useMemo(
    () =>
      Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], {
        useNativeDriver: nativeDriverEnabled,
        listener: onScrollMove,
      }),
    [scrollY, onScrollMove],
  );
  const { coverWidth, measureRow } = useShelfCoverWidth();
  // 서가 한 줄(세 작품)이 목록의 한 칸이다.
  const sections = useMemo(
    () => [{ key: "stories", data: shelfRowsOf(stories) }],
    [stories],
  );
  const renderRow = useCallback(
    ({ item, index }: { item: NovelSummary[]; index: number }) => (
      <ShelfRow stories={item} coverWidth={coverWidth} first={index === 0} />
    ),
    [coverWidth],
  );
  return (
    <View style={styles.frame}>
      <Animated.SectionList
        sections={sections}
        // 줄의 첫 작품으로 이름을 붙여, 덜 찬 마지막 줄이 다음 쪽을 받아 채워져도 다시 만들지 않는다.
        keyExtractor={(row: NovelSummary[]) => String(row[0].id)}
        renderItem={renderRow}
        ListHeaderComponent={
          head ? (
            <View
              onLayout={(event) =>
                setHeadHeight(event.nativeEvent.layout.height)
              }
            >
              {head}
            </View>
          ) : null
        }
        renderSectionHeader={() => (
          // 이 칸의 폭이 서가 줄 폭과 같아서 여기서 잰다(장르 바는 양옆으로 조금 더 내민다).
          <View style={styles.barRow} onLayout={measureRow}>
            <View style={styles.outset}>{genreBar}</View>
          </View>
        )}
        renderSectionFooter={() =>
          stories.length === 0 && emptyMessage ? (
            <Text style={[ui.hint, styles.empty]}>{emptyMessage}</Text>
          ) : null
        }
        stickySectionHeadersEnabled={false}
        ListFooterComponent={footer ?? null}
        onScroll={onScroll}
        scrollEventThrottle={16}
        onEndReached={onEndReached}
        onEndReachedThreshold={0.5}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          onRefresh ? (
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.muted}
            />
          ) : undefined
        }
        contentContainerStyle={[
          styles.list,
          { paddingBottom: insets.bottom + BOTTOM_SPACE },
        ]}
      />
      <RevealedBar shown={revealed}>{genreBar}</RevealedBar>
    </View>
  );
}

function emptyMessageOf(filter: FruitListProps["filter"]) {
  if (filter.query.trim()) return "찾는 열매가 없어요. 다른 말로 찾아보세요.";
  if (filter.genres.length > 0 || filter.status)
    return "고른 조건에 맞는 열매가 아직 없어요.";
  return "아직 여기에 열린 열매가 없어요.";
}

const useStyles = themedStyles(() => ({
  frame: { flex: 1 },
  list: { paddingTop: LIST_TOP, paddingHorizontal: LIST_SIDE },
  barRow: { paddingTop: BAR_GAP },
  outset: { marginHorizontal: -GENRE_BAR_OUTSET },
  empty: { marginTop: 24 },
}));
