import { createContext, forwardRef, useContext } from "react";
import {
  StyleSheet,
  Text as NativeText,
  TextInput as NativeTextInput,
  type StyleProp,
  type TextProps,
  type TextInputProps,
  type TextStyle,
} from "react-native";
import { areFontsLoaded, fontFamilyOf } from "../theme/fonts";

// 앱의 모든 글자는 react-native 대신 여기의 Text·TextInput을 쓴다(Pretendard).
// 글자 안의 글자인지 알아 두는 값이라, Text 안에 View를 끼우고 다시 Text를 넣는 구조는 쓰지 않는다.
const InsideText = createContext(false);

// 굵기를 글꼴 이름으로 바꾸고 fontWeight는 지운다.
// 글자 안의 글자가 굵기를 정하지 않았으면 바깥 글꼴을 물려받게 그대로 둔다.
function withFont(
  style: StyleProp<TextStyle>,
  inherit: boolean,
): StyleProp<TextStyle> {
  if (!areFontsLoaded()) return style;
  const flat = StyleSheet.flatten(style) ?? {};
  if (flat.fontFamily) return style;
  if (inherit && flat.fontWeight === undefined) return style;
  const { fontWeight, ...rest } = flat;
  return { ...rest, fontFamily: fontFamilyOf(fontWeight) };
}

export const Text = forwardRef<NativeText, TextProps>(function Text(
  { style, ...props },
  ref,
) {
  const inside = useContext(InsideText);
  return (
    <InsideText.Provider value>
      <NativeText ref={ref} style={withFont(style, inside)} {...props} />
    </InsideText.Provider>
  );
});

export const TextInput = forwardRef<NativeTextInput, TextInputProps>(
  function TextInput({ style, ...props }, ref) {
    return (
      <NativeTextInput ref={ref} style={withFont(style, false)} {...props} />
    );
  },
);
