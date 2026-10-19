import { useEffect, useRef, useState } from "react";
import { Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import type { Purchase } from "expo-iap";
import type { RefreshStore } from "../../api/types";
import {
  messageOf,
  useStoreConnection,
  type StoreOrder,
  type StoreReceipt,
} from "./purchaseContext";

export interface StorePurchaseOptions<Order extends StoreOrder, Result> {
  // 이 훅이 맡는 상품. 다른 상품의 거래는 건드리지 않는다.
  productIds: string[];
  // 스토어 결제를 마치고 서버 확인 전에 앱이 꺼져도 다음에 마저 확인하도록 주문을 적어 두는 자리
  pendingKey: string;
  checkout: (provider: RefreshStore, productId: string) => Promise<Order>;
  verify: (receipt: StoreReceipt) => Promise<Result>;
  // 지금 사서 받은 것이면 bought가 true이고, 지난번에 확인하지 못한 결제를 마저 확인한 것이면 false다.
  onPaid: (result: Result, bought: boolean) => void;
  onError: (message: string) => void;
}

export interface StorePurchase {
  available: boolean;
  // 스토어에 적힌 가격(예: ₩1,100). 아직 모르면 비어 있다.
  priceOf: (productId: string) => string | undefined;
  busy: boolean;
  buy: (productId: string) => void;
}

// 같은 거래가 결제 알림과 남은 구매 목록으로, 또는 같은 상품을 맡은 두 화면으로 와도 한 번만 확인한다.
const settling = new Set<string>();
// 지금 결제를 진행 중인 화면. 같은 상품을 맡은 다른 화면이 그 거래를 가로채 확인하지 않게 한다.
let buyer: { owner: object; productIds: string[] } | null = null;

// 확인을 기다리는 주문은 상품마다 하나씩 둔다. 다른 상품을 사도 앞의 주문이 지워지지 않는다.
type PendingOrders<Order> = Record<string, Order>;

async function readPending<Order extends StoreOrder>(
  key: string,
): Promise<PendingOrders<Order>> {
  try {
    const saved = await AsyncStorage.getItem(key);
    if (!saved) return {};
    const parsed = JSON.parse(saved);
    // 예전 앱은 주문 하나만 적어 두었다.
    if (parsed && typeof parsed.orderId === "string")
      return { [parsed.productId]: parsed };
    return parsed ?? {};
  } catch {
    return {};
  }
}

async function writePending<Order extends StoreOrder>(
  key: string,
  productId: string,
  order: Order | null,
) {
  const orders = await readPending<Order>(key);
  if (order) orders[productId] = order;
  else delete orders[productId];
  if (Object.keys(orders).length === 0) await AsyncStorage.removeItem(key);
  else await AsyncStorage.setItem(key, JSON.stringify(orders));
}

// 서버에 주문을 만들고 → 스토어에서 결제하고 → 서버가 스토어에 확인하면 결제한 것이 생긴다(소모형 상품).
// 확인을 마친 뒤에야 스토어 거래를 끝내므로, 중간에 끊긴 결제는 다음에 스토어가 다시 알려 준다.
export function useStorePurchase<Order extends StoreOrder, Result>({
  productIds,
  pendingKey,
  checkout,
  verify,
  onPaid,
  onError,
}: StorePurchaseOptions<Order, Result>): StorePurchase {
  const store = useStoreConnection();
  const options = useRef({ productIds, checkout, verify, onPaid, onError });
  options.current = { productIds, checkout, verify, onPaid, onError };
  // 이 화면에서 사기 시작한 결제인지. 아니면 지난번에 확인하지 못한 결제를 마저 확인한 것이다.
  const buying = useRef(false);
  const [busy, setBusy] = useState(false);
  const owner = useRef({}).current;
  const stopBuying = () => {
    buying.current = false;
    setBusy(false);
    if (buyer?.owner === owner) buyer = null;
  };

  const settle = (purchase: Purchase) => {
    if (!options.current.productIds.includes(purchase.productId)) return;
    if (settling.has(purchase.id)) return;
    const othersBuying =
      !!buyer &&
      buyer.owner !== owner &&
      buyer.productIds.includes(purchase.productId);
    if (othersBuying) return;
    settling.add(purchase.id);
    const bought = buying.current;
    void (async () => {
      const orders = await readPending<Order>(pendingKey);
      const order = orders[purchase.productId];
      if (!order) return;
      const result = await options.current.verify({
        provider: order.provider,
        orderId: order.orderId,
        productId: order.productId,
        receiptData: purchase.purchaseToken ?? undefined,
        originalTransactionId: purchase.transactionId ?? purchase.id,
      });
      await store.finish(purchase);
      await writePending(pendingKey, purchase.productId, null);
      options.current.onPaid(result, bought);
    })()
      .catch((error) =>
        options.current.onError(
          messageOf(
            error,
            "결제를 확인하지 못했어요. 잠시 뒤에 앱을 다시 열어 주세요.",
          ),
        ),
      )
      .finally(() => {
        settling.delete(purchase.id);
        if (bought) stopBuying();
      });
  };
  const settleRef = useRef(settle);
  settleRef.current = settle;
  // 결제 중에 창이 닫혀도 다른 화면이 남은 거래를 이어받아 확인할 수 있게 한다.
  useEffect(
    () => () => {
      if (buyer?.owner === owner) buyer = null;
    },
    [owner],
  );

  useEffect(
    () =>
      store.listen({
        onPurchase: (purchase) => settleRef.current(purchase),
        // 결제 오류는 모든 화면에 함께 오므로, 이 화면에서 시작한 결제일 때만 알린다.
        onError: (message) => {
          if (!buying.current) return;
          stopBuying();
          if (message) options.current.onError(message);
        },
      }),
    [store.listen],
  );
  // 결제하고 확인하기 전에 앱이 꺼졌으면 스토어에 남은 구매를 받아 마저 확인한다.
  useEffect(() => {
    if (!store.connected) return;
    void readPending(pendingKey).then((orders) => {
      if (Object.keys(orders).length > 0)
        void store.loadAvailablePurchases().catch(() => {});
    });
  }, [store.connected, store.loadAvailablePurchases, pendingKey]);
  useEffect(() => {
    store.availablePurchases.forEach((purchase) => settleRef.current(purchase));
  }, [store.availablePurchases]);

  const buy = (productId: string) => {
    if (busy || !store.available) return;
    setBusy(true);
    buying.current = true;
    buyer = { owner, productIds: options.current.productIds };
    void (async () => {
      const order = await options.current.checkout(
        Platform.OS === "ios" ? "APPLE" : "GOOGLE",
        productId,
      );
      await writePending(pendingKey, order.productId, order);
      await store.requestPurchase(order.productId);
    })().catch((error) => {
      stopBuying();
      options.current.onError(messageOf(error, "결제를 시작하지 못했어요."));
    });
  };

  return {
    available: store.available,
    priceOf: store.priceOf,
    busy,
    buy,
  };
}
