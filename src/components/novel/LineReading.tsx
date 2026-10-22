import { Pressable, View } from "react-native";
import { Text } from "../text";
import { ChevronLeft, ChevronRight } from "lucide-react-native";
import type { ChapterNode, NovelSummary } from "../../api/types";
import { lineRuns, siblingsOf, type StoryLine } from "../../design/storyLines";
import { darken, storyColorOf } from "../../theme";
import { themedStyles, useColors } from "../../theme/themed";
import { useUi } from "../ui";
import { LineBranch } from "./LineBranch";
import { isLineFinished } from "./StoryLineList";

// 읽기 화면 위쪽: 지금 읽는 줄기의 가지에 "읽는 중" 표시를 단다.
export function LineProgress({
  novel,
  line,
  readingAt,
}: {
  novel: NovelSummary;
  line: StoryLine<ChapterNode>;
  readingAt: number;
}) {
  const styles = useStyles();
  const { runs, mergedLines } = lineRuns(line);
  return (
    <View
      accessible
      accessibilityLabel={`열매 ${line.number} 줄기, ${line.path.length}장 중 ${readingAt}장 읽는 중`}
      style={styles.progress}
    >
      <View style={styles.progressHead}>
        <View
          style={[styles.dot, { backgroundColor: storyColorOf(novel.id) }]}
        />
        <Text style={styles.progressText}>
          {`열매 ${line.number} 줄기 · ${readingAt}/${line.path.length}장 읽는 중`}
        </Text>
      </View>
      <LineBranch
        novelId={novel.id}
        runs={runs}
        mergedLines={mergedLines}
        ownLine={line.number}
        chapterCount={line.path.length}
        finished={isLineFinished(novel, line)}
        readingAt={readingAt}
      />
    </View>
  );
}

// 줄기의 마지막 장까지 읽었을 때. 아직 자라는 줄기면 누군가 이어 쓰면 다음 장이 열린다고 알려 준다.
export function LineEndNote({
  novel,
  line,
}: {
  novel: NovelSummary;
  line: StoryLine<ChapterNode>;
}) {
  const ui = useUi();
  const styles = useStyles();
  const colors = useColors();
  const finished = isLineFinished(novel, line);
  const title = finished
    ? `열매 ${line.number}의 끝이에요`
    : "이 줄기는 아직 자라는 중이에요";
  const message = finished
    ? "다른 열매의 이야기도 읽어 보세요."
    : `누군가 이어 쓰면 여기에 다음 장이 열려요. 목표는 ${novel.chapterLimit}장이에요.`;
  const mark = finished
    ? { backgroundColor: storyColorOf(novel.id) }
    : { backgroundColor: colors.bud, borderColor: darken(colors.bud, 0.3) };
  return (
    <View style={styles.note}>
      <View style={[styles.noteMark, mark]} />
      <View style={styles.noteText}>
        <Text style={styles.noteTitle}>{title}</Text>
        <Text style={ui.body}>{message}</Text>
      </View>
    </View>
  );
}

// 같은 회차에서 갈라진 옆 가지로 넘기기. 갈라진 곳에서만 보인다.
export function SiblingSwitcher({
  nodes,
  chapterId,
  onSwitch,
}: {
  nodes: ChapterNode[];
  chapterId: number;
  onSwitch: (siblingId: number) => void;
}) {
  const styles = useStyles();
  const colors = useColors();
  const { siblings, index } = siblingsOf(nodes, chapterId);
  if (siblings.length < 2 || index < 0) return null;
  const previous = siblings[index - 1];
  const next = siblings[index + 1];
  return (
    <View style={styles.switcher}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="이전 가지"
        accessibilityState={{ disabled: !previous }}
        disabled={!previous}
        hitSlop={6}
        onPress={() => {
          if (previous) onSwitch(previous.id);
        }}
        style={styles.switchButton}
      >
        <ChevronLeft size={20} color={previous ? colors.ink : colors.line} />
      </Pressable>
      <Text
        accessibilityLabel={`갈라진 가지 ${siblings.length}개 중 ${index + 1}번째`}
        style={styles.switchCount}
      >
        {`${index + 1}/${siblings.length}`}
      </Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="다음 가지"
        accessibilityState={{ disabled: !next }}
        disabled={!next}
        hitSlop={6}
        onPress={() => {
          if (next) onSwitch(next.id);
        }}
        style={styles.switchButton}
      >
        <ChevronRight size={20} color={next ? colors.ink : colors.line} />
      </Pressable>
    </View>
  );
}

const useStyles = themedStyles((colors) => ({
  progress: {
    marginTop: 16,
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 4,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.line,
  },
  progressHead: { flexDirection: "row", alignItems: "center", gap: 8 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  progressText: { fontSize: 12, fontWeight: "600", color: colors.muted },
  note: {
    flexDirection: "row",
    gap: 12,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.line,
    marginBottom: 16,
  },
  noteMark: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 1,
    borderColor: "transparent",
    marginTop: 2,
  },
  noteText: { flex: 1 },
  noteTitle: { fontSize: 14, fontWeight: "700", color: colors.ink },
  switcher: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 22,
  },
  switchButton: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  switchCount: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.muted,
    minWidth: 26,
    textAlign: "center",
  },
}));
