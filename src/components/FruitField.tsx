import { useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
  Easing,
  StyleSheet,
  View,
  useWindowDimensions,
} from "react-native";
import { useIsFocused } from "expo-router";
import type { NovelSummary } from "../api/types";
import type { HomeFruit } from "../design/homeFruits";
import { fruitShapeOf } from "../theme";
import type { ScreenPoint } from "../design/fruitFlight";
import { planCanopyShow, type CanopyShow } from "../design/canopyShow";
import {
  planRollAway,
  rollAwayDelayOf,
  type RollAway,
} from "../design/rollAway";
import { seededRandom } from "../design/storyTree";
import type { RestingFruit } from "../design/handDrop";
import type { FieldGround } from "./fruitHand";
import { Canopy } from "./canopy/Canopy";
import { FieldFruit, type FruitNeighbors } from "./FieldFruit";
import { LeavingFruit } from "./LeavingFruit";
import { Meadow } from "./home/Meadow";
import { FieldCast, type CastBounds } from "./home/FieldCast";
import type { PlacedFruit } from "./fruitPlacement";
import {
  FRUIT_FIELD_LIMIT,
  canopyFrameOf,
  fieldPlacementOf,
  layoutField,
} from "./fruitLayout";
import {
  nativeDriverEnabled,
  nativeValue,
  rollsLikeBall,
  useReducedMotion,
} from "./fruitMotion";

// 굴러 나가는 열매는 새로고침 나무(CANOPY_LAYER)보다 뒤에 그려, 뒤로 굴러간 열매가 내려오는 나무에 가린다.
// 땅에 놓인 열매(FieldFruit)는 땅 위 자리 순서로 그보다 앞에 쌓인다.
const LEAVING_LAYER = 0;

// 새로고침 차례 하나. 열매가 튀고 굴러갈 결과(seed)와 나무 연출, 그 차례가 시작될 때 놓인 열매들이다.
// 홈에 처음 들어온 차례에는 나무 연출이 없다(열매만 하늘에서 떨어진다).
interface Scene {
  round: number;
  seed: number;
  show?: CanopyShow;
  fruitKeys: string;
}

// 새 묶음이 오면 땅에서 굴러 나가는 열매
interface Leaving {
  key: string;
  story: NovelSummary;
  rest: RestingFruit;
  size: number;
  path: RollAway;
  delayMs: number;
}

// 바로 앞에 그린 열매들과 그 땅. 새로고침하면 이 열매들이 지금 놓인 자리에서 굴러 나간다.
interface ShownField {
  fruits: { key: string; fruit: PlacedFruit }[];
  ground?: FieldGround;
}

// 열매마다, 새로고침할 때마다 굴러 나가는 방향을 조금씩 다르게 흩뜨리는 값(-1~1)
function spreadOf(fruitKey: number, round: number) {
  const random = seededRandom(fruitKey * 7919 + round * 104729);
  return random() * 2 - 1;
}

// 새로고침하면 땅에 놓인 열매들이 열매 밭 가운데에서 바깥쪽 사방으로 굴러 나가는 길을 정한다.
// 바깥쪽 열매부터 차례로 나가고, 뒤쪽 열매부터 그려 앞쪽 열매가 앞에 보인다.
function departingFruits(
  shown: ShownField,
  restsByKey: Map<string, { rest: RestingFruit; angle: number }>,
  edges: { left: number; right: number; bottom: number },
  round: number,
): Leaving[] {
  const { ground } = shown;
  if (!ground) return [];
  const center = {
    x: (ground.bounds.left + ground.bounds.right) / 2,
    y: (ground.bounds.top + ground.bounds.bottom) / 2,
  };
  const fruits = shown.fruits.map(({ key, fruit }) => {
    const now = restsByKey.get(key);
    const rest = now?.rest ?? fruit.rest;
    return {
      key,
      item: fruit.item,
      rest,
      angle: now?.angle ?? 0,
      fromCenter: Math.hypot(rest.x - center.x, rest.y - center.y),
    };
  });
  const farthest = Math.max(0, ...fruits.map((fruit) => fruit.fromCenter));
  return fruits
    .map((fruit) => {
      const size = ground.fruitSize * fruit.rest.depth;
      return {
        key: `leaving-${fruit.key}`,
        story: fruit.item.story,
        rest: fruit.rest,
        size,
        delayMs: rollAwayDelayOf(fruit.fromCenter, farthest),
        path: planRollAway({
          rest: fruit.rest,
          view: ground.view,
          area: ground.bounds,
          size,
          rollsLikeBall: rollsLikeBall(fruitShapeOf(fruit.item.story.id)),
          startAngle: fruit.angle,
          scale: ground.scale,
          edges,
          spread: spreadOf(fruit.item.key, round),
        }),
      };
    })
    .sort((first, second) => first.rest.y - second.rest.y);
}

