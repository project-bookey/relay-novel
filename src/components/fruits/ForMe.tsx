import { Pressable, View } from "react-native";
import { router } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { Text } from "../text";
import { novels } from "../../api/novels";
import { demoStories } from "../../api/demo";
import type { NovelSummary } from "../../api/types";
import { progressLine } from "../../design/fruitList";
import {
  demoForMe,
  forMeChoice,
  forMeGenres,
} from "../../design/fruitSections";
import { useSession } from "../../state/session";
import { statusLabel } from "../../theme";
import { themedStyles } from "../../theme/themed";
import { CoverThumb } from "../CoverThumb";
import { SectionHead } from "../search/SectionHead";
import { LikeMark } from "./LikeMark";

const BIG_COVER = 150;
// 아래 두 편은 작은 표지 옆에 제목을 두는 낮은 칸이다. 3:4 표지를 반 칸 너비로 키우면 묶음이 첫 화면을
// 다 차지해 모든 이야기 서가가 밀려나서, 큰 칸은 하나만 둔다(표지는 자르지 않는다).
const PAIR_COVER = 56;
const PAIR_GAP = 12;
const COVER_RADIUS = 4;

// 나를 위한 이야기: 관심 장르(앞의 세 개)의 작품 세 편을 큰 칸 하나 + 두 칸으로 보인다
// (시안 reference/sian/fruits-redesign D "정리 + 크기" — 표지 벽에 리듬을 주는 큰 칸은 여기 하나뿐).
// 관심 장르가 없거나 맞는 작품이 없으면 최근에 심은 이야기 세 편을 놓는다. 둘러보기는 좋아요가 많은 예시 세 편.
export function ForMeSection() {
  const styles = useStyles();
  const { mode } = useSession();
  const isDemo = mode === "demo";
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
  const choice = isDemo
    ? { stories: demoForMe(demoStories), hint: "좋아요가 많은 이야기" }
    : forMeChoice(
        genres,
        picks.data?.content ?? [],
        recent.data?.content ?? [],
      );
  const { stories } = choice;
  // 위쪽 덧붙임 묶음이라 불러오는 중·실패하면 자리를 비워 두고, 아래 모든 이야기 서가가 그대로 보이게 한다.
  if (stories.length === 0) return null;
  const [big, ...pair] = stories;
  return (
    <View style={styles.block}>
      <SectionHead title="나를 위한 이야기" hint={choice.hint} />
      <BigTile story={big} />
      {pair.length > 0 && <PairRow stories={pair} />}
    </View>
  );
}

function openStory(story: NovelSummary) {
  router.push(`/novel/${story.id}`);
}

function BigTile({ story }: { story: NovelSummary }) {
  const styles = useStyles();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${story.title}, ${statusLabel[story.status]}`}
      accessibilityHint={`${story.description}, ${progressLine(story)}`}
      onPress={() => openStory(story)}
      style={({ pressed }) => [styles.big, pressed && styles.pressed]}
    >
      <View>
        <CoverThumb novel={story} width={BIG_COVER} radius={COVER_RADIUS} />
        <LikeMark count={story.likeCount} coverRadius={COVER_RADIUS} />
      </View>
      <View style={styles.bigText}>
        <Text style={styles.bigTitle} numberOfLines={2}>
          {story.title}
        </Text>
        <Text style={styles.bigDescription} numberOfLines={3}>
          {story.description}
        </Text>
        <Text style={styles.progress} numberOfLines={1}>
          {progressLine(story)}
        </Text>
      </View>
    </Pressable>
  );
}

function PairRow({ stories }: { stories: NovelSummary[] }) {
  const styles = useStyles();
  return (
    <View style={styles.pair}>
      {stories.map((story) => (
        <Pressable
          key={story.id}
          accessibilityRole="button"
          accessibilityLabel={`${story.title}, ${statusLabel[story.status]}`}
          accessibilityHint={progressLine(story)}
          onPress={() => openStory(story)}
          style={({ pressed }) => [styles.pairItem, pressed && styles.pressed]}
        >
          <CoverThumb novel={story} width={PAIR_COVER} radius={3} />
          <View style={styles.pairText}>
            <Text style={styles.pairTitle} numberOfLines={2}>
              {story.title}
            </Text>
            <Text style={styles.progress} numberOfLines={1}>
              {progressLine(story)}
            </Text>
          </View>
        </Pressable>
      ))}
    </View>
  );
}

const useStyles = themedStyles((colors) => ({
  block: { marginTop: 22 },
  pressed: { opacity: 0.6 },
  big: { flexDirection: "row", alignItems: "flex-end", gap: 16, marginTop: 8 },
  bigText: { flex: 1, minWidth: 0, paddingBottom: 4 },
  bigTitle: {
    fontSize: 20,
    lineHeight: 26,
    fontWeight: "800",
    letterSpacing: -0.5,
    color: colors.ink,
  },
  bigDescription: {
    marginTop: 8,
    fontSize: 13,
    lineHeight: 19,
    color: colors.muted,
  },
  progress: {
    marginTop: 6,
    fontSize: 12,
    lineHeight: 16,
    color: colors.progressInk,
  },
  pair: { flexDirection: "row", gap: PAIR_GAP, marginTop: 18 },
  pairItem: { flex: 1, flexDirection: "row", alignItems: "center", gap: 10 },
  pairText: { flex: 1, minWidth: 0 },
  pairTitle: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "700",
    letterSpacing: -0.3,
    color: colors.ink,
  },
}));
