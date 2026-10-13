import { ScrollView, StyleSheet, Text, View } from "react-native";
import { Redirect, router } from "expo-router";
import { useQuery, type UseQueryResult } from "@tanstack/react-query";
import { useSession } from "../../src/state/session";
import { novels } from "../../src/api/novels";
import { demoStories } from "../../src/api/demo";
import type { NovelSummary } from "../../src/api/types";
import { StoryCard } from "../../src/components/home/StoryCard";
import {
  Button,
  Card,
  ErrorBox,
  Label,
  Loading,
  Screen,
  ui,
} from "../../src/components/ui";

function StorySection({
  title,
  stories,
  query,
  emptyMessage,
}: {
  title: string;
  stories: NovelSummary[];
  // 둘러보기에서는 서버에 묻지 않으므로 쿼리가 없다.
  query?: UseQueryResult<unknown>;
  emptyMessage: string;
}) {
  return (
    <>
      <Text style={ui.sectionTitle}>{title}</Text>
      {!!query?.isPending && <Loading />}
      {!!query?.error && (
        <ErrorBox
          error={query.error}
          retry={() => {
            void query.refetch();
          }}
        />
      )}
      {!query?.isPending && !query?.error && stories.length === 0 && (
        <Text style={ui.hint}>{emptyMessage}</Text>
      )}
      {stories.map((story) => (
        <StoryCard key={story.id} story={story} />
      ))}
    </>
  );
}

// 마이 페이지. 내 차례와 내 작품, 초대 코드 참가, 로그아웃을 모았다.
export default function MyPage() {
  const { mode, logout } = useSession();
  const turns = useQuery({
    queryKey: ["my-turns", mode],
    queryFn: novels.turns,
    enabled: mode === "authenticated",
  });
  const mine = useQuery({
    queryKey: ["novels", "mine", mode],
    queryFn: () => novels.mine(0),
    enabled: mode === "authenticated",
  });

  if (mode === "loading")
    return (
      <Screen>
        <Loading />
      </Screen>
    );
  if (mode === "guest") return <Redirect href="/login" />;

  const isDemo = mode === "demo";
  const myTurns = isDemo
    ? demoStories.filter((story) => story.myTurn)
    : (turns.data ?? []);
  const myStories = isDemo
    ? demoStories.filter((story) => story.mine)
    : (mine.data?.content ?? []);
  const leave = () => {
    void logout().then(() => router.replace("/login"));
  };

  return (
    <Screen scroll={false}>
      <View style={styles.frame}>
        <ScrollView contentContainerStyle={styles.content}>
          <Label>MY PAGE</Label>
          <Text style={ui.heading}>마이</Text>
          {isDemo && (
            <Card>
              <Text style={ui.body}>
                디자인 미리보기예요. 로그인하면 내 차례와 내 작품을 볼 수
                있어요.
              </Text>
              <Button outline onPress={() => router.push("/login")}>
                Bookey 계정으로 로그인
              </Button>
            </Card>
          )}
          <StorySection
            title="내 차례"
            stories={myTurns}
            query={isDemo ? undefined : turns}
            emptyMessage="지금 이어 쓸 차례인 이야기가 없어요."
          />
          <StorySection
            title="내 작품"
            stories={myStories}
            query={isDemo ? undefined : mine}
            emptyMessage="아직 함께 쓰는 이야기가 없어요."
          />
          <View style={styles.actions}>
            <Button
              outline
              onPress={() => router.push(isDemo ? "/login" : "/join")}
            >
              초대 코드로 참가하기
            </Button>
            <Button outline onPress={leave}>
              {isDemo ? "둘러보기 끝내기" : "로그아웃"}
            </Button>
          </View>
        </ScrollView>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  frame: {
    flex: 1,
    width: "100%",
    maxWidth: 680,
    alignSelf: "center",
    padding: 24,
  },
  // 아래쪽 버튼에 마지막 내용이 가리지 않도록 여유를 둔다.
  content: { paddingBottom: 120 },
  actions: { marginTop: 24 },
});
