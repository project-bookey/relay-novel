import { Text, View } from "react-native";
import { Redirect, router, useLocalSearchParams } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { novels } from "../../src/api/novels";
import { demoChapters, demoDetail } from "../../src/api/demo";
import { useSession } from "../../src/state/session";
import {
  Screen,
  Label,
  Button,
  Loading,
  ErrorBox,
  ui,
} from "../../src/components/ui";
import { colors } from "../../src/theme";
export default function Read() {
  const p = useLocalSearchParams<{ id: string; chapter: string }>(),
    id = Number(p.id),
    number = Number(p.chapter),
    { mode } = useSession();
  const detail = useQuery({
    queryKey: ["novel", id, mode],
    queryFn: () =>
      mode === "demo" ? Promise.resolve(demoDetail(id)) : novels.get(id),
    enabled: mode === "demo" || mode === "authenticated",
  });
  const query = useQuery({
    queryKey: ["chapter", id, number, mode],
    queryFn: () =>
      mode === "demo"
        ? Promise.resolve(demoChapters.find((c) => c.chapterNumber === number)!)
        : novels.chapter(id, number),
    enabled: mode === "demo" || mode === "authenticated",
  });
  if (mode === "guest") return <Redirect href="/login" />;
  const c = query.data;
  return (
    <Screen title={detail.data?.novel.title || "이야기 읽기"}>
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
        c && (
          <>
            <View style={{ marginVertical: 25 }}>
              <Label>CHAPTER {String(c.chapterNumber).padStart(2, "0")}</Label>
              <Text style={ui.heading}>{c.title}</Text>
              <Text style={ui.body}>
                {c.authorNickname} ·{" "}
                {new Date(c.createdAt).toLocaleDateString("ko-KR")}
              </Text>
            </View>
            <Text
              selectable
              style={{
                fontSize: 17,
                lineHeight: 32,
                color: colors.ink,
                paddingBottom: 35,
              }}
            >
              {c.body}
            </Text>
            <View style={{ flexDirection: "row", gap: 10 }}>
              {number > 1 && (
                <View style={{ flex: 1 }}>
                  <Button
                    outline
                    onPress={() => router.setParams({ chapter: number - 1 })}
                  >
                    이전 장
                  </Button>
                </View>
              )}
              {number < (detail.data?.novel.chapterCount || 0) && (
                <View style={{ flex: 1 }}>
                  <Button
                    onPress={() => router.setParams({ chapter: number + 1 })}
                  >
                    다음 장
                  </Button>
                </View>
              )}
            </View>
            {detail.data?.canWrite &&
              number === detail.data.novel.chapterCount && (
                <Button
                  onPress={() =>
                    router.push({ pathname: "/novel/write", params: { id } })
                  }
                >
                  이제 당신의 이야기 이어 쓰기
                </Button>
              )}
          </>
        )
      )}
    </Screen>
  );
}
