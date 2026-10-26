import { useMemo, useRef } from "react";
import { Animated, Pressable, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Text } from "../../src/components/text";
import { Redirect, router } from "expo-router";
import { useSession } from "../../src/state/session";
import { StoryBackdrop } from "../../src/components/StoryBackdrop";
import { MyCard } from "../../src/components/my/MyCard";
import { MyTodo } from "../../src/components/my/MyTodo";
import { MyShelfSection } from "../../src/components/my/MyShelfSection";
import { useMyStories } from "../../src/components/my/useMyStories";
import { SettingRows } from "../../src/components/my/SettingRows";
import { nativeDriverEnabled } from "../../src/components/fruitMotion";
import { Loading, Screen, useUi } from "../../src/components/ui";
import { themedStyles } from "../../src/theme/themed";

// 맨 위를 물들이는 내 이야기 색의 높이(상태 표시줄 아래부터)
const BACKDROP_HEIGHT = 340;
// 아래 바와 그 위 여유. 기기 아래 여백은 따로 더한다.
const BOTTOM_SPACE = 120;

// 마이 페이지(사용자가 고른 시안 reference/sian/my-redesign A′ "유리 명함").
// 내 이야기 색 위의 유리 명함(이름 · 햇살 칩 · 숫자 셋) → 내 할 일(상자 없이, 강조는 가장 급한 "이어 쓰기" 하나)
// → 내 작품 · 내가 이어 쓴 이야기 책장(큰 이름 + 조금 각진 상자) → 설정 상자 → 멀리 떨어진 로그아웃.
// 맨 위 색이 상태 표시줄 뒤까지 닿도록 안전 영역을 직접 비우고, 내리면 상태 표시줄 뒤에만 바탕색을 깐다.
export default function MyPage() {
  const styles = useStyles();
  const insets = useSafeAreaInsets();
  const { mode, logout } = useSession();
  const scrollY = useRef(new Animated.Value(0)).current;
  const onScroll = useMemo(
    () =>
      Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], {
        useNativeDriver: nativeDriverEnabled,
      }),
    [scrollY],
  );

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
  // 내리면 상태 표시줄 뒤에 바탕색이 깔려 시계·배터리가 글자와 겹치지 않는다(유리 줄은 두지 않는다 — 사용자 요청).
  const statusVeil = scrollY.interpolate({
    inputRange: [0, insets.top + 24],
    outputRange: [0, 1],
    extrapolate: "clamp",
  });

  return (
    <View style={styles.screen}>
      <Animated.ScrollView
        onScroll={onScroll}
        scrollEventThrottle={16}
        // 안전 영역을 직접 비운다. 아래는 아래 바(높이 + 기기 아래 여백)에 마지막 줄이 가리지 않을 만큼.
        contentContainerStyle={{
          paddingTop: insets.top + 16,
          paddingBottom: insets.bottom + BOTTOM_SPACE,
        }}
      >
        <ShelfBackdrop height={insets.top + BACKDROP_HEIGHT} />
        <View style={styles.column}>
          <MyCard />
          {isDemo && <DemoNotice />}
          <View style={styles.todo}>
            <MyTodo />
          </View>
          <MyShelfSection shelf="mine" />
          <MyShelfSection shelf="continued" />
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
        </View>
      </Animated.ScrollView>
      <Animated.View
        pointerEvents="none"
        style={[styles.statusVeil, { height: insets.top, opacity: statusVeil }]}
      />
    </View>
  );
}

// 내 작품과 이어 쓴 이야기의 색을 맨 위에 깐다. 두 책장과 같은 쿼리라 따로 불러오지 않는다.
function ShelfBackdrop({ height }: { height: number }) {
  const mine = useMyStories("mine");
  const continued = useMyStories("continued");
  return (
    <StoryBackdrop
      stories={[...mine.stories, ...continued.stories]}
      height={height}
    />
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

const useStyles = themedStyles((colors) => ({
  screen: { flex: 1, backgroundColor: colors.background },
  column: {
    width: "100%",
    maxWidth: 680,
    alignSelf: "center",
    paddingHorizontal: 24,
  },
  notice: { marginTop: 20, gap: 8 },
  noticeButton: {
    minHeight: 48,
    justifyContent: "center",
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: colors.ink,
    alignSelf: "flex-start",
  },
  noticeButtonText: { fontSize: 15, fontWeight: "700", color: colors.ink },
  todo: { marginTop: 12 },
  settings: { marginTop: 28 },
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
  statusVeil: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.background,
  },
}));
