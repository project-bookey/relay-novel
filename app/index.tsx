import { useState } from "react";
import {
  View,
  Text,
  Pressable,
  ScrollView,
  TextInput,
  StyleSheet,
} from "react-native";
import { Redirect, router } from "expo-router";
import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import {
  Plus,
  Search,
  ArrowUpRight,
  BookOpen,
  Users,
  LogOut,
} from "lucide-react-native";
import { useSession } from "../src/state/session";
import { novels } from "../src/api/novels";
import { demoStories } from "../src/api/demo";
import type { NovelStatus, NovelSummary } from "../src/api/types";
import { colors, candyColors, statusLabel } from "../src/theme";
import { Candy, CandyUniverse } from "../src/components/Candy";
import {
  Screen,
  Label,
  Button,
  Card,
  Loading,
  ErrorBox,
  ui,
} from "../src/components/ui";
const filters: [string, NovelStatus | undefined][] = [
  ["전체", undefined],
  ["모집 중", "RECRUITING"],
  ["집필 중", "ONGOING"],
  ["완결", "COMPLETED"],
];
export default function Home() {
  const { mode, logout } = useSession();
  const [tab, setTab] = useState<"feed" | "mine" | "turns">("feed"),
    [status, setStatus] = useState<NovelStatus>(),
    [search, setSearch] = useState("");
  const query = useInfiniteQuery({
    queryKey: ["novels", tab, status, mode],
    initialPageParam: 0,
    queryFn: ({ pageParam }) =>
      tab === "mine" ? novels.mine(pageParam) : novels.feed(status, pageParam),
    getNextPageParam: (last) => (last.hasNext ? last.page + 1 : undefined),
    enabled: mode === "authenticated" && tab !== "turns",
  });
  const turns = useQuery({
    queryKey: ["my-turns", mode],
    queryFn: novels.turns,
    enabled: mode === "authenticated" && tab === "turns",
    refetchInterval: 30000,
  });
  if (mode === "loading")
    return (
      <Screen>
        <Loading />
      </Screen>
    );
  if (mode === "guest") return <Redirect href="/login" />;
  const items = (
    mode === "demo"
      ? demoStories.filter((n) =>
          tab === "mine" ? n.mine : tab === "turns" ? n.myTurn : true,
        )
      : tab === "turns"
        ? turns.data || []
        : query.data?.pages.flatMap((p) => p.content) || []
  ).filter(
    (n) =>
      (!status || n.status === status) &&
      `${n.title} ${n.description} ${n.genre}`.includes(search.trim()),
  );
  const openCreate = () => router.push(mode === "demo" ? "/login" : "/create");
  return (
    <Screen>
      <View style={ui.row}>
        <Text style={s.logo}>
          <Text style={{ color: colors.green }}>✳ </Text>relay
          <Text style={{ fontWeight: "400" }}>novel</Text>
          <Text style={{ color: colors.lavender }}> .</Text>
        </Text>
        <Pressable
          accessibilityLabel="로그아웃"
          onPress={() => {
            void logout().then(() => router.replace("/login"));
          }}
          hitSlop={12}
        >
          <LogOut size={18} color={colors.muted} />
        </Pressable>
      </View>
      {mode === "demo" && (
        <Pressable onPress={() => router.push("/login")} style={s.demo}>
          <Text style={{ fontSize: 12, color: colors.green }}>
            디자인 미리보기 · 로그인하면 실제 이야기에 참여할 수 있어요 →
          </Text>
        </Pressable>
      )}
      <View style={s.hero}>
        <Label>A LITTLE IMAGINATION, A BIG STORY</Label>
        <Text style={s.heroTitle}>
          너의 한 문장,{"\n"}우리의{" "}
          <Text style={{ color: colors.green }}>다음 이야기.</Text>
        </Text>
        <Text style={ui.body}>
          작은 상상 하나를 더해 주세요.{"\n"}그다음은 우리가 함께 쓸 테니까요.
        </Text>
        <CandyUniverse />
        <View style={s.artCaption}>
          <Text style={s.captionText}>✦ EVERY WORD IS A LITTLE UNIVERSE</Text>
        </View>
        <Button onPress={openCreate}>새 이야기 시작하기</Button>
      </View>
      <View style={s.how}>
        <Text style={s.howText}>
          01 발견하고 → 02 차례를 이어 쓰고 → 03 함께 완성해요
        </Text>
      </View>
      <View style={[ui.row, { marginTop: 26 }]}>
        <Text style={[ui.sectionTitle, { marginTop: 0, marginBottom: 0 }]}>
          함께 만드는 이야기
        </Text>
        <Pressable
          accessibilityLabel="초대 코드로 참가"
          onPress={() => router.push(mode === "demo" ? "/login" : "/join")}
        >
          <Plus size={21} color={colors.green} />
        </Pressable>
      </View>
      <View style={s.tabs}>
        {(
          [
            ["feed", "이야기 탐색"],
            ["turns", "내 차례"],
            ["mine", "내 작품"],
          ] as const
        ).map(([key, label]) => (
          <Pressable
            key={key}
            onPress={() => setTab(key)}
            style={[s.tab, tab === key && s.activeTab]}
          >
            <Text
              style={[
                s.tabText,
                tab === key && { color: colors.ink, fontWeight: "700" },
              ]}
            >
              {label}
            </Text>
          </Pressable>
        ))}
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: 8, paddingVertical: 14 }}
      >
        {filters.map(([label, value]) => (
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ selected: status === value }}
            key={label}
            style={[ui.pill, status === value && ui.pillSelected]}
            onPress={() => setStatus(value)}
          >
            <Text
              style={[ui.pillText, status === value && ui.pillTextSelected]}
            >
              {label}
            </Text>
          </Pressable>
        ))}
      </ScrollView>
      <View style={s.search}>
        <Search size={16} color={colors.muted} />
        <TextInput
          accessibilityLabel="불러온 이야기 검색"
          value={search}
          onChangeText={setSearch}
          placeholder="제목, 소개, 장르로 찾아보기"
          placeholderTextColor={colors.muted}
          style={{
            flex: 1,
            fontSize: 13,
            color: colors.ink,
            paddingVertical: 8,
          }}
        />
      </View>
      {mode !== "demo" &&
        (tab === "turns" ? turns.isPending : query.isPending) && <Loading />}
      {(tab === "turns" ? turns.error : query.error) && (
        <ErrorBox
          error={tab === "turns" ? turns.error : query.error}
          retry={() => {
            void (tab === "turns" ? turns.refetch() : query.refetch());
          }}
        />
      )}
      {items.map((n) => (
        <StoryCard key={n.id} story={n} />
      ))}
      {!items.length &&
        !(
          mode !== "demo" &&
          (tab === "turns" ? turns.isPending : query.isPending)
        ) && (
          <Card>
            <Text style={ui.sectionTitle}>
              {tab === "turns"
                ? "아직 당신의 차례가 없어요"
                : "새로운 이야기를 기다리고 있어요"}
            </Text>
            <Text style={ui.body}>
              모집 중인 작품에 참가하거나, 직접 이야기를 시작해 보세요.
            </Text>
            <Button outline onPress={openCreate}>
              첫 이야기 만들기
            </Button>
          </Card>
        )}
      {mode === "authenticated" && tab !== "turns" && query.hasNextPage && (
        <Button
          outline
          disabled={query.isFetchingNextPage}
          onPress={() => {
            void query.fetchNextPage();
          }}
        >
          {query.isFetchingNextPage ? "불러오는 중…" : "이야기 더 보기"}
        </Button>
      )}
      <Text style={[ui.hint, { textAlign: "center", marginTop: 20 }]}>
        작은 상상들이 모이는 곳. relay novel
      </Text>
    </Screen>
  );
}
function StoryCard({ story: n }: { story: NovelSummary }) {
  const color = candyColors[(n.id - 1) % candyColors.length];
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${n.title}, ${statusLabel[n.status]}`}
      onPress={() => router.push(`/novel/${n.id}`)}
      style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
    >
      <Card style={{ padding: 0, overflow: "hidden" }}>
        <View style={[s.cardArt, { backgroundColor: `${color}22` }]}>
          <View style={{ position: "absolute", left: 18, top: 17 }}>
            <Text style={s.genre}>{n.genre}</Text>
            <Text style={s.cardNumber}>
              CHAPTER {String(n.chapterCount).padStart(2, "0")}
            </Text>
          </View>
          <View style={{ marginLeft: "auto", marginRight: 18 }}>
            <Candy color={color} size={115} />
          </View>
        </View>
        <View style={{ padding: 18 }}>
          <View style={ui.row}>
            <Text style={s.status}>● {statusLabel[n.status]}</Text>
            {n.myTurn && <Text style={s.myTurn}>내 차례</Text>}
          </View>
          <Text style={s.cardTitle}>{n.title}</Text>
          <Text style={ui.body} numberOfLines={2}>
            {n.description}
          </Text>
          <View
            style={[
              ui.row,
              {
                marginTop: 17,
                paddingTop: 14,
                borderTopWidth: 1,
                borderColor: colors.line,
              },
            ]}
          >
            <View
              style={{ flexDirection: "row", gap: 6, alignItems: "center" }}
            >
              <Users size={12} color={colors.muted} />
              <Text style={s.meta}>
                {n.memberCount}/{n.memberLimit}
              </Text>
              <Text style={s.meta}>·</Text>
              <BookOpen size={12} color={colors.muted} />
              <Text style={s.meta}>
                {n.chapterCount}/{n.chapterLimit}장
              </Text>
            </View>
            <View style={{ flexDirection: "row", gap: 4 }}>
              <Text style={{ fontSize: 12, color: colors.green }}>
                이야기 펼치기
              </Text>
              <ArrowUpRight size={14} color={colors.green} />
            </View>
          </View>
        </View>
      </Card>
    </Pressable>
  );
}
const s = StyleSheet.create({
  logo: {
    fontSize: 24,
    fontWeight: "800",
    letterSpacing: -1,
    color: colors.ink,
  },
  demo: {
    backgroundColor: "#ECEEE4",
    padding: 12,
    borderRadius: 10,
    marginTop: 16,
  },
  hero: { paddingTop: 36 },
  heroTitle: {
    fontSize: 36,
    lineHeight: 48,
    letterSpacing: -1.5,
    fontWeight: "700",
    color: colors.ink,
    marginTop: 15,
    marginBottom: 12,
  },
  artCaption: { alignItems: "center", marginTop: -12, marginBottom: 16 },
  captionText: { fontSize: 8, letterSpacing: 2, color: colors.muted },
  how: { paddingVertical: 18, borderBottomWidth: 1, borderColor: colors.line },
  howText: { fontSize: 10, color: colors.muted, textAlign: "center" },
  tabs: {
    flexDirection: "row",
    marginTop: 18,
    borderBottomWidth: 1,
    borderColor: colors.line,
  },
  tab: { flex: 1, paddingVertical: 14, alignItems: "center" },
  activeTab: { borderBottomWidth: 2, borderColor: colors.green },
  tabText: { fontSize: 13, color: colors.muted },
  search: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 12,
    paddingHorizontal: 13,
    marginBottom: 18,
  },
  cardArt: { height: 130, flexDirection: "row", alignItems: "center" },
  genre: {
    fontSize: 11,
    color: colors.ink,
    backgroundColor: "#ffffffaa",
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    alignSelf: "flex-start",
  },
  cardNumber: {
    fontSize: 9,
    letterSpacing: 1.5,
    color: colors.muted,
    marginTop: 30,
  },
  status: { fontSize: 10, color: colors.green },
  myTurn: {
    fontSize: 10,
    fontWeight: "700",
    backgroundColor: "#EAF0E6",
    color: colors.green,
    padding: 6,
    borderRadius: 6,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: colors.ink,
    letterSpacing: -0.5,
    marginVertical: 10,
  },
  meta: { fontSize: 11, color: colors.muted },
});