const keysOf = (items: HomeFruit[]) =>
  items
    .slice(0, FRUIT_FIELD_LIMIT)
    .map((item) => item.key)
    .join(",");

// 지금 놓을 열매가 모두 자리를 정해 둔 열매 가운데 있는지. 이어 쓴 열매가 사라질 때처럼 빠지기만 했으면
// 남은 열매는 놓인 자리에 그대로 둔다.
function onlyRemoved(laidOut: HomeFruit[], items: HomeFruit[]) {
  const placed = new Set(keysOf(laidOut).split(","));
  return keysOf(items)
    .split(",")
    .every((key) => key === "" || placed.has(key));
}

// 다시 새로고침할 수 있는 때(ms). 나무 연출이 있으면 나무가 다시 올라간 뒤, 없으면 하늘에서 떨어진 열매가
// 다 멈춘 뒤다. 동작 줄이기에서는 열매가 처음부터 제자리에 놓이므로 기다리지 않는다.
function settleTimeOf(
  show: CanopyShow | undefined,
  reduced: boolean,
  fruits: PlacedFruit[],
) {
  if (show) return show.durationMs;
  if (reduced) return 0;
  return Math.max(
    0,
    ...fruits.map((fruit) => fruit.delayMs + fruit.flight.durationMs),
  );
}

function sceneOf(round: number, items: HomeFruit[], withTree: boolean): Scene {
  const fruitCount = Math.min(items.length, FRUIT_FIELD_LIMIT);
  return {
    round,
    seed: Math.floor(Math.random() * 2 ** 31),
    show: withTree ? planCanopyShow(fruitCount) : undefined,
    fruitKeys: keysOf(items),
  };
}

