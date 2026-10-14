import { useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
  PanResponder,
  type PanResponderGestureState,
} from "react-native";
import type { GroundView } from "../design/fruitFlight";
import {
  clampToGround,
  depthAt,
  planHandDrop,
  type GroundBounds,
  type HandDrop,
} from "../design/handDrop";
import { springTo } from "./fruitMotion";

// 집어 든 열매를 땅에서 들어 올리는 높이(그림 좌표계, 원근 배율 1 기준). 화면에서는 scale을 곱한다.
const HOLD_HEIGHT = 30;
// 이만큼 끌면 누르기가 아니라 열매를 집어 옮기는 것으로 본다.
const DRAG_START_DISTANCE = 8;
// 길게 누르면 끌지 않아도 열매를 집어 든다.
const GRAB_PRESS_MS = 300;
// 끌고 놓은 직후에 웹에서 뒤늦게 오는 누르기를 무시하는 시간
const IGNORE_PRESS_AFTER_DRAG_MS = 300;

// 열매 밭의 땅. 열매를 옮기거나 떨어뜨릴 때 원근과 범위를 맞춘다.
export interface FieldGround {
  view: GroundView;
  bounds: GroundBounds;
  // 원근 배율 1인 곳의 열매 크기
  fruitSize: number;
  scale: number;
}

type RestSpot = { x: number; y: number; depth: number };

interface HandOptions {
  rest: RestSpot;
  ground: FieldGround;
  reduced: boolean;
  rollsLikeBall: boolean;
  // 하늘에서 떨어지거나 굴러가는 중에는 집을 수 없다.
  canGrab: () => boolean;
  onDrop: (drop: HandDrop) => void;
}

// 열매를 손으로 집어 옮기고 떨어뜨리는 손놀림. 누르기(소설 열기)는 Pressable이 맡고,
// 끌기 시작하거나 길게 누르면 열매를 들어 올려 손가락을 따라 땅 위로 옮긴다.
// 놓으면 든 높이와 손이 움직이던 빠르기로 떨어질 움직임을 계산해 onDrop으로 넘긴다.
export function useFruitHand(options: HandOptions) {
  const [held, setHeld] = useState(false);
  const heldRef = useRef(false);
  // 손가락을 따라 옮긴 거리(멈춘 자리 기준)와 들어 올린 높이(원근 배율 1 기준)
  const pan = useRef(new Animated.ValueXY({ x: 0, y: 0 })).current;
  const lift = useRef(new Animated.Value(0)).current;
  const dragOffset = useRef({ x: 0, y: 0 });
  const dragging = useRef(false);
  const lastDragEnd = useRef(0);
  const pressOutTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      clearTimeout(pressOutTimer.current);
    };
  }, []);

  // 손놀림 처리기는 한 번만 만들기 때문에 최신 값을 여기서 읽는다.
  const latest = useRef(options);
  latest.current = options;

  const holdHeight = () =>
    latest.current.reduced ? 0 : HOLD_HEIGHT * latest.current.ground.scale;

  const setHolding = (holding: boolean) => {
    heldRef.current = holding;
    setHeld(holding);
  };

  const grab = () => {
    if (!latest.current.canGrab()) return;
    dragOffset.current = { x: 0, y: 0 };
    pan.setValue({ x: 0, y: 0 });
    lift.setValue(0);
    setHolding(true);
    springTo(lift, holdHeight()).start();
  };

  const moveBy = (gesture: PanResponderGestureState) => {
    const { rest, ground } = latest.current;
    const target = clampToGround(ground.bounds, {
      x: rest.x + gesture.dx,
      y: rest.y + gesture.dy,
    });
    dragOffset.current = { x: target.x - rest.x, y: target.y - rest.y };
    pan.setValue(dragOffset.current);
  };

  const release = (velocity: { x: number; y: number }) => {
    if (!heldRef.current) return;
    heldRef.current = false;
    const { rest, ground, reduced, rollsLikeBall, onDrop } = latest.current;
    const groundPoint = {
      x: rest.x + dragOffset.current.x,
      y: rest.y + dragOffset.current.y,
    };
    // 빨리 던지면 다 들어 올리기 전에 놓을 수 있으므로, 목표 높이가 아니라 지금 들린 높이에서 떨어뜨린다.
    // 네이티브에서 움직이는 값은 멈춰야 읽을 수 있어서 콜백으로 받는다.
    lift.stopAnimation((liftedHeight) => {
      if (!mounted.current) return;
      onDrop(
        planHandDrop({
          view: ground.view,
          bounds: ground.bounds,
          ground: groundPoint,
          lift: liftedHeight * depthAt(ground.view, groundPoint.y),
          velocity: reduced ? { x: 0, y: 0 } : velocity,
          fruitSize: ground.fruitSize,
          scale: ground.scale,
          rollsLikeBall,
        }),
      );
      setHeld(false);
    });
  };

  const actions = useRef({ grab, moveBy, release });
  actions.current = { grab, moveBy, release };

  const panResponder = useMemo(() => {
    const endDrag = () => {
      dragging.current = false;
      lastDragEnd.current = Date.now();
    };
    return PanResponder.create({
      // 누르기는 아래 Pressable이 받고, 끌기 시작하면 이쪽이 가져온다.
      onMoveShouldSetPanResponderCapture: (_event, gesture) =>
        latest.current.canGrab() &&
        Math.hypot(gesture.dx, gesture.dy) >= DRAG_START_DISTANCE,
      onPanResponderGrant: () => {
        dragging.current = true;
        // 길게 눌러 이미 집었으면 그대로 이어서 옮긴다.
        if (!heldRef.current) actions.current.grab();
      },
      onPanResponderMove: (_event, gesture) => actions.current.moveBy(gesture),
      onPanResponderRelease: (_event, gesture) => {
        endDrag();
        // 손놀림 빠르기는 px/ms라 px/초로 바꾼다.
        actions.current.release({ x: gesture.vx * 1000, y: gesture.vy * 1000 });
      },
      onPanResponderTerminate: () => {
        endDrag();
        actions.current.release({ x: 0, y: 0 });
      },
    });
  }, []);

  const pressHandlers = {
    delayLongPress: GRAB_PRESS_MS,
    onLongPress: () => actions.current.grab(),
    // 길게 눌러 집은 열매를 끌지 않고 그대로 놓으면 그 자리에 떨어뜨린다.
    // 누른 채 끌기 시작해도 누르기가 끝났다는 알림이 오므로, 끌기가 이어받았는지 한 박자 뒤에 확인한다.
    onPressOut: () => {
      if (!heldRef.current) return;
      pressOutTimer.current = setTimeout(() => {
        if (!dragging.current) actions.current.release({ x: 0, y: 0 });
      }, 0);
    },
  };

  const holding = useMemo(
    () => followHand(pan, lift, options.ground, options.rest),
    [pan, lift, options.ground, options.rest],
  );

  return {
    held,
    holding,
    // 든 열매가 손가락(커서) 위로 떠오르는 높이
    holdHeight: holdHeight(),
    panHandlers: panResponder.panHandlers,
    pressHandlers,
    justDragged: () =>
      Date.now() - lastDragEnd.current < IGNORE_PRESS_AFTER_DRAG_MS,
  };
}

