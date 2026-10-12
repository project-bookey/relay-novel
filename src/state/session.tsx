import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { useQueryClient } from "@tanstack/react-query";
import { tokenStorage } from "./tokens";
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
      .then((t) => setMode(t ? "authenticated" : "guest"))
      .catch(() => setMode("guest"));
  }, []);
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
