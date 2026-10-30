import { useEffect, useRef } from "react";
import { Animated, View } from "react-native";
import { useQuery } from "@tanstack/react-query";
import { novels } from "../../api/novels";
import { demoStories } from "../../api/demo";
import type { NovelSummary } from "../../api/types";
import {
  demoForMe,
  forMeChoice,
  forMeGenres,
  splitForMe,
} from "../../design/fruitSections";
import { useSession } from "../../state/session";
import { themedStyles } from "../../theme/themed";
import { nativeDriverEnabled, useReducedMotion } from "../fruitMotion";
import { SectionHead } from "../search/SectionHead";
import { StoryStrip, StoryStripPlaceholder } from "../StoryStrip";
import { FeatureCard, FeatureCardPlaceholder } from "./FeatureCard";

// 상자 아래 표지 줄. 첫 화면에 모든 이야기 서가 첫 줄이 보이도록 마이 책장(92)보다 작게 두고 제목만 둔다
// (사용자가 고른 시안 reference/sian/fruits-polish C).
const STRIP_COVER_WIDTH = 80;
// 불러온 작품이 빈 상자 안에 서서히 나타나는 시간
const APPEAR_MS = 320;

export interface ForMeChoice {
  stories: NovelSummary[];
  hint: string;
  // 아직 고를 작품을 묻는 중이다. 그동안 같은 크기의 빈 상자로 자리를 잡아 두어 아래 서가가 밀리지 않게 한다.
  pending: boolean;
}

// 나를 위한 이야기에 놓을 작품: 관심 장르(앞의 세 개)의 작품, 관심 장르가 없거나 맞는 작품이 없으면 최근에 심은 이야기,
// 둘러보기는 좋아요가 많은 예시. 열매 탭 맨 위 빛(FruitsBackdrop)도 같은 작품 색을 쓴다.
export function useForMe(): ForMeChoice {
  const { mode } = useSession();
  const myGenres = useQuery({
    queryKey: ["my-genres", mode],
    queryFn: novels.myGenres,
    enabled: mode === "authenticated",
  });
  const genres = forMeGenres(myGenres.data ?? []);
  const picks = useQuery({
    queryKey: ["novels", "for-me", genres, mode],
    queryFn: () => novels.feed({ genres }, 0),
    enabled: mode === "authenticated" && genres.length > 0,
  });
  // 관심 장르로 고를 작품이 없다고 확인된 뒤에만 최근 작품을 읽는다(관심 장르 작품이 늦게 와서 바뀌지 않게).
  const genrePicksMissing =
    myGenres.isSuccess &&
    (genres.length === 0 ||
      (picks.isSuccess && picks.data.content.length === 0));
  const recent = useQuery({
    queryKey: ["novels", "for-me-recent", mode],
    queryFn: () => novels.feed({}, 0),
    enabled: mode === "authenticated" && genrePicksMissing,
  });
  if (mode === "demo")
    return {
      stories: demoForMe(demoStories),
      hint: "좋아요가 많은 이야기",
      pending: false,
    };
  // 꺼 둔 쿼리도 isPending이라, 지금 기다리는 쿼리만 센다. 하나라도 실패하면 기다리지 않고 자리를 비운다.
  const waitingForGenres = myGenres.isPending;
  const waitingForPicks = genres.length > 0 && picks.isPending;
  const waitingForRecent = genrePicksMissing && recent.isPending;
  const pending =
    mode === "authenticated" &&
    (waitingForGenres || waitingForPicks || waitingForRecent);
  return {
    ...forMeChoice(
      genres,
      picks.data?.content ?? [],
      recent.data?.content ?? [],
    ),
    pending,
  };
}

// 나를 위한 이야기(시안 reference/sian/fruits-glass-b2 → fruits-polish C): 큰 이름을 상자 밖 위에 두고, 반투명 상자 하나에
// 앞의 세 편이 돌아가며 보이는 큰 추천 칸과 나머지를 옆으로 넘겨 보는 표지 줄을 함께 담는다.
// 불러오는 동안은 같은 크기의 빈 상자(표지·글줄 자리만 옅게)를 먼저 두고, 작품이 오면 상자 안쪽만 서서히 나타난다.
// 위쪽 덧붙임 묶음이라 실패하거나 고를 작품이 없으면 자리를 비워 두고, 아래 모든 이야기 서가가 그대로 보이게 한다.
export function ForMeSection({
  choice,
  shown,
  onShow,
  paused,
}: {
  choice: ForMeChoice;
  shown: number;
  onShow: (index: number) => void;
  paused: boolean;
}) {
  const styles = useStyles();
  const appear = useAppearAfterWaiting(choice.pending);
  if (choice.pending)
    return (
      <View style={styles.block}>
        <SectionHead large title="나를 위한 이야기" />
        <View style={styles.box}>
          <View style={[styles.cardSpace, styles.cardAbove]}>
            <FeatureCardPlaceholder />
          </View>
          <StoryStripPlaceholder coverWidth={STRIP_COVER_WIDTH} />
        </View>
      </View>
    );
  if (choice.stories.length === 0) return null;
  const { featured, rest } = splitForMe(choice.stories);
  return (
    <View style={styles.block}>
      <SectionHead large title="나를 위한 이야기" hint={choice.hint} />
      <View style={styles.box}>
        <Animated.View style={{ opacity: appear }}>
          <View style={[styles.cardSpace, rest.length > 0 && styles.cardAbove]}>
            <FeatureCard
              stories={featured}
              shown={shown}
              onShow={onShow}
              paused={paused}
            />
          </View>
          {rest.length > 0 && (
            <StoryStrip
              stories={rest}
              coverWidth={STRIP_COVER_WIDTH}
              showProgress={false}
            />
          )}
        </Animated.View>
      </View>
    </View>
  );
}

// 빈 상자를 보인 뒤 작품이 오면 상자 안쪽을 서서히 띄운다. 처음부터 작품이 있었으면(둘러보기·캐시) 그대로 보인다.
// 기다리는 동안 미리 0으로 내려 두어, 작품이 온 첫 그림에서 한 번 번쩍 보이지 않게 한다. 동작 줄이기면 바로 보인다.
function useAppearAfterWaiting(waiting: boolean) {
  const reduced = useReducedMotion();
  const opacity = useRef(new Animated.Value(1)).current;
  const waited = useRef(false);
  useEffect(() => {
    if (waiting) {
      waited.current = true;
      opacity.setValue(0);
      return;
    }
    if (!waited.current) return;
    waited.current = false;
    if (reduced) {
      opacity.setValue(1);
      return;
    }
    Animated.timing(opacity, {
      toValue: 1,
      duration: APPEAR_MS,
      useNativeDriver: nativeDriverEnabled,
    }).start();
  }, [waiting, reduced, opacity]);
  return opacity;
}

const useStyles = themedStyles((colors) => ({
  block: { marginTop: 18 },
  // 맨 위 작품 색이 비치는 반투명 상자. 표지 줄은 상자 끝까지 넘어간다.
  box: {
    marginTop: 4,
    borderRadius: 16,
    backgroundColor: colors.forMeBox,
    borderWidth: 1,
    borderColor: colors.forMeBoxEdge,
  },
  cardSpace: { margin: 10 },
  // 아래 표지 줄은 자기 위 여백(16)을 가진다.
  cardAbove: { marginBottom: 0 },
}));
