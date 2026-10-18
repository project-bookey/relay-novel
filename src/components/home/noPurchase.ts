import type { NovelHomeFeed } from "../../api/types";

// 홈에서 새로고침 한 번을 사는 스토어 결제. 앱(iOS·Android)은 refreshPurchase.ts가, 웹은 refreshPurchase.web.ts가 맡는다.
export interface RefreshPurchase {
  // 이 기기에서 스토어 결제를 할 수 있는지. 웹과 Expo Go에는 앱 안 결제가 없다.
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

const noPurchase: RefreshPurchase = {
  available: false,
  busy: false,
  buy: () => {},
};

export function useNoPurchase(_callbacks: PurchaseCallbacks): RefreshPurchase {
  return noPurchase;
}
