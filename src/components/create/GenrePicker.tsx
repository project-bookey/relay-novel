import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text } from "react-native";
import { useQuery } from "@tanstack/react-query";
import { novels } from "../../api/novels";
import { useSession } from "../../state/session";
import { ErrorBox, Loading, useUi } from "../ui";

// 서버도 세 개까지만 받는다.
export const GENRES_MAX = 3;

// 작품 장르 고르기(최대 세 개, 고른 순서대로). 장르 목록은 서버가 정한다.
export function GenrePicker({
  value,
  onChange,
}: {
  value: string[];
  onChange: (genres: string[]) => void;
}) {
  const ui = useUi();
  const { mode } = useSession();
  const [triedTooMany, setTriedTooMany] = useState(false);
  // 하나를 빼거나 베이스 작품으로 장르가 바뀌어 자리가 생기면 안내를 거둔다.
  const showLimit = triedTooMany && value.length >= GENRES_MAX;
  const genres = useQuery({
    queryKey: ["genres"],
    queryFn: novels.genres,
    enabled: mode === "authenticated",
    staleTime: 60 * 60 * 1000,
  });
  const toggle = (genre: string) => {
    if (value.includes(genre)) {
      setTriedTooMany(false);
      onChange(value.filter((picked) => picked !== genre));
      return;
    }
    if (value.length >= GENRES_MAX) {
      setTriedTooMany(true);
      return;
    }
    onChange([...value, genre]);
  };
  return (
    <>
      <Text style={ui.label}>{`장르 (최대 ${GENRES_MAX}개)`}</Text>
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
        {(genres.data ?? []).map((genre) => {
          const selected = value.includes(genre);
          return (
            <Pressable
              key={genre}
              accessibilityRole="checkbox"
              accessibilityLabel={genre}
              accessibilityState={{ checked: selected }}
              onPress={() => toggle(genre)}
              style={[ui.pill, selected && ui.pillSelected]}
            >
              <Text style={[ui.pillText, selected && ui.pillTextSelected]}>
                {genre}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
      {showLimit && (
        <Text style={ui.hint} accessibilityLiveRegion="polite">
          {`장르는 ${GENRES_MAX}개까지 고를 수 있어요. 다른 장르를 고르려면 하나를 빼 주세요.`}
        </Text>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  genres: { gap: 8, paddingVertical: 14 },
});
