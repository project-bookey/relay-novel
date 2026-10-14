import { useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
  Easing,
  PanResponder,
  type PanResponderGestureState,
} from "react-native";
import { shadowAt, type GroundView } from "../design/fruitFlight";
import {
  holdPose,
  planHandDrop,
  type GroundBounds,
  type HandDrop,
  type HoldPose,
  type RestingFruit,
} from "../design/handDrop";
import { FRUIT_BOTTOM } from "./FruitArt";
import { nativeDriverEnabled, nativeValue } from "./fruitMotion";

// 다 들어 올렸을 때 땅에서 떠 있는 높이(그림 좌표계, 원근 배율 1 기준). 화면에서는 scale을 곱한다.
const HOLD_HEIGHT = 40;
// 집은 뒤 이만큼 끌면 다 들어 올린다(그림 좌표계). 끌지 않고 놓으면 제자리에 그대로 둔다.
const LIFT_DISTANCE = 36;
// 이만큼 끌면 누르기가 아니라 열매를 집어 옮기는 것으로 본다.
// 누르다 손가락이 조금 흔들려도(Android 기본 8dp) 소설이 열리도록 넉넉히 둔다.
const DRAG_START_DISTANCE = 10;
// 길게 누르면 끌지 않아도 열매를 집는다. 말풍선으로 무슨 소설인지 볼 수 있다.
const GRAB_PRESS_MS = 300;
const BUBBLE_FADE_MS = 160;
// 집었다 놓은 직후에 웹에서 뒤늦게 오는 누르기를 무시하는 시간
const IGNORE_PRESS_AFTER_HOLD_MS = 300;

// 열매 밭의 땅. 열매를 옮기거나 떨어뜨릴 때 원근과 범위를 맞춘다.
export interface FieldGround {
  view: GroundView;
  // 하늘에서 떨어진 열매가 멈출 수 있는 땅(처음 배치)
  bounds: GroundBounds;
  // 손으로 옮긴 열매가 놓일 수 있는 땅. 처음 배치보다 앞쪽으로, 아래 버튼 줄 바로 위까지 넓다.
  handBounds: GroundBounds;
  // 든 열매 바닥이 올라갈 수 있는 가장 높은 화면 y. 그 위로는 말풍선이 들어갈 자리를 남긴다.
  skyTop: number;
  // 원근 배율 1인 곳의 열매 크기
  fruitSize: number;
  scale: number;
}

interface HandOptions {
  rest: RestingFruit;
  ground: FieldGround;
  reduced: boolean;
  rollsLikeBall: boolean;
  // 하늘에서 떨어지거나 튀는 중에는 집을 수 없다.
  canGrab: () => boolean;
  // 땅에 놓여 있는 다른 열매들. 놓을 때 그 위에 겹치지 않게 한다.
  otherFruits: () => RestingFruit[];
  onDrop: (drop: HandDrop) => void;
}

