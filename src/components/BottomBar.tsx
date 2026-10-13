import type { ComponentType } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { router, type Href } from "expo-router";
import { useSession } from "../state/session";
import { ICON_LINE_PX } from "../theme";
import {
  FruitsIcon,
  HomeIcon,
  SeedPouch,
  UserIcon,
  type BarIconProps,
} from "./BarIcons";
import { GlassSurface } from "./Glass";

type Place = "home" | "my" | "fruits";

const ICON_SIZE = 28;
// 새 이야기를 심는 씨앗주머니는 눈에 잘 띄도록 다른 아이콘보다 크게 그린다.
const POUCH_SIZE = 34;
// 아이콘 그림은 24칸이라, 화면에서 ICON_LINE_PX 굵기로 보이도록 크기에 맞춰 환산한다.
const lineFor = (size: number) => (ICON_LINE_PX * 24) / size;

const places: {
  place: Place;
  label: string;
  Icon: ComponentType<BarIconProps>;
  href: Href;
}[] = [
  { place: "home", label: "홈", Icon: HomeIcon, href: "/" },
  { place: "my", label: "마이", Icon: UserIcon, href: "/my" },
  { place: "fruits", label: "열매", Icon: FruitsIcon, href: "/fruits" },
];

// 화면 아래에 떠 있는 유리 두 조각. 왼쪽 알약 모양 바에는 홈·마이·열매가,
// 오른쪽에 따로 떨어진 같은 높이의 동그란 유리에는 새 이야기를 심는 씨앗주머니가 있다.
// 아이콘만 보이고, 이름은 화면 읽기 프로그램과 테스트를 위해 accessibilityLabel로만 둔다.
// 부모 영역의 아래쪽 모서리에 붙도록, 여백 없는 부모 안에 둔다.
export function BottomBar({ current }: { current: Place }) {
  const { mode } = useSession();
  // 둘러보기에서는 이야기를 만들 수 없으므로 로그인으로 보낸다.
  const plantSeed = () => router.push(mode === "demo" ? "/login" : "/create");

  return (
    <View style={styles.bar}>
      <GlassSurface style={styles.capsule}>
        {places.map(({ place, label, Icon, href }) => {
          const active = current === place;
          return (
            <Pressable
              key={place}
              accessibilityRole="button"
              accessibilityLabel={label}
              accessibilityState={{ selected: active }}
              onPress={() => router.navigate(href)}
              hitSlop={4}
              style={({ pressed }) => [
                styles.place,
                // 지금 있는 곳은 옅은 회색 알약을 깔아 구분한다.
                active && styles.selected,
                pressed && styles.pressed,
              ]}
            >
              <Icon size={ICON_SIZE} strokeWidth={lineFor(ICON_SIZE)} />
            </Pressable>
          );
        })}
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
  );
}

const styles = StyleSheet.create({
  bar: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    // 두 유리 사이 빈 곳은 뒤쪽 열매를 누를 수 있게 손가락을 통과시킨다.
    pointerEvents: "box-none",
  },
  // 두 유리는 높이(56)를 맞추고 양끝을 완전히 둥글게 해서 한 벌로 보이게 한다.
  capsule: {
    flexDirection: "row",
    padding: 6,
    borderRadius: 28,
    borderCurve: "continuous",
  },
  circle: { width: 56, height: 56, borderRadius: 28 },
  place: {
    width: 56,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  selected: { backgroundColor: "rgba(0, 0, 0, 0.06)" },
  pouch: {
    width: 56,
    height: 56,
    alignItems: "center",
    justifyContent: "center",
  },
  pressed: { opacity: 0.6 },
});
