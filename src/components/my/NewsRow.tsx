import { Pressable, View } from "react-native";
import { router } from "expo-router";
import { Text } from "../text";
import type { NovelSummary } from "../../api/types";
import { newsLine, type MyNews } from "../../design/fruitSections";
import { useSession } from "../../state/session";
import { themedStyles } from "../../theme/themed";
import { CoverThumb } from "../CoverThumb";

// 마이 내 할 일의 한 줄: 작품(누르면 작품 화면)과 "이어 쓰기". 유리 말투라 버튼은 알약 모양이고,
// 할 일이 여럿이면 가장 급한 줄만 진하게, 나머지는 테두리만(quiet) 둔다(강조는 하나).
export function NewsRow({
  news,
  quiet = false,
}: {
  news: MyNews;
  quiet?: boolean;
}) {
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
        style={({ pressed }) => [
          styles.write,
          quiet && styles.quiet,
          pressed && styles.pressed,
        ]}
      >
        <Text style={[styles.writeText, quiet && styles.quietText]}>
          이어 쓰기
        </Text>
      </Pressable>
    </View>
  );
}

const useStyles = themedStyles((colors) => ({
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
  // 화면의 유일한 강조(알약 모양)
  write: {
    minHeight: 44,
    paddingHorizontal: 18,
    justifyContent: "center",
    borderRadius: 22,
    backgroundColor: colors.ink,
  },
  writeText: { fontSize: 13, fontWeight: "800", color: colors.onInk },
  quiet: {
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: colors.line,
  },
  quietText: { color: colors.ink },
}));
