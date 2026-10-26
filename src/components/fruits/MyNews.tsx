import { Pressable, View } from "react-native";
import { router } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { Text } from "../text";
import { novels } from "../../api/novels";
import { demoStories } from "../../api/demo";
import type { NovelSummary } from "../../api/types";
import {
  mostUrgentNews,
  newsLine,
  type MyNews,
} from "../../design/fruitSections";
import { useSession } from "../../state/session";
import { themedStyles } from "../../theme/themed";
import { CoverThumb } from "../CoverThumb";
import { ErrorBox } from "../ui";
import { SectionHead } from "../search/SectionHead";

// 열매 탭 맨 위의 내 이야기 소식: 내 차례(GET /my-turns)와 내가 맡은 자리(GET /deliveries) 가운데 마감이 가장 가까운
// 한 줄만 보인다(시안 reference/sian/fruits-redesign D). 화면에서 강조하는 것은 이 줄의 "이어 쓰기" 하나다.
// 할 일이 없거나 아직 불러오는 중이면 묶음째 두지 않는다. 쓸 수 있는지는 쓰기 화면이 서버 값으로 다시 본다.
export function MyNewsSection() {
  const styles = useStyles();
  const { mode } = useSession();
  const isDemo = mode === "demo";
  const turns = useQuery({
    queryKey: ["my-turns", mode],
    queryFn: novels.turns,
    enabled: mode === "authenticated",
  });
  const deliveries = useQuery({
    queryKey: ["deliveries", mode],
    queryFn: novels.deliveries,
    enabled: mode === "authenticated",
  });
  if (!isDemo && (turns.error || deliveries.error))
    return (
      <View style={styles.block}>
        <ErrorBox
          error={turns.error ?? deliveries.error}
          retry={() => {
            void turns.refetch();
            void deliveries.refetch();
          }}
        />
      </View>
    );
  // 둘러보기에는 맡은 자리가 없고, 예시 작품 가운데 내 차례인 작품만 있다.
  const news = isDemo
    ? mostUrgentNews(
        demoStories.filter((story) => story.myTurn),
        [],
      )
    : mostUrgentNews(turns.data ?? [], deliveries.data ?? []);
  if (!news) return null;
  return (
    <View style={styles.block}>
      <SectionHead title="내 이야기 소식" />
      <NewsRow news={news} />
    </View>
  );
}

// 소식 한 줄. 마이의 내 할 일도 같은 줄을 쓴다.
export function NewsRow({ news }: { news: MyNews }) {
  const styles = useStyles();
  const { mode } = useSession();
  const story: NovelSummary =
    news.kind === "turn" ? news.story : news.delivery.novel;
  // 둘러보기에서는 쓰기 화면을 거치지 않고 바로 로그인으로 보낸다.
  const write = () => {
    if (mode === "demo") return router.push("/login");
    if (news.kind === "turn")
      return router.push({
        pathname: "/novel/write",
        params: { id: story.id },
      });
    router.push({
      pathname: "/novel/write",
      params: { id: story.id, deliveryId: news.delivery.deliveryId },
    });
  };
  const line = newsLine(news);
  return (
    <View style={styles.row}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${story.title}, ${line}`}
        onPress={() => router.push(`/novel/${story.id}`)}
        style={({ pressed }) => [styles.story, pressed && styles.pressed]}
      >
        <CoverThumb novel={story} width={40} radius={3} />
        <View style={styles.text}>
          <Text style={styles.title} numberOfLines={1}>
            {story.title}
          </Text>
          <Text style={styles.line} numberOfLines={1}>
            {line}
          </Text>
        </View>
      </Pressable>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${story.title} 이어 쓰기`}
        onPress={write}
        style={({ pressed }) => [styles.write, pressed && styles.pressed]}
      >
        <Text style={styles.writeText}>이어 쓰기</Text>
      </Pressable>
    </View>
  );
}

const useStyles = themedStyles((colors) => ({
  block: { marginTop: 14 },
  row: { flexDirection: "row", alignItems: "center", gap: 12, minHeight: 64 },
  story: { flex: 1, flexDirection: "row", alignItems: "center", gap: 12 },
  pressed: { opacity: 0.6 },
  text: { flex: 1, minWidth: 0 },
  title: {
    fontSize: 15,
    fontWeight: "700",
    letterSpacing: -0.3,
    color: colors.ink,
  },
  line: { marginTop: 2, fontSize: 12.5, color: colors.muted },
  // 화면의 유일한 강조. 열매 탭은 각진 말투라 모서리는 표지만큼만 둥글다.
  write: {
    minHeight: 44,
    paddingHorizontal: 14,
    justifyContent: "center",
    borderRadius: 4,
    backgroundColor: colors.ink,
  },
  writeText: { fontSize: 13, fontWeight: "800", color: colors.onInk },
}));
