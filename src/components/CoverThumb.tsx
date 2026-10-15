import { useState } from "react";
import { Image, StyleSheet, View } from "react-native";
import type { NovelSummary } from "../api/types";
import { colors } from "../theme";
import { StoryTree } from "./StoryTree";

// 작품 표지(3:4). 표지가 없거나 불러오지 못하면 같은 자리에 그 소설의 이야기 나무를 작게 그린다.
export function CoverThumb({
  novel,
  width,
  onError,
}: {
  novel: NovelSummary;
  width: number;
  onError?: () => void;
}) {
  const [failed, setFailed] = useState(false);
  const size = { width, height: Math.round((width * 4) / 3) };
  if (novel.coverUrl && !failed)
    return (
      <Image
        source={{ uri: novel.coverUrl }}
        style={[styles.cover, size]}
        accessibilityLabel={`${novel.title} 표지`}
        accessibilityIgnoresInvertColors
        onError={() => {
          setFailed(true);
          onError?.();
        }}
      />
    );
  return (
    <View style={[styles.cover, styles.treeBox, size]}>
      <StoryTree novel={novel} height={size.height - 12} />
    </View>
  );
}

const styles = StyleSheet.create({
  cover: { borderRadius: 8, backgroundColor: colors.line },
  treeBox: {
    backgroundColor: colors.paper,
    borderWidth: 1,
    borderColor: colors.line,
    justifyContent: "center",
    overflow: "hidden",
  },
});
