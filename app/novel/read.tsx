import { Text, View } from "react-native";
import { Redirect, router, useLocalSearchParams } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { novels } from "../../src/api/novels";
import { demoChapter, demoDetail } from "../../src/api/demo";
import type { Chapter, ChapterNode, NovelDetail } from "../../src/api/types";
import { branchesFrom } from "../../src/design/chapterTree";
import {
  firstTipUnder,
  lineThrough,
  storyLines,
} from "../../src/design/storyLines";
import { useSession } from "../../src/state/session";
import {
  useChapterTree,
  useMyDelivery,
} from "../../src/components/novel/useNovelChapters";
import {
  LineEndNote,
  LineProgress,
  SiblingSwitcher,
} from "../../src/components/novel/LineReading";
import { SelfContinue } from "../../src/components/novel/SelfContinue";
import { ApiError } from "../../src/api/transport";
import {
  Button,
  ErrorBox,
  Label,
  Loading,
  Screen,
  useUi,
} from "../../src/components/ui";
import { themedStyles } from "../../src/theme/themed";

export default function Read() {
  const params = useLocalSearchParams<{
    id: string;
    chapterId: string;
    tipId?: string;
  }>();
  const id = Number(params.id);
  const chapterId = Number(params.chapterId);
  const tipId = params.tipId ? Number(params.tipId) : undefined;
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
    // 숨은 가지(404)는 다시 물어도 같으니 바로 안내한다.
    retry: (count, error) => !isHiddenBranch(error) && count < 1,
  });
  const tree = useChapterTree(id, detail.data);
  if (mode === "guest") return <Redirect href="/login" />;
  const chapter = query.data;
  return (
    <Screen title={detail.data?.novel.title || "이야기 읽기"}>
      {query.isPending && <Loading />}
      {isHiddenBranch(query.error) && <HiddenBranch novelId={id} />}
      {!!query.error && !isHiddenBranch(query.error) && (
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
          tipId={tipId}
        />
      )}
    </Screen>
  );
}

function ChapterBody({
  chapter,
  nodes,
  detail,
  tipId,
}: {
  chapter: Chapter;
  nodes: ChapterNode[];
  detail?: NovelDetail;
  tipId?: number;
}) {
  const ui = useUi();
  const styles = useStyles();
  const novelId = chapter.novelId;
  const branching = detail?.novel.mode === "OPEN";
  const next = branchesFrom(nodes, chapter.id);
  // 가지가 갈라진 작품은 고른 열매(tipId)까지 이어진 줄기를 따라 읽는다. 아직 한 줄기면 목차처럼 읽는다.
  const lines = branching ? storyLines(nodes) : [];
  const line =
    lines.length > 1 ? lineThrough(lines, nodes, chapter.id, tipId) : undefined;
  const lineIndex =
    line?.path.findIndex((node) => node.id === chapter.id) ?? -1;
  // 줄기를 못 찾으면(나무가 아직 갱신 전 등) 먼저 쓴 가지로 잇는다. 한 줄기 작품은 다음 회차가 하나뿐이다.
  const nextChapter = line ? line.path[lineIndex + 1] : next[0];
  const myDelivery = useMyDelivery(novelId, detail?.myDeliveryId);
  const goTo = (chapterId: number, nextTipId = line?.tip.id) =>
    router.setParams({ chapterId, tipId: nextTipId });
  // 차례대로 쓰는 작품은 마지막 장을 읽은 다음 작가가, 열매로 받은 작품은 받은 회차를 읽은 사람이 이어 쓴다.
  const canContinueTurn =
    !!detail?.canWrite && !branching && nodes.length > 0 && next.length === 0;
  const canContinueBranch =
    !!detail?.myDeliveryId && myDelivery?.chapterId === chapter.id;
  const atLineEnd = !!line && !nextChapter;
  // 서버가 내 회차라 햇살로 이어 쓸 수 있다고 할 때만. 받은 열매가 있으면 그쪽이 먼저다.
  const canSelfContinue = !!chapter.canSelfContinue && !canContinueBranch;

  return (
    <>
      {!!line && !!detail && (
        <LineProgress
          novel={detail.novel}
          line={line}
          readingAt={chapter.chapterNumber}
        />
      )}
      <View style={styles.header}>
        <Label>{`CHAPTER ${String(chapter.chapterNumber).padStart(2, "0")}`}</Label>
        <View style={styles.titleRow}>
          <Text style={[ui.heading, styles.title]}>{chapter.title}</Text>
          {branching && (
            <SiblingSwitcher
              nodes={nodes}
              chapterId={chapter.id}
              onSwitch={(sibling) =>
                goTo(sibling, firstTipUnder(nodes, sibling)?.id)
              }
            />
          )}
        </View>
        <Text style={ui.body}>
          {`${chapter.authorNickname} · ${new Date(chapter.createdAt).toLocaleDateString("ko-KR")}`}
        </Text>
      </View>
      <Text selectable style={styles.body}>
        {chapter.body}
      </Text>
      {atLineEnd && !!detail && !!line && (
        <LineEndNote novel={detail.novel} line={line} />
      )}
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
        {!!nextChapter && (
          <View style={styles.navigationButton}>
            <Button onPress={() => goTo(nextChapter.id)}>다음 장</Button>
          </View>
        )}
        {atLineEnd && (
          <View style={styles.navigationButton}>
            <Button outline onPress={() => backToNovel(novelId)}>
              다른 열매 보기
            </Button>
          </View>
        )}
      </View>
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
      {canSelfContinue && <SelfContinue chapter={chapter} />}
    </>
  );
}

// 수거함에 들어간 가지는 나무에서 숨겨져 서버가 찾지 못한다(404).
function isHiddenBranch(error: unknown) {
  return error instanceof ApiError && error.status === 404;
}

function HiddenBranch({ novelId }: { novelId: number }) {
  const ui = useUi();
  return (
    <View>
      <Text style={ui.sectionTitle}>이 가지는 지금 볼 수 없어요.</Text>
      <Text style={ui.body}>나무에서 내려왔거나 사라졌을 수 있어요.</Text>
      <Button outline onPress={() => backToNovel(novelId)}>
        다른 열매 보기
      </Button>
    </View>
  );
}

// 읽기는 상세의 줄기 목록에서 들어오므로 뒤로 가면 다른 열매를 고를 수 있다.
function backToNovel(novelId: number) {
  if (router.canGoBack()) router.back();
  else router.replace({ pathname: "/novel/[id]", params: { id: novelId } });
}

const useStyles = themedStyles((colors) => ({
  header: { marginVertical: 25 },
  titleRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  title: { flex: 1 },
  body: { fontSize: 17, lineHeight: 32, color: colors.ink, paddingBottom: 35 },
  navigation: { flexDirection: "row", gap: 10 },
  navigationButton: { flex: 1 },
}));
