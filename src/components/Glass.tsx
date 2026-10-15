import type { ReactNode } from "react";
import { Platform, View, type StyleProp, type ViewStyle } from "react-native";
import {
  GlassView,
  isGlassEffectAPIAvailable,
  isLiquidGlassAvailable,
} from "expo-glass-effect";
import { useAppearance } from "../state/appearance";
import { themedStyles } from "../theme/themed";

// iOS 26부터는 시스템이 그리는 리퀴드 글래스를 그대로 쓴다.
// 일부 iOS 26 베타에는 API가 없어 앱이 멈출 수 있으므로 두 가지를 모두 확인한다.
const hasSystemGlass =
  Platform.OS === "ios" &&
  isLiquidGlassAvailable() &&
  isGlassEffectAPIAvailable();

// 웹 미리보기에서는 뒤쪽을 흐리고 채도를 올려 비추는 CSS backdrop-filter로 유리를 흉내 낸다.
// React Native 스타일 타입에는 없는 웹 전용 속성이라 타입을 맞춰 따로 둔다.
const webGlass = {
  backdropFilter: "blur(16px) saturate(180%)",
} as ViewStyle;

// 뒤쪽 내용이 비치는 유리판. 둥근 모양과 크기는 style로 정한다.
export function GlassSurface({
  style,
  children,
}: {
  style?: StyleProp<ViewStyle>;
  children: ReactNode;
}) {
  const { scheme } = useAppearance();
  const styles = useStyles();
  if (hasSystemGlass)
    return (
      <GlassView
        glassEffectStyle="regular"
        isInteractive
        colorScheme={scheme}
        style={style}
      >
        {children}
      </GlassView>
    );
  return (
    <View
      style={[
        styles.imitation,
        Platform.OS === "web" ? styles.webTint : styles.solidTint,
        style,
      ]}
    >
      {children}
    </View>
  );
}

const useStyles = themedStyles((colors) => ({
  // 시스템 유리가 없는 곳(웹·안드로이드·iOS 26 이전)에서 흉내 낸 유리.
  // 가장자리에 맺힌 빛은 안쪽 그림자로, 화면 위에 떠 있는 느낌은 바깥 그림자로 낸다.
  imitation: {
    borderWidth: 1,
    borderColor: colors.glassEdge,
    boxShadow: colors.glassShadow,
  },
  webTint: { backgroundColor: colors.glassTint, ...webGlass },
  // 뒤를 흐리게 할 수 없는 곳에서는 뒤쪽 글자가 겹쳐 읽히지 않도록 더 불투명하게 둔다.
  solidTint: { backgroundColor: colors.glassSolid },
}));