// 열매를 손으로 집어 옮기고 떨어뜨리는 손놀림. 누르기(소설 열기)는 Pressable이 맡고,
// 끌기 시작하거나 길게 누르면 열매를 집는다. 집은 열매는 손가락 아래에 그대로 붙어 따라오고,
// 끄는 만큼 땅에서 떠올라 그림자가 바로 아래 땅에 남는다. 놓으면 그 땅으로 떨어진다.
export function useFruitHand(options: HandOptions) {
  const [held, setHeld] = useState(false);
  const heldRef = useRef(false);
  // 집은 뒤 손가락이 움직인 거리와, 그동안 가장 멀리 끈 거리
  const drag = useRef({ x: 0, y: 0 });
  const farthestDrag = useRef(0);
  // PanResponder는 끌기를 넘겨받는 순간 움직인 거리를 0부터 다시 센다.
  // 그 전에 이미 움직인 만큼을 더해 주어야 열매가 손가락보다 뒤처지지 않는다.
  const movedBeforeGrant = useRef({ x: 0, y: 0 });
  const dragging = useRef(false);
  const lastHoldEnd = useRef(0);
  const pressOutTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => () => clearTimeout(pressOutTimer.current), []);

  // 든 열매·그림자·말풍선을 그리는 값. 손가락이 움직일 때마다 계산해서 넣는다.
  const [shown] = useState(() => ({
    bodyX: nativeValue(0),
    bodyY: nativeValue(0),
    bodyScale: nativeValue(1),
    shadowY: nativeValue(0),
    shadowScale: nativeValue(1),
    shadowOpacity: nativeValue(1),
    bubbleX: nativeValue(0),
    bubbleY: nativeValue(0),
    bubbleAppear: nativeValue(0),
  }));

  // 손놀림 처리기는 한 번만 만들기 때문에 최신 값을 여기서 읽는다.
  const latest = useRef(options);
  latest.current = options;

  const currentPose = (): HoldPose => {
    const { rest, ground, reduced } = latest.current;
    const liftShare = Math.min(
      1,
      farthestDrag.current / (LIFT_DISTANCE * ground.scale),
    );
    // 동작 줄이기 설정이면 띄우지 않아서, 놓았을 때 떨어지는 움직임 없이 그 자리에 놓인다.
    const holdHeight = reduced ? 0 : HOLD_HEIGHT * ground.scale * liftShare;
    return holdPose({
      view: ground.view,
      bounds: ground.handBounds,
      skyTop: ground.skyTop,
      rest,
      drag: drag.current,
      holdHeight,
    });
  };

  // 지금 자세대로 그린다. 놓는 순간 떨어지는 움직임(fruitFlight.ts)의 첫 장면과 같은 크기·그림자다.
  const showPose = () => {
    const { rest, ground } = latest.current;
    const pose = currentPose();
    // 떠 있는 열매는 바로 아래 땅의 원근 배율로 보인다.
    const grow = pose.ground.depth / rest.depth;
    const shadow = shadowAt(pose.height, ground.fruitSize);
    const size = ground.fruitSize * pose.ground.depth;
    shown.bodyX.setValue(pose.bottom.x - rest.x);
    shown.bodyY.setValue(pose.bottom.y - rest.y);
    shown.bodyScale.setValue(grow);
    shown.shadowY.setValue(pose.ground.y - rest.y);
    shown.shadowScale.setValue(grow * shadow.scale);
    shown.shadowOpacity.setValue(shadow.opacity);
    shown.bubbleX.setValue(pose.bottom.x);
    shown.bubbleY.setValue(pose.bottom.y - size * FRUIT_BOTTOM);
  };

  const setHolding = (holding: boolean) => {
    heldRef.current = holding;
    setHeld(holding);
  };

  const grab = () => {
    if (heldRef.current || !latest.current.canGrab()) return;
    drag.current = { x: 0, y: 0 };
    farthestDrag.current = 0;
    showPose();
    setHolding(true);
    if (latest.current.reduced) {
      shown.bubbleAppear.setValue(1);
      return;
    }
    shown.bubbleAppear.setValue(0);
    Animated.timing(shown.bubbleAppear, {
      toValue: 1,
      duration: BUBBLE_FADE_MS,
      easing: Easing.out(Easing.cubic),
      // 말풍선 자리 값들과 함께 네이티브에서 움직인다.
      useNativeDriver: nativeDriverEnabled,
    }).start();
  };

  const moveBy = (gesture: PanResponderGestureState) => {
    drag.current = {
      x: movedBeforeGrant.current.x + gesture.dx,
      y: movedBeforeGrant.current.y + gesture.dy,
    };
    farthestDrag.current = Math.max(
      farthestDrag.current,
      Math.hypot(drag.current.x, drag.current.y),
    );
    showPose();
  };

  const release = () => {
    if (!heldRef.current) return;
    lastHoldEnd.current = Date.now();
    shown.bubbleAppear.stopAnimation();
    setHolding(false);
    // 끌지 않고 놓으면(길게 눌러 말풍선만 본 경우) 움직이지 않고 그 자리에 둔다.
    if (farthestDrag.current === 0) return;
    const { ground, rollsLikeBall, otherFruits, onDrop } = latest.current;
    onDrop(
      planHandDrop({
        view: ground.view,
        bounds: ground.handBounds,
        pose: currentPose(),
        fruitSize: ground.fruitSize,
        scale: ground.scale,
        rollsLikeBall,
        others: otherFruits(),
      }),
    );
  };

  const actions = useRef({ grab, moveBy, release });
  actions.current = { grab, moveBy, release };

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        // 누르기는 아래 Pressable이 받고, 끌기 시작하면 이쪽이 가져온다.
        onMoveShouldSetPanResponderCapture: (_event, gesture) => {
          const startsDrag =
            latest.current.canGrab() &&
            Math.hypot(gesture.dx, gesture.dy) >= DRAG_START_DISTANCE;
          if (startsDrag)
            movedBeforeGrant.current = { x: gesture.dx, y: gesture.dy };
          return startsDrag;
        },
        onPanResponderGrant: (_event, gesture) => {
          dragging.current = true;
          // 길게 눌러 이미 집었으면 그대로 이어서 옮긴다.
          actions.current.grab();
          actions.current.moveBy(gesture);
        },
        onPanResponderMove: (_event, gesture) =>
          actions.current.moveBy(gesture),
        onPanResponderRelease: () => {
          dragging.current = false;
          actions.current.release();
        },
        onPanResponderTerminate: () => {
          dragging.current = false;
          actions.current.release();
        },
      }),
    [],
  );

  const pressHandlers = {
    delayLongPress: GRAB_PRESS_MS,
    onLongPress: () => actions.current.grab(),
    // 길게 눌러 집은 열매를 끌지 않고 놓으면 내려놓는다.
    // 누른 채 끌기 시작해도 누르기가 끝났다는 알림이 오므로, 끌기가 이어받았는지 한 박자 뒤에 확인한다.
    onPressOut: () => {
      if (!heldRef.current) return;
      pressOutTimer.current = setTimeout(() => {
        if (!dragging.current) actions.current.release();
      }, 0);
    },
  };

  // 열매 밭이 떨어지는 움직임과 같은 이름으로 쓰도록 맞춘다.
  const holding = useMemo(
    () => ({
      translateX: shown.bodyX,
      translateY: shown.bodyY,
      scaleX: shown.bodyScale,
      scaleY: shown.bodyScale,
      shadowTranslateY: shown.shadowY,
      shadowScale: shown.shadowScale,
      shadowOpacity: shown.shadowOpacity,
    }),
    [shown],
  );

  return {
    held,
    holding,
    bubble: {
      centerX: shown.bubbleX,
      top: shown.bubbleY,
      appear: shown.bubbleAppear,
    },
    panHandlers: panResponder.panHandlers,
    pressHandlers,
    justHeld: () =>
      Date.now() - lastHoldEnd.current < IGNORE_PRESS_AFTER_HOLD_MS,
  };
}
