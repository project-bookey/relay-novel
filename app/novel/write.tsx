import { useRef } from "react";
import { Text } from "react-native";
import { Redirect, router, useLocalSearchParams } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { novels } from "../../src/api/novels";
import type { Draft, NovelDetail } from "../../src/api/types";
import { useSession } from "../../src/state/session";
import { useMyDelivery } from "../../src/components/novel/useNovelChapters";
import { Editor } from "../../src/components/write/Editor";
import {
  branchTarget,
  turnTarget,
} from "../../src/components/write/writeTarget";
import {
  Screen,
  Button,
  Card,
  Loading,
  ErrorBox,
  ui,
} from "../../src/components/ui";

// 회차 쓰기. deliveryId가 있으면 받은 열매에서 가지를 뻗고, 없으면 내 차례의 다음 회차를 쓴다.
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
  const title =
    target.kind === "branch" ? "가지 뻗어 이어 쓰기" : "다음 장 이어 쓰기";

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
      {!!current && !target.canWrite(current) && (
        <NotWritable novelId={id} branch={target.kind === "branch"} />
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

function NotWritable({
  novelId,
  branch,
}: {
  novelId: number;
  branch: boolean;
}) {
  return (
    <Card>
      <Text style={ui.sectionTitle}>
        {branch
          ? "이 열매는 이제 이어 쓸 수 없어요."
          : "지금은 당신의 집필 차례가 아니에요."}
      </Text>
      <Text style={ui.body}>
        {branch
          ? "이어 쓸 수 있는 시간이 지났거나 이미 가지를 뻗었을 수 있어요."
          : "차례가 바뀌었거나 제한 시간이 지났을 수 있어요."}
      </Text>
      <Button onPress={() => router.replace(`/novel/${novelId}`)}>
        작품으로 돌아가기
      </Button>
    </Card>
  );
}
