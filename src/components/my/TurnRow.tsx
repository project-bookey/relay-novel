import { Pressable, Text, View } from "react-native";
import { router } from "expo-router";
import type { NovelSummary } from "../../api/types";
import { useSession } from "../../state/session";
import { themedStyles } from "../../theme/themed";
import { CoverThumb } from "../CoverThumb";

// 마이 맨 위의 내 차례 한 줄. 화면에서 진하게 강조하는 유일한 동작(이어 쓰기)이다.
// 목록은 서버가 정한 내 차례(GET /my-turns)라 버튼을 바로 두고, 쓸 수 있는지는 쓰기 화면이 서버 값(canWrite)으로 다시 본다.
// 줄을 누르면 작품으로, "이어 쓰기"를 누르면 바로 쓰기 화면으로 간다.
export function TurnRow({ story }: { story: NovelSummary }) {
  const styles = useStyles();
  const { mode } = useSession();
  // 둘러보기에서는 쓰기 화면을 거치지 않고 바로 로그인으로 보낸다.
  const write = () => {
    if (mode === "demo") router.push("/login");
    else router.push({ pathname: "/novel/write", params: { id: story.id } });
  };
  return (
    <View style={styles.row}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`내 차례, ${story.title}`}
        onPress={() => router.push(`/novel/${story.id}`)}
        style={({ pressed }) => [styles.story, pressed && styles.pressed]}
      >
        <CoverThumb novel={story} width={44} square />
        <View style={styles.text}>
          <Text style={styles.eyebrow}>내 차례</Text>
          <Text style={styles.title} numberOfLines={1}>
            {story.title}
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
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.line,
  },
  story: { flex: 1, flexDirection: "row", alignItems: "center", gap: 14 },
  pressed: { opacity: 0.6 },
  text: { flex: 1, minWidth: 0 },
  eyebrow: { fontSize: 12, color: colors.muted },
  title: { fontSize: 16, fontWeight: "700", color: colors.ink, marginTop: 2 },
  write: {
    minHeight: 44,
    paddingHorizontal: 18,
    justifyContent: "center",
    backgroundColor: colors.ink,
  },
  writeText: { fontSize: 14, fontWeight: "700", color: colors.onInk },
}));
