import { Pressable, View } from "react-native";
import { router } from "expo-router";
import { ChevronRight } from "lucide-react-native";
import { Text } from "../text";
import { themedStyles, useColors } from "../../theme/themed";
import { ErrorBox, Loading } from "../ui";
import { MyStoryStrip } from "./MyStoryStrip";
import {
  shelfCopy,
  shelfHref,
  useMyStories,
  type MyShelf,
} from "./useMyStories";

// 마이의 책장 하나(시안 reference/sian/my-redesign A′). 책장 이름을 크게 상자 밖 위에 두고(사용자 요청),
// 조금 각진 옅은 상자 안에서 표지를 옆으로 넘겨 본다. "모두 보기"는 책장 화면으로 간다.
export function MyShelfSection({ shelf }: { shelf: MyShelf }) {
  const styles = useStyles();
  const colors = useColors();
  const { query, isDemo, stories, total } = useMyStories(shelf);
  const { title, empty } = shelfCopy[shelf];
  const loading = !isDemo && query.isPending;
  // 처음 불러오다 실패했을 때만 상자 안을 오류로 바꾼다.
  const failed = !isDemo && !!query.error && !query.data;
  return (
    <View style={styles.section}>
      <View style={styles.head}>
        <View style={styles.titleRow}>
          <Text accessibilityRole="header" style={styles.title}>
            {title}
          </Text>
          {total !== undefined && total > 0 && (
            <Text style={styles.count}>{String(total)}</Text>
          )}
        </View>
        {stories.length > 0 && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`${title} 모두 보기`}
            onPress={() => router.push(shelfHref(shelf))}
            style={({ pressed }) => [styles.more, pressed && styles.pressed]}
          >
            <Text style={styles.moreText}>모두 보기</Text>
            <ChevronRight size={16} color={colors.muted} />
          </Pressable>
        )}
      </View>
      <View style={styles.box}>
        {loading && <Loading />}
        {failed && (
          <View style={styles.boxInner}>
            <ErrorBox
              error={query.error}
              retry={() => {
                void query.refetch();
              }}
            />
          </View>
        )}
        {!loading && !failed && stories.length === 0 && (
          <Text style={styles.empty}>{empty}</Text>
        )}
        {stories.length > 0 && <MyStoryStrip stories={stories} />}
      </View>
    </View>
  );
}

const useStyles = themedStyles((colors) => ({
  section: { marginTop: 22 },
  head: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    minHeight: 48,
  },
  titleRow: {
    flexShrink: 1,
    flexDirection: "row",
    alignItems: "baseline",
    gap: 7,
  },
  title: {
    fontSize: 21,
    fontWeight: "800",
    letterSpacing: -0.6,
    color: colors.ink,
  },
  count: { fontSize: 15, fontWeight: "600", color: colors.muted },
  more: { minHeight: 44, flexDirection: "row", alignItems: "center", gap: 2 },
  moreText: { fontSize: 13.5, color: colors.muted },
  pressed: { opacity: 0.6 },
  // 사용자 요청 "조금 각지게"(모서리 12), "흰색에 가깝게"(shelfBox)
  box: {
    marginTop: 4,
    borderRadius: 12,
    overflow: "hidden",
    backgroundColor: colors.shelfBox,
  },
  boxInner: { paddingHorizontal: 16 },
  empty: {
    fontSize: 14,
    lineHeight: 22,
    color: colors.muted,
    padding: 16,
  },
}));
