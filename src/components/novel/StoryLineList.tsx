import { Pressable, Text, View } from "react-native";
import { router } from "expo-router";
import type { ChapterNode, NovelSummary } from "../../api/types";
import { lineRuns, type StoryLine } from "../../design/storyLines";
import { darken, storyColorOf } from "../../theme";
import { themedStyles } from "../../theme/themed";
import { Card, Label, useUi } from "../ui";
import { LineBranch } from "./LineBranch";

// 줄기가 끝났는지는 서버가 준 값으로만 정한다: 작품 완결, 또는 끝 회차가 목표 회차에 닿음(그 가지는 더 배달되지 않는다).
export function isLineFinished(
  novel: Pick<NovelSummary, "status" | "chapterLimit">,
  line: StoryLine<ChapterNode>,
) {
  return (
    novel.status === "COMPLETED" || line.tip.chapterNumber >= novel.chapterLimit
  );
}

function stateTextOf(finished: boolean, mine: boolean) {
  if (mine) return "나에게 온 열매";
  return finished ? "완결" : "자라는 중";
}

function forkText(line: StoryLine<ChapterNode>) {
  if (!line.fork) return `처음 쓴 줄기 · 1장부터 ${line.path.length}장까지`;
  return `열매 ${line.fork.fromLine}의 ${line.fork.chapter.chapterNumber}장에서 갈라졌어요`;
}

// 이 줄기가 거쳐 온 열매들. 길면 처음과 마지막 둘만 남긴다.
function lineageText(line: StoryLine<ChapterNode>) {
  const ancestors = [...new Set(line.ownerOf)].filter(
    (owner) => owner !== line.number,
  );
  if (ancestors.length < 2) return "";
  const names = ancestors.map((owner) => `열매 ${owner}`);
  const shown = names.length > 3 ? [names[0], "…", ...names.slice(-2)] : names;
  return `${[...shown, "여기"].join(" › ")} · ${ancestors.length}번 갈라짐`;
}

function authorsText(line: StoryLine<ChapterNode>) {
  const authors = [...new Set(line.path.map((node) => node.authorNickname))];
  const shown = authors.slice(0, 2).join(", ");
  const more = authors.length > 2 ? " 외" : "";
  return `작가 ${authors.length}명 · ${shown}${more}`;
}

// 열매로 퍼뜨린 작품의 목록. 끝 열매 하나가 이야기 한 줄기이고, 누르면 1장부터 그 열매까지 이어 읽는다.
export function StoryLineList({
  novel,
  lines,
  myDeliveryChapterId,
}: {
  novel: NovelSummary;
  lines: StoryLine<ChapterNode>[];
  // 내가 받은 열매의 회차. 그 회차가 끝인 줄기에 "나에게 온 열매"를 붙인다.
  myDeliveryChapterId?: number;
}) {
  return (
    <>
      {lines.map((line) => (
        <LineCard
          key={line.tip.id}
          novel={novel}
          line={line}
          finished={isLineFinished(novel, line)}
          mine={line.tip.id === myDeliveryChapterId}
        />
      ))}
    </>
  );
}

function LineCard({
  novel,
  line,
  finished,
  mine,
}: {
  novel: NovelSummary;
  line: StoryLine<ChapterNode>;
  finished: boolean;
  mine: boolean;
}) {
  const ui = useUi();
  const styles = useStyles();
  const { runs, mergedLines } = lineRuns(line);
  const lineage = lineageText(line);
  const accessibilityLabel = [
    `열매 ${line.number}`,
    `${line.path.length}장`,
    line.tip.title,
    stateTextOf(finished, mine),
    forkText(line),
  ].join(", ");

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      onPress={() =>
        router.push({
          pathname: "/novel/read",
          params: {
            id: novel.id,
            chapterId: line.path[0].id,
            tipId: line.tip.id,
          },
        })
      }
    >
      <Card>
        <View style={ui.row}>
          <Label>{`열매 ${line.number} · ${line.path.length}장`}</Label>
          <StateTag novelId={novel.id} finished={finished} mine={mine} />
        </View>
        <Text style={[ui.sectionTitle, styles.title]}>{line.tip.title}</Text>
        <LineBranch
          novelId={novel.id}
          runs={runs}
          mergedLines={mergedLines}
          ownLine={line.number}
          chapterCount={line.path.length}
          finished={finished}
        />
        <Text style={styles.fork}>{forkText(line)}</Text>
        {!!lineage && <Text style={styles.lineage}>{lineage}</Text>}
        <Text style={ui.body}>{authorsText(line)}</Text>
      </Card>
    </Pressable>
  );
}

// 상태는 색만이 아니라 글자와 모양(열매·봉오리)으로도 구분한다. 진하게 강조하는 건 나에게 온 열매 하나다.
function StateTag({
  novelId,
  finished,
  mine,
}: {
  novelId: number;
  finished: boolean;
  mine: boolean;
}) {
  const styles = useStyles();
  if (mine)
    return (
      <View style={[styles.tag, styles.mineTag]}>
        <Text style={[styles.tagText, styles.mineTagText]}>나에게 온 열매</Text>
      </View>
    );
  // 가지 끝 그림과 같게: 끝난 줄기는 작품 색 열매, 자라는 줄기는 봉오리
  const mark = finished
    ? [styles.fruitMark, { backgroundColor: storyColorOf(novelId) }]
    : styles.budMark;
  return (
    <View style={styles.tag}>
      <View style={mark} />
      <Text style={styles.tagText}>{stateTextOf(finished, false)}</Text>
    </View>
  );
}

const useStyles = themedStyles((colors) => ({
  title: { marginTop: 10, marginBottom: 4 },
  fork: { fontSize: 13, fontWeight: "600", color: colors.ink, marginTop: 4 },
  lineage: { fontSize: 12, color: colors.muted, marginTop: 2 },
  tag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.line,
  },
  tagText: { fontSize: 11, fontWeight: "600", color: colors.muted },
  mineTag: { backgroundColor: colors.ink, borderColor: colors.ink },
  mineTagText: { color: colors.onInk },
  fruitMark: { width: 8, height: 8, borderRadius: 4 },
  budMark: {
    width: 8,
    height: 8,
    borderRadius: 4,
    borderWidth: 1,
    backgroundColor: colors.bud,
    borderColor: darken(colors.bud, 0.3),
  },
}));
