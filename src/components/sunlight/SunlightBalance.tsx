import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Pressable, Text, View } from "react-native";
import { router } from "expo-router";
import { useSession } from "../../state/session";
import { themedStyles } from "../../theme/themed";
import { ErrorBox, useUi } from "../ui";
import { SunlightShop } from "./SunlightShop";
import { useSunlightPurchase } from "./sunlightPurchase";
import { useSunlight } from "./useSunlight";

// 마이의 "햇살 n개 · 채우기" 한 줄. 둘러보기에서는 채울 수 없어 로그인으로 보낸다.
export function SunlightBalance() {
  const ui = useUi();
  const styles = useStyles();
  const { mode } = useSession();
  const wallet = useSunlight();
  const [shopOpen, setShopOpen] = useState(false);
  const client = useQueryClient();
  // 창을 열지 않아도, 지난번에 결제하고 확인하지 못한 햇살을 마이에 들어올 때 마저 받는다.
  useSunlightPurchase({
    onPaid: (paid) => client.setQueryData(["sunlight", mode], paid),
    onError: () => {},
  });
  const charge = () => {
    if (mode === "demo") router.push("/login");
    else setShopOpen(true);
  };
  if (wallet.error)
    return (
      <ErrorBox
        error={wallet.error}
        retry={() => {
          void wallet.refetch();
        }}
      />
    );
  const balance = wallet.data?.balance;
  return (
    <>
      <Text style={ui.sectionTitle}>햇살</Text>
      <View style={styles.row}>
        <Text style={styles.balance}>
          {balance === undefined ? "햇살 불러오는 중…" : `햇살 ${balance}개`}
        </Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="햇살 채우기"
          onPress={charge}
          style={({ pressed }) => [styles.charge, pressed && styles.pressed]}
        >
          <Text style={styles.chargeText}>채우기</Text>
        </Pressable>
      </View>
      <Text style={ui.hint}>
        나뭇가지 수거함의 가지를 살리거나 내가 쓴 회차에 이어 쓸 때 써요.
      </Text>
      {shopOpen && <SunlightShop onClose={() => setShopOpen(false)} />}
    </>
  );
}

const useStyles = themedStyles((colors) => ({
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  balance: { fontSize: 16, fontWeight: "700", color: colors.ink },
  charge: {
    minHeight: 44,
    minWidth: 72,
    paddingHorizontal: 16,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: colors.line,
    alignItems: "center",
    justifyContent: "center",
  },
  pressed: { opacity: 0.6 },
  chargeText: { fontSize: 14, fontWeight: "600", color: colors.ink },
}));
