import { useEffect, useState } from "react";
import {
  AccessibilityInfo,
  Animated,
  Platform,
  Pressable,
  View,
} from "react-native";
import { router, useIsFocused } from "expo-router";
import { keepWords, Text } from "../text";
import type { NovelSummary } from "../../api/types";
import { likeHintOf, progressLine } from "../../design/fruitList";
import { nextFeatured } from "../../design/fruitSections";
import { statusLabel } from "../../theme";
import { themedStyles } from "../../theme/themed";
import { CoverThumb } from "../CoverThumb";
import { useReducedMotion } from "../fruitMotion";
import { LikeMark } from "./LikeMark";
import { useCrossFade } from "./useCrossFade";

// 큰 추천이 다음 작품으로 넘어가는 간격(사용자 결정 6초)
const FEATURE_ROTATE_MS = 6000;
// 사용자가 고른 C(촘촘하게 · 서가 먼저)에서 첫 화면에 서가 첫 줄이 보이도록 줄이되, 표지는 "조금 더 크게" 96으로
// (2026-10-30 사용자 결정, 시안 reference/sian/fruits-polish C′).
const COVER_WIDTH = 96;
const COVER_HEIGHT = (COVER_WIDTH * 4) / 3;
const COVER_RADIUS = 4;

// 나를 위한 이야기의 큰 추천 칸(시안 reference/sian/fruits-glass-b2 → fruits-polish C). 앞의 작품들이 6초마다 서서히 넘어가고,
// 아래 점이 지금 몇 번째인지 보인다. 누르면 그때 보이는 작품으로 간다. 손가락을 대고 있는 동안(웹은 마우스를 올려 두거나
// 키보드 초점이 있는 동안도), 열매 탭이 가려져 있을 때, 동작 줄이기나 화면 읽기를 켰을 때는 넘어가지 않는다
// (화면 읽기는 "다음·이전 추천 이야기" 동작으로 넘기고, 넘기면 새 제목을 읽어 준다).
export function FeatureCard({
  stories,
  shown,
  onShow,
  paused = false,
}: {
  stories: NovelSummary[];
  shown: number;
  onShow: (index: number) => void;
  paused?: boolean;
}) {
  const styles = useStyles();
  const reduced = useReducedMotion();
  const screenReader = useScreenReader();
  // 다른 탭이나 작품 화면으로 가 있는 동안에는 넘기지 않는다.
  const focused = useIsFocused();
  const [held, setHeld] = useState({
    press: false,
    hover: false,
    focus: false,
  });
  const hold = (kind: keyof typeof held, on: boolean) =>
    setHeld((now) => ({ ...now, [kind]: on }));
  const holding = held.press || held.hover || held.focus;
  // 부르는 쪽이 작품 수보다 큰 차례를 주어도 첫 작품을 보인다.
  const current = shown < stories.length ? shown : 0;
  const fades = useCrossFade(
    stories.map((story) => story.id).join(","),
    stories.length,
    current,
  );
  const rotates =
    stories.length > 1 &&
    focused &&
    !paused &&
    !holding &&
    !reduced &&
    !screenReader;
  useEffect(() => {
    if (!rotates) return;
    const timer = setTimeout(
      () => onShow(nextFeatured(current, stories.length)),
      FEATURE_ROTATE_MS,
    );
    return () => clearTimeout(timer);
  }, [rotates, current, stories.length, onShow]);

  const story = stories[current];
  const step = (by: number) => {
    const next = (current + by + stories.length) % stories.length;
    onShow(next);
    AccessibilityInfo.announceForAccessibility(stories[next].title);
  };
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${story.title}, ${statusLabel[story.status]}`}
      accessibilityHint={`${story.description}, ${progressLine(story)}, ${likeHintOf(story.likeCount)}`}
      accessibilityActions={
        stories.length > 1
          ? [
              { name: "next", label: "다음 추천 이야기" },
              { name: "previous", label: "이전 추천 이야기" },
            ]
          : undefined
      }
      onAccessibilityAction={(event) => {
        if (event.nativeEvent.actionName === "next") step(1);
        if (event.nativeEvent.actionName === "previous") step(-1);
      }}
      onPress={() => router.push(`/novel/${story.id}`)}
      onPressIn={() => hold("press", true)}
      onPressOut={() => hold("press", false)}
      onHoverIn={() => hold("hover", true)}
      onHoverOut={() => hold("hover", false)}
      onFocus={() => hold("focus", true)}
      onBlur={() => hold("focus", false)}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
    >
      <View style={styles.slides}>
        {stories.map((each, index) => {
          const hidden = index !== current;
          return (
            <Animated.View
              key={each.id}
              aria-hidden={hidden}
              importantForAccessibility={
                hidden ? "no-hide-descendants" : "auto"
              }
              style={[styles.slide, { opacity: fades[index] }]}
            >
              <View>
                <CoverThumb
                  novel={each}
                  width={COVER_WIDTH}
                  radius={COVER_RADIUS}
                />
                <LikeMark count={each.likeCount} coverRadius={COVER_RADIUS} />
              </View>
              <View style={styles.text}>
                <Text
                  style={[styles.title, keepWords.style]}
                  lineBreakStrategyIOS={keepWords.lineBreakStrategyIOS}
                  numberOfLines={2}
                >
                  {each.title}
                </Text>
                <Text
                  style={[styles.description, keepWords.style]}
                  lineBreakStrategyIOS={keepWords.lineBreakStrategyIOS}
                  numberOfLines={2}
                >
                  {each.description}
                </Text>
                <Text
                  style={[
                    styles.progress,
                    each.status === "COMPLETED" && styles.finished,
                  ]}
                  numberOfLines={1}
                >
                  {progressLine(each)}
                </Text>
              </View>
            </Animated.View>
          );
        })}
      </View>
      {stories.length > 1 && (
        <View style={styles.dots}>
          {stories.map((each, index) => (
            <View
              key={each.id}
              style={[styles.dot, index === current && styles.shownDot]}
            />
          ))}
        </View>
      )}
    </Pressable>
  );
}

// 추천을 불러오는 동안 큰 추천 칸 자리에 두는 빈 칸. 크기는 진짜 칸과 같고(표지 + 점 셋 자리),
// 표지·제목·소개 자리만 아주 옅게 둔다. 화면 읽기에서는 숨긴다.
export function FeatureCardPlaceholder() {
  const styles = useStyles();
  return (
    <View
      style={styles.card}
      aria-hidden
      importantForAccessibility="no-hide-descendants"
    >
      <View style={[styles.slides, styles.placeholderRow]}>
        <View style={[styles.block, styles.coverBlock]} />
        <View style={styles.text}>
          <View style={[styles.block, styles.titleBlock]} />
          <View style={[styles.block, styles.lineBlock]} />
          <View style={[styles.block, styles.shortLineBlock]} />
        </View>
      </View>
      <View style={styles.dotsSpace} />
    </View>
  );
}

// 화면 읽기가 켜져 있으면 저절로 넘기지 않는다(읽는 도중 바뀌지 않게).
// 웹은 화면 읽기를 알 수 없어 늘 켜져 있다고 답하므로 묻지 않는다.
function useScreenReader() {
  const [enabled, setEnabled] = useState(false);
  useEffect(() => {
    if (Platform.OS === "web") return;
    let active = true;
    void AccessibilityInfo.isScreenReaderEnabled().then((value) => {
      if (active) setEnabled(value);
    });
    const subscription = AccessibilityInfo.addEventListener(
      "screenReaderChanged",
      setEnabled,
    );
    return () => {
      active = false;
      subscription.remove();
    };
  }, []);
  return enabled;
}

const useStyles = themedStyles((colors) => ({
  // 사용자 요청 "흰색으로 하되 너무 하얗지 않게" — 순백 대신 한 톤 가라앉은 흰색(featureCard).
  // 상자 안에 상자가 겹쳐 보이지 않게 테두리·그림자 없이 바탕만 다르다.
  card: {
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingTop: 14,
    paddingBottom: 12,
    backgroundColor: colors.featureCard,
  },
  pressed: { opacity: 0.85 },
  slides: { height: COVER_HEIGHT },
  slide: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 14,
  },
  text: { flex: 1, minWidth: 0 },
  title: {
    fontSize: 19,
    lineHeight: 24,
    fontWeight: "800",
    letterSpacing: -0.6,
    color: colors.ink,
  },
  description: {
    marginTop: 6,
    fontSize: 13,
    lineHeight: 19,
    color: colors.muted,
  },
  progress: {
    marginTop: 8,
    fontSize: 12,
    lineHeight: 16,
    color: colors.progressInk,
  },
  // 다 끝난 작품은 자라는 초록 대신 차분한 회색(글자 "완결"도 함께 바뀐다)
  finished: { color: colors.progressDoneInk },
  dots: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 6,
    marginTop: 12,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.line,
  },
  // 지금 보이는 작품은 길고 진한 점(색만으로 구분하지 않음)
  shownDot: { width: 16, backgroundColor: colors.ink },
  // 불러오는 중의 빈 칸
  placeholderRow: { flexDirection: "row", alignItems: "flex-end", gap: 14 },
  block: {
    borderRadius: COVER_RADIUS,
    backgroundColor: colors.placeholderBlock,
  },
  coverBlock: { width: COVER_WIDTH, height: COVER_HEIGHT },
  titleBlock: { width: "70%", height: 20 },
  lineBlock: { width: "100%", height: 12, marginTop: 12 },
  shortLineBlock: { width: "86%", height: 12, marginTop: 8, marginBottom: 20 },
  // 점 셋(위 여백 12 + 높이 6)과 같은 자리
  dotsSpace: { marginTop: 12, height: 6 },
}));
