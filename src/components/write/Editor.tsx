import { useEffect, useState } from "react";
import { StyleSheet, View } from "react-native";
import { Text } from "../text";
import { router, useNavigation } from "expo-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { Draft, NovelDetail } from "../../api/types";
import { Button, Card, ErrorBox, Field, Label, useUi } from "../ui";
import { ParentChapterPeek } from "./ParentChapterPeek";
import type { WriteTarget } from "./writeTarget";
import { WritingAssist } from "./WritingAssist";
import { StoryAssist } from "./StoryAssist";
import { MAX_BODY_LENGTH } from "./limits";

// 발행하면 무엇이 일어나는지. 차례대로 쓰는 작품은 다음 작가에게 넘어가고, 열매로 퍼뜨리는 작품은
// 발행한 회차가 다른 사람들의 홈에 이어 쓸 수 있는 열매로 놓인다.
function publishCopy(target: WriteTarget, detail: NovelDetail) {
  const spreads = target.kind === "branch" || detail.novel.mode === "OPEN";
  if (!spreads)
    return {
      hint: "발행한 회차는 수정할 수 없고, 다음 작가에게 집필 차례가 넘어가요.",
      action: "발행하고 다음 작가에게 넘기기",
    };
  return {
    hint: "발행한 회차는 수정할 수 없고, 다른 사람들이 이 회차에서 가지를 뻗어 이어 쓸 수 있어요.",
    action: "발행하고 열매 맺기",
  };
}

// 편집기 위 작은 제목. 첫 작가의 줄기는 회차 수(가지 포함)와 깊이가 달라 몇 장인지 쓰지 않는다.
function subtitleOf(target: WriteTarget, detail: NovelDetail) {
  if (target.kind === "branch")
    return "맡은 회차에서 뻗는 새 가지 · 당신의 상상을 더할 차례";
  if (detail.novel.mode === "OPEN")
    return "내 줄기의 다음 회차 · 줄기는 위로 자라고 떨어지지 않아요";
  const nextNumber = String(detail.novel.chapterCount + 1).padStart(2, "0");
  return `CHAPTER ${nextNumber} · 당신의 상상을 더할 차례`;
}

