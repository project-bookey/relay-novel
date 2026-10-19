import { novels } from "../../api/novels";
import type { NovelHomeFeed } from "../../api/types";
import { useStorePurchase } from "../purchase/storePurchase";
import { REFRESH_PRODUCT_ID } from "../purchase/purchaseContext";

// 홈에서 새로고침 한 번을 사는 스토어 결제. 웹과 Expo Go에는 앱 안 결제가 없어 available이 false다.
export interface RefreshPurchase {
  available: boolean;
  // 스토어에 적힌 새로고침 한 번 가격(예: ₩1,000). 아직 모르면 비어 있다.
  price?: string;
  busy: boolean;
  buy: () => void;
}

export interface PurchaseCallbacks {
  // 서버가 결제를 확인하면 결제한 새로고침이 하나 늘어난 묶음을 준다.
  // 지금 사서 받은 것이면 bought가 true이고, 지난번에 확인하지 못한 결제를 마저 확인한 것이면 false다.
  onPaid: (feed: NovelHomeFeed, bought: boolean) => void;
  onError: (message: string) => void;
}

// 스토어 결제를 마친 뒤 서버 확인 전에 앱이 꺼져도 다음에 마저 확인하도록 주문을 적어 둔다.
const PENDING_KEY = "relay-novel.pending-refresh-purchase";

// 서버가 결제를 확인하면 결제한 새로고침이 하나 늘어난 묶음을 받는다. 결제 흐름은 storePurchase가 맡는다.
export function useRefreshPurchase({
  onPaid,
  onError,
}: PurchaseCallbacks): RefreshPurchase {
  const store = useStorePurchase({
    productIds: [REFRESH_PRODUCT_ID],
    pendingKey: PENDING_KEY,
    checkout: (provider) => novels.checkoutRefresh(provider),
    verify: novels.verifyRefresh,
    onPaid,
    onError,
  });
  return {
    available: store.available,
    price: store.priceOf(REFRESH_PRODUCT_ID),
    busy: store.busy,
    buy: () => store.buy(REFRESH_PRODUCT_ID),
  };
}
