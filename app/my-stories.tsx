import { FlatList, View } from "react-native";
import { Text } from "../src/components/text";
import { Redirect, useLocalSearchParams } from "expo-router";
import { useSession } from "../src/state/session";
import {
  shelfCopy,
  useMyStories,
  type MyShelf,
} from "../src/components/my/useMyStories";
import {
  ShelfRow,
  useShelfCoverWidth,
} from "../src/components/fruits/FruitShelf";
import { shelfRowsOf } from "../src/design/fruitList";
import { ErrorBox, Loading, Screen, useUi } from "../src/components/ui";
import { themedStyles } from "../src/theme/themed";

// 책장 하나를 모두 보는 화면(마이의 "모두 보기"나 유리 명함의 숫자에서 들어온다): 내 작품(기본) · 내가 이어 쓴 이야기 ·
// 즐겨찾기. 열매 탭과 같은 서가(표지 세 칸 + 제목·진행)로 보여 주고, 끝까지 내리면 다음 쪽을 이어서 불러온다.
// 둘러보기에서는 예시 작품으로 보여 준다.
export default function MyStoriesScreen() {
  const { mode } = useSession();
  const params = useLocalSearchParams<{ shelf?: string }>();
  const shelf = shelfOf(params.shelf);
  if (mode === "loading")
    return (
      <Screen>
        <Loading />
      </Screen>
    );
  if (mode === "guest") return <Redirect href="/login" />;
  return (
    <Screen title={shelfCopy[shelf].title} scroll={false}>
      <StoryList shelf={shelf} />
    </Screen>
  );
}

// 주소의 책장 이름. 모르는 값이면 내 작품을 보인다.
function shelfOf(value: string | undefined): MyShelf {
  if (value === "continued" || value === "favorites") return value;
  return "mine";
}

function StoryList({ shelf }: { shelf: MyShelf }) {
  const ui = useUi();
  const styles = useStyles();
  const { coverWidth, measureRow } = useShelfCoverWidth();
  const { query: shelfQuery, isDemo, stories } = useMyStories(shelf);
  if (!isDemo && shelfQuery.isPending) return <Loading />;
  // 처음 불러오다 실패했을 때만 목록 자리를 오류로 바꾼다.
  if (!isDemo && shelfQuery.error && !shelfQuery.data)
    return (
      <ErrorBox
        error={shelfQuery.error}
        retry={() => {
          void shelfQuery.refetch();
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
      ListEmptyComponent={<Text style={ui.hint}>{shelfCopy[shelf].empty}</Text>}
      ListFooterComponent={
        <ListFooter
          loadingMore={shelfQuery.isFetchingNextPage}
          error={isDemo ? null : shelfQuery.error}
          retry={() => {
            void shelfQuery.fetchNextPage();
          }}
        />
      }
      onEndReached={() => {
        if (
          !isDemo &&
          shelfQuery.hasNextPage &&
          !shelfQuery.isFetchingNextPage &&
          !shelfQuery.error
        )
          void shelfQuery.fetchNextPage();
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