export function Editor({
  novelId,
  detail,
  draft,
  target,
  writable,
  sessionExpired,
  parentChapterId,
}: {
  novelId: number;
  detail: NovelDetail;
  draft: Draft;
  target: WriteTarget;
  writable: boolean;
  sessionExpired: boolean;
  // 맡은 열매에서 뻗을 때 이어받은 회차
  parentChapterId?: number;
}) {
  const ui = useUi();
  const [title, setTitle] = useState(draft.title);
  const [body, setBody] = useState(draft.body);
  const [selection, setSelection] = useState({ start: 0, end: 0 });
  const [saved, setSaved] = useState(draft);
  const [confirm, setConfirm] = useState(false);
  const [validation, setValidation] = useState("");
  const [discard, setDiscard] = useState(false);
  const client = useQueryClient();
  const navigation = useNavigation();
  const isBranch = target.kind === "branch";
  const copy = publishCopy(target, detail);
  const dirty = title !== saved.title || body !== saved.body;
  const savedStatus = saved.savedAt
    ? `최근 저장 ${new Date(saved.savedAt).toLocaleTimeString("ko-KR")}`
    : "아직 저장하지 않았어요";
  const save = useMutation({
    mutationFn: () => target.save(draft.turnNumber, title, body),
    onSuccess: (updated) => {
      setSaved(updated);
      client.setQueryData(target.draftKey, updated);
    },
  });
  const publish = useMutation({
    mutationFn: () =>
      target.publish(draft.turnNumber, title.trim(), body.trim()),
    onSuccess: async () => {
      setSaved({ ...saved, title, body });
      // 이어 쓴 회차는 서버가 홈 열매에서 뺀다. 홈 묶음(["novels", "home-feed"])도 다시 받는다.
      await Promise.all([
        client.invalidateQueries({ queryKey: ["novel", novelId] }),
        client.invalidateQueries({ queryKey: ["novels"] }),
        client.invalidateQueries({ queryKey: ["my-turns"] }),
        client.invalidateQueries({ queryKey: ["deliveries"] }),
        client.invalidateQueries({ queryKey: ["chapter-tree", novelId] }),
        client.invalidateQueries({ queryKey: ["chapter", novelId] }),
      ]);
      router.replace(`/novel/${novelId}`);
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
  // 다시 로그인하고 돌아오면 만료 때문에 실패한 저장 오류는 지운다.
  const resetSave = save.reset;
  const resetPublish = publish.reset;
  useEffect(() => {
    if (sessionExpired) return;
    resetSave();
    resetPublish();
  }, [sessionExpired, resetSave, resetPublish]);
  useEffect(() => {
    if (discard) router.replace(`/novel/${novelId}`);
  }, [discard, novelId]);
  const busy = save.isPending || publish.isPending;

  return (
    <>
      <Label>{isBranch ? "YOUR NEW BRANCH" : "YOUR NEXT CHAPTER"}</Label>
      <Text style={ui.heading}>{detail.novel.title}</Text>
      <Text style={[ui.body, styles.subtitle]}>
        {subtitleOf(target, detail)}
      </Text>
      {isBranch && parentChapterId !== undefined && (
        <ParentChapterPeek novelId={novelId} chapterId={parentChapterId} />
      )}
      {sessionExpired && (
        <Card>
          <Text style={ui.body}>
            로그인이 만료됐어요. 원고는 화면에 남겨 두었으니 다시 로그인한 뒤
            이어서 저장해 주세요.
          </Text>
          <Button onPress={() => router.push("/login?returnBack=1")}>
            다시 로그인
          </Button>
        </Card>
      )}
      {!writable && !sessionExpired && (
        <Card>
          <Text style={ui.body}>
            {isBranch
              ? "이어 쓸 수 있는 시간이 지났거나 서버 확인이 필요해요. 원고는 화면에 남겨 두었으니 복사해 보관해 주세요."
              : "집필 차례가 바뀌었거나 서버 확인이 필요해요. 원고는 화면에 남겨 두었으니 복사해 보관해 주세요."}
          </Text>
        </Card>
      )}
      <Field
        label="이번 장의 제목"
        value={title}
        onChangeText={(value) => {
          setTitle(value);
          setConfirm(false);
        }}
        maxLength={120}
        placeholder="다음 장의 이름"
      />
      <Field
        label="이어지는 이야기"
        value={body}
        onSelectionChange={(event) => setSelection(event.nativeEvent.selection)}
        onChangeText={(value) => {
          setBody(value);
          setSelection({ start: 0, end: 0 });
          setConfirm(false);
        }}
        multiline
        maxLength={MAX_BODY_LENGTH}
        style={styles.bodyInput}
        placeholder="앞선 작가의 문장을 이어, 새로운 장을 시작해 주세요."
      />
      <Text style={ui.hint}>
        {`${body.length.toLocaleString()} / ${MAX_BODY_LENGTH.toLocaleString()}자 · ${savedStatus}`}
      </Text>
      <WritingAssist
        body={body}
        selection={selection}
        disabled={!writable || busy}
        rewrite={(text) => target.rewrite(draft.turnNumber, text)}
        onApply={(updated) => {
          setBody(updated);
          setConfirm(false);
          setSelection({ start: 0, end: 0 });
        }}
      />
      <StoryAssist
        body={body}
        hasPrevious={detail.novel.chapterCount > 0}
        disabled={!writable || busy}
        generate={(request) => target.story(draft.turnNumber, request)}
        onApply={(updated) => {
          setBody(updated);
          setConfirm(false);
          setSelection({ start: 0, end: 0 });
        }}
      />
      {!!validation && (
        <>
          <ErrorBox error={new Error(validation)} />
          <Button outline onPress={() => setDiscard(true)}>
            저장하지 않고 나가기
          </Button>
        </>
      )}
      {!sessionExpired && !!(save.error || publish.error) && (
        <ErrorBox error={save.error || publish.error} />
      )}
      <View style={styles.actions}>
        <View style={styles.action}>
          <Button
            outline
            disabled={!writable || busy || !dirty}
            onPress={() => {
              setValidation("");
              save.mutate();
            }}
          >
            {save.isPending ? "저장 중…" : "임시저장"}
          </Button>
        </View>
        <View style={styles.action}>
          <Button
            disabled={!writable || busy || !title.trim() || !body.trim()}
            onPress={() => setConfirm(true)}
          >
            회차 발행
          </Button>
        </View>
      </View>
      {confirm && (
        <Card style={styles.confirm}>
          <Text style={ui.label}>이 장을 발행할까요?</Text>
          <Text style={ui.hint}>{copy.hint}</Text>
          <Button disabled={!writable || busy} onPress={() => publish.mutate()}>
            {publish.isPending ? "발행 중…" : copy.action}
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

const styles = StyleSheet.create({
  subtitle: { marginBottom: 24 },
  bodyInput: { minHeight: 340, lineHeight: 27 },
  actions: { flexDirection: "row", gap: 10 },
  action: { flex: 1 },
  confirm: { marginTop: 18 },
});
