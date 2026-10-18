import { useEffect, useRef, useState } from "react";
import { Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { requireOptionalNativeModule } from "expo";
import { isUserCancelledError, useIAP, type Purchase } from "expo-iap";
import { novels } from "../../api/novels";
import type { RefreshCheckout } from "../../api/types";
import {
  useNoPurchase,
  type PurchaseCallbacks,
  type RefreshPurchase,
} from "./noPurchase";

// 스토어에 등록한 새로고침 한 번 상품(소모품). 서버 설정(bookey.novel 의 새로고침 결제 상품 id)과 같아야 한다.
const PRODUCT_ID = "relaynovel.refresh.1";
// 스토어 결제를 마친 뒤 서버 확인 전에 앱이 꺼져도 다음에 마저 확인하도록 주문을 적어 둔다.
const PENDING_KEY = "relay-novel.pending-refresh-purchase";
// 앱 안 결제 모듈은 개발 빌드와 스토어 앱에만 있다. Expo Go에서는 스토어에 붙지 않는다.
const storeInApp = !!requireOptionalNativeModule("ExpoIap");

async function readPending(): Promise<RefreshCheckout | null> {
  try {
    const saved = await AsyncStorage.getItem(PENDING_KEY);
    return saved ? JSON.parse(saved) : null;
  } catch {
    return null;
  }
}

const messageOf = (error: unknown, fallback: string) =>
  error instanceof Error && error.message ? error.message : fallback;

// 서버에 주문을 만들고 → 스토어에서 결제하고 → 서버가 스토어에 확인하면 결제한 새로고침이 하나 생긴다.
// 확인을 마친 뒤에야 스토어 거래를 끝내므로(소모), 중간에 끊긴 결제는 다음에 스토어가 다시 알려 준다.
function useStorePurchase({
  onPaid,
  onError,
}: PurchaseCallbacks): RefreshPurchase {
  const callbacks = useRef({ onPaid, onError });
  callbacks.current = { onPaid, onError };
  const pending = useRef<RefreshCheckout | null>(null);
  // 이번에 사기 시작한 결제인지. 맞으면 확인하자마자 새 열매를 받는다.
  const buying = useRef(false);
  // 같은 거래가 결제 알림과 남은 구매 목록으로 두 번 와도 한 번만 확인한다.
  const settling = useRef(new Set<string>()).current;
  const [busy, setBusy] = useState(false);

  const settle = (purchase: Purchase) => {
    if (purchase.productId !== PRODUCT_ID || settling.has(purchase.id)) return;
    settling.add(purchase.id);
    const bought = buying.current;
    void (async () => {
      const order = pending.current ?? (await readPending());
      if (!order) return;
      const feed = await novels.verifyRefresh({
        provider: order.provider,
        orderId: order.orderId,
        productId: order.productId,
        receiptData: purchase.purchaseToken ?? undefined,
        originalTransactionId: purchase.transactionId ?? purchase.id,
      });
      await store.finishTransaction({ purchase, isConsumable: true });
      pending.current = null;
      await AsyncStorage.removeItem(PENDING_KEY);
      callbacks.current.onPaid(feed, bought);
    })()
      .catch((error) =>
        callbacks.current.onError(
          messageOf(
            error,
            "결제를 확인하지 못했어요. 잠시 뒤에 앱을 다시 열어 주세요.",
          ),
        ),
      )
      .finally(() => {
        settling.delete(purchase.id);
        buying.current = false;
        setBusy(false);
      });
  };

  const store = useIAP({
    onPurchaseSuccess: settle,
    onPurchaseError: (error) => {
      buying.current = false;
      setBusy(false);
      if (!isUserCancelledError(error))
        callbacks.current.onError(
          messageOf(error, "스토어 결제를 마치지 못했어요."),
        );
    },
  });
  const { connected, fetchProducts, getAvailablePurchases } = store;

  useEffect(() => {
    if (!connected) return;
    void fetchProducts({ skus: [PRODUCT_ID], type: "in-app" }).catch(() => {});
    // 결제하고 확인하기 전에 앱이 꺼졌으면 스토어에 남은 구매를 받아 마저 확인한다.
    void readPending().then((order) => {
      if (order) void getAvailablePurchases().catch(() => {});
    });
  }, [connected, fetchProducts, getAvailablePurchases]);
  // settle은 그릴 때마다 새로 만들어지지만 ref만 읽으므로, 남은 구매 목록이 바뀔 때만 다시 본다.
  useEffect(() => {
    store.availablePurchases.forEach(settle);
  }, [store.availablePurchases]);

  const buy = () => {
    if (busy) return;
    setBusy(true);
    buying.current = true;
    void (async () => {
      const order = await novels.checkoutRefresh(
        Platform.OS === "ios" ? "APPLE" : "GOOGLE",
      );
      pending.current = order;
      await AsyncStorage.setItem(PENDING_KEY, JSON.stringify(order));
      await store.requestPurchase({
        type: "in-app",
        request:
          Platform.OS === "ios"
            ? { apple: { sku: order.productId, quantity: 1 } }
            : { google: { skus: [order.productId] } },
      });
    })().catch((error) => {
      buying.current = false;
      setBusy(false);
      callbacks.current.onError(messageOf(error, "결제를 시작하지 못했어요."));
    });
  };

  return {
    available: true,
    price: store.products.find((product) => product.id === PRODUCT_ID)
      ?.displayPrice,
    busy,
    buy,
  };
}

// 결제 모듈이 있는지는 앱이 도는 동안 바뀌지 않으므로, 어느 쪽 훅을 쓸지 처음에 한 번 정한다.
export const useRefreshPurchase = storeInApp ? useStorePurchase : useNoPurchase;
