import { useEffect, useState } from "react";
import { useWindowDimensions } from "react-native";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { novels } from "../../api/novels";
import { demoHomeFruits } from "../../api/demo";
import type { NovelHomeFeed } from "../../api/types";
import { REFRESH_BUTTON_SPOT, canopyPlacement } from "../../design/canopy";
import { useSession } from "../../state/session";
import { REFRESH_TOUCH_SIZE, type RefreshOffer } from "./RefreshButton";
import { useRefreshPurchase, type RefreshPurchase } from "./refreshPurchase";

// 둘러보기에는 서버가 없어서 하루 무료·광고 새로고침을 이 화면 안에서만 흉내 낸다(앱을 다시 열면 다시 찬다).
const DEMO_FREE_REFRESHES = 2;
const DEMO_AD_REFRESHES = 3;
const AD_SKIPPED = "광고를 끝까지 보면 새 열매를 받을 수 있어요.";
const DEMO_NO_PURCHASE =
  "둘러보기에서는 결제할 수 없어요. 로그인하면 결제하고 새 열매를 받을 수 있어요.";
const PURCHASE_IN_APP_ONLY = "새로고침 결제는 iOS·Android 앱에서 할 수 있어요.";
// 새로고침 버튼 아래 알림 말풍선이 떠 있는 시간
const NOTICE_MS = 3200;

// 둘러보기에서 새로고침하면 같은 예시 열매들이 자리를 바꿔 다시 떨어진다.
function shuffled<Item>(items: Item[]) {
  const copy = [...items];
  for (let index = copy.length - 1; index > 0; index--) {
    const swap = Math.floor(Math.random() * (index + 1));
    [copy[index], copy[swap]] = [copy[swap], copy[index]];
  }
  return copy;
}

// 새로고침 버튼 가운데 자리. 위쪽 나무의 네모 오른쪽 위에 두되, 누르는 칸 전체가 상태 표시줄 아래에 오게 한다.
// 아이폰은 상태 표시줄을 누르면 시스템이 가져가서, 칸이 걸치면 그만큼 눌리지 않는다.
// 나무는 화면 맨 위에 붙지만 버튼은 안전 영역 안쪽(Screen의 여백 안)에 그리므로, 화면 자리에서 여백만큼 뺀다.
export function useRefreshButtonCenter() {
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const { scale, left } = canopyPlacement(width);
  const onScreen = {
    x: left + REFRESH_BUTTON_SPOT.x * scale,
    y: Math.max(
      REFRESH_BUTTON_SPOT.y * scale,
      insets.top + REFRESH_TOUCH_SIZE / 2,
    ),
  };
  return { x: onScreen.x - insets.left, y: onScreen.y - insets.top };
}

// 무료 새로고침을 다 쓴 뒤 새싹을 누르면 묻는 것: 광고를 보고 받을지, 광고도 다 썼으면 결제할지.
type OfferKind = "ad" | "purchase";

function offerOf(
  kind: OfferKind | undefined,
  adLeft: number | undefined,
  purchase: RefreshPurchase,
  actions: { watchAd: () => void; buy: () => void; close: () => void },
): RefreshOffer | undefined {
  if (kind === "ad")
    return {
      message: `오늘 무료 새로고침을 다 썼어요. 광고를 보면 ${adLeft}번 더 받을 수 있어요.`,
      action: "광고 보고 새 열매 받기",
      onAccept: actions.watchAd,
      onClose: actions.close,
    };
  if (kind === "purchase")
    return {
      message:
        "오늘 광고로 받는 새로고침도 다 썼어요. 결제하면 새 열매를 한 번 더 받을 수 있어요.",
      action: purchase.price
        ? `결제하고 새 열매 받기 · ${purchase.price}`
        : "결제하고 새 열매 받기",
      busy: purchase.busy,
      onAccept: actions.buy,
      onClose: actions.close,
    };
  return undefined;
}

