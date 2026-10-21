import { useEffect, useRef, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { Redirect, router, useNavigation } from "expo-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { novels } from "../src/api/novels";
import type { BaseWork, CreateNovel, NovelMode } from "../src/api/types";
import { useSession } from "../src/state/session";
import { BaseWorkPicker } from "../src/components/create/BaseWorkPicker";
import {
  BRANCH_LIMIT_DEFAULT,
  BranchLimitStepper,
  ModePicker,
} from "../src/components/create/ModePicker";
import { RelayLimits } from "../src/components/create/RelayLimits";
import { FollowPicker } from "../src/components/create/FollowPicker";
import { GENRES_MAX, GenrePicker } from "../src/components/create/GenrePicker";
import { FirstChapterFields } from "../src/components/create/FirstChapterFields";
import {
  CoverPicker,
  type PickedCover,
} from "../src/components/create/CoverPicker";
import {
  Button,
  Card,
  ErrorBox,
  Field,
  Label,
  Screen,
  useUi,
} from "../src/components/ui";

// 목표 회차는 한 가지가 닿을 수 있는 깊이다. 서버도 1~50으로 막는다.
const CHAPTER_LIMIT_MAX = 50;
const TURN_HOURS_MAX = 168;

interface Form {
  title: string;
  description: string;
  genres: string[];
  mode: NovelMode;
  branchLimit: number;
  inviteeIds: number[];
  chapterLimit: string;
  turnHours: string;
  firstTitle: string;
  firstBody: string;
  baseWork?: BaseWork;
  cover?: PickedCover;
}

const emptyForm: Form = {
  title: "",
  description: "",
  genres: ["판타지"],
  mode: "OPEN",
  branchLimit: BRANCH_LIMIT_DEFAULT,
  inviteeIds: [],
  chapterLimit: "20",
  turnHours: "24",
  firstTitle: "",
  firstBody: "",
};

function isWholeNumberBetween(value: number, min: number, max: number) {
  return Number.isInteger(value) && value >= min && value <= max;
}

// 입력을 확인하고 서버에 보낼 요청을 만든다. 문제가 있으면 사용자에게 보일 문장을 돌려준다.
function toRequest(form: Form): CreateNovel | string {
  const chapterLimit = Number(form.chapterLimit);
  const turnHours = Number(form.turnHours);
  if (!form.title.trim() || !form.description.trim())
    return "제목과 소개를 입력해 주세요.";
  if (form.genres.length === 0 || form.genres.length > GENRES_MAX)
    return `장르를 1~${GENRES_MAX}개 골라 주세요.`;
  if (!isWholeNumberBetween(chapterLimit, 1, CHAPTER_LIMIT_MAX))
    return `목표 회차는 1~${CHAPTER_LIMIT_MAX}화로 입력해 주세요.`;
  if (!isWholeNumberBetween(turnHours, 1, TURN_HOURS_MAX))
    return `제한 시간은 1~${TURN_HOURS_MAX}시간으로 입력해 주세요.`;
  if (form.mode === "CIRCLE" && form.inviteeIds.length === 0)
    return "함께 쓸 작가를 한 명 이상 골라 주세요.";
  if (!form.firstTitle.trim() || !form.firstBody.trim())
    return "1회차 제목과 이야기를 써 주세요. 첫 회차는 만드는 사람이 직접 써요.";
  if (form.cover && form.cover.id === undefined)
    return "표지를 다 올린 뒤에 만들 수 있어요. 올리지 못했다면 다시 올리거나 빼 주세요.";
  const common = {
    kind: "RELAY" as const,
    mode: form.mode,
    title: form.title.trim(),
    description: form.description.trim(),
    genre: form.genres[0],
    genres: form.genres,
    chapterLimit,
    turnHours,
    baseWorkId: form.baseWork?.id,
    coverId: form.cover?.id,
    firstChapter: {
      title: form.firstTitle.trim(),
      body: form.firstBody.trim(),
    },
  };
  // 열매로 퍼뜨리는 작품은 누구나 읽고, 모여 만들기는 고른 작가만 본다.
  if (form.mode === "OPEN")
    return { ...common, isPublic: true, branchLimit: form.branchLimit };
  return { ...common, isPublic: false, inviteeIds: form.inviteeIds };
}

// 베이스 작품의 장르를 맨 앞(대표 장르)에 두고, 이미 고른 장르는 세 개까지 남긴다.
function withBaseWorkGenre(baseGenre: string, picked: string[]) {
  const others = picked.filter((genre) => genre !== baseGenre);
  return [baseGenre, ...others].slice(0, GENRES_MAX);
}

function submitLabel(mode: NovelMode, pending: boolean) {
  if (pending) return "이야기 만드는 중…";
  if (mode === "OPEN") return "1회차 올리고 열매 맺기";
  return "1회차 올리고 모여 만들기 시작하기";
}

export default function Create() {
  const ui = useUi();
  const { mode } = useSession();
  const client = useQueryClient();
  const navigation = useNavigation();
  const [form, setForm] = useState<Form>(emptyForm);
  const [validation, setValidation] = useState("");
  // 쓰던 내용을 두고 나가려 할 때의 안내. 입력 오류와 따로 둔다.
  const [leaveWarning, setLeaveWarning] = useState(false);
  const [leaving, setLeaving] = useState(false);
  // 만든 뒤 화면을 옮길 때는 이탈 확인을 건너뛴다. onSuccess 안에서는 아직 성공 상태가 아니라 ref로 표시한다.
  const created = useRef(false);
  const update = (changes: Partial<Form>) => {
    setForm((current) => ({ ...current, ...changes }));
    setValidation("");
  };
  const mutation = useMutation({
    mutationFn: novels.create,
    onSuccess: (detail) => {
      created.current = true;
      void client.invalidateQueries({ queryKey: ["novels"] });
      router.replace(`/novel/${detail.novel.id}`);
    },
  });
  const dirty = form !== emptyForm;
  // 쓰던 내용이 있으면 실수로 나가지 않게 한 번 묻는다.
  useEffect(
    () =>
      navigation.addListener("beforeRemove", (event) => {
        if (dirty && !created.current && !leaving) {
          event.preventDefault();
          setLeaveWarning(true);
        }
      }),
    [navigation, dirty, leaving],
  );
  useEffect(() => {
    if (leaving) router.back();
  }, [leaving]);

  if (mode !== "authenticated") return <Redirect href="/login" />;
  const submit = () => {
    const request = toRequest(form);
    if (typeof request === "string") {
      setValidation(request);
      return;
    }
    mutation.mutate(request);
  };
  const isOpen = form.mode === "OPEN";

  return (
    <Screen title="이야기 시작하기">
      <Label>A NEW BEGINNING</Label>
      <Text style={ui.heading}>어떤 이야기를{"\n"}심어 볼까요?</Text>
      {leaveWarning && (
        <Card>
          <Text style={ui.body}>
            작성 중인 이야기가 있어요. 나가면 입력한 내용이 사라져요.
          </Text>
          <Button outline onPress={() => setLeaving(true)}>
            작성을 그만두고 나가기
          </Button>
          <Button outline onPress={() => setLeaveWarning(false)}>
            계속 쓰기
          </Button>
        </Card>
      )}
      <BaseWorkPicker
        picked={form.baseWork}
        onPick={(work) =>
          update(
            work
              ? {
                  baseWork: work,
                  description: work.synopsis,
                  genres: withBaseWorkGenre(work.genre, form.genres),
                }
              : { baseWork: undefined },
          )
        }
      />
      <View style={styles.section}>
        <Text style={ui.label}>표지 (선택)</Text>
        <CoverPicker
          picked={form.cover}
          onChange={(cover) => update({ cover })}
        />
      </View>
      <View style={styles.section}>
        <Field
          label="이야기 제목"
          value={form.title}
          onChangeText={(title) => update({ title })}
          maxLength={120}
          placeholder="달빛을 파는 가게"
        />
        <Field
          label="이야기 소개"
          value={form.description}
          onChangeText={(description) => update({ description })}
          multiline
          maxLength={500}
          placeholder="어떤 세계를 함께 만들고 싶나요?"
        />
        <GenrePicker
          value={form.genres}
          onChange={(genres) => update({ genres })}
        />
      </View>
      <View style={styles.section}>
        <Text style={ui.label}>만드는 방식</Text>
        <ModePicker
          value={form.mode}
          onChange={(next) => update({ mode: next })}
        />
        {isOpen ? (
          <BranchLimitStepper
            value={form.branchLimit}
            onChange={(branchLimit) => update({ branchLimit })}
          />
        ) : (
          <FollowPicker
            selected={form.inviteeIds}
            onChange={(inviteeIds) => update({ inviteeIds })}
          />
        )}
      </View>
      <View style={styles.section}>
        <RelayLimits
          mode={form.mode}
          chapterLimit={form.chapterLimit}
          turnHours={form.turnHours}
          onChange={update}
        />
      </View>
      <View style={styles.section}>
        <Text style={ui.label}>1회차는 직접 써요</Text>
        <FirstChapterFields
          mode={form.mode}
          title={form.firstTitle}
          body={form.firstBody}
          onChange={update}
        />
      </View>
      {!!validation && <ErrorBox error={new Error(validation)} />}
      {!!mutation.error && <ErrorBox error={mutation.error} />}
      <Button onPress={submit} disabled={mutation.isPending}>
        {submitLabel(form.mode, mutation.isPending)}
      </Button>
    </Screen>
  );
}

const styles = StyleSheet.create({
  // 묶음 사이 간격은 묶음 안 간격보다 넓게 둔다.
  section: { marginTop: 28 },
});
