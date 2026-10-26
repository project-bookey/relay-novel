import { useEffect, useRef } from "react";
import { Animated } from "react-native";
import { nativeDriverEnabled, useReducedMotion } from "../fruitMotion";

const FADE_MS = 600;

// 겹쳐 둔 여러 장 가운데 shown 장만 보이도록 서서히 바꾼다. 나를 위한 이야기의 큰 추천 카드와 맨 위 빛이
// 같은 값으로 함께 넘어간다. 장 묶음(sheetKey)이 바뀌면 그때의 shown 장만 보이게 값을 새로 만들고,
// 그 뒤로는 아래 effect가 움직인다. 동작 줄이기면 바로 바꾼다.
export function useCrossFade(sheetKey: string, count: number, shown: number) {
  const reduced = useReducedMotion();
  const sheets = useRef<{ key: string; fades: Animated.Value[] }>(null);
  if (sheets.current?.key !== sheetKey) {
    sheets.current = {
      key: sheetKey,
      fades: Array.from(
        { length: count },
        (_, index) => new Animated.Value(index === shown ? 1 : 0),
      ),
    };
  }
  const { fades } = sheets.current;
  useEffect(() => {
    const animation = Animated.parallel(
      fades.map((fade, index) =>
        Animated.timing(fade, {
          toValue: index === shown ? 1 : 0,
          duration: reduced ? 0 : FADE_MS,
          useNativeDriver: nativeDriverEnabled,
        }),
      ),
    );
    animation.start();
    return () => animation.stop();
  }, [fades, shown, reduced]);
  return fades;
}
