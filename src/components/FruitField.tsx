import { useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
  Pressable,
  StyleSheet,
  View,
  type LayoutChangeEvent,
} from "react-native";
import type { NovelSummary } from "../api/types";
import { colors, fruitShapeOf, lighten, storyColorOf } from "../theme";
import {
  FRUIT_BOTTOM,
  FRUIT_CENTER,
  FruitBody,
  FruitShadow,
  FruitStem,
  SHADOW_ORIGIN,
  SpeedLines,
} from "./FruitArt";
import { planFruitPath } from "../design/fruitPath";
import { SHADOW_BOX } from "../design/fruitShapes";
import {
  followPath,
  playAlongPath,
  rollsLikeBall,
  useReducedMotion,
} from "./fruitMotion";

// 그림 좌표계. 실제 크기는 화면 너비에 맞춰 늘리고 줄인다.
const VIEW_WIDTH = 340;
const VIEW_HEIGHT = 190;
const FRUIT_SIZE = 44;

// 가장 앞쪽 열매에 주는 중력 가속도(픽셀/초²)
const GRAVITY = 2400;
// 땅은 화면 위쪽 1/5을 비워 두고 나머지 4/5를 덮는다.
const GROUND_TOP_RATIO = 0.2;

interface RestSpot {
  x: number;
  y: number;
  depth: number;
}

// 흰 화면 전체가 땅이다. 열매가 멈추는 자리(땅에 닿는 점)이고,
// 원근을 살짝 살려 뒤쪽(위)일수록 작게 둔다. 가운데부터 채워서 열매가 적어도 한가운데에 모인다.
const restSpots: RestSpot[] = [
  { x: 170, y: 124, depth: 0.9 },
  { x: 92, y: 160, depth: 1 },
  { x: 252, y: 164, depth: 1 },
  { x: 124, y: 90, depth: 0.8 },
  { x: 226, y: 94, depth: 0.8 },
  { x: 300, y: 128, depth: 0.88 },
  { x: 40, y: 128, depth: 0.88 },
];
export const FRUIT_FIELD_LIMIT = restSpots.length;

