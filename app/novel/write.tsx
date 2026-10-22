import { useRef } from "react";
import { Text } from "../../src/components/text";
import { Redirect, router, useLocalSearchParams } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { novels } from "../../src/api/novels";
import type { Draft, NovelDetail, NovelMode } from "../../src/api/types";
import { useSession } from "../../src/state/session";
import { useMyDelivery } from "../../src/components/novel/useNovelChapters";
import { Editor } from "../../src/components/write/Editor";
import {
  branchTarget,
  turnTarget,
} from "../../src/components/write/writeTarget";
import {
  Button,
  Card,
  ErrorBox,
  Loading,
  Screen,
  useUi,
} from "../../src/components/ui";

// 회차 쓰기. deliveryId가 있으면 자리를 맡은 열매에서 가지를 뻗고, 없으면 내 차례의 다음 회차
// (열매로 퍼뜨리는 작품이면 첫 작가의 줄기)를 쓴다.
export default function WriteScreen() {
  const params = useLocalSearchParams<{ id: string; deliveryId?: string }>();
  const id = Number(params.id);
  const deliveryId = params.deliveryId ? Number(params.deliveryId) : undefined;
  const { mode } = useSession();
  const signedIn = mode === "authenticated";
  // 편집기를 연 시점의 상세와 초안. 차례가 바뀌어도 쓰던 원고는 그대로 둔다.
  const initial = useRef<{ detail: NovelDetail; draft: Draft } | null>(null);
  const detail = useQuery({
    queryKey: ["novel", id, mode],
    queryFn: () => novels.get(id),
    enabled: signedIn,
    refetchInterval: 15000,
  });
  const target =
    deliveryId === undefined
      ? turnTarget(id, detail.data?.turnNumber)
      : branchTarget(deliveryId);
  const draft = useQuery({
    queryKey: target.draftKey,
    queryFn: target.loadDraft,
    enabled:
      signedIn &&
      !!detail.data &&
      target.canWrite(detail.data) &&
      !initial.current,
    staleTime: Infinity,
  });
  const myDelivery = useMyDelivery(id, deliveryId);

  // 쓰는 도중 로그인이 만료돼도 원고를 잃지 않도록 편집기는 그대로 둔다.
  if (!signedIn && !initial.current) return <Redirect href="/login" />;
  const current = detail.data;
  if (
    !initial.current &&
    current &&
    target.canWrite(current) &&
    draft.data &&
    draft.data.turnNumber === target.turnOf(current)
  )
    initial.current = { detail: current, draft: draft.data };
  const writable =
    signedIn &&
    !!current &&
    target.canWrite(current) &&
    target.turnOf(current) === initial.current?.draft.turnNumber &&
    !detail.error;
  const title = titleOf(target.kind, detail.data?.novel.mode);

  if (initial.current)
    return (
      <Screen title={title}>
        <Editor
          novelId={id}
          detail={initial.current.detail}
          draft={initial.current.draft}
          target={target}
          writable={writable}
          sessionExpired={!signedIn}
          parentChapterId={myDelivery?.chapterId}
        />
      </Screen>
    );
  return (
    <Screen title={title}>
      {detail.isPending && <Loading />}
      {!!detail.error && (
        <ErrorBox
          error={detail.error}
          retry={() => {
            void detail.refetch();
          }}
        />
      )}
      {!!current && !target.canWrite(current) && detail.isFetching && (
        <Loading />
      )}
      {!!current && !target.canWrite(current) && !detail.isFetching && (
        <NotWritable
          novelId={id}
          branch={target.kind === "branch"}
          trunk={current.novel.mode === "OPEN"}
        />
      )}
      {!!current && target.canWrite(current) && draft.isPending && <Loading />}
      {!!current &&
        target.canWrite(current) &&
        !!draft.data &&
        draft.data.turnNumber !== target.turnOf(current) && (
          <ErrorBox
            error={new Error("원고를 맞춰 보지 못했어요. 다시 불러와 주세요.")}
            retry={() => {
              void Promise.all([detail.refetch(), draft.refetch()]);
            }}
          />
        )}
      {!!current && target.canWrite(current) && !!draft.error && (
        <ErrorBox
          error={draft.error}
          retry={() => {
            void draft.refetch();
          }}
        />
      )}
    </Screen>
  );
}

function titleOf(kind: "turn" | "branch", mode?: NovelMode) {
  if (kind === "branch") return "가지 뻗어 이어 쓰기";
  if (mode === "OPEN") return "줄기 이어 쓰기";
  return "다음 장 이어 쓰기";
}

// 지금 쓸 수 없는 까닭. 가지는 맡은 자리가, 첫 작가의 줄기는 작품 상태가, 모여 만들기는 차례가 정한다.
function notWritableCopy(branch: boolean, trunk: boolean) {
  if (branch)
    return {
      title: "이 열매는 이제 이어 쓸 수 없어요.",
      body: "자리를 맡은 시간이 지났거나 이미 가지를 뻗었을 수 있어요.",
    };
  if (trunk)
    return {
      title: "지금은 줄기를 이어 쓸 수 없어요.",
      body: "줄기가 목표 회차에 닿았거나 작품이 완결됐을 수 있어요.",
    };
  return {
    title: "지금은 당신의 집필 차례가 아니에요.",
    body: "차례가 바뀌었거나 제한 시간이 지났을 수 있어요.",
  };
}

function NotWritable({
  novelId,
  branch,
  trunk,
}: {
  novelId: number;
  branch: boolean;
  trunk: boolean;
}) {
  const ui = useUi();
  const copy = notWritableCopy(branch, trunk);
  return (
    <Card>
      <Text style={ui.sectionTitle}>{copy.title}</Text>
      <Text style={ui.body}>{copy.body}</Text>
      <Button onPress={() => router.replace(`/novel/${novelId}`)}>
        작품으로 돌아가기
      </Button>
    </Card>
  );
}
