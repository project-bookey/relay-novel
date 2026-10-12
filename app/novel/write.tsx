import { useEffect, useRef, useState } from "react";
import { Text, View } from "react-native";
import {
  Redirect,
  router,
  useLocalSearchParams,
  useNavigation,
} from "expo-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { novels } from "../../src/api/novels";
import type { Draft, NovelDetail } from "../../src/api/types";
import { useSession } from "../../src/state/session";
import {
  Screen,
  Label,
  Field,
  Button,
  Card,
  Loading,
  ErrorBox,
  ui,
} from "../../src/components/ui";
export default function WriteScreen() {
  const { id: raw } = useLocalSearchParams<{ id: string }>(),
    id = Number(raw),
    { mode } = useSession();
  const initial = useRef<{ detail: NovelDetail; draft: Draft } | null>(null);
  const detail = useQuery({
    queryKey: ["novel", id, mode],
    queryFn: () => novels.get(id),
    enabled: mode === "authenticated",
    refetchInterval: 15000,
  });
  const draft = useQuery({
    queryKey: ["draft", id, detail.data?.turnNumber],
    queryFn: () => novels.draft(id),
    enabled:
      mode === "authenticated" &&
      detail.data?.canWrite === true &&
      !initial.current,
    staleTime: Infinity,
  });
  if (mode !== "authenticated") return <Redirect href="/login" />;
  const d = detail.data;
  if (
    !initial.current &&
    d?.canWrite &&
    draft.data &&
    draft.data.turnNumber === d.turnNumber
  )
    initial.current = { detail: d, draft: draft.data };
  const writable =
    !!d?.canWrite &&
    d.turnNumber === initial.current?.draft.turnNumber &&
    !detail.error;
  return (
    <Screen title="다음 장 이어 쓰기">
      {initial.current ? (
        <Editor
          id={id}
          detail={initial.current.detail}
          draft={initial.current.draft}
          writable={writable}
        />
      ) : detail.isPending ? (
        <Loading />
      ) : detail.error ? (
        <ErrorBox
          error={detail.error}
          retry={() => {
            void detail.refetch();
          }}
        />
      ) : (
        d &&
        (!d.canWrite ? (
          <Card>
            <Text style={ui.sectionTitle}>
              지금은 당신의 집필 차례가 아니에요.
            </Text>
            <Text style={ui.body}>
              차례가 바뀌었거나 제한 시간이 지났을 수 있어요.
            </Text>
            <Button onPress={() => router.replace(`/novel/${id}`)}>
              작품으로 돌아가기
            </Button>
          </Card>
        ) : draft.isPending ? (
          <Loading />
        ) : draft.error ? (
          <ErrorBox
            error={draft.error}
            retry={() => {
              void draft.refetch();
            }}
          />
        ) : null)
      )}
    </Screen>
  );
}
function Editor({
  id,
  detail,
  draft,
  writable,
}: {
  id: number;
  detail: NovelDetail;
  draft: Draft;
  writable: boolean;
}) {
  const [title, setTitle] = useState(draft.title),
    [body, setBody] = useState(draft.body),
    [saved, setSaved] = useState(draft),
    [confirm, setConfirm] = useState(false),
    [validation, setValidation] = useState(""),
    [discard, setDiscard] = useState(false);
  const client = useQueryClient(),
    navigation = useNavigation();
  const dirty = title !== saved.title || body !== saved.body;
  const save = useMutation({
    mutationFn: () =>
      novels.saveDraft(id, { turnNumber: draft.turnNumber, title, body }),
    onSuccess: (d) => {
      setSaved(d);
      client.setQueryData(["draft", id, draft.turnNumber], d);
    },
  });
  const publish = useMutation({
    mutationFn: () =>
      novels.publish(id, {
        turnNumber: draft.turnNumber,
        title: title.trim(),
        body: body.trim(),
      }),
    onSuccess: async () => {
      setSaved({ ...saved, title, body });
      await Promise.all([
        client.invalidateQueries({ queryKey: ["novel", id] }),
        client.invalidateQueries({ queryKey: ["novels"] }),
        client.invalidateQueries({ queryKey: ["my-turns"] }),
        client.invalidateQueries({ queryKey: ["chapters", id] }),
      ]);
      router.replace(`/novel/${id}`);
    },
  });
  useEffect(
    () =>
      navigation.addListener("beforeRemove", (event) => {
        if (dirty && !publish.isSuccess && !discard) {
          event.preventDefault();
          setValidation(
            "저장하지 않은 원고가 있어요. 임시저장하거나, 원고를 복사해 보관해 주세요.",
          );
        }
      }),
    [navigation, dirty, publish.isSuccess, discard],
  );
  useEffect(() => {
    if (discard) router.replace(`/novel/${id}`);
  }, [discard, id]);
  return (
    <>
      <Label>YOUR NEXT CHAPTER</Label>
      <Text style={ui.heading}>{detail.novel.title}</Text>
      <Text style={[ui.body, { marginBottom: 24 }]}>
        CHAPTER {String(detail.novel.chapterCount + 1).padStart(2, "0")} ·
        당신의 상상을 더할 차례
      </Text>
      {!writable && (
        <Card>
          <Text style={ui.body}>
            집필 차례가 바뀌었거나 서버 확인이 필요해요. 원고는 화면에 남겨
            두었으니 복사해 보관해 주세요.
          </Text>
        </Card>
      )}
      <Field
        label="이번 장의 제목"
        value={title}
        onChangeText={(v) => {
          setTitle(v);
          setConfirm(false);
        }}
        maxLength={120}
        placeholder="다음 장의 이름"
      />
      <Field
        label="이어지는 이야기"
        value={body}
        onChangeText={(v) => {
          setBody(v);
          setConfirm(false);
        }}
        multiline
        maxLength={20000}
        style={{ minHeight: 340, lineHeight: 27 }}
        placeholder="앞선 작가의 문장을 이어, 새로운 장을 시작해 주세요."
      />
      <Text style={ui.hint}>
        {body.length.toLocaleString()} / 20,000자 ·{" "}
        {saved.savedAt
          ? `최근 저장 ${new Date(saved.savedAt).toLocaleTimeString("ko-KR")}`
          : "아직 저장하지 않았어요"}
      </Text>
      {!!validation && (
        <>
          <ErrorBox error={new Error(validation)} />
          <Button outline onPress={() => setDiscard(true)}>
            저장하지 않고 나가기
          </Button>
        </>
      )}{" "}
      {!!(save.error || publish.error) && (
        <ErrorBox error={save.error || publish.error} />
      )}
      <View style={{ flexDirection: "row", gap: 10 }}>
        <View style={{ flex: 1 }}>
          <Button
            outline
            disabled={
              !writable || save.isPending || publish.isPending || !dirty
            }
            onPress={() => {
              setValidation("");
              save.mutate();
            }}
          >
            {save.isPending ? "저장 중…" : "임시저장"}
          </Button>
        </View>
        <View style={{ flex: 1 }}>
          <Button
            disabled={
              !writable ||
              save.isPending ||
              publish.isPending ||
              !title.trim() ||
              !body.trim()
            }
            onPress={() => setConfirm(true)}
          >
            회차 발행
          </Button>
        </View>
      </View>
      {confirm && (
        <Card style={{ marginTop: 18 }}>
          <Text style={ui.label}>이 장을 발행할까요?</Text>
          <Text style={ui.hint}>
            발행한 회차는 수정할 수 없고, 다음 작가에게 집필 차례가 넘어가요.
          </Text>
          <Button
            disabled={!writable || publish.isPending || save.isPending}
            onPress={() => publish.mutate()}
          >
            {publish.isPending ? "발행 중…" : "발행하고 다음 작가에게 넘기기"}
          </Button>
          <Button
            outline
            disabled={publish.isPending}
            onPress={() => setConfirm(false)}
          >
            계속 다듬기
          </Button>
        </Card>
      )}
    </>
  );
}