function FallingFruit({
  story,
  spot,
  order,
  scale,
  fieldTop,
  reduced,
  onOpen,
}: {
  story: NovelSummary;
  spot: RestSpot;
  order: number;
  scale: number;
  fieldTop: number;
  reduced: boolean;
  onOpen: (story: NovelSummary) => void;
}) {
  const shape = fruitShapeOf(story.id);
  const isBall = rollsLikeBall(shape);
  // 열매 무리 바깥쪽으로 흩어지도록, 왼쪽 자리 열매는 왼쪽으로, 오른쪽 자리 열매는 오른쪽으로 튕겨 나간다.
  const direction = spot.x < VIEW_WIDTH / 2 ? -1 : 1;
  const size = FRUIT_SIZE * spot.depth * scale;
  const centerX = spot.x * scale;
  const groundY = fieldTop + spot.y * scale;
  const top = groundY - size * FRUIT_BOTTOM;
  // 화면 위쪽 허공에서 나타나 떨어진다. 화면이 낮아도 열매 두 개 높이만큼은 떨어진다.
  const fallHeight = Math.max(top + size * 0.6, size * 2);
  // 소설마다 다 굴러간 뒤 기울어지는 정도가 조금씩 다르다.
  const restTilt = 12 + ((story.id * 7) % 16);

  const path = useMemo(
    () =>
      planFruitPath({
        fallHeight,
        size,
        rollsLikeBall: isBall,
        direction,
        // 멀리 있는 열매는 화면에서 더 짧게 움직이므로 중력도 그만큼 작게 준다.
        gravity: GRAVITY * spot.depth * scale,
        restTilt,
      }),
    [fallHeight, size, isBall, direction, spot.depth, scale, restTilt],
  );

  // 진행률 0은 하늘에 있는 처음 자리라서, 첫 그리기부터 열매가 땅에 번쩍 보이지 않는다.
  const progress = useRef(new Animated.Value(0)).current;
  const landed = useRef(false);

  useEffect(() => {
    // 동작 줄이기 설정이거나 이미 내려앉았으면 다시 떨어지지 않고 제자리만 맞춘다.
    // 화면 크기가 바뀌거나 오류 안내가 떠도 열매가 처음부터 다시 떨어지지 않게 하려는 것이다.
    if (reduced || landed.current) {
      progress.setValue(1);
      return;
    }
    progress.setValue(0);
    const motion = playAlongPath(progress, path.durationMs, order);
    motion.start(({ finished }) => {
      if (finished) landed.current = true;
    });
    return () => motion.stop();
  }, [progress, reduced, path, order]);

  const motion = useMemo(
    () => followPath(progress, path, size),
    [path, progress, size],
  );

  // 멀리 있는 열매는 살짝 옅어 보이게 한다.
  const color = lighten(storyColorOf(story.id), (1 - spot.depth) * 0.6);

  return (
    <>
      <Animated.View
        style={[
          styles.layer,
          styles.passThrough,
          styles.shadow,
          {
            // 그림자는 열매와 같은 칸 좌표로 그려서 열매 바닥에 그대로 붙는다.
            left: centerX - size / 2 + (SHADOW_BOX.left / 40) * size,
            top: top + (SHADOW_BOX.top / 40) * size,
            opacity: motion.shadowOpacity,
            transform: [
              { translateX: motion.translateX },
              { scale: motion.shadowScale },
            ],
          },
        ]}
      >
        <FruitShadow shape={shape} size={size} />
      </Animated.View>
      <Animated.View
        style={[
          styles.layer,
          styles.fallingBody,
          {
            left: centerX - size / 2,
            top,
            opacity: motion.fruitOpacity,
            transform: [
              { translateX: motion.translateX },
              { translateY: motion.translateY },
              { scale: motion.nearness },
            ],
          },
        ]}
      >
        <Animated.View
          style={[
            styles.speedLines,
            styles.passThrough,
            { top: -size * 0.45, opacity: motion.speedLineOpacity },
          ]}
        >
          <SpeedLines size={size} />
        </Animated.View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${story.title} 열매`}
          hitSlop={6}
          onPress={() => onOpen(story)}
          style={{ width: size, height: size }}
        >
          {/* 구는 돌아도 겉모양이 같으므로 몸통은 그대로 두고 꼭지만 돌린다.
              그래야 굴러가는 동안에도 빛이 늘 왼쪽 위에서 비친다. */}
          {isBall && <FruitBody shape={shape} color={color} size={size} />}
          <Animated.View
            style={[
              styles.rollingBody,
              { transform: [{ rotate: motion.rotate }] },
            ]}
          >
            {!isBall && (
              <View style={styles.overlay}>
                <FruitBody shape={shape} color={color} size={size} />
              </View>
            )}
            <View style={styles.overlay}>
              <FruitStem shape={shape} size={size} />
            </View>
          </Animated.View>
        </Pressable>
      </Animated.View>
    </>
  );
}

// 홈 화면의 열매 밭. 오로지 열매와 땅만 있다.
// 소설 열매가 흰 땅 위로 톡토독 떨어져, 부딪힌 곳에서 옆으로 튕겨 나가 굴러가다 멈춘다. 누르면 그 소설로 간다.
export function FruitField({
  stories,
  onOpen,
}: {
  stories: NovelSummary[];
  onOpen: (story: NovelSummary) => void;
}) {
  const reduced = useReducedMotion();
  const [area, setArea] = useState({ width: 0, height: 0 });
  const scale = area.width / VIEW_WIDTH;
  // 열매 무리는 땅 한가운데에 내려앉는다.
  const groundTop = area.height * GROUND_TOP_RATIO;
  const groundHeight = area.height - groundTop;
  const fieldTop =
    groundTop + Math.max(0, (groundHeight - VIEW_HEIGHT * scale) / 2);
  const placed = stories
    .slice(0, FRUIT_FIELD_LIMIT)
    .map((story, order) => ({ story, order, spot: restSpots[order] }));
  // 뒤쪽 열매부터 그려야 겹칠 때 앞쪽 열매가 앞에 보인다.
  const backToFront = [...placed].sort(
    (first, second) => first.spot.y - second.spot.y,
  );

  return (
    <View
      style={styles.stage}
      onLayout={(event: LayoutChangeEvent) => {
        const { width, height } = event.nativeEvent.layout;
        setArea({ width, height });
      }}
    >
      <View style={[styles.ground, { top: groundTop }]} />
      {area.width > 0 &&
        backToFront.map(({ story, order, spot }) => (
          <FallingFruit
            key={story.id}
            story={story}
            spot={spot}
            order={order}
            scale={scale}
            fieldTop={fieldTop}
            reduced={reduced}
            onOpen={onOpen}
          />
        ))}
    </View>
  );
}

const styles = StyleSheet.create({
  // 홈 화면 전체가 땅이다. 위쪽 바깥에서 나타나는 열매는 화면 영역 안으로만 보이게 자른다.
  stage: { flex: 1, width: "100%", overflow: "hidden" },
  layer: { position: "absolute" },
  // 열매가 내려앉는 땅. 모서리를 살짝 둥글린 판이다.
  ground: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 28,
    backgroundColor: colors.fieldGround,
  },
  // 원근으로 커지거나 땅에 눌릴 때는 바닥을, 구를 때는 몸통 가운데를 축으로 한다.
  // 네이티브의 transformOrigin은 정수 퍼센트만 읽으므로 반올림해 둔다.
  fallingBody: { transformOrigin: `50% ${Math.round(FRUIT_BOTTOM * 100)}%` },
  rollingBody: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    transformOrigin: `${FRUIT_CENTER.x} ${FRUIT_CENTER.y}`,
  },
  // 열매가 떠오르면 그림자는 땅에 닿는 점을 향해 줄어든다.
  // 네이티브의 transformOrigin은 정수 퍼센트만 읽으므로 반올림해 둔다.
  shadow: {
    transformOrigin: `${Math.round(SHADOW_ORIGIN.x * 100)}% ${Math.round(SHADOW_ORIGIN.y * 100)}%`,
  },
  // 몸통과 꼭지 그림을 같은 자리에 겹쳐 놓는다.
  overlay: { position: "absolute", top: 0, left: 0 },
  speedLines: { position: "absolute", left: 0 },
  // 그림자와 속도선이 뒤쪽 열매를 누르는 손가락을 가로채지 않게 한다.
  passThrough: { pointerEvents: "none" },
});
