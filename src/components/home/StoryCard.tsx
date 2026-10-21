import { Pressable, Text, View } from "react-native";
import { router } from "expo-router";
import { ArrowUpRight, BookOpen, Users } from "lucide-react-native";
import type { NovelSummary } from "../../api/types";
import { genresLabel, statusLabel, writersLabel } from "../../theme";
import { themedStyles, useColors } from "../../theme/themed";
import { StoryTree } from "../StoryTree";
import { Card, useUi } from "../ui";

export function StoryCard({ story }: { story: NovelSummary }) {
  const ui = useUi();
  const styles = useStyles();
  const colors = useColors();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${story.title}, ${statusLabel[story.status]}`}
      onPress={() => router.push(`/novel/${story.id}`)}
      style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
    >
      <Card style={styles.card}>
        <View style={styles.art}>
          <View style={styles.artText}>
            <Text style={styles.genre} numberOfLines={1}>
              {genresLabel(story)}
            </Text>
            <Text style={styles.chapterNumber}>
              CHAPTER {String(story.chapterCount).padStart(2, "0")}
            </Text>
          </View>
          <View style={styles.tree}>
            <StoryTree novel={story} height={112} />
          </View>
        </View>
        <View style={styles.body}>
          <View style={ui.row}>
            <Text style={styles.status}>● {statusLabel[story.status]}</Text>
            {story.myTurn && <Text style={styles.myTurn}>내 차례</Text>}
          </View>
          <Text style={styles.title}>{story.title}</Text>
          <Text style={ui.body} numberOfLines={2}>
            {story.description}
          </Text>
          <View style={[ui.row, styles.footer]}>
            <View style={styles.metaGroup}>
              <Users size={12} color={colors.muted} />
              <Text style={styles.meta}>{writersLabel(story)}</Text>
              <Text style={styles.meta}>·</Text>
              <BookOpen size={12} color={colors.muted} />
              <Text style={styles.meta}>
                {story.chapterCount}/{story.chapterLimit}장
              </Text>
            </View>
            <View style={styles.openHint}>
              <Text style={styles.openText}>이야기 펼치기</Text>
              <ArrowUpRight size={14} color={colors.green} />
            </View>
          </View>
        </View>
      </Card>
    </Pressable>
  );
}

const useStyles = themedStyles((colors) => ({
  card: { padding: 0, overflow: "hidden" },
  art: {
    height: 120,
    flexDirection: "row",
    alignItems: "center",
    borderBottomWidth: 1,
    borderColor: colors.line,
  },
  artText: { position: "absolute", left: 18, top: 17 },
  tree: { width: 140, marginLeft: "auto", marginRight: 10 },
  genre: {
    fontSize: 11,
    color: colors.ink,
    borderWidth: 1,
    borderColor: colors.line,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    alignSelf: "flex-start",
  },
  chapterNumber: {
    fontSize: 9,
    letterSpacing: 1.5,
    color: colors.muted,
    marginTop: 30,
  },
  body: { padding: 18 },
  status: { fontSize: 10, color: colors.green },
  myTurn: {
    fontSize: 10,
    fontWeight: "700",
    borderWidth: 1,
    borderColor: colors.green,
    color: colors.green,
    padding: 6,
    borderRadius: 6,
  },
  title: {
    fontSize: 20,
    fontWeight: "700",
    color: colors.ink,
    letterSpacing: -0.5,
    marginVertical: 10,
  },
  footer: {
    marginTop: 17,
    paddingTop: 14,
    borderTopWidth: 1,
    borderColor: colors.line,
  },
  metaGroup: { flexDirection: "row", gap: 6, alignItems: "center" },
  meta: { fontSize: 11, color: colors.muted },
  openHint: { flexDirection: "row", gap: 4 },
  openText: { fontSize: 12, color: colors.green },
}));
