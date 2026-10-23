import type { ReactElement } from "react";
import { Pressable, View } from "react-native";
import { router } from "expo-router";
import { Text } from "../text";
import type { NovelSummary } from "../../api/types";
import { rankingColumnsOf, type RankedStory } from "../../design/fruitList";
import { themedStyles } from "../../theme/themed";
import { ErrorBox, Loading, useUi } from "../ui";
import { SectionHead } from "./SectionHead";

// 이번 주 많이 이어 쓴 이야기: 번호와 제목만, 1~5위 · 6~10위 두 단(시안 reference/sian/fruits-search B "두 단").
// 장르 탭은 제목 바로 아래에서 순위를 거른다. 누르면 그 작품으로 간다.
export function WeeklyRanking({
  tabs,
  stories,
  loading,
  error,
  retry,
}: {
  tabs: ReactElement;
  stories?: NovelSummary[];
  loading: boolean;
  error: unknown;
  retry: () => void;
}) {
  const ui = useUi();
  const styles = useStyles();
  let body: ReactElement;
  // 다시 읽기만 실패했으면 보이던 순위는 그대로 두고 아래에 알린다.
  if (error && !stories) body = <ErrorBox error={error} retry={retry} />;
  else if (loading || !stories) body = <Loading />;
  else if (stories.length === 0)
    body = (
      <Text style={[ui.hint, styles.empty]}>
        이번 주에 이어 쓴 이야기가 아직 없어요.
      </Text>
    );
  else
    body = (
      <>
        <View style={styles.columns}>
          {rankingColumnsOf(stories).map((column) => (
            <View key={column[0].rank} style={styles.column}>
              {column.map((ranked) => (
                <RankRow key={ranked.story.id} ranked={ranked} />
              ))}
            </View>
          ))}
        </View>
        {error ? <ErrorBox error={error} retry={retry} /> : null}
      </>
    );
  return (
    <View style={styles.block}>
      <SectionHead title="이번 주 많이 이어 쓴 이야기" />
      {tabs}
      {body}
    </View>
  );
}

function RankRow({ ranked }: { ranked: RankedStory }) {
  const styles = useStyles();
  const { rank, story } = ranked;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${rank}위 ${story.title}`}
      onPress={() => router.push(`/novel/${story.id}`)}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
    >
      <Text style={styles.rank}>{rank}</Text>
      <Text style={styles.title} numberOfLines={1}>
        {story.title}
      </Text>
    </Pressable>
  );
}

const useStyles = themedStyles((colors) => ({
  block: { marginTop: 30 },
  columns: { flexDirection: "row", gap: 18, marginTop: 8 },
  // 긴 제목은 제 단 안에서 말줄임이 되도록 두 단이 너비를 똑같이 나눈다.
  column: { flex: 1, minWidth: 0 },
  row: { flexDirection: "row", alignItems: "center", gap: 10, minHeight: 46 },
  pressed: { opacity: 0.6 },
  // "10"도 같은 자리에 오도록 너비를 잡고 숫자 폭을 맞춘다.
  rank: {
    width: 20,
    fontSize: 15,
    fontWeight: "800",
    fontVariant: ["tabular-nums"],
    color: colors.ink,
  },
  title: { flex: 1, fontSize: 15, letterSpacing: -0.3, color: colors.ink },
  empty: { marginTop: 18 },
}));
