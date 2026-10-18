import { useEffect, useMemo, useState } from "react";
import { StyleSheet, Text, View, useWindowDimensions } from "react-native";
import { Redirect, router } from "expo-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useSession } from "../../src/state/session";
import { novels } from "../../src/api/novels";
import { demoStories } from "../../src/api/demo";
import { usedFruits } from "../../src/state/usedFruits";
import type { NovelHomeFeed, NovelSummary } from "../../src/api/types";
import { FruitField } from "../../src/components/FruitField";
import {
  REFRESH_TOUCH_SIZE,
  RefreshButton,
  type RefreshOffer,
} from "../../src/components/home/RefreshButton";
import { RewardedAd } from "../../src/components/home/RewardedAd";
import { useRefreshPurchase } from "../../src/components/home/refreshPurchase";
import { ErrorBox, Loading, Screen, useUi } from "../../src/components/ui";
import { REFRESH_BUTTON_SPOT, canopyPlacement } from "../../src/design/canopy";

// 둘러보기에는 서버가 없어서 하루 무료·광고 새로고침을 이 화면 안에서만 흉내 낸다(앱을 다시 열면 다시 찬다).
const DEMO_FREE_REFRESHES = 2;
const DEMO_AD_REFRESHES = 3;
const AD_SKIPPED = "광고를 끝까지 보면 새 열매를 받을 수 있어요.";
const DEMO_NO_PURCHASE =
  "둘러보기에서는 결제할 수 없어요. 로그인하면 결제하고 새 열매를 받을 수 있어요.";
const PURCHASE_IN_APP_ONLY = "새로고침 결제는 iOS·Android 앱에서 할 수 있어요.";
// 새로고침 버튼 아래 알림 말풍선이 떠 있는 시간
const NOTICE_MS = 3200;

// 열매 자리는 몇 개뿐이라, 나에게 배달된 열매와 내가 이어 쓸 차례인 소설을 먼저 놓고
// 나머지를 홈 묶음 순서대로 채운다. 이미 이어 쓴 소설은 홈 묶음에 남아 있어도 놓지 않는다
// (다시 배달되거나 내 차례가 돌아오면 그때는 새 열매로 놓인다).
function fruitOrder(
  delivered: NovelSummary[],
  myTurns: NovelSummary[],
  homeFeed: NovelSummary[],
  used: number[],
) {
  const seen = new Set<number>();
  const fresh = homeFeed.filter((story) => !used.includes(story.id));
  return [...delivered, ...myTurns, ...fresh].filter((story) => {
    if (seen.has(story.id)) return false;
    seen.add(story.id);
    return true;
  });
}

