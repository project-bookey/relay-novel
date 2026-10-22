import { useState } from "react";
import { Modal, Pressable, View } from "react-native";
import { Text } from "../text";
import { SafeAreaView } from "react-native-safe-area-context";
import { useQueryClient } from "@tanstack/react-query";
import type { SunlightProduct, SunlightWallet } from "../../api/types";
import { useSession } from "../../state/session";
import { themedStyles } from "../../theme/themed";
import { Button, ErrorBox, Loading, useUi } from "../ui";
import { useSunlightPurchase } from "./sunlightPurchase";
import { useSunlight } from "./useSunlight";

// 햇살 채우기 — 아래에서 올라오는 창. 상품을 누르면 스토어 결제로 가고, 서버가 확인하면 잔액이 바뀐다.
// 웹과 Expo Go에는 앱 안 결제가 없어 안내만 보인다. 열 때만 그린다.
export function SunlightShop({
  reason,
  onClose,
}: {
  // 모자라서 연 경우 그 이유(예: 가지를 살리려면 햇살 3개가 필요해요)
  reason?: string;
  onClose: () => void;
}) {
  const ui = useUi();
  const styles = useStyles();
  const client = useQueryClient();
  const { mode } = useSession();
  const wallet = useSunlight();
  const [message, setMessage] = useState("");
  const purchase = useSunlightPurchase({
    onPaid: (paid: SunlightWallet) => {
      client.setQueryData(["sunlight", mode], paid);
      setMessage(`햇살을 채웠어요. 지금 ${paid.balance}개 있어요.`);
    },
    onError: setMessage,
  });
  const close = () => {
    setMessage("");
    onClose();
  };
  const products = wallet.data?.products ?? [];

  return (
    <Modal
      visible
      transparent
      animationType="slide"
      onRequestClose={close}
      statusBarTranslucent
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="햇살 채우기 닫기"
        style={styles.scrim}
        onPress={close}
      />
      <SafeAreaView edges={["bottom"]} style={styles.sheet}>
        <Text style={ui.sectionTitle}>햇살 채우기</Text>
        {!!wallet.data && (
          <Text style={ui.body}>
            {`지금 햇살 ${wallet.data.balance}개 · 가지 살리기 ${wallet.data.restoreCost}개 · 내 글 잇기 ${wallet.data.selfBranchCost}개`}
          </Text>
        )}
        {!!reason && <Text style={styles.reason}>{reason}</Text>}
        {wallet.isPending && <Loading />}
        {!!wallet.error && (
          <ErrorBox
            error={wallet.error}
            retry={() => {
              void wallet.refetch();
            }}
          />
        )}
        {!!wallet.data && purchase.available && products.length === 0 && (
          <Text style={[ui.hint, styles.unavailable]}>
            지금은 채울 수 있는 햇살 상품이 없어요. 잠시 뒤에 다시 열어 주세요.
          </Text>
        )}
        {!purchase.available ? (
          <Text style={[ui.hint, styles.unavailable]}>
            햇살은 iOS·Android 앱에서 채울 수 있어요.
          </Text>
        ) : (
          <View style={styles.products}>
            {products.map((product) => (
              <ProductRow
                key={product.productId}
                product={product}
                price={purchase.priceOf(product.productId)}
                busy={purchase.busy}
                onBuy={() => {
                  setMessage("");
                  purchase.buy(product.productId);
                }}
              />
            ))}
          </View>
        )}
        {!!message && (
          <Text accessibilityLiveRegion="polite" style={styles.message}>
            {message}
          </Text>
        )}
        <Button outline onPress={close}>
          닫기
        </Button>
      </SafeAreaView>
    </Modal>
  );
}

function ProductRow({
  product,
  price,
  busy,
  onBuy,
}: {
  product: SunlightProduct;
  // 스토어에 적힌 가격. 아직 모르면 서버에 적힌 원화 가격을 보인다.
  price?: string;
  busy: boolean;
  onBuy: () => void;
}) {
  const styles = useStyles();
  const shownPrice = price ?? `${product.amountKrw.toLocaleString("ko-KR")}원`;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`햇살 ${product.quantity}개 사기, ${shownPrice}`}
      accessibilityState={{ disabled: busy }}
      disabled={busy}
      onPress={onBuy}
      style={({ pressed }) => [
        styles.product,
        (pressed || busy) && styles.productDim,
      ]}
    >
      <Text style={styles.quantity}>{`햇살 ${product.quantity}개`}</Text>
      <Text style={styles.price}>{shownPrice}</Text>
    </Pressable>
  );
}

const useStyles = themedStyles((colors) => ({
  scrim: { flex: 1, backgroundColor: colors.scrim },
  sheet: {
    backgroundColor: colors.background,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 24,
    paddingBottom: 16,
  },
  reason: { marginTop: 10, fontSize: 14, fontWeight: "600", color: colors.ink },
  products: { marginTop: 18, gap: 10 },
  product: {
    minHeight: 52,
    paddingHorizontal: 18,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.line,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  productDim: { opacity: 0.55 },
  quantity: { fontSize: 15, fontWeight: "700", color: colors.ink },
  price: { fontSize: 14, color: colors.muted },
  unavailable: { marginTop: 14 },
  message: { marginTop: 14, fontSize: 13, lineHeight: 20, color: colors.ink },
}));
