import { useState } from "react";
import { Modal, Pressable, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { ChevronRight } from "lucide-react-native";
import { novels } from "../../api/novels";
import { useAppearance } from "../../state/appearance";
import { useSession } from "../../state/session";
import { themedStyles, useColors } from "../../theme/themed";
import { AppearancePicker, appearanceLabel } from "./AppearancePicker";
import { useBranchBin } from "./BranchBin";

// 마이 아래쪽 설정 묶음. 자주 쓰지 않으므로 "이름 … 지금 값 ›" 줄 목록으로 차분하게 두고,
// 누르면 그 기능의 화면이나 아래에서 올라오는 창으로 간다. 햇살은 맨 위 숫자 줄(MyHeader)에 있다.
export function SettingRows() {
  return (
    <View>
      <BinRow />
      <AppearanceRow />
      <GenresRow />
    </View>
  );
}

function SettingRow({
  label,
  value,
  onPress,
}: {
  label: string;
  value: string;
  onPress: () => void;
}) {
  const styles = useStyles();
  const colors = useColors();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={value ? `${label}, ${value}` : label}
      onPress={onPress}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
    >
      <Text style={styles.label}>{label}</Text>
      <View style={styles.valueBox}>
        <Text style={styles.value} numberOfLines={1}>
          {value}
        </Text>
        <ChevronRight size={16} color={colors.muted} />
      </View>
    </Pressable>
  );
}

// 둘러보기에도 예시 가지가 있어 수거함 화면은 그대로 열린다(살리기·버리기만 로그인으로).
function BinRow() {
  const bin = useBranchBin();
  return (
    <SettingRow
      label="나뭇가지 수거함"
      // 수거함 화면(BranchBin)처럼 응답에 목록이 없어도 화면 전체가 멈추지 않게 한다.
      value={countText(bin.data?.branches?.length, !!bin.error)}
      onPress={() => router.push("/branch-bin")}
    />
  );
}

function AppearanceRow() {
  const styles = useStyles();
  const { preference } = useAppearance();
  const [choosing, setChoosing] = useState(false);
  const close = () => setChoosing(false);
  return (
    <>
      <SettingRow
        label="화면 모드"
        value={appearanceLabel(preference)}
        onPress={() => setChoosing(true)}
      />
      {choosing && (
        <Modal
          visible
          transparent
          animationType="slide"
          onRequestClose={close}
          statusBarTranslucent
        >
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="화면 모드 닫기"
            style={styles.scrim}
            onPress={close}
          />
          <SafeAreaView edges={["bottom"]} style={styles.sheet}>
            <AppearancePicker onPicked={close} />
          </SafeAreaView>
        </Modal>
      )}
    </>
  );
}

function GenresRow() {
  const { mode } = useSession();
  const isDemo = mode === "demo";
  const genres = useQuery({
    queryKey: ["my-genres", mode],
    queryFn: novels.myGenres,
    enabled: mode === "authenticated",
  });
  return (
    <SettingRow
      label="관심 장르"
      value={isDemo ? "" : genresText(genres.data, !!genres.error)}
      onPress={() => router.push(isDemo ? "/login" : "/genres")}
    />
  );
}

// 값을 아직 모르면 비우고, 불러오지 못했으면 그렇다고만 적는다(눌러 들어가면 그 화면이 다시 불러온다).
function countText(count: number | undefined, failed: boolean) {
  if (failed) return "불러오지 못했어요";
  if (count === undefined) return "";
  return `${count}개`;
}

function genresText(genres: string[] | undefined, failed: boolean) {
  if (failed) return "불러오지 못했어요";
  if (!genres) return "";
  if (genres.length === 0) return "고르지 않음";
  if (genres.length === 1) return genres[0];
  return `${genres[0]} 외 ${genres.length - 1}`;
}

const useStyles = themedStyles((colors) => ({
  row: {
    minHeight: 52,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  pressed: { opacity: 0.6 },
  label: { fontSize: 15, color: colors.ink },
  valueBox: {
    flexShrink: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  value: { flexShrink: 1, fontSize: 14, color: colors.muted },
  scrim: { flex: 1, backgroundColor: colors.scrim },
  // 마이·열매 탭은 둥근 모서리를 쓰지 않는다(사용자 결정).
  sheet: {
    backgroundColor: colors.background,
    paddingHorizontal: 24,
    paddingTop: 4,
    paddingBottom: 24,
  },
}));
