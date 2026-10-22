import { useId } from "react";
import { View } from "react-native";
import { Text } from "../text";
import Svg, { Defs, Path, RadialGradient, Rect, Stop } from "react-native-svg";
import { likeCountLabel } from "../../design/fruitList";
import { themedStyles, useColors } from "../../theme/themed";

const HEART_PATH =
  "M7 12.2C2 8.6 0.4 6.4 0.4 4C0.4 1.9 2 0.5 3.8 0.5C5.2 0.5 6.3 1.3 7 2.5C7.7 1.3 8.8 0.5 10.2 0.5C12 0.5 13.6 1.9 13.6 4C13.6 6.4 12 8.6 7 12.2Z";

// 하트·숫자 뒤에 까는 은은한 흰 빛의 크기
const GLOW_WIDTH = 30;
const GLOW_HEIGHT = 34;

// 표지 위쪽 왼편의 좋아요: 채우지 않은 초록 하트와 그 밑의 수.
// 밝은 표지·어두운 표지 어디서도 보이도록 하트와 숫자 둘레에 같은 굵기의 가는 흰 테두리를 두른다.
// 하트 바깥 크기는 흰 선이 정하고, 초록 선은 그 안쪽으로만 굵다.
export function LikeMark({ count }: { count: number }) {
  const styles = useStyles();
  const colors = useColors();
  const glowId = `like-glow-${useId().replace(/[^\w-]/g, "")}`;
  return (
    <View style={styles.mark}>
      {/* 어두운 표지에서도 또렷하도록 뒤에 은은한 흰 빛을 깐다(밝은 표지에서는 보이지 않는다, 시안 3번). */}
      <Svg width={GLOW_WIDTH} height={GLOW_HEIGHT} style={styles.glow}>
        <Defs>
          <RadialGradient id={glowId} cx="50%" cy="50%" r="50%">
            <Stop
              offset="0"
              stopColor={colors.likeMarkOutline}
              stopOpacity={0.38}
            />
            <Stop
              offset="1"
              stopColor={colors.likeMarkOutline}
              stopOpacity={0}
            />
          </RadialGradient>
        </Defs>
        <Rect
          width={GLOW_WIDTH}
          height={GLOW_HEIGHT}
          fill={`url(#${glowId})`}
        />
      </Svg>
      <Svg width={12} height={11} viewBox="-1 -1 16 15">
        <Path
          d={HEART_PATH}
          fill="none"
          stroke={colors.likeMarkOutline}
          strokeWidth={3.6}
          strokeLinejoin="round"
        />
        <Path
          d={HEART_PATH}
          fill="none"
          stroke={colors.likeMark}
          strokeWidth={2.4}
          strokeLinejoin="round"
        />
      </Svg>
      <Text style={styles.count} maxFontSizeMultiplier={1.5}>
        {likeCountLabel(count)}
      </Text>
    </View>
  );
}

const useStyles = themedStyles((colors) => ({
  // 누르기는 목록 줄 전체가 받으므로 표시는 손가락을 가로채지 않는다.
  mark: {
    position: "absolute",
    left: 6,
    top: 6,
    alignItems: "center",
    pointerEvents: "none",
  },
  // 하트(12) 가운데에 맞춰 둘레로 퍼진다.
  glow: {
    position: "absolute",
    left: (12 - GLOW_WIDTH) / 2,
    top: -7,
  },
  // 앱에서 가장 작은 글자. 기기 글자 크기를 키우면 따라 커지되, 표지 그림을 다 가리지 않게 1.5배까지만.
  count: {
    marginTop: 1,
    fontSize: 8,
    fontWeight: "900",
    color: colors.likeMark,
    textShadowColor: colors.likeMarkOutline,
    textShadowRadius: 1.5,
    textShadowOffset: { width: 0, height: 0 },
  },
}));
