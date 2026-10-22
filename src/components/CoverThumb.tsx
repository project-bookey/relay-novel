import { useState } from "react";
import { Image, View } from "react-native";
import type { NovelSummary } from "../api/types";
import { themedStyles } from "../theme/themed";
import { StoryTree } from "./StoryTree";

// 작품 표지(3:4, 눕히면 4:3). 표지가 없거나 불러오지 못하면 같은 자리에 그 소설의 이야기 나무를 작게 그린다.
export function CoverThumb({
  novel,
  width,
  square = false,
  radius,
  landscape = false,
  onError,
}: {
  novel: NovelSummary;
  width: number;
  // 모서리를 둥글리지 않는다(책장·내 차례 줄).
  square?: boolean;
  // 모서리 둥글기를 따로 정한다(열매 탭 목록은 아주 조금만). square보다 앞선다.
  radius?: number;
  // 가로로 긴 4:3으로 눕힌다(열매 탭 목록). 표지는 3:4로 올리므로 가운데만 보인다.
  landscape?: boolean;
  onError?: () => void;
}) {
  const styles = useStyles();
  const [failed, setFailed] = useState(false);
  const height = landscape ? (width * 3) / 4 : (width * 4) / 3;
  const size = { width, height: Math.round(height) };
  const corner = cornerOf(radius, square);
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

// 모서리: 따로 정한 둥글기가 있으면 그것, 각지게면 0, 아니면 기본(8).
function cornerOf(radius: number | undefined, square: boolean) {
  if (radius !== undefined) return { borderRadius: radius };
  if (square) return { borderRadius: 0 };
  return undefined;
}

const useStyles = themedStyles((colors) => ({
  cover: { borderRadius: 8, backgroundColor: colors.line },
  treeBox: {
    backgroundColor: colors.paper,
    borderWidth: 1,
    borderColor: colors.line,
    justifyContent: "center",
    overflow: "hidden",
  },
}));
