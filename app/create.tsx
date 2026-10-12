import { useState } from "react";
import { Text, View, ScrollView, Pressable, Switch } from "react-native";
import { Redirect, router } from "expo-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { novels } from "../src/api/novels";
import { useSession } from "../src/state/session";
import {
  Screen,
  Label,
  Field,
  Button,
  ErrorBox,
  ui,
} from "../src/components/ui";
import { colors } from "../src/theme";
export default function Create() {
  const { mode } = useSession(),
    client = useQueryClient();
  const [title, setTitle] = useState(""),
    [description, setDescription] = useState(""),
    [genre, setGenre] = useState("판타지"),
    [memberLimit, setMembers] = useState("6"),
    [chapterLimit, setChapters] = useState("20"),
    [turnHours, setHours] = useState("24"),
    [isPublic, setPublic] = useState(true),
    [validation, setValidation] = useState("");
  const mutation = useMutation({
    mutationFn: novels.create,
    onSuccess: (d) => {
      void client.invalidateQueries({ queryKey: ["novels"] });
      router.replace(`/novel/${d.novel.id}`);
    },
  });
  if (mode !== "authenticated") return <Redirect href="/login" />;
  function submit() {
    const members = Number(memberLimit),
      chapters = Number(chapterLimit),
      hours = Number(turnHours);
    if (!title.trim() || !description.trim()) {
      setValidation("제목과 소개를 입력해 주세요.");
      return;
    }
    if (
      !Number.isInteger(members) ||
      members < 2 ||
      members > 10 ||
      !Number.isInteger(chapters) ||
      chapters < 1 ||
      chapters > 100 ||
      !Number.isInteger(hours) ||
      hours < 1 ||
      hours > 168
    ) {
      setValidation(
        "참가자는 2~10명, 회차는 1~100장, 제한 시간은 1~168시간으로 입력해 주세요.",
      );
      return;
    }
    setValidation("");
    mutation.mutate({
      kind: "RELAY",
      title: title.trim(),
      description: description.trim(),
      genre,
      memberLimit: members,
      chapterLimit: chapters,
      turnHours: hours,
      isPublic,
    });
  }
  return (
    <Screen title="이야기 시작하기">
      <Label>A NEW BEGINNING</Label>
      <Text style={ui.heading}>함께 쓸 세계를{"\n"}열어 주세요.</Text>
      <Text style={[ui.body, { marginBottom: 24 }]}>
        작가를 모집한 뒤 릴레이를 시작해요.{"\n"}승인된 작가들이 정해진 차례대로
        한 장씩 이어 써요.
      </Text>
      <Field
        label="이야기 제목"
        value={title}
        onChangeText={setTitle}
        maxLength={120}
        placeholder="달빛을 파는 가게"
      />
      <Field
        label="이야기 소개"
        value={description}
        onChangeText={setDescription}
        multiline
        maxLength={500}
        placeholder="어떤 세계를 함께 만들고 싶나요?"
      />
      <Text style={ui.label}>장르</Text>
      <ScrollView
        horizontal
        contentContainerStyle={{ gap: 8, paddingVertical: 14 }}
        showsHorizontalScrollIndicator={false}
      >
        {["판타지", "일상", "미스터리", "로맨스", "SF"].map((g) => (
          <Pressable
            key={g}
            accessibilityRole="button"
            accessibilityState={{ selected: genre === g }}
            onPress={() => setGenre(g)}
            style={[ui.pill, genre === g && ui.pillSelected]}
          >
            <Text style={[ui.pillText, genre === g && ui.pillTextSelected]}>
              {g}
            </Text>
          </Pressable>
        ))}
      </ScrollView>
      <View style={{ flexDirection: "row", gap: 10 }}>
        <View style={{ flex: 1 }}>
          <Field
            label="최대 작가 수"
            value={memberLimit}
            onChangeText={setMembers}
            keyboardType="number-pad"
            maxLength={2}
          />
        </View>
        <View style={{ flex: 1 }}>
          <Field
            label="목표 회차 수"
            value={chapterLimit}
            onChangeText={setChapters}
            keyboardType="number-pad"
            maxLength={3}
          />
        </View>
      </View>
      <Field
        label="한 차례 제한 시간 (시간)"
        value={turnHours}
        onChangeText={setHours}
        keyboardType="number-pad"
        maxLength={3}
      />
      <View style={ui.row}>
        <View>
          <Text style={ui.label}>공개 모집</Text>
          <Text style={ui.hint}>
            {isPublic
              ? "누구나 참가를 신청할 수 있어요."
              : "초대 코드를 받은 사람만 신청할 수 있어요."}
          </Text>
        </View>
        <Switch
          accessibilityLabel="공개 모집"
          value={isPublic}
          onValueChange={setPublic}
          trackColor={{ true: colors.mint }}
        />
      </View>
      <Text style={ui.hint}>
        최소 두 명이 모이면 개설자가 릴레이를 시작할 수 있어요. 제한 시간이
        지나면 백엔드 규칙에 따라 다음 작가에게 차례가 넘어가요.
      </Text>
      {!!validation && <ErrorBox error={new Error(validation)} />}
      {!!mutation.error && <ErrorBox error={mutation.error} />}
      <Button onPress={submit} disabled={mutation.isPending}>
        {mutation.isPending ? "이야기 만드는 중…" : "작가 모집 시작하기"}
      </Button>
    </Screen>
  );
}
