import { useState } from "react";
import { Image, View } from "react-native";
import type { NovelSummary } from "../api/types";
import { mix, storyColorOf } from "../theme";
import { themedStyles, useColors } from "../theme/themed";
import { StoryTree } from "./StoryTree";

// 작품 표지(3:4). 표지가 없거나 불러오지 못하면 같은 자리에 그 소설의 이야기 나무를 작게 그린다.
// 나무 칸은 흰 종이 대신 그 작품 색(홈 열매와 같은 색)을 옅게 섞은 종이라, 표지 없는 작품끼리도 구별된다
// (시안 reference/sian/fruits-polish). 종이가 바탕과 달라 테두리는 두지 않는다.
export function CoverThumb({
  novel,
  width,
  square = false,
  radius,
  onError,
}: {
  novel: NovelSummary;
  width: number;
  // 모서리를 둥글리지 않는다(책장·내 차례 줄).
  square?: boolean;
  // 모서리 둥글기를 따로 정한다(열매 탭 서가는 아주 조금만). square보다 앞선다.
  radius?: number;
  onError?: () => void;
}) {
  const styles = useStyles();
  const colors = useColors();
  const [failed, setFailed] = useState(false);
  const size = { width, height: Math.round((width * 4) / 3) };
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
  const storyColor = storyColorOf(novel.id);
  const paper = mix(colors.paper, storyColor, colors.coverTint);
  const ground = mix(colors.paper, storyColor, colors.coverGroundTint);
  return (
    <View
      style={[
        styles.cover,
        styles.treeBox,
        size,
        corner,
        { backgroundColor: paper },
      ]}
    >
      <StoryTree novel={novel} height={size.height - 12} groundColor={ground} />
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
  treeBox: { justifyContent: "center", overflow: "hidden" },
}));
