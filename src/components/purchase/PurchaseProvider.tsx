import { useCallback, useEffect, useMemo, useRef, type ReactNode } from "react";
import { Platform } from "react-native";
import { requireOptionalNativeModule } from "expo";
import { isUserCancelledError, useIAP, type Purchase } from "expo-iap";
import {
  ALL_PRODUCT_IDS,
  messageOf,
  StoreContext,
  type StoreConnection,
  type StoreListener,
} from "./purchaseContext";

// 앱 안 결제 모듈은 개발 빌드와 스토어 앱에만 있다. Expo Go에서는 스토어에 붙지 않는다.
const storeInApp = !!requireOptionalNativeModule("ExpoIap");

// 스토어 연결은 앱 맨 위에서 한 번만 연다. useIAP는 화면에서 사라질 때 전역 연결을 끊기 때문이다.
function InAppProvider({ children }: { children: ReactNode }) {
  const listeners = useRef(new Set<StoreListener>()).current;
  const store = useIAP({
    onPurchaseSuccess: (purchase) =>
      listeners.forEach((listener) => listener.onPurchase(purchase)),
    onPurchaseError: (error) => {
      const message = isUserCancelledError(error)
        ? null
        : messageOf(error, "스토어 결제를 마치지 못했어요.");
      listeners.forEach((listener) => listener.onError(message));
    },
  });
  const {
    connected,
    products,
    availablePurchases,
    fetchProducts,
    getAvailablePurchases,
    requestPurchase,
    finishTransaction,
  } = store;

  useEffect(() => {
    if (!connected) return;
    void fetchProducts({ skus: ALL_PRODUCT_IDS, type: "in-app" }).catch(
      () => {},
    );
  }, [connected, fetchProducts]);

  const listen = useCallback(
    (listener: StoreListener) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    [listeners],
  );

  const value = useMemo<StoreConnection>(
    () => ({
      available: true,
      connected,
      priceOf: (productId) =>
        products.find((product) => product.id === productId)?.displayPrice,
      availablePurchases,
      listen,
      requestPurchase: (productId) =>
        requestPurchase({
          type: "in-app",
          request:
            Platform.OS === "ios"
              ? { apple: { sku: productId, quantity: 1 } }
              : { google: { skus: [productId] } },
        }),
      finish: (purchase: Purchase) =>
        finishTransaction({ purchase, isConsumable: true }),
      loadAvailablePurchases: () => getAvailablePurchases(),
    }),
    [
      connected,
      products,
      availablePurchases,
      listen,
      requestPurchase,
      finishTransaction,
      getAvailablePurchases,
    ],
  );
  return (
    <StoreContext.Provider value={value}>{children}</StoreContext.Provider>
  );
}

// 결제 모듈이 없으면 기본값(결제 없음)이 그대로 쓰인다.
function WithoutStore({ children }: { children: ReactNode }) {
  return <>{children}</>;
}

// 결제 모듈이 있는지는 앱이 도는 동안 바뀌지 않으므로, 어느 쪽을 쓸지 처음에 한 번 정한다.
export const PurchaseProvider = storeInApp ? InAppProvider : WithoutStore;
