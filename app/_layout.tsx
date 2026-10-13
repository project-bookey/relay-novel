import { Stack } from "expo-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { SessionProvider } from "../src/state/session";
import { colors } from "../src/theme";
const client = new QueryClient({
  defaultOptions: { queries: { retry: 1, staleTime: 15000 } },
});
export default function Layout() {
  return (
    <SafeAreaProvider>
      <QueryClientProvider client={client}>
        <SessionProvider>
          <StatusBar style="dark" />
          <Stack
            screenOptions={{
              headerShown: false,
              contentStyle: { backgroundColor: colors.background },
            }}
          />
        </SessionProvider>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}