// 홈 화면의 열매 밭. 둘레에 풀과 꽃을 흩뿌리고, 열매(이어 쓸 수 있는 회차·내 차례 소설)가 하늘에서 떨어져 땅에 부딪혀 털썩 멈추거나,
// 굴러가거나, 크게 튀어 다른 자리로 가서 멈춘다. 새로고침하면(round가 바뀌면) 땅의 열매가 굴러 나가고,
// 화면 위에 숨어 있던 나무가 새 열매를 달고 툭 떨어져 캐릭터 셋이 방방 뛰어 열매를 떨어뜨린 뒤 다시 올라간다.
// 열매를 누르면 그 회차나 소설로 가고, 끌거나 길게 누르면 집어서 앞쪽 빈 땅까지 옮겨 떨어뜨릴 수 있다.
export function FruitField({
  items,
  round,
  onOpen,
  onShowEnd,
}: {
  items: HomeFruit[];
  // 새로고침할 때마다 늘어나는 차례. 바뀔 때마다 새로고침 연출을 한다.
  round: number;
  onOpen: (item: HomeFruit) => void;
  // 열매가 다 내려앉고 나무도 다시 올라가면 알린다(새로고침 버튼을 다시 누를 수 있게).
  onShowEnd?: () => void;
}) {
  const reduced = useReducedMotion();
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const stageRef = useRef<View>(null);
  const [area, setArea] = useState({ width: 0, height: 0 });
  // 열매 밭 왼쪽 위의 화면 자리. 화면 맨 위에 있는 나무와 자리를 맞추는 데 쓴다.
  const [origin, setOrigin] = useState<ScreenPoint>();
  // 열매마다 지금 놓인 자리와 기울기. 그리기와 상관없는 기록이라 상태 대신 ref에 둔다.
  const restsByKey = useRef(
    new Map<string, { rest: RestingFruit; angle: number }>(),
  ).current;
  const neighbors = useMemo<FruitNeighbors>(
    () => ({
      report: (key, rest, angle) => restsByKey.set(key, { rest, angle }),
      forget: (key) => restsByKey.delete(key),
      othersThan: (key) =>
        [...restsByKey.entries()]
          .filter(([otherKey]) => otherKey !== key)
          .map(([, { rest }]) => rest),
    }),
    [restsByKey],
  );

  const shownRef = useRef<ShownField>({ fruits: [] });
  const [scene, setScene] = useState(() => sceneOf(round, items, false));
  // 나무가 다시 올라가 연출이 끝났는지. 끝나면 나무를 그리지 않아 그림 메모리를 돌려준다.
  const [treeGone, setTreeGone] = useState(false);
  // 열매가 다 내려앉았는지(나무 연출이 있으면 나무가 다시 올라간 뒤). 그 전에는 풀밭 캐릭터가 화면 밖에 숨어 있다.
  const [settled, setSettled] = useState(false);
  // 지금 누르고 있거나 집어 든 열매들. 하나라도 있으면 풀밭 캐릭터가 놀라 달아난다.
  const touchedRef = useRef(new Set<string>());
  const [scared, setScared] = useState(false);
  // 굴러 나가는 열매는 차례와 따로 둔다. 하나씩 사라질 때마다 열매 밭을 다시 배치하면
  // 나무에 매달린 새 열매가 처음부터 다시 움직여 가지와 박자가 어긋난다.
  const [leaving, setLeaving] = useState<Leaving[]>([]);
  // 열매 자리를 정한 열매들. 열매가 빠지기만 하면 다시 배치하지 않고 빠진 열매만 지운다.
  // 새 열매가 들어오면 예전처럼 다시 배치한다.
  const [laidOut, setLaidOut] = useState(items);
  if (scene.round === round && !onlyRemoved(laidOut, items)) setLaidOut(items);
  if (scene.round !== round) {
    // 화면 가장자리(열매 밭 좌표). 열매가 이 밖으로 나가면 다 굴러 나간 것이다.
    const stageX = origin?.x ?? 0;
    const stageY = origin?.y ?? 0;
    const edges = {
      left: -stageX,
      right: windowWidth - stageX,
      bottom: windowHeight - stageY,
    };
    const departing = departingFruits(
      shownRef.current,
      restsByKey,
      edges,
      round,
    );
    setScene(sceneOf(round, items, true));
    setLaidOut(items);
    setTreeGone(false);
    setSettled(false);
    setLeaving((before) => [...before, ...departing]);
  }
  const show = reduced ? undefined : scene.show;

  const frame = useMemo(
    () => (origin ? canopyFrameOf(windowWidth, origin) : undefined),
    [windowWidth, origin],
  );
  const placement = useMemo(
    () =>
      area.width === 0 ? undefined : fieldPlacementOf(area.width, area.height),
    [area.width, area.height],
  );
  // 열매 자리는 어떤 열매들이 놓이는지에만 따른다. 좋아요 수처럼 내용만 바뀐 응답으로 다시 배치하면
  // 손으로 옮긴 열매가 처음 자리로 돌아가므로, 배치는 자리를 정한 열매 목록이 바뀔 때만 다시 하고
  // 열매에는 그릴 때마다 최신 정보를 넘긴다.
  const laidOutKeys = keysOf(laidOut);
  const field = useMemo(() => {
    if (area.width === 0 || !frame) return undefined;
    // 차례가 시작될 때와 같은 열매들이면 나무에 매달았다 떨어뜨리고,
    // 그 사이 목록이 바뀌었으면(자리를 맡은 열매가 생기는 등) 예전처럼 하늘에서 떨어뜨린다.
    const hanging =
      show && laidOutKeys === scene.fruitKeys ? { show, frame } : undefined;
    return layoutField(area.width, area.height, laidOut, scene.seed, hanging);
  }, [
    area.width,
    area.height,
    frame,
    laidOutKeys,
    scene.seed,
    scene.fruitKeys,
    show,
  ]);
  // 자리를 정한 열매 가운데 지금도 놓을 열매
  const itemKeys = keysOf(items);
  const fruits = useMemo(() => {
    const kept = new Set(itemKeys.split(","));
    return (field?.fruits ?? []).filter((fruit) =>
      kept.has(String(fruit.item.key)),
    );
  }, [field, itemKeys]);
  const fruitKeyOf = (fruit: PlacedFruit) => `${scene.round}:${fruit.item.key}`;
  useEffect(() => {
    shownRef.current = {
      fruits: fruits.map((fruit) => ({
        key: `${scene.round}:${fruit.item.key}`,
        fruit,
      })),
      ground: field?.ground,
    };
  }, [fruits, field, scene.round]);

  // 나무 연출은 열매가 자리를 잡는 것과 같은 때에 시작해야 매달린 열매와 가지가 함께 움직인다.
  const clock = useRef(nativeValue(0)).current;
  const showEndRef = useRef(onShowEnd);
  showEndRef.current = onShowEnd;
  const settleRef = useRef(0);
  settleRef.current = settleTimeOf(show, reduced, fruits);
  const ready = !!field;
  const sceneRound = scene.round;
  useEffect(() => {
    if (!ready) return;
    // 새로고침할 때마다(sceneRound) 다 끝났다고 알린다.
    const settled = setTimeout(() => {
      showEndRef.current?.();
      setSettled(true);
    }, settleRef.current);
    if (!show) return () => clearTimeout(settled);
    clock.setValue(0);
    const motion = Animated.timing(clock, {
      toValue: show.durationMs,
      duration: show.durationMs,
      easing: Easing.linear,
      useNativeDriver: nativeDriverEnabled,
    });
    motion.start(({ finished }) => {
      if (finished) setTreeGone(true);
    });
    return () => {
      motion.stop();
      clearTimeout(settled);
    };
  }, [ready, show, clock, sceneRound]);

  const latestItems = new Map(items.map((item) => [item.key, item]));
  // 홈이 다른 탭이나 소설 화면에 가려져 있으면 인기 열매의 흔들림·숨쉬기를 멈춰 배터리를 아낀다.
  const onScreen = useIsFocused();
  const touchFruit = (key: string, touching: boolean) => {
    const touched = touchedRef.current;
    if (touching) touched.add(key);
    else touched.delete(key);
    setScared(touched.size > 0);
  };
  // 풀밭 캐릭터가 노는 땅과 숨는 곳. 열매 땅 뒤쪽 끝보다 조금 앞에서 아래쪽 버튼 줄 바로 위까지, 화면 양옆까지 논다.
  const castBounds = useMemo<CastBounds | undefined>(() => {
    if (!field || !origin) return undefined;
    const { ground } = field;
    const size = ground.scale;
    const edgeLeft = -origin.x;
    const edgeRight = windowWidth - origin.x;
    return {
      left: edgeLeft + 24 * size,
      right: edgeRight - 24 * size,
      top: ground.bounds.top + 44 * size,
      bottom: ground.handBounds.bottom - 6 * size,
      edgeLeft,
      edgeRight,
      exitLeft: edgeLeft - 50 * size,
      exitRight: edgeRight + 50 * size,
    };
  }, [field, origin, windowWidth]);
  const forgetLeaving = (key: string) =>
    setLeaving((current) => current.filter((fruit) => fruit.key !== key));

  return (
    <View
      ref={stageRef}
      style={styles.stage}
      onLayout={(event) => {
        const { width, height } = event.nativeEvent.layout;
        setArea({ width, height });
        // 같은 자리면 그대로 둔다. 자리가 새로 정해지면 열매 배치를 다시 해서 떨어지던 열매가 처음부터 다시 떨어진다.
        stageRef.current?.measureInWindow((x, y) =>
          setOrigin((before) =>
            before && before.x === x && before.y === y ? before : { x, y },
          ),
        );
      }}
    >
      {/* 풀과 꽃은 화면 전체에 겹쳐 두고, 열매와 나무는 그 위에 그린다. */}
      {!!origin && !!placement && (
        <Meadow
          windowWidth={windowWidth}
          windowHeight={windowHeight}
          origin={origin}
          scale={placement.scale}
          fieldTop={placement.fieldTop}
        />
      )}
      {/* 풀밭 캐릭터: 열매가 다 내려앉으면 빼꼼 들어와 놀고, 열매를 만지면 놀라 달아난다. */}
      {!!castBounds && !!field && (
        <FieldCast
          bounds={castBounds}
          scale={field.ground.scale}
          scared={scared}
          away={!settled}
          moving={!reduced && onScreen}
          reduced={reduced}
        />
      )}
      {/* 나무는 새로고침 연출 동안에만 그린다. 평소 홈에는 열매와 풀·꽃만 있다. */}
      {!!frame && !!show && !treeGone && (
        <Canopy
          show={show}
          clock={clock}
          scale={frame.scale}
          left={frame.left}
          top={frame.top}
        />
      )}
      {!!frame &&
        leaving.map((fruit) => (
          <LeavingFruit
            key={fruit.key}
            story={fruit.story}
            rest={fruit.rest}
            size={fruit.size}
            path={fruit.path}
            delayMs={fruit.delayMs}
            layer={LEAVING_LAYER}
            reduced={reduced}
            onGone={() => forgetLeaving(fruit.key)}
          />
        ))}
      {!!field &&
        fruits.map((fruit) => (
          <FieldFruit
            key={fruitKeyOf(fruit)}
            fruitKey={fruitKeyOf(fruit)}
            fruit={fruit}
            item={latestItems.get(fruit.item.key) ?? fruit.item}
            ground={field.ground}
            neighbors={neighbors}
            reduced={reduced}
            onScreen={onScreen}
            onOpen={onOpen}
            onTouch={(touching) => touchFruit(fruitKeyOf(fruit), touching)}
          />
        ))}
    </View>
  );
}

const styles = StyleSheet.create({
  // 열매가 하늘(화면 위 바깥)이나 위쪽 나무에서 떨어져 들어오도록, 영역 밖도 자르지 않는다.
  stage: { flex: 1, width: "100%", overflow: "visible" },
});
