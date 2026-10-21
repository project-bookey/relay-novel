import { useState } from "react";
import { Pressable, Text, View } from "react-native";
import { router } from "expo-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { me } from "../../api/me";
import { demoProfile } from "../../api/demo";
import { useSession } from "../../state/session";
import { ICON_LINE_PX } from "../../theme";
import { themedStyles } from "../../theme/themed";
import { SunIcon } from "../BarIcons";
import { SunlightShop } from "../sunlight/SunlightShop";
import { useSunlightPurchase } from "../sunlight/sunlightPurchase";
import { useSunlight } from "../sunlight/useSunlight";
import { ErrorBox } from "../ui";
import { useMyStories } from "./useMyStories";

const SUN_SIZE = 16;

// 마이 맨 위(시안 B "숫자 줄", reference/sian/my-profile/에서 사용자가 숫자를 이름 오른쪽 끝으로 옮김):
// 왼쪽에 닉네임과 @아이디, 오른쪽 끝에 작은 숫자 둘 — 내 작품 수와 햇살(해 아이콘). 햇살을 누르면 채우기 창이 열린다.
export function MyHeader() {
  const styles = useStyles();
  return (
    <View style={styles.header}>
      <View style={styles.profileBox}>
        <Profile />
      </View>
      <View style={styles.stats}>
        <StoryCount />
        <SunlightStat />
      </View>
    </View>
  );
}

function Profile() {
  const styles = useStyles();
  const { mode } = useSession();
  const isDemo = mode === "demo";
  const profile = useQuery({
    queryKey: ["me", mode],
    queryFn: me.profile,
    enabled: mode === "authenticated",
    staleTime: 5 * 60 * 1000,
  });
  // 내 정보를 못 불러오면 닉네임 대신 "마이"를 제목으로 두고 그 아래에서 다시 불러오게 한다.
  if (!isDemo && profile.error)
    return (
      <View style={styles.profile}>
        <Text style={styles.name} accessibilityRole="header">
          마이
        </Text>
        <ErrorBox
          error={profile.error}
          retry={() => {
            void profile.refetch();
          }}
        />
      </View>
    );
  const data = isDemo ? demoProfile : profile.data;
  // 불러오는 동안에도 자리를 잡아 아래 내용이 밀려 내려오지 않게 한다.
  return (
    <View style={styles.profile}>
      <Text
        style={styles.name}
        accessibilityRole="header"
        accessibilityLabel={data ? undefined : "내 정보 불러오는 중"}
        numberOfLines={1}
      >
        {data?.nickname ?? " "}
      </Text>
      <Text style={styles.handle} numberOfLines={1}>
        {data ? `@${data.handle}` : " "}
      </Text>
    </View>
  );
}

function StoryCount() {
  const styles = useStyles();
  const { total } = useMyStories();
  const count = total === undefined ? "–" : String(total);
  return (
    <View
      style={styles.stat}
      accessible
      accessibilityLabel={
        total === undefined ? "내 작품, 불러오는 중" : `내 작품 ${total}편`
      }
    >
      <Text style={styles.number}>{count}</Text>
      <Text style={styles.caption}>내 작품</Text>
    </View>
  );
}

function SunlightStat() {
  const styles = useStyles();
  const { mode } = useSession();
  const client = useQueryClient();
  const wallet = useSunlight();
  const [shopOpen, setShopOpen] = useState(false);
  // 창을 열지 않아도, 지난번에 결제하고 확인하지 못한 햇살을 마이에 들어올 때 마저 받는다.
  useSunlightPurchase({
    onPaid: (paid) => client.setQueryData(["sunlight", mode], paid),
    onError: () => {},
  });
  const failed = !!wallet.error;
  const balance = wallet.data?.balance;
  const count = balance === undefined ? "–" : String(balance);
  // 자리가 좁아 이름만 적고, 채우기는 접근성 이름과 누르기로 알린다.
  const caption = failed ? "다시 불러오기" : "햇살";
  const press = () => {
    // 잔액을 못 불러왔으면 채우기 대신 다시 불러온다.
    if (failed) void wallet.refetch();
    else if (mode === "demo") router.push("/login");
    else setShopOpen(true);
  };
  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={
          failed ? "햇살 다시 불러오기" : sunlightLabel(balance)
        }
        onPress={press}
        style={({ pressed }) => [styles.stat, pressed && styles.pressed]}
      >
        <View style={styles.sunRow}>
          <SunIcon
            size={SUN_SIZE}
            strokeWidth={(ICON_LINE_PX * 24) / SUN_SIZE}
          />
          <Text style={styles.number}>{count}</Text>
        </View>
        <Text style={styles.caption}>{caption}</Text>
      </Pressable>
      {shopOpen && <SunlightShop onClose={() => setShopOpen(false)} />}
    </>
  );
}

function sunlightLabel(balance: number | undefined) {
  if (balance === undefined) return "햇살, 불러오는 중";
  return `햇살 ${balance}개, 채우기`;
}

const useStyles = themedStyles((colors) => ({
  header: { flexDirection: "row", alignItems: "center", gap: 16 },
  profileBox: { flex: 1, minWidth: 0 },
  profile: { minHeight: 58, justifyContent: "center" },
  name: {
    fontSize: 28,
    fontWeight: "800",
    letterSpacing: -0.8,
    color: colors.ink,
  },
  handle: { fontSize: 14, color: colors.muted, marginTop: 2 },
  stats: { flexDirection: "row", gap: 18 },
  // 숫자 아래 작은 이름. 누르는 햇살 칸도 44는 되게 둔다.
  stat: {
    minHeight: 44,
    minWidth: 44,
    alignItems: "center",
    justifyContent: "center",
    gap: 2,
  },
  pressed: { opacity: 0.6 },
  sunRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  number: { fontSize: 18, fontWeight: "800", color: colors.ink },
  caption: { fontSize: 11, color: colors.muted },
}));
