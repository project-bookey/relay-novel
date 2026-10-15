import { useEffect, useMemo } from "react";
import {
  AccessibilityInfo,
  Animated,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { ICON_LINE_PX } from "../../theme";
import { themedStyles, useColors } from "../../theme/themed";
import type { Point } from "../../design/fruitShapes";
import type { ScreenPoint } from "../../design/fruitFlight";
import {
  DOT_LINE,
  DOT_RADIUS,
  DOT_ROW_Y,
  FLYING_LEAVES,
  LEAF_APPEAR_MS,
  LEAF_FLIGHT_MS,
  SPROUT_GRID,
  SPROUT_PIVOT,
  sproutDots,
} from "../../design/refreshSprout";
import { SmallLeaf, SproutIcon } from "../BarIcons";
import { turnAround } from "../canopy/canopyMotion";
import { useSproutMotion } from "./sproutMotion";

// 보이는 새싹 그림 칸 크기. 아래 바 아이콘과 같은 크기라 씨앗주머니보다 눈에 덜 띈다.
const SPROUT_SIZE = 28;
// 누르는 칸. 안드로이드 최소 크기(48dp)에 맞추고, 새싹은 그 가운데에 그린다.
export const REFRESH_TOUCH_SIZE = 48;
const ICON_INSET = (REFRESH_TOUCH_SIZE - SPROUT_SIZE) / 2;
// 24칸 아이콘 단위 하나가 화면에서 차지하는 px
const UNIT = SPROUT_SIZE / SPROUT_GRID;
const DOT_SIZE = (DOT_RADIUS * 2 + DOT_LINE) * UNIT;
const SMALL_LEAF_SIZE = 8;
// 새싹이 도는 축(줄기 밑동)이 그림 칸 가운데에서 떨어진 거리(px)
const PIVOT_OFFSET: Point = {
  x: SPROUT_PIVOT.x * UNIT - SPROUT_SIZE / 2,
  y: SPROUT_PIVOT.y * UNIT - SPROUT_SIZE / 2,
};

function labelOf(left: number | undefined) {
  if (left === undefined) return "새 열매 받기";
  if (left > 0) return `새 열매 받기, 오늘 ${left}번 남았어요`;
  return "새 열매 받기, 오늘은 다 썼어요";
}

// 홈 오른쪽 위, 나무 위에 뜨는 새로고침 버튼(자리는 사용자 결정, 모양은 시안 D). 유리 없이 검은 새싹만 두고,
// 그 아래 점으로 오늘 남은 무료 새로고침(서버가 정함)을 보여 준다. 누르면 열매 밭을 새 묶음으로 바꾼다.
// 알릴 말(notice)이 있으면 버튼 아래에 말풍선으로 띄우고 화면 읽기 프로그램에도 알린다.
export function RefreshButton({
  center,
  left,
  total,
  busy,
  notice,
  onPress,
}: {
  // 버튼 가운데 자리(버튼을 그리는 부모 뷰 기준)
  center: ScreenPoint;
  // 오늘 남은 무료 새로고침과 하루 무료 횟수. 아직 모르면 비어 있고 점을 그리지 않는다.
  left: number | undefined;
  total: number | undefined;
  // 새 묶음을 받는 중이거나 나무 연출이 끝나지 않았으면 누를 수 없다.
  busy: boolean;
  notice: string | undefined;
  onPress: () => void;
}) {
  const styles = useStyles();
  const usedUp = left === 0;
  const motion = useSproutMotion({ left, dimmed: busy || usedUp });
  // 안드로이드는 말풍선의 accessibilityLiveRegion이, 웹은 alert 역할이 알아서 읽어 준다.
  useEffect(() => {
    if (notice && Platform.OS === "ios")
      AccessibilityInfo.announceForAccessibility(notice);
  }, [notice]);

  // 다 쓴 뒤에도 누를 수 있다. 자정이 지나 다시 찼을 수 있고 판정은 서버가 하므로, 서버에 묻고 안내를 말풍선으로 보여 준다.
  const press = () => {
    motion.play(usedUp);
    onPress();
  };

  return (
    <View
      style={[
        styles.anchor,
        {
          left: center.x - REFRESH_TOUCH_SIZE / 2,
          top: center.y - REFRESH_TOUCH_SIZE / 2,
        },
      ]}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={labelOf(left)}
        accessibilityState={{ disabled: busy, busy }}
        disabled={busy}
        onPressIn={motion.pressIn}
        onPressOut={motion.pressOut}
        onPress={press}
        // 동작 줄이기면 꾹 들어가는 대신 누르는 동안 흐려져 눌린 것을 알린다.
        style={({ pressed }) => [
          styles.press,
          motion.reduced && pressed && styles.pressedStill,
        ]}
      >
        <Animated.View
          style={[
            styles.sprout,
            { opacity: motion.dim, transform: [{ scale: motion.squash }] },
          ]}
        >
          <Animated.View
            style={[
              StyleSheet.absoluteFill,
              { transform: turnAround(PIVOT_OFFSET, motion.sproutAngle) },
            ]}
          >
            <SproutIcon
              size={SPROUT_SIZE}
              strokeWidth={(ICON_LINE_PX * SPROUT_GRID) / SPROUT_SIZE}
            />
          </Animated.View>
          <FlyingLeaves clock={motion.leafClock} />
          <RemainingDots
            left={left}
            total={total}
            opacity={motion.dotsOpacity}
            pop={motion.dotPop}
          />
        </Animated.View>
      </Pressable>
      {!!notice && (
        <View style={styles.notice} accessibilityLiveRegion="polite">
          <Text accessibilityRole="alert" style={styles.noticeText}>
            {notice}
          </Text>
        </View>
      )}
    </View>
  );
}

// 휘청일 때 잎 끝에서 하나씩 흩날리는 작은 초록 잎. 처음에 빠르게 날아가다 느려지며 사라진다.
function FlyingLeaves({ clock }: { clock: Animated.Value }) {
  const styles = useStyles();
  const colors = useColors();
  const leaves = useMemo(
    () =>
      FLYING_LEAVES.map((leaf) => {
        const start = leaf.delayMs;
        const end = start + LEAF_FLIGHT_MS;
        const middle = start + LEAF_FLIGHT_MS / 3;
        const travel = (distance: number) =>
          clock.interpolate({
            inputRange: [start, middle, end],
            outputRange: [0, distance * 0.6, distance],
            extrapolate: "clamp",
          });
        return {
          left: leaf.from.x * UNIT - SMALL_LEAF_SIZE / 2,
          top: leaf.from.y * UNIT - SMALL_LEAF_SIZE / 2,
          opacity: clock.interpolate({
            inputRange: [start, start + LEAF_APPEAR_MS, end],
            outputRange: [0, 1, 0],
            extrapolate: "clamp",
          }),
          transform: [
            { translateX: travel(leaf.move.x * UNIT) },
            { translateY: travel(leaf.move.y * UNIT) },
            {
              rotate: clock.interpolate({
                inputRange: [start, end],
                outputRange: ["0deg", `${leaf.turn}deg`],
                extrapolate: "clamp",
              }),
            },
          ],
        };
      }),
    [clock],
  );
  return leaves.map((style, index) => (
    <Animated.View key={index} style={[styles.smallLeaf, style]}>
      <SmallLeaf size={SMALL_LEAF_SIZE} color={colors.leaf} />
    </Animated.View>
  ));
}

// 오늘 남은 무료 새로고침을 새싹 아래 점으로 보여 준다(●● → ●○ → ○○).
// 횟수는 버튼 이름에 이미 있으므로 화면 읽기 프로그램에는 숨긴다.
function RemainingDots({
  left,
  total,
  opacity,
  pop,
}: {
  left: number | undefined;
  total: number | undefined;
  opacity: Animated.Value;
  pop: Animated.Value;
}) {
  const styles = useStyles();
  const dots = sproutDots(left, total);
  // 막 비워진 점은 첫 빈 점이다. pop은 점이 비워질 때만 움직이고 평소에는 1이다.
  const justEmptied = dots.findIndex((dot) => !dot.filled);
  return (
    <Animated.View
      style={[StyleSheet.absoluteFill, styles.dots, { opacity }]}
      aria-hidden
    >
      {dots.map((dot, index) => (
        <Animated.View
          key={index}
          style={[
            styles.dot,
            {
              left: dot.x * UNIT - DOT_SIZE / 2,
              top: DOT_ROW_Y * UNIT - DOT_SIZE / 2,
            },
            dot.filled && styles.filledDot,
            index === justEmptied && { transform: [{ scale: pop }] },
          ]}
        />
      ))}
    </Animated.View>
  );
}

const useStyles = themedStyles((colors) => ({
  anchor: {
    position: "absolute",
    width: REFRESH_TOUCH_SIZE,
    height: REFRESH_TOUCH_SIZE,
  },
  press: {
    width: REFRESH_TOUCH_SIZE,
    height: REFRESH_TOUCH_SIZE,
    alignItems: "center",
    justifyContent: "center",
  },
  pressedStill: { opacity: 0.45 },
  sprout: { width: SPROUT_SIZE, height: SPROUT_SIZE },
  smallLeaf: {
    position: "absolute",
    width: SMALL_LEAF_SIZE,
    height: SMALL_LEAF_SIZE,
  },
  dots: { pointerEvents: "none" },
  dot: {
    position: "absolute",
    width: DOT_SIZE,
    height: DOT_SIZE,
    borderRadius: DOT_SIZE / 2,
    borderWidth: DOT_LINE * UNIT,
    borderColor: colors.iconInk,
  },
  filledDot: { backgroundColor: colors.iconInk },
  // 버튼 아래, 오른쪽 끝을 새싹 그림 칸에 맞춘 말풍선
  notice: {
    position: "absolute",
    pointerEvents: "none",
    top: REFRESH_TOUCH_SIZE + 4,
    right: ICON_INSET,
    width: 220,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 14,
    backgroundColor: colors.paper,
    boxShadow: `0 6px 18px ${colors.cardShadow}`,
  },
  noticeText: { fontSize: 13, lineHeight: 19, color: colors.ink },
}));