// 집어 든 열매의 위치·크기·그림자. 놓는 순간 떨어지는 움직임(src/design/fruitFlight.ts)의 처음과 이어지도록
// 같은 방식으로 계산한다: 앞뒤로 옮기면 원근 배율이 바뀌고, 들어 올린 만큼 그림자가 작고 옅어진다.
function followHand(
  pan: Animated.ValueXY,
  lift: Animated.Value,
  ground: FieldGround,
  rest: RestSpot,
) {
  // 땅 위 자리의 원근 배율은 화면 y에 비례하므로, 멈춘 자리에 대한 배율도 옮긴 거리에 비례한다.
  const nearness = pan.y.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1 + 1 / (ground.view.eyeHeight * rest.depth)],
    extrapolate: "extend",
  });
  // 들어 올린 높이는 원근 배율 1 기준이라, 화면에서는 그 자리의 원근 배율만큼 줄어 보인다.
  const raised = Animated.multiply(
    lift,
    Animated.multiply(nearness, rest.depth),
  );
  // 열매 세 개 높이만큼 들면 그림자가 다 사라진다(fruitFlight.ts와 같은 기준).
  const closeness = lift.interpolate({
    inputRange: [0, ground.fruitSize * 3],
    outputRange: [1, 0],
    extrapolate: "clamp",
  });
  return {
    translateX: pan.x,
    translateY: Animated.subtract(pan.y, raised),
    scaleX: nearness,
    scaleY: nearness,
    shadowTranslateY: pan.y,
    shadowScale: Animated.multiply(
      nearness,
      closeness.interpolate({ inputRange: [0, 1], outputRange: [0.35, 1] }),
    ),
    shadowOpacity: closeness,
  };
}
