import { useEffect, useMemo, useRef, type ComponentType } from "react";
import { Animated, Easing, Pressable, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router, type Href } from "expo-router";
import { useSession } from "../state/session";
import { ICON_LINE_PX } from "../theme";
import { themedStyles } from "../theme/themed";
import {
  FruitsIcon,
  HomeIcon,
  SeedPouch,
  UserIcon,
  type BarIconProps,
} from "./BarIcons";
import { GlassSurface } from "./Glass";
import { useReducedMotion } from "./fruitMotion";

export type Place = "home" | "my" | "fruits";

const ICON_SIZE = 28;
// 새 이야기를 심는 씨앗주머니는 눈에 잘 띄도록 다른 아이콘보다 크게 그린다.
const POUCH_SIZE = 34;
// 아이콘 그림은 24칸이라, 화면에서 ICON_LINE_PX 굵기로 보이도록 크기에 맞춰 환산한다.
const lineFor = (size: number) => (ICON_LINE_PX * 24) / size;
// 왼쪽 바에서 버튼 하나가 차지하는 너비
const SLOT = 56;
// 화면 가장자리와 아래쪽에서 바까지의 여백. 각 화면의 바깥 여백과 같다.
const PAGE_GAP = 24;

const places: {
  place: Place;
  label: string;
  Icon: ComponentType<BarIconProps>;
  href: Href;
}[] = [
  { place: "home", label: "홈", Icon: HomeIcon, href: "/" },
  { place: "fruits", label: "열매", Icon: FruitsIcon, href: "/fruits" },
  { place: "my", label: "마이", Icon: UserIcon, href: "/my" },
];

// 지금 있는 곳 아래에 깔리는 유리 방울. 다른 곳으로 옮기면 가는 쪽 가장자리가 먼저 뻗어 나가고
// 뒤쪽 가장자리가 늦게 따라와, 물방울처럼 늘어났다가 모이며 살짝 부풀었다 가라앉는다.
// 위치와 너비를 바꾸므로 네이티브 드라이버 없이 움직인다.
function useLiquidLens(index: number) {
  const reduced = useReducedMotion();
  const left = useRef(new Animated.Value(index * SLOT)).current;
  const right = useRef(new Animated.Value((index + 1) * SLOT)).current;
  const swell = useRef(new Animated.Value(0)).current;
  const shownIndex = useRef(index);

  useEffect(() => {
    const from = shownIndex.current;
    shownIndex.current = index;
    if (from === index) return;
    const toLeft = index * SLOT;
    const toRight = toLeft + SLOT;
    if (reduced) {
      left.setValue(toLeft);
      right.setValue(toRight);
      return;
    }
    const lead = { stiffness: 380, damping: 26, useNativeDriver: false };
    const trail = { stiffness: 160, damping: 20, useNativeDriver: false };
    const goingRight = index > from;
    const motion = Animated.parallel([
      Animated.spring(left, {
        toValue: toLeft,
        ...(goingRight ? trail : lead),
      }),
      Animated.spring(right, {
        toValue: toRight,
        ...(goingRight ? lead : trail),
      }),
      Animated.sequence([
        Animated.timing(swell, {
          toValue: 1,
          duration: 120,
          easing: Easing.out(Easing.quad),
          useNativeDriver: false,
        }),
        Animated.spring(swell, {
          toValue: 0,
          stiffness: 200,
          damping: 14,
          useNativeDriver: false,
        }),
      ]),
    ]);
    motion.start();
    // 움직이는 중에 또 옮기면 지금 자리에서 새 자리로 이어서 간다.
    return () => motion.stop();
  }, [index, reduced, left, right, swell]);

  return useMemo(
    () => ({
      left,
      width: Animated.subtract(right, left),
      transform: [
        {
          scale: swell.interpolate({
            inputRange: [0, 1],
            outputRange: [1, 1.12],
          }),
        },
      ],
    }),
    [left, right, swell],
  );
}

// 화면 아래에 떠 있는 유리 두 조각. 왼쪽 알약 모양 바에는 홈·열매·마이가,
// 오른쪽에 따로 떨어진 같은 높이의 동그란 유리에는 새 이야기를 심는 씨앗주머니가 있다.
// 아이콘만 보이고, 이름은 화면 읽기 프로그램과 테스트를 위해 accessibilityLabel로만 둔다.
// 탭 레이아웃이 화면 위에 겹쳐 띄우며, 화면을 옮겨 다녀도 바는 그대로 남는다.
export function BottomBar({ current }: { current: Place }) {
  const { mode } = useSession();
  const styles = useStyles();
  const insets = useSafeAreaInsets();
  const lens = useLiquidLens(
    places.findIndex(({ place }) => place === current),
  );
  // 둘러보기에서는 이야기를 만들 수 없으므로 로그인으로 보낸다.
  const plantSeed = () => router.push(mode === "demo" ? "/login" : "/create");

  return (
    <View style={[styles.dock, { paddingBottom: insets.bottom + PAGE_GAP }]}>
      <View style={styles.bar}>
        <GlassSurface style={styles.capsule}>
          <View style={styles.places}>
            <Animated.View style={[styles.lens, lens]} />
            {places.map(({ place, label, Icon, href }) => (
              <Pressable
                key={place}
                accessibilityRole="button"
                accessibilityLabel={label}
                accessibilityState={{ selected: current === place }}
                onPress={() => router.navigate(href)}
                hitSlop={4}
                style={({ pressed }) => [
                  styles.place,
                  pressed && styles.pressed,
                ]}
              >
                <Icon size={ICON_SIZE} strokeWidth={lineFor(ICON_SIZE)} />
              </Pressable>
            ))}
          </View>
        </GlassSurface>
        <GlassSurface style={styles.circle}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="새 이야기 심기"
            hitSlop={4}
            onPress={plantSeed}
            style={({ pressed }) => [styles.pouch, pressed && styles.pressed]}
          >
            <SeedPouch size={POUCH_SIZE} strokeWidth={lineFor(POUCH_SIZE)} />
          </Pressable>
        </GlassSurface>
      </View>
    </View>
  );
}

const useStyles = themedStyles((colors) => ({
  // 바 바깥 빈 곳은 뒤쪽 화면(열매 등)을 누를 수 있게 손가락을 통과시킨다.
  dock: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: "center",
    pointerEvents: "box-none",
  },
  bar: {
    width: "100%",
    maxWidth: 680,
    paddingHorizontal: PAGE_GAP,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    pointerEvents: "box-none",
  },
  // 두 유리는 높이(56)를 맞추고 양끝을 완전히 둥글게 해서 한 벌로 보이게 한다.
  capsule: {
    padding: 6,
    borderRadius: 28,
    borderCurve: "continuous",
  },
  circle: { width: 56, height: 56, borderRadius: 28 },
  places: { flexDirection: "row" },
  place: {
    width: SLOT,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  // 바보다 한 겹 밝게 떠 있는 유리 방울. 위쪽 테두리에 빛이 맺히고 아래로 옅은 그림자가 진다.
  lens: {
    position: "absolute",
    top: 0,
    height: 44,
    borderRadius: 22,
    borderCurve: "continuous",
    backgroundColor: colors.lensFill,
    borderWidth: 1,
    borderColor: colors.lensEdge,
    boxShadow: colors.lensShadow,
  },
  pouch: {
    width: 56,
    height: 56,
    alignItems: "center",
    justifyContent: "center",
  },
  pressed: { opacity: 0.6 },
}));
