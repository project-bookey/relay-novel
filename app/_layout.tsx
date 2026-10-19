import { Stack } from "expo-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { SessionProvider } from "../src/state/session";
import { AppearanceProvider, useAppearance } from "../src/state/appearance";
import { useColors } from "../src/theme/themed";
import { PurchaseProvider } from "../src/components/purchase/PurchaseProvider";
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
