import { useCallback, useEffect, useRef, useState } from "react";
import {
  BackHandler,
  Keyboard,
  KeyboardAvoidingView,
  View,
  type TextInput as NativeTextInput,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useNavigation } from "expo-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { BookOpen, Lightbulb, PenLine } from "lucide-react-native";
import type { Draft, NovelDetail } from "../../api/types";
import { themedStyles } from "../../theme/themed";
import { EditorPage } from "./EditorPage";
import { PreviousChapter } from "./PreviousChapter";
import { PublishPopup } from "./PublishPopup";
import { ToolDock, type DockTool } from "./ToolDock";
import { WriteTopBar } from "./WriteTopBar";
import type { WriteTarget } from "./writeTarget";
import {
  leaveBlockedError,
  publishCopy,
  saveLineOf,
  writingPlaceOf,
} from "./writeStatus";
import { manuscriptScopeOf, useAutoSave } from "./useAutoSave";
import { WritingAssist } from "./WritingAssist";
import { StoryAssist } from "./StoryAssist";
import type { TextSelection } from "./rewriteTarget";

type Tool = "previous" | "polish" | "story";
type Popup = Tool | "publish";

const NO_SELECTION: TextSelection = { start: 0, end: 0 };
// 쓰는 동안 꺼내 쓰는 도구. 앞 이야기는 맡은 열매에서 뻗을 때만 있다(이어받은 회차가 있을 때).
function toolsOf(hasPrevious: boolean): DockTool<Tool>[] {
  const writingTools: DockTool<Tool>[] = [
    { key: "polish", label: "다듬기", Icon: PenLine },
    { key: "story", label: "이야기 제안", Icon: Lightbulb },
  ];
  if (!hasPrevious) return writingTools;
  return [
    { key: "previous", label: "앞 이야기", Icon: BookOpen },
    ...writingTools,
  ];
}

