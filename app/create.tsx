import { useEffect, useRef, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Redirect, router, useNavigation } from "expo-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { novels } from "../src/api/novels";
import type { BaseWork, CreateNovel, NovelMode } from "../src/api/types";
import { useSession } from "../src/state/session";
import { BaseWorkPicker } from "../src/components/create/BaseWorkPicker";
import {
  DeliveryCountStepper,
  ModePicker,
} from "../src/components/create/ModePicker";
import { RelayLimits } from "../src/components/create/RelayLimits";
import { FollowPicker } from "../src/components/create/FollowPicker";
import {
  CoverPicker,
  type PickedCover,
} from "../src/components/create/CoverPicker";
import {
  Screen,
  Label,
  Field,
  Button,
  Card,
  ErrorBox,
  Loading,
  ui,
} from "../src/components/ui";

// 목표 회차는 한 가지가 닿을 수 있는 깊이다. 서버도 1~50으로 막는다.
const CHAPTER_LIMIT_MAX = 50;
const TURN_HOURS_MAX = 168;

interface Form {
  title: string;
  description: string;
  genre: string;
  mode: NovelMode;
  deliveryCount: number;
  inviteeIds: number[];
  chapterLimit: string;
  turnHours: string;
  baseWork?: BaseWork;
  cover?: PickedCover;
}

const emptyForm: Form = {
  title: "",
  description: "",
  genre: "판타지",
  mode: "OPEN",
  deliveryCount: 3,
  inviteeIds: [],
  chapterLimit: "20",
  turnHours: "24",
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
  if (!isWholeNumberBetween(chapterLimit, 1, CHAPTER_LIMIT_MAX))
    return `목표 회차는 1~${CHAPTER_LIMIT_MAX}화로 입력해 주세요.`;
  if (!isWholeNumberBetween(turnHours, 1, TURN_HOURS_MAX))
    return `제한 시간은 1~${TURN_HOURS_MAX}시간으로 입력해 주세요.`;
  if (form.mode === "CIRCLE" && form.inviteeIds.length === 0)
    return "함께 쓸 작가를 한 명 이상 골라 주세요.";
  if (form.cover && form.cover.id === undefined)
    return "표지를 다 올린 뒤에 만들 수 있어요. 올리지 못했다면 다시 올리거나 빼 주세요.";
  const common = {
    kind: "RELAY" as const,
    mode: form.mode,
    title: form.title.trim(),
    description: form.description.trim(),
    genre: form.genre,
    chapterLimit,
    turnHours,
    baseWorkId: form.baseWork?.id,
    coverId: form.cover?.id,
  };
  // 열매로 퍼뜨리는 작품은 누구나 읽고, 모여 만들기는 고른 작가만 본다.
  if (form.mode === "OPEN")
    return { ...common, isPublic: true, deliveryCount: form.deliveryCount };
  return { ...common, isPublic: false, inviteeIds: form.inviteeIds };
}

function submitLabel(mode: NovelMode, pending: boolean) {
  if (pending) return "이야기 만드는 중…";
  if (mode === "OPEN") return "첫 회차 쓰러 가기";
  return "모여 만들기 시작하기";
}

export default function Create() {
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
  const genres = useQuery({
    queryKey: ["genres"],
    queryFn: novels.genres,
    enabled: mode === "authenticated",
    staleTime: 60 * 60 * 1000,
  });
  const mutation = useMutation({
    mutationFn: novels.create,
    onSuccess: (detail) => {
      created.current = true;
      void client.invalidateQueries({ queryKey: ["novels"] });
      router.replace(`/novel/${detail.novel.id}`);
      // 열매로 퍼뜨리는 작품은 만든 사람이 1회차를 써야 배달이 시작된다.
      if (detail.novel.mode === "OPEN" && detail.canWrite)
        router.push({
          pathname: "/novel/write",
          params: { id: detail.novel.id },
        });
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
                  genre: work.genre,
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
        <Text style={ui.label}>장르</Text>
        {genres.isPending && <Loading />}
        {!!genres.error && (
          <ErrorBox
            error={genres.error}
            retry={() => {
              void genres.refetch();
            }}
          />
        )}
        <ScrollView
          horizontal
          contentContainerStyle={styles.genres}
          showsHorizontalScrollIndicator={false}
        >
          {(genres.data ?? []).map((genre) => (
            <Pressable
              key={genre}
              accessibilityRole="button"
              accessibilityState={{ selected: form.genre === genre }}
              onPress={() => update({ genre })}
              style={[ui.pill, form.genre === genre && ui.pillSelected]}
            >
              <Text
                style={[
                  ui.pillText,
                  form.genre === genre && ui.pillTextSelected,
                ]}
              >
                {genre}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
      </View>
      <View style={styles.section}>
        <Text style={ui.label}>만드는 방식</Text>
        <ModePicker
          value={form.mode}
          onChange={(next) => update({ mode: next })}
        />
        {isOpen ? (
          <DeliveryCountStepper
            value={form.deliveryCount}
            onChange={(deliveryCount) => update({ deliveryCount })}
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
  genres: { gap: 8, paddingVertical: 14 },
});
