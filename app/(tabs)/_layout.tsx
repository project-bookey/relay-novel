import { Tabs } from "expo-router/js-tabs";
import { BottomBar, type Place } from "../../src/components/BottomBar";
import { useSession } from "../../src/state/session";
import { useColors } from "../../src/theme/themed";

// 탭 이름(파일 이름)마다 아래쪽 바에서 맡은 자리
const placeOf: Record<string, Place> = {
  index: "home",
  fruits: "fruits",
  my: "my",
};

// 홈·열매·마이는 아래쪽 유리 바 하나를 함께 쓰는 탭이다. 화면을 옮겨 다녀도 바는 그대로 남아 있어서,
// 지금 있는 곳 표시가 다음 자리로 미끄러져 간다.
export default function TabsLayout() {
  const { mode } = useSession();
  const colors = useColors();
  // 세션을 확인하는 동안이나 로그인 전에는 화면이 기다리거나 로그인으로 보내므로 바를 띄우지 않는다.
  const showBar = mode === "demo" || mode === "authenticated";

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        sceneStyle: { backgroundColor: colors.background },
      }}
      tabBar={({ state }) =>
        showBar ? (
          <BottomBar
            current={placeOf[state.routes[state.index].name] ?? "home"}
          />
        ) : null
      }
    >
      <Tabs.Screen name="index" />
      <Tabs.Screen name="fruits" />
      <Tabs.Screen name="my" />
    </Tabs>
  );
}
