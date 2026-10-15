import { useState } from "react";
import { Text } from "react-native";
import { Redirect, router, useLocalSearchParams } from "expo-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { novels } from "../../src/api/novels";
import { demoDetail } from "../../src/api/demo";
import type { ChapterNode, NovelDetail } from "../../src/api/types";
import { useSession } from "../../src/state/session";
import { NovelOverview } from "../../src/components/novel/NovelOverview";
import { TurnCard } from "../../src/components/novel/TurnCard";
import { OpenRelayCard } from "../../src/components/novel/OpenRelayCard";
import { CircleControls } from "../../src/components/novel/CircleControls";
import { CompleteControl } from "../../src/components/novel/CompleteControl";
import { AuthorList } from "../../src/components/novel/Members";
import { ChapterList } from "../../src/components/novel/ChapterList";
import {
  useChapterTree,
  useMyDelivery,
} from "../../src/components/novel/useNovelChapters";
import {
  Button,
  Card,
  ErrorBox,
  Loading,
  Screen,
  useUi,
} from "../../src/components/ui";

type NovelAction =
  | { type: "apply" }
  | { type: "start" }
  | { type: "complete" }
  | { type: "decide"; userId: number; approved: boolean };

function runAction(novelId: number, action: NovelAction) {
  switch (action.type) {
    case "apply":
      return novels.apply(novelId);
    case "start":
      return novels.start(novelId);
    case "complete":
      return novels.complete(novelId);
    case "decide":
      return novels.decide(novelId, action.userId, action.approved);
  }
}

// 회차를 쓴 작가를 처음 쓴 순서대로 한 번씩.
function authorsOf(nodes: ChapterNode[]) {
  return [...new Set(nodes.map((node) => node.authorNickname))];
}

export default function Detail() {
  const ui = useUi();
  const params = useLocalSearchParams<{ id: string }>();
  const id = Number(params.id);
  const { mode } = useSession();
  const client = useQueryClient();
  const [confirmingComplete, setConfirmingComplete] = useState(false);

  const query = useQuery({
    queryKey: ["novel", id, mode],
    queryFn: () =>
      mode === "demo" ? Promise.resolve(demoDetail(id)) : novels.get(id),
    enabled: mode === "demo" || mode === "authenticated",
    refetchInterval: mode === "authenticated" ? 30000 : false,
  });
  const detail = query.data;
  const tree = useChapterTree(id, detail);
  const myDelivery = useMyDelivery(id, detail?.myDeliveryId);
  const refreshLists = () =>
    Promise.all([
      client.invalidateQueries({ queryKey: ["novels"] }),
      client.invalidateQueries({ queryKey: ["my-turns"] }),
      client.invalidateQueries({ queryKey: ["deliveries"] }),
    ]);
  const mutation = useMutation({
    mutationFn: (action: NovelAction) => runAction(id, action),
    onSuccess: async (updated) => {
      client.setQueryData(["novel", id, mode], updated);
      setConfirmingComplete(false);
      await refreshLists();
    },
  });
  const decline = useMutation({
    mutationFn: (deliveryId: number) => novels.decline(deliveryId),
    onSuccess: async () => {
      await Promise.all([
        client.invalidateQueries({ queryKey: ["novel", id] }),
        refreshLists(),
      ]);
    },
  });

  if (mode === "guest") return <Redirect href="/login" />;
  if (query.isPending)
    return (
      <Screen title="이야기 펼치기">
        <Loading />
      </Screen>
    );
  if (query.error || !detail)
    return (
      <Screen title="이야기 펼치기">
        <ErrorBox
          error={query.error}
          retry={() => {
            void query.refetch();
          }}
        />
      </Screen>
    );

  const { novel } = detail;
  const isOpen = novel.mode === "OPEN";
  const nodes = tree.data ?? [];
  const busy = mutation.isPending || decline.isPending;

  return (
    <Screen title="이야기 펼치기">
      <NovelOverview novel={novel} nodes={tree.data} />
      {mode === "demo" && <DemoNotice />}
      {isOpen && novel.status === "ONGOING" && (
        <OpenRelayCard
          detail={detail}
          delivery={myDelivery}
          busy={decline.isPending}
          onDecline={() => {
            if (detail.myDeliveryId) decline.mutate(detail.myDeliveryId);
          }}
        />
      )}
      {!isOpen && novel.status === "ONGOING" && <TurnCard detail={detail} />}
      {isOpen ? (
        <AuthorList names={authorsOf(nodes)} />
      ) : (
        <CircleControls
          detail={detail}
          signedIn={mode === "authenticated"}
          busy={busy}
          onApply={() => mutation.mutate({ type: "apply" })}
          onDecide={(userId, approved) =>
            mutation.mutate({ type: "decide", userId, approved })
          }
          onStart={() => mutation.mutate({ type: "start" })}
        />
      )}
      {detail.canComplete && (
        <CompleteControl
          confirming={confirmingComplete}
          busy={busy}
          onAsk={() => setConfirmingComplete(true)}
          onCancel={() => setConfirmingComplete(false)}
          onComplete={() => mutation.mutate({ type: "complete" })}
        />
      )}
      {!!mutation.error && <ErrorBox error={mutation.error} />}
      {!!decline.error && <ErrorBox error={decline.error} />}
      <Text style={ui.sectionTitle}>
        {isOpen ? "이야기의 가지" : "이야기의 목차"}
      </Text>
      {tree.isLoading && <Loading />}
      {!!tree.error && (
        <ErrorBox
          error={tree.error}
          retry={() => {
            void tree.refetch();
          }}
        />
      )}
      <ChapterList novelId={id} chapters={nodes} branching={isOpen} />
      {novel.chapterCount === 0 && <EmptyChapters detail={detail} />}
    </Screen>
  );
}

function DemoNotice() {
  const ui = useUi();
  return (
    <Card>
      <Text style={ui.body}>
        디자인 미리보기예요. 로그인하면 실제 작품에 참가할 수 있어요.
      </Text>
      <Button outline onPress={() => router.push("/login")}>
        Bookey 계정으로 로그인
      </Button>
    </Card>
  );
}

function EmptyChapters({ detail }: { detail: NovelDetail }) {
  const ui = useUi();
  const message =
    detail.novel.mode === "OPEN"
      ? "만든 사람이 첫 회차를 쓰면 열매가 배달되기 시작해요."
      : "첫 번째 장을 기다리고 있어요. 릴레이가 시작되면 첫 작가가 이야기를 열어요.";
  return <Text style={ui.hint}>{message}</Text>;
}
