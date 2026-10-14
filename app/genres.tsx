import { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Redirect, router, useLocalSearchParams } from "expo-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { novels } from "../src/api/novels";
import { useSession } from "../src/state/session";
import {
  Screen,
  Label,
  Button,
  ErrorBox,
  Loading,
  ui,
} from "../src/components/ui";

const MAX_GENRES = 5;

// 관심 장르 고르기. 이 장르의 작품이 열매로 먼저 배달된다.
// 가입 직후(onboarding=1)와 마이에서 연다.
export default function Genres() {
  const { mode } = useSession();
  const { onboarding } = useLocalSearchParams<{ onboarding?: string }>();
  const isOnboarding = onboarding === "1";
  const client = useQueryClient();
  const [picked, setPicked] = useState<string[]>();
  const genres = useQuery({
    queryKey: ["genres"],
    queryFn: novels.genres,
    enabled: mode === "authenticated",
    staleTime: 60 * 60 * 1000,
  });
  const mine = useQuery({
    queryKey: ["my-genres", mode],
    queryFn: novels.myGenres,
    enabled: mode === "authenticated",
  });
  // 이미 고른 장르를 처음 한 번만 채운다.
  useEffect(() => {
    if (picked === undefined && mine.data) setPicked(mine.data);
  }, [picked, mine.data]);
  const done = () => {
    if (isOnboarding) router.replace("/");
    else router.back();
  };
  const save = useMutation({
    mutationFn: (selected: string[]) => novels.saveMyGenres(selected),
    onSuccess: (saved) => {
      client.setQueryData(["my-genres", mode], saved);
      done();
    },
  });

  if (mode !== "authenticated") return <Redirect href="/login" />;
  const selected = picked ?? [];
  const full = selected.length >= MAX_GENRES;
  const toggle = (genre: string) => {
    if (selected.includes(genre))
      setPicked(selected.filter((item) => item !== genre));
    else if (!full) setPicked([...selected, genre]);
  };
  const isLoading = genres.isPending || mine.isPending;
  const error = genres.error ?? mine.error;

  return (
    <Screen title="관심 장르">
      <Label>WHAT YOU LOVE</Label>
      <Text style={ui.heading}>어떤 이야기를{"\n"}받고 싶나요?</Text>
      <Text style={[ui.body, styles.intro]}>
        고른 장르의 이야기가 열매로 먼저 배달돼요. 다섯 개까지 고를 수 있어요.
      </Text>
      {isLoading && <Loading />}
      {!!error && (
        <ErrorBox
          error={error}
          retry={() => {
            void Promise.all([genres.refetch(), mine.refetch()]);
          }}
        />
      )}
      {!isLoading && !error && genres.data?.length === 0 && (
        <Text style={ui.hint}>지금은 고를 수 있는 장르가 없어요.</Text>
      )}
      <View style={styles.grid}>
        {(genres.data ?? []).map((genre) => {
          const checked = selected.includes(genre);
          const disabled = !checked && full;
          return (
            <Pressable
              key={genre}
              accessibilityRole="checkbox"
              accessibilityState={{ checked, disabled }}
              accessibilityLabel={genre}
              disabled={disabled}
              onPress={() => toggle(genre)}
              style={[
                ui.pill,
                styles.pill,
                checked && ui.pillSelected,
                disabled && styles.disabled,
              ]}
            >
              <Text style={[ui.pillText, checked && ui.pillTextSelected]}>
                {checked ? `✓ ${genre}` : genre}
              </Text>
            </Pressable>
          );
        })}
      </View>
      <Text
        style={ui.hint}
      >{`${selected.length}/${MAX_GENRES}개 골랐어요`}</Text>
      {!!save.error && <ErrorBox error={save.error} />}
      <Button
        disabled={save.isPending || isLoading || !!error}
        onPress={() => save.mutate(selected)}
      >
        {save.isPending ? "저장하는 중…" : "관심 장르 저장하기"}
      </Button>
      {isOnboarding && (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="나중에 할게요"
          onPress={done}
          style={styles.later}
        >
          <Text style={ui.body}>나중에 할게요</Text>
        </Pressable>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  intro: { marginBottom: 20 },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  // 장르 칸도 누르기 쉽게 44pt 높이를 둔다.
  pill: { minHeight: 44, justifyContent: "center", paddingHorizontal: 18 },
  disabled: { opacity: 0.4 },
  later: { minHeight: 48, alignItems: "center", justifyContent: "center" },
});
