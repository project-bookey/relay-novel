import { Stack } from "expo-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { SessionProvider } from "../src/state/session";
import { AppearanceProvider, useAppearance } from "../src/state/appearance";
import { useColors } from "../src/theme/themed";
import { PurchaseProvider } from "../src/components/purchase/PurchaseProvider";
import { useFonts } from "expo-font";
import * as SplashScreen from "expo-splash-screen";
import { useEffect } from "react";
import { fontFiles, markFontsLoaded } from "../src/theme/fonts";

// 글꼴을 다 읽기 전에 기본 글꼴로 한 번 그려졌다 바뀌지 않게 시작 화면을 잡아 둔다.
SplashScreen.preventAutoHideAsync();

const client = new QueryClient({
  defaultOptions: { queries: { retry: 1, staleTime: 15000 } },
});

function ThemedStack() {
  const { scheme } = useAppearance();
  const colors = useColors();
  return (
    <>
      <StatusBar style={scheme === "dark" ? "light" : "dark"} />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.background },
        }}
      />
    </>
  );
}

export default function Layout() {
  const [fontsLoaded, fontError] = useFonts(fontFiles);
  // 글꼴을 못 읽으면 기기 기본 글꼴로라도 앱을 연다.
  // 화면들이 그려지기 전에 알려야 Text가 글꼴 이름을 붙이므로 그리는 중에 표시한다.
  if (fontsLoaded) markFontsLoaded();
  const ready = fontsLoaded || fontError !== null;
  useEffect(() => {
    if (ready) SplashScreen.hideAsync();
  }, [ready]);
  if (!ready) return null;

  return (
    <SafeAreaProvider>
      <AppearanceProvider>
        <QueryClientProvider client={client}>
          <SessionProvider>
            <PurchaseProvider>
              <ThemedStack />
            </PurchaseProvider>
          </SessionProvider>
        </QueryClientProvider>
      </AppearanceProvider>
    </SafeAreaProvider>
  );
}
