import { Pressable, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { ArrowUpRight } from "lucide-react-native";
import type { ChapterNode } from "../../api/types";
import { arrangeChapterTree, type BranchRow } from "../../design/chapterTree";
import { colors, storyColorOf } from "../../theme";
import { Card, Label, ui } from "../ui";

export type ChapterListItem = Pick<
  ChapterNode,
  "id" | "parentChapterId" | "chapterNumber" | "title" | "authorNickname"
>;

// 한 단계 깊어질 때마다 들여 쓰는 폭. 깊은 가지도 화면 밖으로 밀리지 않게 상한을 둔다.
const INDENT_STEP = 12;
const MAX_INDENT = 72;

function chapterLabel(chapterNumber: number) {
  return `CHAPTER ${String(chapterNumber).padStart(2, "0")}`;
}

function accessibilityLabelOf(
  row: BranchRow<ChapterListItem>,
  branching: boolean,
) {
  const { node } = row;
  const base = `${chapterLabel(node.chapterNumber)} ${node.title}, ${node.authorNickname}`;
  if (!branching) return base;
  const tip = row.isTip ? ", 끝 열매" : "";
  return `${chapterLabel(node.chapterNumber)} 가지 ${row.label} ${node.title}, ${node.authorNickname}${tip}`;
}

// 회차 목록. 한 줄기로 이어진 작품은 첫 장부터 차례로, 가지가 갈라진 작품은
// 뿌리부터 가지를 따라 깊이만큼 "-"를 붙여 들여 쓰고, 아무도 잇지 않은 끝 가지에는 열매를 단다.
export function ChapterList({
  novelId,
  chapters,
  branching,
}: {
  novelId: number;
  chapters: ChapterListItem[];
  branching: boolean;
}) {
  const rows = arrangeChapterTree(chapters);
  return (
    <>
      {rows.map((row) => {
        const indent = branching
          ? Math.min((row.depth - 1) * INDENT_STEP, MAX_INDENT)
          : 0;
        return (
          <Pressable
            key={row.node.id}
            accessibilityRole="button"
            accessibilityLabel={accessibilityLabelOf(row, branching)}
            onPress={() =>
              router.push({
                pathname: "/novel/read",
                params: { id: novelId, chapterId: row.node.id },
              })
            }
            style={{ marginLeft: indent }}
          >
            <Card>
              <View style={ui.row}>
                <Label>{chapterLabel(row.node.chapterNumber)}</Label>
                <ArrowUpRight size={16} color={colors.green} />
              </View>
              {branching && (
                <View style={styles.branch}>
                  <Text style={styles.branchName}>
                    {`${row.indent} 가지 ${row.label}`}
                  </Text>
                  {row.isTip && (
                    <View style={styles.tip}>
                      <View
                        style={[
                          styles.fruitDot,
                          { backgroundColor: storyColorOf(novelId) },
                        ]}
                      />
                      <Text style={styles.tipText}>열매</Text>
                    </View>
                  )}
                </View>
              )}
              <Text style={[ui.sectionTitle, styles.title]}>
                {row.node.title}
              </Text>
              <Text style={ui.body}>{row.node.authorNickname}</Text>
            </Card>
          </Pressable>
        );
      })}
    </>
  );
}

const styles = StyleSheet.create({
  title: { marginTop: 10, marginBottom: 6 },
  branch: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 8 },
  branchName: { fontSize: 12, color: colors.muted, fontWeight: "600" },
  tip: { flexDirection: "row", alignItems: "center", gap: 4 },
  fruitDot: { width: 8, height: 8, borderRadius: 4 },
  tipText: { fontSize: 11, color: colors.muted },
});
