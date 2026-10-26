import { View } from "react-native";
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
import { SectionHead } from "../search/SectionHead";
import { StoryStrip } from "../StoryStrip";
import { FeatureCard } from "./FeatureCard";

export interface ForMeChoice {
  stories: NovelSummary[];
  hint: string;
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
    return { stories: demoForMe(demoStories), hint: "좋아요가 많은 이야기" };
  return forMeChoice(
    genres,
    picks.data?.content ?? [],
    recent.data?.content ?? [],
  );
}

// 나를 위한 이야기(시안 reference/sian/fruits-glass-b2): 큰 이름을 상자 밖 위에 두고, 반투명 상자 하나에
// 앞의 세 편이 돌아가며 보이는 큰 유리 카드와 나머지를 옆으로 넘겨 보는 표지 줄을 함께 담는다.
// 위쪽 덧붙임 묶음이라 불러오는 중·실패하면 자리를 비워 두고, 아래 모든 이야기 서가가 그대로 보이게 한다.
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
  if (choice.stories.length === 0) return null;
  const { featured, rest } = splitForMe(choice.stories);
  return (
    <View style={styles.block}>
      <SectionHead large title="나를 위한 이야기" hint={choice.hint} />
      <View style={styles.box}>
        <View style={[styles.cardSpace, rest.length > 0 && styles.cardAbove]}>
          <FeatureCard
            stories={featured}
            shown={shown}
            onShow={onShow}
            paused={paused}
          />
        </View>
        {rest.length > 0 && <StoryStrip stories={rest} />}
      </View>
    </View>
  );
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
