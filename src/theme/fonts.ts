import { Platform, type TextStyle } from "react-native";
import { fontFiles } from "./fontFiles";

export { fontFiles };

// 굵기마다 파일이 따로라서 굵기를 글꼴 이름으로 고른다.
// 안드로이드는 직접 넣은 글꼴에 fontWeight를 주면 굵기를 고르지 못하고 가짜 굵게를 덧칠한다.
type FontName = keyof typeof fontFiles;
type FontWeight = NonNullable<TextStyle["fontWeight"]>;

export const BASE_FONT: FontName = "Pretendard-Regular";

const fontByWeight: Record<string, FontName> = {
  "100": "Pretendard-Regular",
  "200": "Pretendard-Regular",
  "300": "Pretendard-Regular",
  "400": "Pretendard-Regular",
  normal: "Pretendard-Regular",
  regular: "Pretendard-Regular",
  "500": "Pretendard-Medium",
  medium: "Pretendard-Medium",
  "600": "Pretendard-SemiBold",
  semibold: "Pretendard-SemiBold",
  "700": "Pretendard-Bold",
  bold: "Pretendard-Bold",
  // 900은 한 곳(작은 좋아요 수)뿐이라 파일을 더 넣지 않고 800으로 그린다.
  "800": "Pretendard-ExtraBold",
  "900": "Pretendard-ExtraBold",
  heavy: "Pretendard-ExtraBold",
  black: "Pretendard-ExtraBold",
};

// 글꼴을 못 읽었으면 없는 이름을 넘기지 않고 기기 글꼴과 원래 굵기를 그대로 쓴다.
let fontsLoaded = false;

export function markFontsLoaded() {
  fontsLoaded = true;
}

export function areFontsLoaded() {
  return fontsLoaded;
}

export function fontNameOf(weight: FontWeight | undefined): FontName {
  if (weight === undefined) return BASE_FONT;
  return fontByWeight[String(weight)] ?? BASE_FONT;
}

// 웹은 글꼴 이름 뒤에 기기 글꼴을 이어 둬서 늦게 읽혀도 세리프로 보이지 않게 한다.
export function fontFamilyOf(weight: FontWeight | undefined): string {
  const name = fontNameOf(weight);
  if (Platform.OS === "web") return `${name}, system-ui, sans-serif`;
  return name;
}
