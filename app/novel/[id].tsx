import { useState } from "react";
import { Text, View, Pressable, Share } from "react-native";
import { Redirect, router, useLocalSearchParams } from "expo-router";
import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { ArrowUpRight } from "lucide-react-native";
import { novels } from "../../src/api/novels";
import { demoDetail, demoChapters } from "../../src/api/demo";
import { useSession } from "../../src/state/session";
import { Candy } from "../../src/components/Candy";
import {
  Screen,
  Label,
  Card,
  Button,
  Loading,
  ErrorBox,
  ui,
} from "../../src/components/ui";
import { candyColors, colors, statusLabel } from "../../src/theme";
export default function Detail() {
  const params = useLocalSearchParams<{ id: string }>(),
    id = Number(params.id),
    { mode } = useSession(),
    client = useQueryClient();
  const [confirm, setConfirm] = useState(false),
    [message, setMessage] = useState("");
  const query = useQuery({
    queryKey: ["novel", id, mode],
    queryFn: () =>
      mode === "demo" ? Promise.resolve(demoDetail(id)) : novels.get(id),
    enabled: mode === "demo" || mode === "authenticated",
    refetchInterval: mode === "authenticated" ? 30000 : false,
  });
  const d = query.data;
  const chapters = useInfiniteQuery({
    queryKey: ["chapters", id],
    initialPageParam: 0,
    queryFn: ({ pageParam }) => novels.chapters(id, pageParam),
    getNextPageParam: (last) => (last.hasNext ? last.page + 1 : undefined),
    enabled:
      mode === "authenticated" &&
      !!d &&
      (d.novel.isPublic || d.myMembership === "ACTIVE"),
  });
  const mutation = useMutation({
    mutationFn: async (action: {
      type: "apply" | "start" | "complete" | "decide";
      userId?: number;
      approved?: boolean;
    }) =>
      action.type === "apply"
        ? novels.apply(id)
        : action.type === "start"
          ? novels.start(id)
          : action.type === "complete"
            ? novels.complete(id)
            : novels.decide(id, action.userId!, action.approved!),
    onSuccess: async (updated) => {
      client.setQueryData(["novel", id, mode], updated);
      setConfirm(false);
      await Promise.all([
        client.invalidateQueries({ queryKey: ["novels"] }),
        client.invalidateQueries({ queryKey: ["my-turns"] }),
      ]);
    },
  });
  if (mode === "guest") return <Redirect href="/login" />;
  return (
    <Screen title="이야기 펼치기">
      {query.isPending ? (
        <Loading />
      ) : query.error ? (
        <ErrorBox
          error={query.error}
          retry={() => {
            void query.refetch();
          }}
        />
      ) : (
        d && (
          <>
            <View style={{ alignItems: "center", paddingTop: 10 }}>
              <Candy color={candyColors[(id - 1) % 6]} size={160} />
              <Label>
                {d.novel.genre} · {statusLabel[d.novel.status]}
              </Label>
              <Text style={[ui.heading, { textAlign: "center", fontSize: 27 }]}>
                {d.novel.title}
              </Text>
              <Text style={[ui.body, { textAlign: "center" }]}>
                {d.novel.description}
              </Text>
            </View>
            <View
              style={[
                ui.row,
                { marginVertical: 25, justifyContent: "center", gap: 25 },
              ]}
            >
              <Text style={ui.body}>
                {d.novel.memberCount}/{d.novel.memberLimit}명의 작가
              </Text>
              <Text style={ui.body}>
                {d.novel.chapterCount}/{d.novel.chapterLimit}개의 장
              </Text>
            </View>
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
            {d.novel.status === "ONGOING" && (
              <Card>
                <Label>
                  {d.canWrite ? "YOUR TURN" : "THE STORY CONTINUES"}
                </Label>
                <Text style={[ui.sectionTitle, { marginTop: 12 }]}>
                  {d.canWrite
                    ? "다음 장은 당신의 차례."
                    : `${d.currentWriterNickname || "다음 작가"} 님이 이어 쓰고 있어요.`}
                </Text>
                {d.novel.turnDueAt && (
                  <Text style={ui.body}>
                    이번 차례 마감 ·{" "}
                    {new Date(d.novel.turnDueAt).toLocaleString("ko-KR")}
                  </Text>
                )}
                {d.canWrite && (
                  <Button
                    onPress={() =>
                      router.push({ pathname: "/novel/write", params: { id } })
                    }
                  >
                    다음 장 이어 쓰기
                  </Button>
                )}
              </Card>
            )}
            <Text style={ui.sectionTitle}>함께 쓰는 작가들</Text>
            <View
              style={{
                flexDirection: "row",
                flexWrap: "wrap",
                gap: 8,
                marginBottom: 18,
              }}
            >
              {d.members.map((m, i) => (
                <View
                  key={m.userId}
                  style={{
                    borderRadius: 12,
                    padding: 12,
                    backgroundColor: `${candyColors[i % 6]}25`,
                  }}
                >
                  <Text style={{ fontSize: 12, color: colors.ink }}>
                    {m.nickname}
                    {m.owner ? " · 개설자" : ""}
                    {m.currentWriter ? " ✦" : ""}
                  </Text>
                </View>
              ))}
            </View>
            {d.myMembership === "PENDING" && (
              <Card>
                <Text style={ui.body}>
                  참가 신청을 보냈어요. 개설자의 승인을 기다리고 있어요.
                </Text>
              </Card>
            )}
            {mode === "authenticated" && d.canApply && (
              <Button
                disabled={mutation.isPending}
                onPress={() => mutation.mutate({ type: "apply" })}
              >
                함께 쓰기 신청하기
              </Button>
            )}
            {d.inviteCode && (
              <Card>
                <Label>INVITE YOUR NEXT WRITER</Label>
                <Text
                  selectable
                  style={[ui.body, { marginTop: 12, fontSize: 12 }]}
                >
                  {d.inviteCode}
                </Text>
                <Button
                  outline
                  onPress={() => {
                    void Share.share({
                      message: `${d.novel.title} 릴레이 소설에 함께해요! 초대 코드: ${d.inviteCode}`,
                    }).catch((e) => setMessage(e.message));
                  }}
                >
                  초대 코드 공유하기
                </Button>
              </Card>
            )}
            {d.applications.length > 0 && (
              <>
                <Text style={ui.sectionTitle}>참가 신청</Text>
                {d.applications.map((a) => (
                  <Card key={a.userId}>
                    <Text style={ui.label}>{a.nickname}</Text>
                    <View style={{ flexDirection: "row", gap: 10 }}>
                      <View style={{ flex: 1 }}>
                        <Button
                          disabled={mutation.isPending}
                          onPress={() =>
                            mutation.mutate({
                              type: "decide",
                              userId: a.userId,
                              approved: true,
                            })
                          }
                        >
                          승인
                        </Button>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Button
                          outline
                          disabled={mutation.isPending}
                          onPress={() =>
                            mutation.mutate({
                              type: "decide",
                              userId: a.userId,
                              approved: false,
                            })
                          }
                        >
                          거절
                        </Button>
                      </View>
                    </View>
                  </Card>
                ))}
              </>
            )}
            {d.canStart && (
              <Button
                disabled={mutation.isPending}
                onPress={() => mutation.mutate({ type: "start" })}
              >
                모인 작가들과 릴레이 시작하기
              </Button>
            )}
            {d.novel.mine && d.novel.status === "RECRUITING" && !d.canStart && (
              <Text style={ui.hint}>
                참가자를 한 명 이상 승인하면 릴레이를 시작할 수 있어요.
              </Text>
            )}
            {d.canComplete &&
              (confirm ? (
                <Card>
                  <Text style={ui.label}>이 작품을 완결할까요?</Text>
                  <Text style={ui.hint}>완결하면 추가 집필이 종료돼요.</Text>
                  <Button
                    disabled={mutation.isPending}
                    onPress={() => mutation.mutate({ type: "complete" })}
                  >
                    완결하기
                  </Button>
                  <Button
                    outline
                    disabled={mutation.isPending}
                    onPress={() => setConfirm(false)}
                  >
                    계속 이어 쓰기
                  </Button>
                </Card>
              ) : (
                <Button outline onPress={() => setConfirm(true)}>
                  이야기 완결하기
                </Button>
              ))}
            {!!mutation.error && <ErrorBox error={mutation.error} />}{" "}
            {!!message && <ErrorBox error={new Error(message)} />}
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
            {(mode === "demo"
              ? d.novel.chapterCount
                ? demoChapters
                : []
              : chapters.data?.pages.flatMap((p) => p.content) || []
            ).map((c) => (
              <Pressable
                key={c.id}
                accessibilityRole="button"
                onPress={() =>
                  router.push({
                    pathname: "/novel/read",
                    params: { id, chapter: c.chapterNumber },
                  })
                }
              >
                <Card>
                  <View style={ui.row}>
                    <Label>
                      CHAPTER {String(c.chapterNumber).padStart(2, "0")}
                    </Label>
                    <ArrowUpRight size={16} color={colors.green} />
                  </View>
                  <Text
                    style={[
                      ui.sectionTitle,
                      { marginTop: 10, marginBottom: 6 },
                    ]}
                  >
                    {c.title}
                  </Text>
                  <Text style={ui.body}>{c.authorNickname}</Text>
                </Card>
              </Pressable>
            ))}
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
            {d.novel.chapterCount === 0 && (
              <Text style={ui.hint}>
                첫 번째 장을 기다리고 있어요. 릴레이가 시작되면 첫 작가가
                이야기를 열어요.
              </Text>
            )}
          </>
        )
      )}
    </Screen>
  );
}