// 둘러보기에서 새로고침하면 같은 예시 작품들이 자리를 바꿔 다시 떨어진다.
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
function useRefreshButtonCenter() {
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

// 홈에는 열매와 그 둘레의 풀·꽃이 있다(새로고침할 때만 위쪽 나무가 내려온다). 열매 하나가 소설 하나이고, 누르면 그 소설로 간다.
// 오른쪽 위 버튼으로 하루 무료 횟수 안에서 열매 밭을 새 묶음으로 바꾸면, 땅의 열매가 굴러 나가고
// 나무가 툭 떨어져 캐릭터들이 방방 뛰며 새 열매를 떨어뜨린다.
export default function Home() {
  const ui = useUi();
  const { mode } = useSession();
  const queryClient = useQueryClient();
  const homeFeed = useQuery({
    queryKey: ["novels", "home-feed", mode],
    queryFn: novels.homeFeed,
    enabled: mode === "authenticated",
  });
  const turns = useQuery({
    queryKey: ["my-turns", mode],
    queryFn: novels.turns,
    enabled: mode === "authenticated",
  });
  // 회차가 발행되면 무작위로 고른 사람의 홈에 열매가 떨어진다. 둘러보기에는 배달이 없다.
  const deliveries = useQuery({
    queryKey: ["deliveries", mode],
    queryFn: novels.deliveries,
    enabled: mode === "authenticated",
  });
  // 이어 쓴 열매. 기기에 적어 둔 것이라 둘러보기에는 없다.
  const used = useQuery({
    queryKey: ["used-fruits", mode],
    queryFn: usedFruits.load,
    enabled: mode === "authenticated",
  });
  const buttonCenter = useRefreshButtonCenter();
  // 새로고침할 때마다 늘어나는 차례. 열매 밭은 이 값이 바뀌면 새로고침 연출을 한다.
  const [round, setRound] = useState(0);
  // 나무 연출이 도는 동안에는 새로고침을 막는다. 홈에 처음 들어올 때도 나무가 내려오는 연출이 돈다.
  const [showing, setShowing] = useState(true);
  const [notice, setNotice] = useState<string>();
  const [demoOrder, setDemoOrder] = useState(demoStories);
  const [demoLeft, setDemoLeft] = useState(DEMO_FREE_REFRESHES);
  const [demoAdLeft, setDemoAdLeft] = useState(DEMO_AD_REFRESHES);
  // 무료 새로고침을 다 쓴 뒤 새싹을 누르면 광고를 볼지, 광고도 다 썼으면 결제할지 묻는다.
  const [offer, setOffer] = useState<"ad" | "purchase">();
  const [watchingAd, setWatchingAd] = useState(false);

  // 둘러보기에서 로그인하는 등 모드가 바뀌면 열매 밭을 새로 그려 나무가 다시 내려온다.
  useEffect(() => setShowing(true), [mode]);
  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(undefined), NOTICE_MS);
    return () => clearTimeout(timer);
  }, [notice]);
  // 홈 묶음을 받을 때마다 묶음에서 빠진 소설은 이어 쓴 기록에서도 지운다.
  // 내용이 같으면 묶음 객체도 그대로라, 받은 때(dataUpdatedAt)로 다시 받았는지 안다.
  const feedNovels = homeFeed.data?.novels;
  const feedUpdatedAt = homeFeed.dataUpdatedAt;
  useEffect(() => {
    if (!feedNovels) return;
    void usedFruits
      .keepOnly(feedNovels.map((story) => story.id))
      .then((changed) => {
        if (changed)
          void queryClient.invalidateQueries({ queryKey: ["used-fruits"] });
      });
  }, [feedNovels, feedUpdatedAt, queryClient]);

  const dropNewFeed = (feed: NovelHomeFeed) => {
    queryClient.setQueryData(["novels", "home-feed", mode], feed);
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
    onPaid: (feed, bought) => {
      queryClient.setQueryData(["novels", "home-feed", mode], feed);
      setOffer(undefined);
      if (bought) refresh.mutate();
    },
    onError: (message) => {
      setOffer(undefined);
      setNotice(message);
    },
  });

  // 홈이 다시 그려질 때마다 새 목록을 만들면 열매 밭이 처음 배치로 돌아가, 손으로 옮긴 열매가 제자리로 튄다.
  // 서버 응답이 바뀔 때만 목록을 새로 만든다.
  const stories = useMemo(
    () =>
      mode === "demo"
        ? demoOrder
        : fruitOrder(
            (deliveries.data ?? []).map((delivery) => delivery.novel),
            turns.data ?? [],
            homeFeed.data?.novels ?? [],
            used.data ?? [],
          ),
    [mode, demoOrder, deliveries.data, turns.data, homeFeed.data, used.data],
  );
  const deliveredIds = useMemo(
    () => new Set((deliveries.data ?? []).map((delivery) => delivery.novel.id)),
    [deliveries.data],
  );

  if (mode === "loading")
    return (
      <Screen>
        <Loading />
      </Screen>
    );
  if (mode === "guest") return <Redirect href="/login" />;

  // 데모 모드에서는 쿼리가 꺼져 있어 isPending이 계속 true이므로 로딩으로 보지 않는다.
  // 목록이 다 온 뒤에 열매를 떨어뜨려야 순서가 바뀌며 다시 떨어지는 일이 없다.
  // 이어 쓴 기록도 기다려야 사라질 열매가 잠깐 떨어졌다 없어지지 않는다.
  const isLoading =
    mode !== "demo" &&
    (homeFeed.isPending ||
      turns.isPending ||
      deliveries.isPending ||
      used.isPending);
  const error = homeFeed.error ?? turns.error ?? deliveries.error;
  const isEmpty = !isLoading && !error && stories.length === 0;
  const refreshesLeft =
    mode === "demo" ? demoLeft : homeFeed.data?.freeRefreshesLeftToday;
  const dailyRefreshes =
    mode === "demo" ? DEMO_FREE_REFRESHES : homeFeed.data?.dailyFreeRefreshes;
  // 광고 새로고침을 모르는 예전 서버에서는 비어 있어, 다 쓴 뒤에도 예전처럼 서버에 묻는다.
  const adLeft =
    mode === "demo" ? demoAdLeft : homeFeed.data?.adRefreshesLeftToday;
  const paidLeft = mode === "demo" ? 0 : (homeFeed.data?.paidRefreshes ?? 0);
  const openStory = (story: NovelSummary) => router.push(`/novel/${story.id}`);
  const retry = () => {
    void Promise.all([
      homeFeed.refetch(),
      turns.refetch(),
      deliveries.refetch(),
    ]);
  };
  const dropDemoFruits = () => {
    setDemoOrder(shuffled(demoStories));
    setShowing(true);
    setRound(round + 1);
  };
  const requestRefresh = () => {
    setNotice(undefined);
    // 무료나 결제한 새로고침이 남았거나 남은 횟수를 아직 모르면 바로 새로 받는다(판정은 서버가 한다).
    if (refreshesLeft !== 0 || paidLeft > 0 || adLeft === undefined) {
      setOffer(undefined);
      if (mode !== "demo") {
        refresh.mutate();
        return;
      }
      setDemoLeft(demoLeft - 1);
      dropDemoFruits();
      return;
    }
    // 다 썼으면 광고를 보거나 결제하고 받을지 묻는다. 물은 채로 한 번 더 누르면 닫는다.
    setOffer(offer ? undefined : adLeft > 0 ? "ad" : "purchase");
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
    if (mode !== "demo") {
      adRefresh.mutate();
      return;
    }
    setDemoAdLeft(demoAdLeft - 1);
    dropDemoFruits();
  };
  const buy = () => {
    const unavailable =
      mode === "demo"
        ? DEMO_NO_PURCHASE
        : !purchase.available
          ? PURCHASE_IN_APP_ONLY
          : undefined;
    if (!unavailable) {
      purchase.buy();
      return;
    }
    setOffer(undefined);
    setNotice(unavailable);
  };
  const closeOffer = () => setOffer(undefined);
  const offerShown: RefreshOffer | undefined =
    offer === "ad"
      ? {
          message: `오늘 무료 새로고침을 다 썼어요. 광고를 보면 ${adLeft}번 더 받을 수 있어요.`,
          action: "광고 보고 새 열매 받기",
          onAccept: watchAd,
          onClose: closeOffer,
        }
      : offer === "purchase"
        ? {
            message:
              "오늘 광고로 받는 새로고침도 다 썼어요. 결제하면 새 열매를 한 번 더 받을 수 있어요.",
            action: purchase.price
              ? `결제하고 새 열매 받기 · ${purchase.price}`
              : "결제하고 새 열매 받기",
            busy: purchase.busy,
            onAccept: buy,
            onClose: closeOffer,
          }
        : undefined;

  return (
    <Screen scroll={false}>
      <View style={styles.frame}>
        <View style={styles.stage}>
          {isLoading && <Loading />}
          {!isLoading && (
            <FruitField
              key={mode}
              stories={stories}
              deliveredIds={deliveredIds}
              round={round}
              onOpen={openStory}
              onShowEnd={() => setShowing(false)}
            />
          )}
          {isEmpty && (
            <Text style={[ui.hint, styles.empty]}>
              아직 떨어진 열매가 없어요.
            </Text>
          )}
          {!!error && (
            // 열매 자리가 흔들리지 않도록 오류 안내는 열매 밭 위에 띄운다.
            <View style={styles.errorOverlay}>
              <ErrorBox error={error} retry={retry} />
            </View>
          )}
        </View>
      </View>
      {!isLoading && (
        <RefreshButton
          center={buttonCenter}
          left={refreshesLeft}
          total={dailyRefreshes}
          adLeft={adLeft}
          paid={paidLeft}
          busy={showing || refresh.isPending || adRefresh.isPending}
          notice={notice}
          offer={offerShown}
          onPress={requestRefresh}
        />
      )}
      <RewardedAd visible={watchingAd} onDone={finishAd} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  frame: {
    flex: 1,
    width: "100%",
    maxWidth: 680,
    alignSelf: "center",
    padding: 24,
  },
  // 아래쪽 유리 바는 탭 레이아웃이 이 영역 아래쪽에 겹쳐 띄우므로, 열매 밭이 그 자리를 비워 둔다.
  stage: { flex: 1 },
  // 나무 아래 하늘 가운데쯤에 띄운다.
  empty: {
    position: "absolute",
    top: "45%",
    left: 0,
    right: 0,
    textAlign: "center",
  },
  errorOverlay: { position: "absolute", top: "30%", left: 0, right: 0 },
});
