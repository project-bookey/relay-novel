import { Pressable, View } from "react-native";
import { router } from "expo-router";
import { Text } from "../text";
import type { NovelSummary } from "../../api/types";
import { splitByKeyword } from "../../design/fruitList";
import { statusLabel } from "../../theme";
import { themedStyles } from "../../theme/themed";
import { CoverThumb } from "../CoverThumb";

// 표지는 검색 결과에서만 작게 보인다(사용자 결정).
const COVER_WIDTH = 44;
const COVER_RADIUS = 3;

// 검색 결과 한 줄: 작은 표지 · 제목(찾은 말은 굵게) · 만든 사람과 장 수.
export function SearchResultRow({
  story,
  keyword,
  onOpen,
}: {
  story: NovelSummary;
  keyword: string;
  onOpen: () => void;
}) {
  const styles = useStyles();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${story.title}, ${statusLabel[story.status]}`}
      accessibilityHint={`${story.ownerNickname}, ${story.chapterCount}장`}
      onPress={() => {
        onOpen();
        router.push(`/novel/${story.id}`);
      }}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
    >
      <CoverThumb novel={story} width={COVER_WIDTH} radius={COVER_RADIUS} />
      <View style={styles.text}>
        <Text style={styles.title} numberOfLines={1}>
          {splitByKeyword(story.title, keyword).map((part, index) => (
            <Text key={index} style={part.matched ? styles.matched : undefined}>
              {part.text}
            </Text>
          ))}
        </Text>
        <Text style={styles.sub} numberOfLines={1}>
          {`${story.ownerNickname} · ${story.chapterCount}장`}
        </Text>
      </View>
    </Pressable>
  );
}

const useStyles = themedStyles((colors) => ({
  row: { flexDirection: "row", alignItems: "center", gap: 14, minHeight: 72 },
  pressed: { opacity: 0.6 },
  text: { flex: 1, minWidth: 0 },
  title: { fontSize: 16, letterSpacing: -0.3, color: colors.ink },
  matched: { fontWeight: "800" },
  sub: { marginTop: 3, fontSize: 13, color: colors.muted },
}));
