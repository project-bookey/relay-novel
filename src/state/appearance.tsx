import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { Appearance, Platform, useColorScheme, View } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SystemUI from "expo-system-ui";
import { palettes, type Scheme } from "../theme";

// 화면 모드: 기기 설정을 따르거나, 마이에서 밝게·어둡게로 고정한다.
export type AppearancePreference = "system" | Scheme;

const key = "relay-novel.appearance";

const isPreference = (value: unknown): value is AppearancePreference =>
  value === "system" || value === "light" || value === "dark";

const Context = createContext<{
  preference: AppearancePreference;
  scheme: Scheme;
  setPreference: (next: AppearancePreference) => void;
}>({
  preference: "system",
  scheme: "light",
  setPreference: () => {},
});

export function AppearanceProvider({ children }: { children: ReactNode }) {
  const systemScheme = useColorScheme();
  const [preference, setPreferenceState] =
    useState<AppearancePreference>("system");
  // 저장된 모드를 읽기 전에 그리면 밝은 화면이 잠깐 번쩍이므로 읽을 때까지 기다린다.
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(key)
      .then((saved) => {
        if (isPreference(saved)) setPreferenceState(saved);
      })
      .catch(() => {})
      .finally(() => setLoaded(true));
  }, []);

  const setPreference = useCallback((next: AppearancePreference) => {
    setPreferenceState(next);
    void AsyncStorage.setItem(key, next).catch(() => {});
  }, []);

  // 네이티브는 키보드·알림창 같은 시스템 화면도 같은 모드로 맞춘다.
  useEffect(() => {
    if (Platform.OS === "web") return;
    Appearance.setColorScheme(
      preference === "system" ? "unspecified" : preference,
    );
  }, [preference]);

  const deviceScheme: Scheme = systemScheme === "dark" ? "dark" : "light";
  const scheme = preference === "system" ? deviceScheme : preference;

  // 화면 전환이나 키보드가 올라올 때 비치는 뿌리 뷰도 바탕색으로 칠한다.
  useEffect(() => {
    void SystemUI.setBackgroundColorAsync(palettes[scheme].background).catch(
      () => {},
    );
  }, [scheme]);

  const value = useMemo(
    () => ({ preference, scheme, setPreference }),
    [preference, scheme, setPreference],
  );

  // 읽는 동안 빈 흰 화면 대신 기기 모드의 바탕색만 칠해 둔다.
  if (!loaded)
    return (
      <View
        style={{ flex: 1, backgroundColor: palettes[deviceScheme].background }}
      />
    );
  return <Context.Provider value={value}>{children}</Context.Provider>;
}

export const useAppearance = () => useContext(Context);
