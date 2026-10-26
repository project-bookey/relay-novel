import { useMemo, useRef } from "react";
import { Animated, StyleSheet } from "react-native";
import type { NovelSummary } from "../../api/types";
import { splitForMe } from "../../design/fruitSections";
import { StoryBackdrop } from "../StoryBackdrop";
import { useCrossFade } from "./useCrossFade";

// 열매 탭 맨 위를 물들이는 빛(시안 reference/sian/fruits-glass-b2). 큰 추천 카드에 보이는 작품 색을 가장 크게 깔고
// 나머지 추천 작품 색을 둘레에 둔다. 카드가 다음 작품으로 넘어가면 빛도 같은 빠르기로 함께 바뀐다.
// 상태 표시줄 뒤까지 닿도록 목록 밖 화면 맨 위에 깔고, 내리는 만큼 위로 올려 목록과 함께 움직여 보이게 한다.
export function FruitsBackdrop({
  stories,
  shown,
  height,
  scrollY,
}: {
  stories: NovelSummary[];
  shown: number;
  height: number;
  scrollY: Animated.Value;
}) {
  const { featured } = splitForMe(stories);
  const fades = useCrossFade(
    featured.map((story) => story.id).join(","),
    featured.length,
    shown,
  );
  // 빛 한 장이 화면 폭만 한 그림이라(안드로이드는 그만큼 그림 메모리를 잡는다) 바로 앞 장과 지금 장만 둔다.
  // 앞 장은 그대로 두고 지금 장을 그 위에서 서서히 덮어, 바뀌는 동안 빛이 옅어지지 않게 한다.
  const previous = usePrevious(shown);
  const lift = useMemo(() => Animated.multiply(scrollY, -1), [scrollY]);
  const current = featured[shown];
  if (!current) return null;
  const before = previous === undefined ? undefined : featured[previous];
  const glowsOf = (story: NovelSummary) => [
    // 가장 큰 두 빛을 그 작품 색으로 칠한다.
    story,
    story,
    ...stories.filter((other) => other.id !== story.id),
  ];
  return (
    <Animated.View
      pointerEvents="none"
      style={[styles.layer, { height, transform: [{ translateY: lift }] }]}
    >
      {before && before.id !== current.id && (
        <Animated.View key={before.id} style={StyleSheet.absoluteFill}>
          <StoryBackdrop height={height} stories={glowsOf(before)} />
        </Animated.View>
      )}
      <Animated.View
        key={current.id}
        style={[StyleSheet.absoluteFill, { opacity: fades[shown] }]}
      >
        <StoryBackdrop height={height} stories={glowsOf(current)} />
      </Animated.View>
    </Animated.View>
  );
}

// 바로 앞 렌더의 값. 처음에는 없다.
function usePrevious<T>(value: T) {
  const holder = useRef<{ now: T; before?: T }>({ now: value });
  if (holder.current.now !== value)
    holder.current = { now: value, before: holder.current.now };
  return holder.current.before;
}

const styles = StyleSheet.create({
  layer: { position: "absolute", top: 0, left: 0, right: 0 },
});
