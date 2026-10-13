import { Pressable, StyleSheet, View } from "react-native";
import { router } from "expo-router";
import { House, UserRound } from "lucide-react-native";
import { useSession } from "../state/session";
import { colors, ICON_LINE_PX } from "../theme";
import { SeedPouch } from "./SeedPouch";

type Place = "home" | "my";

const ICON_SIZE = 30;
const POUCH_SIZE = 40;
// 아이콘 그림은 24칸이라, 화면에서 ICON_LINE_PX 굵기로 보이도록 크기에 맞춰 환산한다.
const ICON_LINE = (ICON_LINE_PX * 24) / ICON_SIZE;

function PlaceButton({
  label,
  Icon,
  active,
  onPress,
}: {
  label: string;
  Icon: typeof House;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected: active }}
      onPress={onPress}
      hitSlop={6}
      style={styles.place}
    >
      {/* 지금 있는 곳은 선을 조금 굵게 그려 구분한다. */}
      <Icon
        size={ICON_SIZE}
        color={colors.black}
        strokeWidth={active ? ICON_LINE * 1.4 : ICON_LINE}
      />
    </Pressable>
  );
}

// 화면 아래에 떠 있는 버튼들. 왼쪽은 홈·마이, 오른쪽은 새 이야기를 심는 씨앗주머니다.
// 홈·마이는 아이콘만 보이고, 이름은 화면 읽기 프로그램과 테스트를 위해 accessibilityLabel로만 둔다.
// 부모 영역의 아래쪽 모서리에 붙도록, 여백 없는 부모 안에 둔다.
export function BottomBar({ current }: { current: Place }) {
  const { mode } = useSession();
  // 둘러보기에서는 이야기를 만들 수 없으므로 로그인으로 보낸다.
  const plantSeed = () => router.push(mode === "demo" ? "/login" : "/create");

  return (
    <View style={styles.bar}>
      <View style={styles.places}>
        <PlaceButton
          label="홈"
          Icon={House}
          active={current === "home"}
          onPress={() => router.navigate("/")}
        />
        <PlaceButton
          label="마이"
          Icon={UserRound}
          active={current === "my"}
          onPress={() => router.navigate("/my")}
        />
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="새 이야기 심기"
        hitSlop={8}
        onPress={plantSeed}
        style={({ pressed }) => pressed && styles.pressed}
      >
        <SeedPouch size={POUCH_SIZE} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    position: "absolute",
    left: 16,
    right: 16,
    bottom: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    // 버튼 사이 빈 곳은 뒤쪽 열매를 누를 수 있게 손가락을 통과시킨다.
    pointerEvents: "box-none",
  },
  places: { flexDirection: "row", gap: 8 },
  place: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  pressed: { opacity: 0.7 },
});
