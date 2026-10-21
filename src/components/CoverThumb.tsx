import { useState } from "react";
import { Image, View } from "react-native";
import type { NovelSummary } from "../api/types";
import { themedStyles } from "../theme/themed";
import { StoryTree } from "./StoryTree";

// 작품 표지(3:4). 표지가 없거나 불러오지 못하면 같은 자리에 그 소설의 이야기 나무를 작게 그린다.
export function CoverThumb({
  novel,
  width,
  square = false,
  onError,
}: {
  novel: NovelSummary;
  width: number;
  // 모서리를 둥글리지 않는다(열매 탭 목록).
  square?: boolean;
  onError?: () => void;
}) {
  const styles = useStyles();
  const [failed, setFailed] = useState(false);
  const size = { width, height: Math.round((width * 4) / 3) };
  const corner = square ? styles.square : undefined;
  if (novel.coverUrl && !failed)
    return (
      <Image
        source={{ uri: novel.coverUrl }}
        style={[styles.cover, size, corner]}
        accessibilityLabel={`${novel.title} 표지`}
        accessibilityIgnoresInvertColors
        onError={() => {
          setFailed(true);
          onError?.();
        }}
      />
    );
  return (
    <View style={[styles.cover, styles.treeBox, size, corner]}>
      <StoryTree novel={novel} height={size.height - 12} />
    </View>
  );
}

const useStyles = themedStyles((colors) => ({
  cover: { borderRadius: 8, backgroundColor: colors.line },
  square: { borderRadius: 0 },
  treeBox: {
    backgroundColor: colors.paper,
    borderWidth: 1,
    borderColor: colors.line,
    justifyContent: "center",
    overflow: "hidden",
  },
}));
