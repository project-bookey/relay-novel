import { Pressable, ScrollView, StyleSheet, Text } from "react-native";
import { useQuery } from "@tanstack/react-query";
import { novels } from "../../api/novels";
import { useSession } from "../../state/session";
import { ErrorBox, Loading, useUi } from "../ui";

// 작품 장르 고르기. 장르 목록은 서버가 정한다.
export function GenrePicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (genre: string) => void;
}) {
  const ui = useUi();
  const { mode } = useSession();
  const genres = useQuery({
    queryKey: ["genres"],
    queryFn: novels.genres,
    enabled: mode === "authenticated",
    staleTime: 60 * 60 * 1000,
  });
  return (
    <>
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
        {(genres.data ?? []).map((genre) => {
          const selected = value === genre;
          return (
            <Pressable
              key={genre}
              accessibilityRole="button"
              accessibilityState={{ selected }}
              onPress={() => onChange(genre)}
              style={[ui.pill, selected && ui.pillSelected]}
            >
              <Text style={[ui.pillText, selected && ui.pillTextSelected]}>
                {genre}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  genres: { gap: 8, paddingVertical: 14 },
});
