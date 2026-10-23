import { useCallback, useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { rememberWord } from "../design/fruitList";

// 열매 탭의 최근 찾은 말. 서버가 아니라 이 기기에만 두고, 로그아웃하면 지운다(session.tsx).
const key = "relay-novel.recent-searches";

const isWordList = (value: unknown): value is string[] =>
  Array.isArray(value) && value.every((word) => typeof word === "string");

export async function clearRecentSearches() {
  await AsyncStorage.removeItem(key).catch(() => {});
}

// mode는 세션 모드(useSession). 세션이 이 파일의 지우기를 부르므로 여기서 세션을 다시 불러오지 않는다.
export function useRecentSearches(mode: string) {
  const [words, setWords] = useState<string[]>([]);

  // 들어온 사람이 바뀌면(둘러보기 ↔ 로그인) 그때 저장된 말을 다시 읽는다.
  // 읽기가 끝나기 전에 찾은 말은 버리지 않고 읽은 목록 앞에 얹는다.
  useEffect(() => {
    setWords([]);
    if (mode !== "authenticated" && mode !== "demo") return;
    let current = true;
    AsyncStorage.getItem(key)
      .then((saved) => {
        const parsed: unknown = saved ? JSON.parse(saved) : [];
        if (!current || !isWordList(parsed)) return;
        setWords((typedMeanwhile) =>
          typedMeanwhile.reduceRight(rememberWord, parsed),
        );
      })
      .catch(() => {});
    return () => {
      current = false;
    };
  }, [mode]);

  // 저장에 실패해도 화면의 목록은 그대로 바뀐다(다음에 열 때만 빠진다).
  const save = useCallback((update: (now: string[]) => string[]) => {
    setWords((now) => {
      const next = update(now);
      if (next !== now)
        void AsyncStorage.setItem(key, JSON.stringify(next)).catch(() => {});
      return next;
    });
  }, []);

  const remember = useCallback(
    (word: string) => save((now) => rememberWord(now, word)),
    [save],
  );
  const forget = useCallback(
    (word: string) => save((now) => now.filter((each) => each !== word)),
    [save],
  );
  const clear = useCallback(() => save(() => []), [save]);

  return { words, remember, forget, clear };
}
