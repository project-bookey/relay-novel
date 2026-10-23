import { useState, type ReactElement } from "react";
import { RefreshControl, ScrollView } from "react-native";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { novels } from "../../api/novels";
import { demoStories } from "../../api/demo";
import { demoRankingOf } from "../../design/fruitList";
import { useSession } from "../../state/session";
import { themedStyles, useColors } from "../../theme/themed";
import { RecentSearches } from "./RecentSearches";
import { WeeklyRanking } from "./WeeklyRanking";

// 열매 탭 첫 화면(찾기를 열기 전): 제목 줄 → 최근 찾은 말 → 이번 주 많이 이어 쓴 이야기.
// 표지 없이 글자만 둔다(사용자가 고른 시안 reference/sian/fruits-search B "두 단").
export function FruitsHome({
  top,
  tabs,
  genres,
  recent,
}: {
  top: ReactElement;
  tabs: ReactElement;
  genres: string[];
  recent: {
    words: string[];
    onPick: (word: string) => void;
    onForget: (word: string) => void;
    onClear: () => void;
  };
}) {
  const styles = useStyles();
  const colors = useColors();
  const { mode } = useSession();
  const isDemo = mode === "demo";
  // 당겨서 새로고침할 때만 위쪽 동그라미를 돌린다.
  const [pulling, setPulling] = useState(false);
  const ranking = useQuery({
    queryKey: ["novels", "ranking", genres, mode],
    queryFn: () => novels.ranking(genres),
    enabled: !isDemo,
    // 장르를 바꾸는 동안 새 순위가 올 때까지 앞 순위를 그대로 둔다(로딩 표시로 바뀌며 덜컥이지 않게).
    placeholderData: keepPreviousData,
  });
  const retry = () => {
    void ranking.refetch();
  };
  return (
    <ScrollView
      contentContainerStyle={styles.page}
      keyboardShouldPersistTaps="handled"
      refreshControl={
        isDemo ? undefined : (
          <RefreshControl
            refreshing={pulling}
            onRefresh={() => {
              setPulling(true);
              void ranking.refetch().finally(() => setPulling(false));
            }}
            tintColor={colors.muted}
          />
        )
      }
    >
      {top}
      <RecentSearches {...recent} />
      <WeeklyRanking
        tabs={tabs}
        stories={isDemo ? demoRankingOf(demoStories, genres) : ranking.data}
        loading={!isDemo && ranking.isPending}
        error={isDemo ? undefined : ranking.error}
        retry={retry}
      />
    </ScrollView>
  );
}

const useStyles = themedStyles(() => ({
  // 아래쪽 바에 마지막 줄이 가리지 않도록 여유를 둔다(찾기 결과 목록과 같은 여백).
  page: { paddingTop: 12, paddingHorizontal: 24, paddingBottom: 120 },
}));