// 쓰기에 집중하는 이어 쓰기 화면(사용자가 고른 시안 reference/sian/write-focus A). 화면에는 원고만 두고,
// 쓰는 동안의 기능은 키보드 위 유리 도구 줄에서 유리 팝업으로 펼쳐 쓴다. 손을 멈추면 저절로 임시저장한다.
export function Editor({
  novelId,
  detail,
  draft,
  target,
  writable,
  sessionExpired,
  parentChapter,
}: {
  novelId: number;
  detail: NovelDetail;
  draft: Draft;
  target: WriteTarget;
  writable: boolean;
  sessionExpired: boolean;
  // 맡은 열매에서 뻗을 때 이어받은 회차
  parentChapter?: { id: number; number: number };
}) {
  const styles = useStyles();
  const [title, setTitle] = useState(draft.title);
  const [body, setBody] = useState(draft.body);
  const [selection, setSelection] = useState(NO_SELECTION);
  const [popup, setPopup] = useState<Popup | null>(null);
  // 다듬기는 도구를 연 순간 고른 부분을 다듬는다(키보드가 내려가며 고른 부분이 풀려도 그대로).
  const [pickedSelection, setPickedSelection] = useState(NO_SELECTION);
  // 나가려 했지만 원고를 저장하지 못해 막았을 때 보일 오류
  const [leaveBlocked, setLeaveBlocked] = useState<Error | null>(null);
  const bodyInput = useRef<NativeTextInput>(null);
  const bodyFocused = useRef(false);
  const resumeTyping = useRef(false);
  const allowLeave = useRef(false);
  const client = useQueryClient();
  const navigation = useNavigation();
  const isBranch = target.kind === "branch";
  const previous = isBranch ? parentChapter : undefined;
  const copy = publishCopy(target, detail);

  const publish = useMutation({
    scope: manuscriptScopeOf(target),
    mutationFn: () =>
      target.publish(draft.turnNumber, title.trim(), body.trim()),
    onSuccess: async () => {
      allowLeave.current = true;
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
  const canSave = writable && !sessionExpired;
  const autosave = useAutoSave({
    target,
    draft,
    manuscript: { title, body },
    enabled: canSave && !publish.isPending && !publish.isSuccess,
  });
  const { dirty, saveNow, forgetFailure } = autosave;
  const saveLine = saveLineOf({
    length: body.length,
    canSave,
    waiting: autosave.waiting,
    saving: autosave.saving,
    failed: autosave.failed,
    savedAt: autosave.saved.savedAt,
  });

  // 나가려 하면 고친 원고를 바로 저장하고 나간다. 저장할 수 없거나 못 했으면 막고 까닭을 보인다.
  // 발행하는 동안에는 결과를 기다리도록 나가지 않는다(발행이 끝나면 작품 화면으로 간다).
  const publishing = publish.isPending;
  useEffect(
    () =>
      navigation.addListener("beforeRemove", (event) => {
        if (allowLeave.current) return;
        if (publishing) return event.preventDefault();
        if (!dirty) return;
        event.preventDefault();
        if (!canSave) return setLeaveBlocked(leaveBlockedError(null));
        void saveNow().then((failure) => {
          if (failure) return setLeaveBlocked(leaveBlockedError(failure));
          allowLeave.current = true;
          navigation.dispatch(event.data.action);
        });
      }),
    [navigation, publishing, dirty, canSave, saveNow],
  );
  // 다시 로그인하고 돌아오면 만료 때문에 실패한 저장·발행 오류는 지운다.
  const resetPublish = publish.reset;
  useEffect(() => {
    if (sessionExpired) return;
    forgetFailure();
    resetPublish();
  }, [sessionExpired, forgetFailure, resetPublish]);

  const openPopup = (next: Popup) => {
    if (popup === null) {
      resumeTyping.current = bodyFocused.current;
      setPickedSelection(selection);
      Keyboard.dismiss();
    }
    setPopup(next);
  };
  // 팝업을 닫으면 쓰던 자리로 돌아간다(쓰는 중에 열었으면 키보드도 다시 올라온다).
  // 아니면 팝업 안 입력칸(이야기 제안의 소재)에 올라와 있던 키보드를 내린다.
  const closePopup = useCallback(() => {
    setPopup(null);
    if (resumeTyping.current) bodyInput.current?.focus();
    else Keyboard.dismiss();
    resumeTyping.current = false;
  }, []);
  useCloseOnBack(popup !== null, closePopup, publishing);
  const changeBody = (value: string) => {
    setBody(value);
    setSelection(NO_SELECTION);
    setLeaveBlocked(null);
  };
  const applySuggestion = (updated: string) => {
    changeBody(updated);
    closePopup();
  };
  const assistDisabled = !writable || publishing;
  const tool = popup === "publish" ? null : popup;

  return (
    <SafeAreaView style={styles.screen}>
      {/* 키보드가 올라오면 화면을 그만큼 줄인다(창이 이미 줄었으면 겹친 만큼만). 도구 줄은 줄어든 원고 칸 안에 두어야 키보드 바로 위에 붙는다. */}
      <KeyboardAvoidingView style={styles.screen} behavior="padding">
        <WriteTopBar
          place={writingPlaceOf({
            novelTitle: detail.novel.title,
            kind: target.kind,
            mode: detail.novel.mode,
            chapterCount: detail.novel.chapterCount,
            parentChapterNumber: parentChapter?.number,
          })}
          saveLine={saveLine}
          saveError={autosave.error}
          onRetrySave={() => void saveNow()}
          onPublish={() => openPopup("publish")}
          publishDisabled={
            !writable || publishing || !title.trim() || !body.trim()
          }
        />
        <View style={styles.screen}>
          <EditorPage
            title={title}
            body={body}
            onTitleChange={(value) => {
              setTitle(value);
              setLeaveBlocked(null);
            }}
            onBodyChange={changeBody}
            onSelectionChange={setSelection}
            bodyInput={bodyInput}
            onBodyFocus={(focused) => {
              bodyFocused.current = focused;
            }}
            notice={{
              sessionExpired,
              writable,
              isBranch,
              leaveBlocked,
              onDiscard: () => {
                allowLeave.current = true;
                router.replace(`/novel/${novelId}`);
              },
            }}
          />
          <ToolDock
            tools={toolsOf(previous !== undefined)}
            active={tool}
            onSelect={openPopup}
            onClose={closePopup}
            panes={{
              previous: previous && (
                <PreviousChapter
                  novelId={novelId}
                  chapterId={previous.id}
                  onClose={closePopup}
                />
              ),
              polish: (
                <WritingAssist
                  body={body}
                  selection={pickedSelection}
                  disabled={assistDisabled}
                  rewrite={(text) => target.rewrite(draft.turnNumber, text)}
                  onApply={applySuggestion}
                  onClose={closePopup}
                />
              ),
              story: (
                <StoryAssist
                  body={body}
                  hasPrevious={detail.novel.chapterCount > 0}
                  disabled={assistDisabled}
                  generate={(request) =>
                    target.story(draft.turnNumber, request)
                  }
                  onApply={applySuggestion}
                  onClose={closePopup}
                />
              ),
            }}
          />
        </View>
        <PublishPopup
          open={popup === "publish"}
          copy={copy}
          publishing={publishing}
          disabled={!writable}
          error={sessionExpired ? null : publish.error}
          onPublish={() => publish.mutate()}
          onClose={closePopup}
        />
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// 팝업이 열려 있을 때 안드로이드 뒤로 버튼을 누르면 화면을 떠나지 않고 팝업만 닫는다.
// 발행하는 동안에는 결과(오류 포함)를 팝업에서 볼 수 있게 닫지 않는다.
function useCloseOnBack(open: boolean, close: () => void, publishing: boolean) {
  useEffect(() => {
    if (!open) return;
    const subscription = BackHandler.addEventListener(
      "hardwareBackPress",
      () => {
        if (!publishing) close();
        return true;
      },
    );
    return () => subscription.remove();
  }, [open, close, publishing]);
}

const useStyles = themedStyles((colors) => ({
  screen: { flex: 1, backgroundColor: colors.background },
}));
