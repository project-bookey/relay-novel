import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";
import type { Tokens } from "../api/types";
const key = "relay-novel.tokens";
// Web preview keeps tokens in memory. Native sessions use the OS keychain.
let webTokens: Tokens | null = null;
export const tokenStorage = {
  async get(): Promise<Tokens | null> {
    if (Platform.OS === "web") return webTokens;
    const value = await SecureStore.getItemAsync(key);
    try {
      return value ? JSON.parse(value) : null;
    } catch {
      return null;
    }
  },
  async set(tokens: Tokens) {
    if (Platform.OS === "web") webTokens = tokens;
    else await SecureStore.setItemAsync(key, JSON.stringify(tokens));
  },
  async clear() {
    if (Platform.OS === "web") webTokens = null;
    else await SecureStore.deleteItemAsync(key);
  },
};
