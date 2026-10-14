import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";
import type { Tokens } from "../api/types";
const key = "relay-novel.tokens";
type ClearListener = () => void;
const clearListeners = new Set<ClearListener>();
const notifyCleared = () => clearListeners.forEach((listener) => listener());

// 웹은 새로고침해도 로그인이 유지되도록 localStorage에 둔다.
// 프라이빗 모드 등에서 저장이 막히면 이번 접속 동안만 메모리에 보관한다.
let webFallback: string | null = null;
const web = {
  area(): Storage | null {
    try {
      return localStorage;
    } catch {
      return null;
    }
  },
  read(): string | null {
    try {
      return localStorage.getItem(key) ?? webFallback;
    } catch {
      return webFallback;
    }
  },
  write(value: string) {
    try {
      localStorage.setItem(key, value);
      webFallback = null;
    } catch {
      // 예전 토큰이 남아 새 토큰보다 먼저 읽히지 않게 지운다.
      webFallback = value;
      try {
        localStorage.removeItem(key);
      } catch {}
    }
  },
  remove() {
    webFallback = null;
    try {
      localStorage.removeItem(key);
    } catch {}
  },
};

// 웹: 다른 탭에서 로그아웃하면 이 탭도 로그인 화면으로 돌아가게 한다.
if (Platform.OS === "web" && typeof window !== "undefined") {
  window.addEventListener("storage", (event) => {
    if (event.storageArea !== web.area()) return;
    const removedAll = event.key === null;
    const removedTokens = event.key === key && event.newValue === null;
    if (removedAll || removedTokens) notifyCleared();
  });
}

async function readSaved(): Promise<string | null> {
  if (Platform.OS === "web") return web.read();
  return SecureStore.getItemAsync(key);
}

export const tokenStorage = {
  async get(): Promise<Tokens | null> {
    const saved = await readSaved();
    try {
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  },
  async set(tokens: Tokens) {
    const serialized = JSON.stringify(tokens);
    if (Platform.OS === "web") web.write(serialized);
    else await SecureStore.setItemAsync(key, serialized);
  },
  async clear() {
    if (Platform.OS === "web") web.remove();
    else await SecureStore.deleteItemAsync(key);
    notifyCleared();
  },
  // 토큰 갱신이 실패해 토큰이 지워지면 세션이 로그인 화면으로 돌아가도록 알린다.
  onClear(listener: ClearListener) {
    clearListeners.add(listener);
    return () => {
      clearListeners.delete(listener);
    };
  },
};
