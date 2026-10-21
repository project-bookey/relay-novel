import { Pressable, ScrollView, Text, View } from "react-native";
import { Redirect, router } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { useSession } from "../../src/state/session";
import { novels } from "../../src/api/novels";
import { demoStories } from "../../src/api/demo";
import { MyHeader } from "../../src/components/my/MyHeader";
import { TurnRow } from "../../src/components/my/TurnRow";
import { useMyStories } from "../../src/components/my/useMyStories";
import { Bookshelf } from "../../src/components/my/Bookshelf";
import { SettingRows } from "../../src/components/my/SettingRows";
import { ErrorBox, Loading, Screen, useUi } from "../../src/components/ui";
import { themedStyles } from "../../src/theme/themed";

// 마이 페이지(사용자가 고른 시안 A "책장" reference/sian/my-page/ + 내 정보 시안 B "숫자 줄" reference/sian/my-profile/).
// 위에서부터 닉네임과 숫자 둘(내 작품·햇살) → 내 차례(진하게 강조하는 유일한 동작) → 내 작품 책장
// → 설정 줄(수거함·화면 모드·관심 장르) → 멀리 떨어진 로그아웃.
export default function MyPage() {
  const styles = useStyles();
  const { mode, logout } = useSession();

  if (mode === "loading")
    return (
      <Screen>
        <Loading />
      </Screen>
    );
  if (mode === "guest") return <Redirect href="/login" />;

  const isDemo = mode === "demo";
  const leave = () => {
    void logout().then(() => router.replace("/login"));
  };

  return (
    <Screen scroll={false}>
      <ScrollView contentContainerStyle={styles.content}>
        <MyHeader />
        {isDemo && <DemoNotice />}
        <MyTurns />
        <MyStories />
        <View style={styles.settings}>
          <SettingRows />
        </View>
        {/* 되돌리기 어려운 동작이라 다른 버튼들과 멀리 떨어뜨린다. */}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={isDemo ? "둘러보기 끝내기" : "로그아웃"}
          onPress={leave}
          style={styles.leave}
        >
          <Text style={styles.leaveText}>
            {isDemo ? "둘러보기 끝내기" : "로그아웃"}
          </Text>
        </Pressable>
      </ScrollView>
    </Screen>
  );
}

function DemoNotice() {
  const ui = useUi();
  const styles = useStyles();
  return (
    <View style={styles.notice}>
      <Text style={ui.body}>
        디자인 미리보기예요. 로그인하면 내 차례와 내 작품을 볼 수 있어요.
      </Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Bookey 계정으로 로그인"
        onPress={() => router.push("/login")}
        style={styles.noticeButton}
      >
        <Text style={styles.noticeButtonText}>Bookey 계정으로 로그인</Text>
      </Pressable>
    </View>
  );
}

// 내 차례가 없으면 자리를 비운다(고를 것을 줄인다). 불러오는 중·오류는 보여 준다.
function MyTurns() {
  const styles = useStyles();
  const { mode } = useSession();
  const isDemo = mode === "demo";
  const turns = useQuery({
    queryKey: ["my-turns", mode],
    queryFn: novels.turns,
    enabled: mode === "authenticated",
  });
  if (!isDemo && turns.isPending) return <Loading />;
  if (!isDemo && turns.error)
    return (
      <ErrorBox
        error={turns.error}
        retry={() => {
          void turns.refetch();
        }}
      />
    );
  const myTurns = isDemo
    ? demoStories.filter((story) => story.myTurn)
    : (turns.data ?? []);
  if (myTurns.length === 0) return null;
  return (
    <View style={styles.turns}>
      {myTurns.map((story) => (
        <TurnRow key={story.id} story={story} />
      ))}
    </View>
  );
}

function MyStories() {
  const ui = useUi();
  const styles = useStyles();
  const { query: mine, isDemo, stories } = useMyStories();
  return (
    <>
      {/* 편수는 맨 위 숫자 줄(MyHeader)에 있다. */}
      <Text style={styles.sectionTitle}>내 작품</Text>
      {!isDemo && mine.isPending && <Loading />}
      {!isDemo && !!mine.error && (
        <ErrorBox
          error={mine.error}
          retry={() => {
            void mine.refetch();
          }}
        />
      )}
      {(isDemo || mine.isSuccess) && stories.length === 0 && (
        <Text style={ui.hint}>아직 함께 쓰는 이야기가 없어요.</Text>
      )}
      <Bookshelf stories={stories} />
      {/* 위 숫자는 전체 편수라, 아직 못 보여 준 작품이 있으면 이어서 불러온다. */}
      {!isDemo && mine.hasNextPage && (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="내 작품 더 보기"
          disabled={mine.isFetchingNextPage}
          onPress={() => {
            void mine.fetchNextPage();
          }}
          style={styles.more}
        >
          <Text style={styles.moreText}>
            {mine.isFetchingNextPage ? "불러오는 중…" : "더 보기"}
          </Text>
        </Pressable>
      )}
    </>
  );
}

const useStyles = themedStyles((colors) => ({
  // 아래쪽 버튼에 마지막 내용이 가리지 않도록 여유를 둔다.
  content: {
    width: "100%",
    maxWidth: 680,
    alignSelf: "center",
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 120,
  },
  notice: { marginTop: 24, gap: 8 },
  noticeButton: {
    minHeight: 48,
    justifyContent: "center",
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: colors.ink,
    alignSelf: "flex-start",
  },
  noticeButtonText: { fontSize: 15, fontWeight: "700", color: colors.ink },
  turns: { marginTop: 20, gap: 10 },
  sectionTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: colors.ink,
    marginTop: 34,
    marginBottom: 14,
  },
  more: { marginTop: 16, minHeight: 44, justifyContent: "center" },
  moreText: { fontSize: 14, fontWeight: "600", color: colors.ink },
  settings: { marginTop: 36 },
  leave: {
    marginTop: 32,
    minHeight: 44,
    justifyContent: "center",
    alignSelf: "flex-start",
  },
  leaveText: {
    fontSize: 14,
    color: colors.muted,
    textDecorationLine: "underline",
  },
}));
