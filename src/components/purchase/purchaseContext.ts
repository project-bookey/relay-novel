import { createContext, useContext } from "react";
import type { Purchase } from "expo-iap";
import type { RefreshStore } from "../../api/types";

// 스토어에 등록한 소모형 상품. 서버 설정(bookey.novel 의 refresh-purchase·sunlight.products)과 같아야 한다.
export const REFRESH_PRODUCT_ID = "relaynovel.refresh.1";
export const SUNLIGHT_PRODUCT_IDS = [
  "relaynovel.sunlight.10",
  "relaynovel.sunlight.30",
  "relaynovel.sunlight.100",
];
export const ALL_PRODUCT_IDS = [REFRESH_PRODUCT_ID, ...SUNLIGHT_PRODUCT_IDS];

export interface StoreListener {
  onPurchase: (purchase: Purchase) => void;
  // 사용자가 결제 창을 닫았으면 message가 null이다.
  onError: (message: string | null) => void;
}

// 앱 전체가 함께 쓰는 스토어 연결 하나. 결제 훅마다 연결을 따로 열면, 한 화면이 닫힐 때 연결이 모두 끊긴다.
export interface StoreConnection {
  // 이 기기에서 스토어 결제를 할 수 있는지. 웹과 Expo Go에는 앱 안 결제가 없다.
  available: boolean;
  connected: boolean;
  priceOf: (productId: string) => string | undefined;
  // 결제했지만 아직 끝내지(소모하지) 않은 거래
  availablePurchases: Purchase[];
  listen: (listener: StoreListener) => () => void;
  requestPurchase: (productId: string) => Promise<unknown>;
  finish: (purchase: Purchase) => Promise<unknown>;
  loadAvailablePurchases: () => Promise<unknown>;
}

const noStore: StoreConnection = {
  available: false,
  connected: false,
  priceOf: () => undefined,
  availablePurchases: [],
  listen: () => () => {},
  requestPurchase: () => Promise.resolve(),
  finish: () => Promise.resolve(),
  loadAvailablePurchases: () => Promise.resolve(),
};

export const StoreContext = createContext<StoreConnection>(noStore);
export const useStoreConnection = () => useContext(StoreContext);

export const messageOf = (error: unknown, fallback: string) =>
  error instanceof Error && error.message ? error.message : fallback;

// 서버가 만든 주문 — 스토어 결제를 마친 뒤 이 주문으로 서버에 확인을 맡긴다.
export interface StoreOrder {
  provider: RefreshStore;
  productId: string;
  orderId: string;
}

// 스토어 결제를 마친 뒤 서버에 확인을 맡기는 내용
export interface StoreReceipt {
  provider: RefreshStore;
  orderId: string;
  productId: string;
  // Google의 구매 토큰
  receiptData?: string;
  // Apple의 거래 id
  originalTransactionId?: string;
}
