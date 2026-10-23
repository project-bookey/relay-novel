import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { useQueryClient } from "@tanstack/react-query";
import { tokenStorage } from "./tokens";
import { clearRecentSearches } from "./recentSearches";
import type { Tokens } from "../api/types";
type Mode = "loading" | "guest" | "demo" | "authenticated";
const Context = createContext<{
  mode: Mode;
  authenticate: (t: Tokens) => Promise<void>;
  demo: () => void;
  logout: () => Promise<void>;
}>({
  mode: "loading",
  authenticate: async () => {},
  demo: () => {},
  logout: async () => {},
});
export function SessionProvider({ children }: { children: ReactNode }) {
  const [mode, setMode] = useState<Mode>("loading");
  const client = useQueryClient();
  useEffect(() => {
    void tokenStorage
      .get()
      .then((tokens) => setMode(tokens ? "authenticated" : "guest"))
      .catch(() => setMode("guest"));
  }, []);
  // 로그아웃하면(손님이 되면) 앞사람이 찾은 말을 다음 사람이 보지 않게 지운다.
  useEffect(() => {
    if (mode === "guest") void clearRecentSearches();
  }, [mode]);
  // 토큰 갱신이 거절되거나 다른 탭에서 로그아웃해 토큰이 지워지면 로그인 화면으로 돌려보낸다.
  useEffect(
    () =>
      tokenStorage.onClear(() => {
        client.clear();
        setMode((current) => (current === "authenticated" ? "guest" : current));
      }),
    [client],
  );
  return (
    <Context.Provider
      value={{
        mode,
        authenticate: async (t) => {
          await tokenStorage.set(t);
          client.clear();
          setMode("authenticated");
        },
        demo: () => {
          client.clear();
          setMode("demo");
        },
        logout: async () => {
          await tokenStorage.clear();
          client.clear();
          setMode("guest");
        },
      }}
    >
      {children}
    </Context.Provider>
  );
}
export const useSession = () => useContext(Context);
