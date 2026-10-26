import { useState } from "react";
import { Pressable, View } from "react-native";
import { Text } from "../text";
import { router } from "expo-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus } from "lucide-react-native";
import { me } from "../../api/me";
import { demoProfile } from "../../api/demo";
import { useSession } from "../../state/session";
import { ICON_LINE_PX } from "../../theme";
import { themedStyles, useColors } from "../../theme/themed";
import { SunIcon } from "../BarIcons";
import { PaneGlass } from "../Glass";
import { SunlightShop } from "../sunlight/SunlightShop";
import { useSunlightPurchase } from "../sunlight/sunlightPurchase";
import { useSunlight } from "../sunlight/useSunlight";
import { ErrorBox } from "../ui";
import {
  shelfCopy,
  shelfHref,
  useMyStories,
  type MyShelf,
} from "./useMyStories";

const CARD_RADIUS = 26;
const SUN_SIZE = 16;
const SUN_STROKE = (ICON_LINE_PX * 24) / SUN_SIZE;

// 마이 맨 위의 유리 명함(사용자가 고른 시안 reference/sian/my-redesign A′). 내 이야기 색 위에 짙은 유리를 띄우고,
// 이름 줄 오른쪽 끝에 햇살 칩(누르면 채우기)을, 그 아래에 숫자 셋(내 작품 · 이어 쓴 이야기 · 즐겨찾기)을 둔다.
// 숫자를 누르면 그 책장을 모두 본다.
export function MyCard() {
  const styles = useStyles();
  return (
    <View style={styles.card}>
      <PaneGlass radius={CARD_RADIUS} />
      <View style={styles.nameLine}>
        <Profile />
        <SunlightChip />
      </View>
      <View style={styles.stats}>
        <ShelfStat shelf="mine" />
        <View style={styles.statDivider} />
        <ShelfStat shelf="continued" />
        <View style={styles.statDivider} />
        <ShelfStat shelf="favorites" />
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

// 햇살은 숫자 묶음에서 떼어 이름 줄 끝의 작은 칩으로 따로 둔다(사용자 요청). 칩의 +가 채우기를 알린다.
function SunlightChip() {
  const styles = useStyles();
  const colors = useColors();
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
        style={({ pressed }) => [styles.sunChip, pressed && styles.pressed]}
      >
        <SunIcon size={SUN_SIZE} strokeWidth={SUN_STROKE} />
        <Text style={styles.sunCount}>
          {failed || balance === undefined ? "–" : String(balance)}
        </Text>
        <View style={styles.sunPlus}>
          <Plus size={13} color={colors.ink} strokeWidth={2.4} />
        </View>
      </Pressable>
      {shopOpen && <SunlightShop onClose={() => setShopOpen(false)} />}
    </>
  );
}

function statLabel(title: string, total: number | undefined, failed: boolean) {
  if (total !== undefined) return `${title} ${total}편`;
  if (failed) return `${title}, 불러오지 못했어요`;
  return `${title}, 불러오는 중`;
}

function sunlightLabel(balance: number | undefined) {
  if (balance === undefined) return "햇살, 불러오는 중";
  return `햇살 ${balance}개, 채우기`;
}

// 숫자 하나. 누르면 그 책장을 모두 본다(내 작품 · 이어 쓴 이야기 · 즐겨찾기).
// 못 불러왔으면 숫자 자리는 비워 두고, 누르면 가는 책장 화면이 오류와 다시 불러오기를 보인다.
function ShelfStat({ shelf }: { shelf: MyShelf }) {
  const styles = useStyles();
  const { query, total } = useMyStories(shelf);
  const { title } = shelfCopy[shelf];
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={statLabel(title, total, query.isError)}
      onPress={() => router.push(shelfHref(shelf))}
      style={({ pressed }) => [styles.stat, pressed && styles.pressed]}
    >
      <Text style={styles.number}>
        {total === undefined ? "–" : String(total)}
      </Text>
      <Text style={styles.caption} numberOfLines={1}>
        {title}
      </Text>
    </Pressable>
  );
}

const useStyles = themedStyles((colors) => ({
  card: {
    borderRadius: CARD_RADIUS,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 12,
  },
  nameLine: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
  profile: { flex: 1, minWidth: 0, minHeight: 58, justifyContent: "center" },
  name: {
    fontSize: 28,
    fontWeight: "800",
    letterSpacing: -0.8,
    color: colors.ink,
  },
  handle: { fontSize: 14, color: colors.muted, marginTop: 2 },
  // 유리 명함 안이라 칩은 유리를 겹치지 않고 옅은 잉크 바탕만 둔다.
  sunChip: {
    minHeight: 44,
    paddingLeft: 12,
    paddingRight: 8,
    borderRadius: 22,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: colors.lensFill,
  },
  sunCount: { fontSize: 16, fontWeight: "800", color: colors.ink },
  sunPlus: {
    width: 22,
    height: 22,
    borderRadius: 11,
    marginLeft: 2,
    alignItems: "center",
    justifyContent: "center",
    // 밝게 모드에서 흰 칩 위에 묻히지 않도록 선 색으로 칠한다.
    backgroundColor: colors.line,
  },
  stats: { flexDirection: "row", alignItems: "center", marginTop: 14 },
  stat: {
    flex: 1,
    minHeight: 52,
    alignItems: "center",
    justifyContent: "center",
    gap: 2,
  },
  statDivider: { width: 1, height: 28, backgroundColor: colors.line },
  number: { fontSize: 20, fontWeight: "800", color: colors.ink },
  caption: { fontSize: 12, color: colors.muted },
  pressed: { opacity: 0.6 },
}));
