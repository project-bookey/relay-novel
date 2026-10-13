import { StyleSheet, View } from "react-native";
import Svg, { Circle, Ellipse, Path } from "react-native-svg";
import { colors } from "../theme";

const VIEW_WIDTH = 340;
const VIEW_HEIGHT = 300;

const crown = [
  { x: 170, y: 72, radius: 52, color: colors.leaf },
  { x: 112, y: 98, radius: 44, color: colors.leafLight },
  { x: 228, y: 96, radius: 46, color: colors.leaf },
  { x: 84, y: 138, radius: 38, color: colors.leafDeep },
  { x: 256, y: 136, radius: 40, color: colors.leafLight },
  { x: 138, y: 144, radius: 44, color: colors.leafDeep },
  { x: 204, y: 140, radius: 44, color: colors.leaf },
  { x: 170, y: 108, radius: 48, color: colors.leafLight },
];

// 로그인 화면의 큰 이야기 나무 그림.
export function HomeTree() {
  return (
    <View style={styles.stage} accessible={false}>
      <Svg
        width="100%"
        height="100%"
        viewBox={`0 0 ${VIEW_WIDTH} ${VIEW_HEIGHT}`}
      >
        <Ellipse cx="170" cy="284" rx="168" ry="15" fill={colors.ground} />
        <Path
          d="M 157 288 Q 165 220 160 150 L 180 150 Q 175 220 184 288 Z"
          fill={colors.bark}
        />
        <Path
          d="M 165 205 Q 140 185 118 152"
          stroke={colors.bark}
          strokeWidth="7"
          strokeLinecap="round"
          fill="none"
        />
        <Path
          d="M 176 196 Q 205 180 226 150"
          stroke={colors.bark}
          strokeWidth="7"
          strokeLinecap="round"
          fill="none"
        />
        {crown.map((blob, index) => (
          <Circle
            key={index}
            cx={blob.x}
            cy={blob.y}
            r={blob.radius}
            fill={blob.color}
          />
        ))}
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  stage: {
    width: "100%",
    aspectRatio: VIEW_WIDTH / VIEW_HEIGHT,
    marginVertical: 8,
  },
});
