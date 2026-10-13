import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { LogOut } from "lucide-react-native";
import type { NovelStatus } from "../../api/types";
import { colors } from "../../theme";
import { Button, Card, ui } from "../ui";

export type Tab = "feed" | "mine" | "turns";

const tabs: [Tab, string][] = [
  ["feed", "이야기 탐색"],
  ["turns", "내 차례"],
  ["mine", "내 작품"],
];

const filters: [string, NovelStatus | undefined][] = [
  ["전체", undefined],
  ["모집 중", "RECRUITING"],
  ["집필 중", "ONGOING"],
  ["완결", "COMPLETED"],
];

export function HomeHeader({
  showDemoNotice,
  onLogout,
}: {
  showDemoNotice: boolean;
  onLogout: () => void;
}) {
  return (
    <>
      <View style={ui.row}>
        <Text style={styles.logo}>
          <Text style={styles.logoMark}>✳ </Text>relay
          <Text style={styles.logoLight}>novel</Text>
          <Text style={styles.logoDot}> .</Text>
        </Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="로그아웃"
          onPress={onLogout}
          hitSlop={12}
        >
          <LogOut size={18} color={colors.muted} />
        </Pressable>
      </View>
      {showDemoNotice && (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="로그인하고 실제 이야기에 참여하기"
          onPress={() => router.push("/login")}
          style={styles.demo}
        >
          <Text style={styles.demoText}>
            디자인 미리보기 · 로그인하면 실제 이야기에 참여할 수 있어요 →
          </Text>
        </Pressable>
      )}
    </>
  );
}

export function TabBar({
  selected,
  onSelect,
}: {
  selected: Tab;
  onSelect: (tab: Tab) => void;
}) {
  return (
    <View style={styles.tabs}>
      {tabs.map(([key, label]) => {
        const isSelected = selected === key;
        return (
          <Pressable
            key={key}
            accessibilityRole="tab"
            accessibilityState={{ selected: isSelected }}
            onPress={() => onSelect(key)}
            style={[styles.tab, isSelected && styles.activeTab]}
          >
            <Text style={[styles.tabText, isSelected && styles.activeTabText]}>
              {label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function StatusFilters({
  selected,
  onSelect,
}: {
  selected?: NovelStatus;
  onSelect: (status?: NovelStatus) => void;
}) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.filters}
    >
      {filters.map(([label, value]) => {
        const isSelected = selected === value;
        return (
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ selected: isSelected }}
            key={label}
            style={[ui.pill, isSelected && ui.pillSelected]}
            onPress={() => onSelect(value)}
          >
            <Text style={[ui.pillText, isSelected && ui.pillTextSelected]}>
              {label}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

export function EmptyStories({
  waitingForTurn,
  onCreate,
}: {
  waitingForTurn: boolean;
  onCreate: () => void;
}) {
  return (
    <Card>
      <Text style={ui.sectionTitle}>
        {waitingForTurn
          ? "아직 당신의 차례가 없어요"
          : "새로운 이야기를 기다리고 있어요"}
      </Text>
      <Text style={ui.body}>
        모집 중인 작품에 참가하거나, 직접 이야기를 시작해 보세요.
      </Text>
      <Button outline onPress={onCreate}>
        첫 이야기 만들기
      </Button>
    </Card>
  );
}

const styles = StyleSheet.create({
  logo: {
    fontSize: 24,
    fontWeight: "800",
    letterSpacing: -1,
    color: colors.ink,
  },
  logoMark: { color: colors.green },
  logoLight: { fontWeight: "400" },
  logoDot: { color: colors.leaf },
  demo: {
    borderWidth: 1,
    borderColor: colors.line,
    padding: 12,
    borderRadius: 10,
    marginTop: 16,
  },
  demoText: { fontSize: 12, color: colors.green },
  tabs: {
    flexDirection: "row",
    marginTop: 18,
    borderBottomWidth: 1,
    borderColor: colors.line,
  },
  tab: { flex: 1, paddingVertical: 14, alignItems: "center" },
  activeTab: { borderBottomWidth: 2, borderColor: colors.green },
  tabText: { fontSize: 13, color: colors.muted },
  activeTabText: { color: colors.ink, fontWeight: "700" },
  filters: { gap: 8, paddingVertical: 14 },
});
