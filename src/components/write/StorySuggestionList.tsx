import { Pressable, View } from "react-native";
import { ChevronRight } from "lucide-react-native";
import { Text } from "../text";
import type { StoryMode, StoryOption } from "../../api/types";
import { themedStyles, useColors } from "../../theme/themed";
import { PaneButton, usePaneStyles } from "./pane";

// 이야기 제안 팝업이 받은 제안. 전개 추천은 번호 붙은 세 갈래 중 하나를 골라 그 방향의 문단을 다시 받고,
// 이어쓰기·첫 문단은 문단을 읽어 본 뒤 원고 끝(첫 문단은 맨 앞)에 넣는다.
export function StorySuggestionList({
  mode,
  suggestions,
  stale,
  allowed,
  onPickPlot,
  onInsert,
}: {
  mode: StoryMode;
  suggestions: StoryOption[];
  // 요청한 뒤 원고나 소재가 바뀌어 더는 쓸 수 없는 제안인지
  stale: boolean;
  allowed: boolean;
  onPickPlot: (option: StoryOption) => void;
  onInsert: (text: string) => void;
}) {
  const pane = usePaneStyles();
  const styles = useStyles();
  const colors = useColors();
  const usable = allowed && !stale;
  return (
    <>
      <Text style={styles.head}>
        {mode === "PLOT"
          ? "어떤 방향으로 이어갈까요?"
          : "원고에 넣기 전에 읽어 보세요."}
      </Text>
      {stale && (
        <Text style={pane.warning}>
          요청한 뒤 원고나 소재가 바뀌었어요. 현재 내용으로 다시 제안받아
          주세요.
        </Text>
      )}
      {mode === "PLOT"
        ? suggestions.map((option, index) => (
            <Pressable
              key={index}
              accessibilityRole="button"
              accessibilityLabel={`${index + 1}번 전개로 이어쓰기`}
              accessibilityState={{ disabled: !usable }}
              disabled={!usable}
              onPress={() => onPickPlot(option)}
              style={({ pressed }) => [
                styles.plot,
                (pressed || !usable) && pane.pressed,
              ]}
            >
              <View style={styles.plotNumber}>
                <Text style={styles.plotNumberText}>{index + 1}</Text>
              </View>
              <View style={styles.plotText}>
                <Text style={styles.plotTitle}>{option.title}</Text>
                <Text style={styles.plotSummary}>{option.text}</Text>
              </View>
              <ChevronRight size={18} color={colors.muted} />
            </Pressable>
          ))
        : suggestions.map((option, index) => (
            <View key={index} style={styles.passage}>
              <Text style={pane.label}>{option.title}</Text>
              <Text selectable style={pane.suggestion}>
                {option.text}
              </Text>
              <View style={pane.stack}>
                <PaneButton
                  disabled={!usable}
                  onPress={() => onInsert(option.text)}
                >
                  {mode === "OPENING" ? "원고 맨 앞에 넣기" : "원고 끝에 넣기"}
                </PaneButton>
              </View>
            </View>
          ))}
    </>
  );
}

const useStyles = themedStyles((colors) => ({
  head: { fontSize: 13, color: colors.muted, marginTop: 18 },
  plot: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    minHeight: 64,
    paddingVertical: 10,
  },
  plotNumber: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "flex-start",
    marginTop: 1,
    backgroundColor: colors.searchField,
  },
  plotNumberText: { fontSize: 12.5, fontWeight: "800", color: colors.ink },
  plotText: { flex: 1, minWidth: 0 },
  plotTitle: {
    fontSize: 15.5,
    fontWeight: "800",
    letterSpacing: -0.3,
    color: colors.ink,
  },
  plotSummary: {
    fontSize: 13.5,
    lineHeight: 21,
    color: colors.muted,
    marginTop: 2,
  },
  passage: { marginTop: 4 },
}));
