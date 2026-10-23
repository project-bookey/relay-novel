import { Pressable, View } from "react-native";
import { X } from "lucide-react-native";
import { Text } from "../text";
import { RECENT_WORDS_SHOWN } from "../../design/fruitList";
import { themedStyles, useColors } from "../../theme/themed";
import { SectionHead } from "./SectionHead";

// 최근 찾은 말 세 줄(시안 reference/sian/fruits-search B "두 단"). 말을 누르면 그 말로 다시 찾고, ×는 그 말만 지운다.
// 찾은 적이 없으면 묶음째 두지 않는다.
export function RecentSearches({
  words,
  onPick,
  onForget,
  onClear,
}: {
  words: string[];
  onPick: (word: string) => void;
  onForget: (word: string) => void;
  onClear: () => void;
}) {
  const styles = useStyles();
  const colors = useColors();
  if (words.length === 0) return null;
  return (
    <View style={styles.block}>
      <SectionHead
        title="최근 찾은 말"
        action={{ label: "모두 지우기", onPress: onClear }}
      />
      {words.slice(0, RECENT_WORDS_SHOWN).map((word) => (
        <View key={word} style={styles.row}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`${word} 다시 찾기`}
            onPress={() => onPick(word)}
            style={({ pressed }) => [styles.word, pressed && styles.pressed]}
          >
            <Text style={styles.wordText} numberOfLines={1}>
              {word}
            </Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`${word} 지우기`}
            onPress={() => onForget(word)}
            style={styles.forget}
          >
            <X size={16} strokeWidth={2.4} color={colors.muted} />
          </Pressable>
        </View>
      ))}
    </View>
  );
}

const useStyles = themedStyles((colors) => ({
  block: { marginTop: 18 },
  row: { flexDirection: "row", alignItems: "center", minHeight: 44 },
  word: { flex: 1, minHeight: 44, justifyContent: "center" },
  wordText: { fontSize: 15, color: colors.ink },
  pressed: { opacity: 0.6 },
  // 그림은 16이지만 누르는 칸은 44로, 오른쪽 끝을 글줄 끝에 맞춘다.
  forget: {
    width: 44,
    height: 44,
    marginRight: -14,
    alignItems: "center",
    justifyContent: "center",
  },
}));
