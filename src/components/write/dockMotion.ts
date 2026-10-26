import { useEffect, useRef, useState } from "react";
import { Animated, Easing } from "react-native";

// 유리 도구 줄이 판으로 펼쳐지고 접히는 움직임. 판 크기가 바뀌어 네이티브 드라이버를 쓰지 않는다.
export const OPEN_MS = 380;
export const CLOSE_MS = 300;
const SWAP_OUT_MS = 110;
const SWAP_IN_MS = 220;
const EASE = Easing.bezier(0.2, 0.8, 0.2, 1);

// 0 = 캡슐, 1 = 펼친 판
export function useOpenness(open: boolean, reduced: boolean) {
  const value = useRef(new Animated.Value(open ? 1 : 0)).current;
  useEffect(() => {
    if (reduced) return value.setValue(open ? 1 : 0);
    const motion = Animated.timing(value, {
      toValue: open ? 1 : 0,
      duration: open ? OPEN_MS : CLOSE_MS,
      easing: EASE,
      useNativeDriver: false,
    });
    motion.start();
    return () => motion.stop();
  }, [open, reduced, value]);
  return value;
}

// 판 높이. 펼칠 때·도구를 바꿀 때·내용이 늘거나 줄 때·키보드가 오르내릴 때 그 높이로 따라간다.
export function usePanelHeight(
  target: number,
  open: boolean,
  reduced: boolean,
) {
  const value = useRef(new Animated.Value(target)).current;
  useEffect(() => {
    if (reduced) return value.setValue(target);
    const motion = Animated.timing(value, {
      toValue: target,
      duration: open ? OPEN_MS : CLOSE_MS,
      easing: EASE,
      useNativeDriver: false,
    });
    motion.start();
    return () => motion.stop();
  }, [target, open, reduced, value]);
  return value;
}

// 판에 보이는 도구 내용. 판이 열린 채 다른 도구로 바꾸면 지금 내용이 잠깐 흐려진 뒤 새 내용이 떠오르고,
// 판을 닫으면 접히는 동안에는 보던 내용을 그대로 둔다.
export function useShownPane<Key extends string>(
  active: Key | null,
  reduced: boolean,
) {
  const [key, setKey] = useState<Key | null>(active);
  const fade = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    if (active === null || active === key) return;
    if (key === null || reduced) {
      fade.setValue(1);
      setKey(active);
      return;
    }
    const swapOut = Animated.timing(fade, {
      toValue: 0,
      duration: SWAP_OUT_MS,
      easing: Easing.out(Easing.quad),
      useNativeDriver: false,
    });
    let swappedOut = false;
    swapOut.start(({ finished }) => {
      swappedOut = true;
      if (!finished) return;
      setKey(active);
      Animated.timing(fade, {
        toValue: 1,
        duration: SWAP_IN_MS,
        easing: Easing.out(Easing.quad),
        useNativeDriver: false,
      }).start();
    });
    // stop()은 이 값에서 지금 도는 움직임을 멈추므로, 흐려지기가 끝난 뒤에는 막 시작한 떠오르기를 멈추지 않게 한다.
    return () => {
      if (!swappedOut) swapOut.stop();
    };
  }, [active, key, reduced, fade]);
  // 접히고 나면 다음에 열 때 처음부터 떠오르도록 비운다.
  useEffect(() => {
    if (active !== null) return;
    const timer = setTimeout(() => setKey(null), CLOSE_MS);
    return () => clearTimeout(timer);
  }, [active]);
  // 처음 펼칠 때는 기다리지 않고 바로 그 도구 내용을 둔다(판 높이를 바로 잴 수 있게).
  return { key: key ?? active, fade };
}
