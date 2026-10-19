import { novels } from "../../api/novels";
import type { SunlightWallet } from "../../api/types";
import { useStorePurchase } from "../purchase/storePurchase";
import { SUNLIGHT_PRODUCT_IDS } from "../purchase/purchaseContext";

// 상품 id는 서버 응답을 기다리지 않고도 지난번에 확인하지 못한 결제를 마저 확인하도록 앱에 적어 둔 것을 쓴다.
const PENDING_KEY = "relay-novel.pending-sunlight-purchase";

export function useSunlightPurchase(callbacks: {
  // 서버가 결제를 확인하면 햇살이 들어간 잔액을 준다.
  onPaid: (wallet: SunlightWallet, bought: boolean) => void;
  onError: (message: string) => void;
}) {
  return useStorePurchase({
    productIds: SUNLIGHT_PRODUCT_IDS,
    pendingKey: PENDING_KEY,
    checkout: novels.checkoutSunlight,
    verify: novels.verifySunlight,
    ...callbacks,
  });
}
