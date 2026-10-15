import { StyleSheet } from "react-native";
import { useAppearance } from "../state/appearance";
import { palettes, type Palette, type Scheme } from "./index";

// 지금 화면 모드(밝게·어둡게)의 색
export function useColors(): Palette {
  return palettes[useAppearance().scheme];
}

// 색을 쓰는 스타일을 화면 모드마다 한 번씩만 만들어 두고 꺼내 쓰는 훅을 만든다.
// 모듈 맨 위에서 `const useStyles = themedStyles((colors) => ({ ... }))`로 만들고,
// 컴포넌트 안에서 `const styles = useStyles()`로 쓴다.
export function themedStyles<
  T extends StyleSheet.NamedStyles<T> | StyleSheet.NamedStyles<any>,
>(make: (colors: Palette) => T & StyleSheet.NamedStyles<any>) {
  const made: Partial<Record<Scheme, T>> = {};
  return function useStyles(): T {
    const { scheme } = useAppearance();
    made[scheme] ??= StyleSheet.create(make(palettes[scheme]));
    return made[scheme];
  };
}
