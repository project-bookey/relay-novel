import { StyleSheet, Text, View } from "react-native";
import { Redirect, router, useLocalSearchParams } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { novels } from "../../src/api/novels";
import { demoChapter, demoDetail } from "../../src/api/demo";
import type { Chapter, ChapterNode, NovelDetail } from "../../src/api/types";
import { arrangeChapterTree, branchesFrom } from "../../src/design/chapterTree";
import { useSession } from "../../src/state/session";
import {
  useChapterTree,
  useMyDelivery,
} from "../../src/components/novel/useNovelChapters";
import {
  Screen,
  Label,
  Button,
  Loading,
  ErrorBox,
  ui,
} from "../../src/components/ui";
import { colors } from "../../src/theme";

export default function Read() {
  const params = useLocalSearchParams<{ id: string; chapterId: string }>();
  const id = Number(params.id);
  const chapterId = Number(params.chapterId);
  const { mode } = useSession();
  const detail = useQuery({
    queryKey: ["novel", id, mode],
    queryFn: () =>
      mode === "demo" ? Promise.resolve(demoDetail(id)) : novels.get(id),
    enabled: mode === "demo" || mode === "authenticated",
  });
  const query = useQuery({
    queryKey: ["chapter", id, chapterId, mode],
    queryFn: async () =>
      mode === "demo"
        ? demoChapter(id, chapterId)
        : novels.chapter(id, chapterId),
    enabled: mode === "demo" || mode === "authenticated",
  });
  const tree = useChapterTree(id, detail.data);
  if (mode === "guest") return <Redirect href="/login" />;
  const chapter = query.data;
  return (
    <Screen title={detail.data?.novel.title || "이야기 읽기"}>
      {query.isPending && <Loading />}
      {!!query.error && (
        <ErrorBox
          error={query.error}
          retry={() => {
            void query.refetch();
          }}
        />
      )}
      {!!chapter && (
        <ChapterBody
          chapter={chapter}
          nodes={tree.data ?? []}
          detail={detail.data}
        />
      )}
    </Screen>
  );
}

function ChapterBody({
  chapter,
  nodes,
  detail,
}: {
  chapter: Chapter;
  nodes: ChapterNode[];
  detail?: NovelDetail;
}) {
  const novelId = chapter.novelId;
  const branching = detail?.novel.mode === "OPEN";
  const labels = new Map(
    arrangeChapterTree(nodes).map((row) => [row.node.id, row.label]),
  );
  const next = branchesFrom(nodes, chapter.id);
  const myDelivery = useMyDelivery(novelId, detail?.myDeliveryId);
  const goTo = (chapterId: number) => router.setParams({ chapterId });
  // 차례대로 쓰는 작품은 마지막 장을 읽은 다음 작가가, 열매로 받은 작품은 받은 회차를 읽은 사람이 이어 쓴다.
  const canContinueTurn =
    !!detail?.canWrite && !branching && nodes.length > 0 && next.length === 0;
  const canContinueBranch =
    !!detail?.myDeliveryId && myDelivery?.chapterId === chapter.id;
  const branchLabel = labels.get(chapter.id);

  return (
    <>
      <View style={styles.header}>
        <Label>
          {`CHAPTER ${String(chapter.chapterNumber).padStart(2, "0")}`}
          {branching && !!branchLabel ? ` · 가지 ${branchLabel}` : ""}
        </Label>
        <Text style={ui.heading}>{chapter.title}</Text>
        <Text style={ui.body}>
          {`${chapter.authorNickname} · ${new Date(chapter.createdAt).toLocaleDateString("ko-KR")}`}
        </Text>
      </View>
      <Text selectable style={styles.body}>
        {chapter.body}
      </Text>
      <View style={styles.navigation}>
        {chapter.parentChapterId != null && (
          <View style={styles.navigationButton}>
            <Button
              outline
              onPress={() => goTo(chapter.parentChapterId as number)}
            >
              이전 장
            </Button>
          </View>
        )}
        {next.length === 1 && (
          <View style={styles.navigationButton}>
            <Button onPress={() => goTo(next[0].id)}>다음 장</Button>
          </View>
        )}
      </View>
      {next.length > 1 && (
        <>
          <Text style={ui.label}>여기서 갈라진 가지</Text>
          {next.map((branch) => (
            <Button key={branch.id} outline onPress={() => goTo(branch.id)}>
              {`가지 ${labels.get(branch.id) ?? ""} · ${branch.title}`}
            </Button>
          ))}
        </>
      )}
      {canContinueTurn && (
        <Button
          onPress={() =>
            router.push({ pathname: "/novel/write", params: { id: novelId } })
          }
        >
          이제 당신의 이야기 이어 쓰기
        </Button>
      )}
      {canContinueBranch && (
        <Button
          onPress={() =>
            router.push({
              pathname: "/novel/write",
              params: { id: novelId, deliveryId: detail?.myDeliveryId },
            })
          }
        >
          이 회차에서 가지 뻗어 이어 쓰기
        </Button>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  header: { marginVertical: 25 },
  body: { fontSize: 17, lineHeight: 32, color: colors.ink, paddingBottom: 35 },
  navigation: { flexDirection: "row", gap: 10 },
  navigationButton: { flex: 1 },
});