// 홈 열매 밭 새로고침 — 하루 무료 횟수 → 광고를 보고 받는 횟수 → 결제한 횟수 순으로 새 묶음을 받는다(판정은 서버).
// 새 묶음을 받으면 차례(round)를 올려 열매 밭이 나무 연출과 함께 새 열매를 떨어뜨린다.
// 둘러보기에서는 예시 열매를 섞어 다시 떨어뜨리고 횟수는 화면 안에서만 흉내 낸다.
export function useHomeRefresh(feed: NovelHomeFeed | undefined) {
  const { mode } = useSession();
  const queryClient = useQueryClient();
  // 새로고침할 때마다 늘어나는 차례. 열매 밭은 이 값이 바뀌면 새로고침 연출을 한다.
  const [round, setRound] = useState(0);
  // 나무 연출이 도는 동안에는 새로고침을 막는다. 홈에 처음 들어올 때도 나무가 내려오는 연출이 돈다.
  const [showing, setShowing] = useState(true);
  const [notice, setNotice] = useState<string>();
  const [demoFruits, setDemoFruits] = useState(demoHomeFruits);
  const [demoLeft, setDemoLeft] = useState(DEMO_FREE_REFRESHES);
  const [demoAdLeft, setDemoAdLeft] = useState(DEMO_AD_REFRESHES);
  const [offer, setOffer] = useState<OfferKind>();
  const [watchingAd, setWatchingAd] = useState(false);

  // 둘러보기에서 로그인하는 등 모드가 바뀌면 열매 밭을 새로 그려 나무가 다시 내려온다.
  useEffect(() => setShowing(true), [mode]);
  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(undefined), NOTICE_MS);
    return () => clearTimeout(timer);
  }, [notice]);

  const dropNewFeed = (next: NovelHomeFeed) => {
    queryClient.setQueryData(["novels", "home-feed", mode], next);
    setShowing(true);
    setRound((current) => current + 1);
  };
  // 하루 횟수를 다 썼을 때의 안내도 서버가 보낸 문구를 그대로 보여 준다.
  // 다른 기기에서 횟수를 썼을 수도 있으니 남은 횟수를 서버에서 다시 받아 맞춘다.
  const refuseRefresh = (error: Error) => {
    setNotice(error.message || "새 열매를 받지 못했어요.");
    void queryClient.invalidateQueries({
      queryKey: ["novels", "home-feed", mode],
    });
  };
  const refresh = useMutation({
    mutationFn: () => novels.refreshHomeFeed(),
    onSuccess: dropNewFeed,
    onError: refuseRefresh,
  });
  // 광고를 끝까지 본 뒤 받는 새로고침
  const adRefresh = useMutation({
    mutationFn: () => novels.refreshHomeFeedWithAd(),
    onSuccess: dropNewFeed,
    onError: refuseRefresh,
  });
  // 광고 새로고침까지 다 쓰면 새로고침 한 번을 산다. 서버가 결제를 확인하면 결제한 새로고침이 생기고,
  // 지금 산 것이면 바로 그것으로 새 열매를 받는다. 지난번에 확인하지 못한 결제는 새싹을 누를 때 쓴다.
  const purchase = useRefreshPurchase({
    onPaid: (paid, bought) => {
      queryClient.setQueryData(["novels", "home-feed", mode], paid);
      setOffer(undefined);
      if (bought) refresh.mutate();
    },
    onError: (message) => {
      setOffer(undefined);
      setNotice(message);
    },
  });

  const isDemo = mode === "demo";
  const refreshesLeft = isDemo ? demoLeft : feed?.freeRefreshesLeftToday;
  const dailyRefreshes = isDemo
    ? DEMO_FREE_REFRESHES
    : feed?.dailyFreeRefreshes;
  // 광고 새로고침을 모르는 예전 서버에서는 비어 있어, 다 쓴 뒤에도 예전처럼 서버에 묻는다.
  const adLeft = isDemo ? demoAdLeft : feed?.adRefreshesLeftToday;
  const paidLeft = isDemo ? 0 : (feed?.paidRefreshes ?? 0);

  const dropDemoFruits = () => {
    setDemoFruits(shuffled(demoHomeFruits()));
    setShowing(true);
    setRound((current) => current + 1);
  };
  const requestRefresh = () => {
    setNotice(undefined);
    // 무료나 결제한 새로고침이 남았거나 남은 횟수를 아직 모르면 바로 새로 받는다(판정은 서버가 한다).
    if (refreshesLeft !== 0 || paidLeft > 0 || adLeft === undefined) {
      setOffer(undefined);
      if (!isDemo) {
        refresh.mutate();
        return;
      }
      setDemoLeft(demoLeft - 1);
      dropDemoFruits();
      return;
    }
    // 다 썼으면 광고를 보거나 결제하고 받을지 묻는다. 물은 채로 한 번 더 누르면 닫는다.
    if (offer) {
      setOffer(undefined);
      return;
    }
    setOffer(adLeft > 0 ? "ad" : "purchase");
  };
  const watchAd = () => {
    setOffer(undefined);
    setWatchingAd(true);
  };
  const finishAd = (rewarded: boolean) => {
    setWatchingAd(false);
    if (!rewarded) {
      setNotice(AD_SKIPPED);
      return;
    }
    if (!isDemo) {
      adRefresh.mutate();
      return;
    }
    setDemoAdLeft(demoAdLeft - 1);
    dropDemoFruits();
  };
  // 결제할 수 없는 까닭. 비어 있으면 결제할 수 있다.
  const purchaseBlockedBy = () => {
    if (isDemo) return DEMO_NO_PURCHASE;
    if (!purchase.available) return PURCHASE_IN_APP_ONLY;
    return undefined;
  };
  const buy = () => {
    const blocked = purchaseBlockedBy();
    if (!blocked) {
      purchase.buy();
      return;
    }
    setOffer(undefined);
    setNotice(blocked);
  };

  return {
    round,
    // 둘러보기에서 떨어뜨릴 예시 열매(새로고침하면 섞인다)
    demoFruits,
    onShowEnd: () => setShowing(false),
    // 새로고침 버튼(RefreshButton)에 그대로 넘기는 값
    button: {
      left: refreshesLeft,
      total: dailyRefreshes,
      adLeft,
      paid: paidLeft,
      busy: showing || refresh.isPending || adRefresh.isPending,
      notice,
      offer: offerOf(offer, adLeft, purchase, {
        watchAd,
        buy,
        close: () => setOffer(undefined),
      }),
      onPress: requestRefresh,
    },
    // 광고 화면(RewardedAd)에 그대로 넘기는 값
    ad: { visible: watchingAd, onDone: finishAd },
  };
}
