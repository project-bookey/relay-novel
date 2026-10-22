import { FlatList, View } from "react-native";
import { Text } from "../src/components/text";
import { Redirect } from "expo-router";
import { useSession } from "../src/state/session";
import { useMyStories } from "../src/components/my/useMyStories";
import {
  ShelfRow,
  useShelfCoverWidth,
} from "../src/components/fruits/FruitShelf";
import { shelfRowsOf } from "../src/design/fruitList";
import { ErrorBox, Loading, Screen, useUi } from "../src/components/ui";
import { themedStyles } from "../src/theme/themed";

// 내 작품 화면(마이의 "내 작품 더 보기"에서 들어온다). 열매 탭과 같은 서가(표지 세 칸 + 제목·진행)로 모두 보여 주고,
// 끝까지 내리면 다음 쪽을 이어서 불러온다. 둘러보기에서는 예시 작품 가운데 내 작품을 보여 준다.
export default function MyStoriesScreen() {
  const { mode } = useSession();
  if (mode === "loading")
    return (
      <Screen>
        <Loading />
      </Screen>
    );
  if (mode === "guest") return <Redirect href="/login" />;
  return (
    <Screen title="내 작품" scroll={false}>
      <StoryList />
    </Screen>
  );
}

function StoryList() {
  const ui = useUi();
  const styles = useStyles();
  const { coverWidth, measureRow } = useShelfCoverWidth();
  const { query: mine, isDemo, stories } = useMyStories();
  if (!isDemo && mine.isPending) return <Loading />;
  // 처음 불러오다 실패했을 때만 목록 자리를 오류로 바꾼다.
  if (!isDemo && mine.error && !mine.data)
    return (
      <ErrorBox
        error={mine.error}
        retry={() => {
          void mine.refetch();
        }}
      />
    );
  return (
    <FlatList
      data={shelfRowsOf(stories)}
      // 줄의 첫 작품으로 이름을 붙여, 덜 찬 마지막 줄이 다음 쪽을 받아 채워져도 다시 만들지 않는다.
      keyExtractor={(row) => String(row[0].id)}
      renderItem={({ item }) => (
        <ShelfRow stories={item} coverWidth={coverWidth} />
      )}
      // 목록 안쪽 폭(서가 줄 폭)을 재는 높이 없는 머리
      ListHeaderComponent={<View onLayout={measureRow} />}
      ListEmptyComponent={
        <Text style={ui.hint}>아직 함께 쓰는 이야기가 없어요.</Text>
      }
      ListFooterComponent={
        <ListFooter
          loadingMore={mine.isFetchingNextPage}
          error={isDemo ? null : mine.error}
          retry={() => {
            void mine.fetchNextPage();
          }}
        />
      }
      onEndReached={() => {
        if (
          !isDemo &&
          mine.hasNextPage &&
          !mine.isFetchingNextPage &&
          !mine.error
        )
          void mine.fetchNextPage();
      }}
      onEndReachedThreshold={0.5}
      contentContainerStyle={styles.list}
    />
  );
}

function ListFooter({
  loadingMore,
  error,
  retry,
}: {
  loadingMore: boolean;
  error: Error | null;
  retry: () => void;
}) {
  if (loadingMore) return <Loading />;
  if (error) return <ErrorBox error={error} retry={retry} />;
  return null;
}

const useStyles = themedStyles(() => ({
  list: {
    width: "100%",
    maxWidth: 680,
    alignSelf: "center",
    paddingHorizontal: 24,
    paddingTop: 8,
    paddingBottom: 48,
  },
}));
