import { useState } from "react";
import {
  Animated,
  Platform,
  Pressable,
  View,
  type LayoutChangeEvent,
  type TextStyle,
} from "react-native";
import { Text, TextInput } from "../text";
import { Search } from "lucide-react-native";
import { themedStyles, useColors } from "../../theme/themed";

// 닫힌 검색칸은 열매 서가 위 돋보기 버튼(48칸, FruitsTop)과 같은 자리·크기다.
// 아이콘 오른쪽 끝을 목록 글자의 오른쪽 여백에 맞추려고 바깥으로 12 내민다.
const CLOSED_WIDTH = 48;
const CLOSED_RIGHT = -12;
// 펼친 검색칸 오른쪽에 "취소"가 들어설 자리
const OPEN_RIGHT = 52;
// 펼친 칸 안에서 돋보기가 차지하는 너비(글자는 그 뒤에서 시작한다)
const OPEN_GLASS_WIDTH = 40;
// 펼친 칸 안의 돋보기는 24에서 18 크기로 줄어든다.
const OPEN_GLASS_SCALE = 18 / 24;
// 조금 둥근 칸(사용자 요청 "검색창을 조금 둥글게", 시안 reference/sian/search-veil)
const FIELD_RADIUS = 14;
// 웹 브라우저는 누른 입력칸에 포커스 테두리를 그린다. 크롬은 outline-style이 auto면 굵기 0을 무시하므로
// 테두리 모양을 none으로 바꾼다. React Native 스타일 타입에는 none이 없어 웹에서만 넣는다.
const WEB_NO_FOCUS_RING = (
  Platform.OS === "web" ? { outlineStyle: "none" } : {}
) as TextStyle;

// 검색 유리막 맨 위의 검색칸. openness(0 = 닫힌 돋보기, 1 = 펼친 칸)는 유리막이 움직이고,
// 칸은 돋보기 자리에서 왼쪽으로 늘어나며 아래 바의 '지금 있는 곳' 방울처럼 밝게 떠오른다.
export function SearchField({
  openness,
  query,
  onQueryChange,
  onSubmit,
  onCancel,
}: {
  openness: Animated.Value;
  query: string;
  onQueryChange: (query: string) => void;
  // 키보드의 찾기를 눌렀을 때(찾은 말을 최근 찾은 말에 남긴다).
  onSubmit: () => void;
  onCancel: () => void;
}) {
  const styles = useStyles();
  const colors = useColors();
  const [rowWidth, setRowWidth] = useState(0);

  // 너비를 재기 전에는 닫힌 너비로 둔다.
  const openWidth = Math.max(CLOSED_WIDTH, rowWidth - OPEN_RIGHT);
  const barStyle = {
    width: openness.interpolate({
      inputRange: [0, 1],
      outputRange: [CLOSED_WIDTH, openWidth],
    }),
    right: openness.interpolate({
      inputRange: [0, 1],
      outputRange: [CLOSED_RIGHT, OPEN_RIGHT],
    }),
  };
  const glassBoxStyle = {
    width: openness.interpolate({
      inputRange: [0, 1],
      outputRange: [CLOSED_WIDTH, OPEN_GLASS_WIDTH],
    }),
  };
  const glassStyle = {
    transform: [
      {
        scale: openness.interpolate({
          inputRange: [0, 1],
          outputRange: [1, OPEN_GLASS_SCALE],
        }),
      },
    ],
  };
  // 칸이 반쯤 늘어난 뒤에야 글자가 보이고, "취소"는 오른쪽에서 들어온다.
  const fadeInLate = openness.interpolate({
    inputRange: [0, 0.4, 1],
    outputRange: [0, 0, 1],
  });
  const cancelStyle = {
    opacity: openness,
    transform: [
      {
        translateX: openness.interpolate({
          inputRange: [0, 1],
          outputRange: [14, 0],
        }),
      },
    ],
  };

  return (
    <View
      style={styles.row}
      onLayout={(event: LayoutChangeEvent) =>
        setRowWidth(event.nativeEvent.layout.width)
      }
    >
      <Animated.View style={[styles.bar, barStyle]}>
        <Animated.View
          style={[styles.fieldBackground, { opacity: openness }]}
        />
        <Animated.View style={[styles.glassBox, glassBoxStyle]}>
          <Animated.View style={glassStyle}>
            <Search size={24} strokeWidth={2.2} color={colors.muted} />
          </Animated.View>
        </Animated.View>
        <Animated.View style={[styles.inputBox, { opacity: fadeInLate }]}>
          <TextInput
            value={query}
            onChangeText={onQueryChange}
            onSubmitEditing={onSubmit}
            placeholder="제목이나 작가로 찾기"
            placeholderTextColor={colors.muted}
            accessibilityLabel="열매 찾기"
            autoFocus
            autoCorrect={false}
            // 서버도 검색어를 50자까지만 쓴다(SEARCH_QUERY_MAX).
            maxLength={50}
            returnKeyType="search"
            clearButtonMode="while-editing"
            style={[styles.input, WEB_NO_FOCUS_RING]}
          />
        </Animated.View>
      </Animated.View>

      <Animated.View style={[styles.cancel, cancelStyle]}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="찾기 닫기"
          onPress={onCancel}
          style={styles.cancelButton}
        >
          <Text style={styles.cancelText}>취소</Text>
        </Pressable>
      </Animated.View>
    </View>
  );
}

const useStyles = themedStyles((colors) => ({
  row: { height: 48 },
  bar: {
    position: "absolute",
    top: 0,
    height: 48,
    flexDirection: "row",
    alignItems: "center",
  },
  // 유리막 위에서 밝게 떠오르는 칸(아래 바의 '지금 있는 곳' 방울과 같은 값). 위아래 2씩 줄여 44 높이로 보인다.
  fieldBackground: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 2,
    bottom: 2,
    borderRadius: FIELD_RADIUS,
    backgroundColor: colors.lensFill,
    borderWidth: 1,
    borderColor: colors.lensEdge,
    boxShadow: colors.lensShadow,
  },
  glassBox: { height: 48, alignItems: "center", justifyContent: "center" },
  inputBox: { flex: 1 },
  // 칸 바탕이 이미 자리를 보여 주므로 포커스 테두리는 두지 않는다(WEB_NO_FOCUS_RING).
  input: {
    height: 48,
    fontSize: 16,
    color: colors.ink,
    paddingVertical: 0,
    paddingRight: 10,
    outlineWidth: 0,
  },
  cancel: { position: "absolute", top: 0, right: -8 },
  cancelButton: {
    height: 48,
    minWidth: 48,
    alignItems: "center",
    justifyContent: "center",
  },
  cancelText: { fontSize: 16, color: colors.ink },
}));
