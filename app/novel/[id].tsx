import { useState } from "react";
import { Text, Share } from "react-native";
import { Redirect, router, useLocalSearchParams } from "expo-router";
import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { novels } from "../../src/api/novels";
import { demoDetail, demoChaptersOf } from "../../src/api/demo";
import type { NovelDetail } from "../../src/api/types";
import { useSession } from "../../src/state/session";
import { NovelOverview } from "../../src/components/novel/NovelOverview";
import { TurnCard } from "../../src/components/novel/TurnCard";
import {
  ApplicationList,
  MemberList,
} from "../../src/components/novel/Members";
import {
  ChapterList,
  type ChapterListItem,
} from "../../src/components/novel/ChapterList";
import {
  Screen,
  Label,
  Card,
  Button,
  Loading,
  ErrorBox,
  ui,
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

export default function Detail() {
  const params = useLocalSearchParams<{ id: string }>();
  const id = Number(params.id);
  const { mode } = useSession();
  const client = useQueryClient();
  const [confirmingComplete, setConfirmingComplete] = useState(false);
  const [shareError, setShareError] = useState("");

  const query = useQuery({
    queryKey: ["novel", id, mode],
    queryFn: () =>
      mode === "demo" ? Promise.resolve(demoDetail(id)) : novels.get(id),
    enabled: mode === "demo" || mode === "authenticated",
    refetchInterval: mode === "authenticated" ? 30000 : false,
  });
  const detail = query.data;
  const chapters = useInfiniteQuery({
    queryKey: ["chapters", id],
    initialPageParam: 0,
    queryFn: ({ pageParam }) => novels.chapters(id, pageParam),
    getNextPageParam: (last) => (last.hasNext ? last.page + 1 : undefined),
    enabled:
      mode === "authenticated" &&
      !!detail &&
      (detail.novel.isPublic || detail.myMembership === "ACTIVE"),
  });
  const mutation = useMutation({
    mutationFn: (action: NovelAction) => runAction(id, action),
    onSuccess: async (updated) => {
      client.setQueryData(["novel", id, mode], updated);
      setConfirmingComplete(false);
      await Promise.all([
        client.invalidateQueries({ queryKey: ["novels"] }),
        client.invalidateQueries({ queryKey: ["my-turns"] }),
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
  let chapterItems: ChapterListItem[];
  if (mode === "demo") chapterItems = demoChaptersOf(id);
  else
    chapterItems = chapters.data?.pages.flatMap((page) => page.content) ?? [];

  return (
    <Screen title="이야기 펼치기">
      <NovelOverview novel={novel} />
      {mode === "demo" && (
        <Card>
          <Text style={ui.body}>
            디자인 미리보기예요. 로그인하면 실제 작품에 참가할 수 있어요.
          </Text>
          <Button outline onPress={() => router.push("/login")}>
            Bookey 계정으로 로그인
          </Button>
        </Card>
      )}
      {novel.status === "ONGOING" && <TurnCard detail={detail} />}
      <MemberList members={detail.members} />
      {detail.myMembership === "PENDING" && (
        <Card>
          <Text style={ui.body}>
            참가 신청을 보냈어요. 개설자의 승인을 기다리고 있어요.
          </Text>
        </Card>
      )}
      {mode === "authenticated" && detail.canApply && (
        <Button
          disabled={mutation.isPending}
          onPress={() => mutation.mutate({ type: "apply" })}
        >
          함께 쓰기 신청하기
        </Button>
      )}
      {!!detail.inviteCode && (
        <InviteCard detail={detail} onShareError={setShareError} />
      )}
      <ApplicationList
        applications={detail.applications}
        busy={mutation.isPending}
        onDecide={(userId, approved) =>
          mutation.mutate({ type: "decide", userId, approved })
        }
      />
      {detail.canStart && (
        <Button
          disabled={mutation.isPending}
          onPress={() => mutation.mutate({ type: "start" })}
        >
          모인 작가들과 릴레이 시작하기
        </Button>
      )}
      {novel.mine && novel.status === "RECRUITING" && !detail.canStart && (
        <Text style={ui.hint}>
          참가자를 한 명 이상 승인하면 릴레이를 시작할 수 있어요.
        </Text>
      )}
      {detail.canComplete && (
        <CompleteControl
          confirming={confirmingComplete}
          busy={mutation.isPending}
          onAsk={() => setConfirmingComplete(true)}
          onCancel={() => setConfirmingComplete(false)}
          onComplete={() => mutation.mutate({ type: "complete" })}
        />
      )}
      {!!mutation.error && <ErrorBox error={mutation.error} />}
      {!!shareError && <ErrorBox error={new Error(shareError)} />}
      <Text style={ui.sectionTitle}>이야기의 목차</Text>
      {chapters.isLoading && <Loading />}
      {!!chapters.error && (
        <ErrorBox
          error={chapters.error}
          retry={() => {
            void chapters.refetch();
          }}
        />
      )}
      <ChapterList novelId={id} chapters={chapterItems} />
      {chapters.hasNextPage && (
        <Button
          outline
          disabled={chapters.isFetchingNextPage}
          onPress={() => {
            void chapters.fetchNextPage();
          }}
        >
          목차 더 보기
        </Button>
      )}
      {novel.chapterCount === 0 && (
        <Text style={ui.hint}>
          첫 번째 장을 기다리고 있어요. 릴레이가 시작되면 첫 작가가 이야기를
          열어요.
        </Text>
      )}
    </Screen>
  );
}

function InviteCard({
  detail,
  onShareError,
}: {
  detail: NovelDetail;
  onShareError: (message: string) => void;
}) {
  const share = () => {
    Share.share({
      message: `${detail.novel.title} 릴레이 소설에 함께해요! 초대 코드: ${detail.inviteCode}`,
    }).catch((error: Error) => onShareError(error.message));
  };
  return (
    <Card>
      <Label>INVITE YOUR NEXT WRITER</Label>
      <Text selectable style={[ui.body, { marginTop: 12, fontSize: 12 }]}>
        {detail.inviteCode}
      </Text>
      <Button outline onPress={share}>
        초대 코드 공유하기
      </Button>
    </Card>
  );
}

function CompleteControl({
  confirming,
  busy,
  onAsk,
  onCancel,
  onComplete,
}: {
  confirming: boolean;
  busy: boolean;
  onAsk: () => void;
  onCancel: () => void;
  onComplete: () => void;
}) {
  if (!confirming)
    return (
      <Button outline onPress={onAsk}>
        이야기 완결하기
      </Button>
    );
  return (
    <Card>
      <Text style={ui.label}>이 작품을 완결할까요?</Text>
      <Text style={ui.hint}>완결하면 추가 집필이 종료돼요.</Text>
      <Button disabled={busy} onPress={onComplete}>
        완결하기
      </Button>
      <Button outline disabled={busy} onPress={onCancel}>
        계속 이어 쓰기
      </Button>
    </Card>
  );
}
