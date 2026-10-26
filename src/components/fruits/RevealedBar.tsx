import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactElement,
} from "react";
import {
  Animated,
  Easing,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from "react-native";
import { barRevealOf } from "../../design/barReveal";
import { themedStyles } from "../../theme/themed";
import { nativeDriverEnabled, useReducedMotion } from "../fruitMotion";
import {
  BAR_REVEAL_TOP,
  GENRE_BAR_HEIGHT,
  GENRE_BAR_OUTSET,
  LIST_SIDE,
  SEARCH_ROOM,
} from "./fruitsLayout";

const REVEAL_MS = 200;

// 목록을 내릴 때마다 장르 바를 맨 위에 다시 꺼낼지 정한다(판정은 src/design/barReveal.ts).
// inPlaceUntil은 목록 속 장르 바가 맨 위 나타나는 자리보다 위로 지나가는 거리다. 그보다 더 내렸으면
// 위쪽 묶음(나를 위한 이야기)도 다 지나간 것이라 pastHead로 알린다.
export function useBarReveal(inPlaceUntil: number) {
  const [revealed, setRevealed] = useState(false);
  const [pastHead, setPastHead] = useState(false);
  const reveal = useRef({ anchorY: 0, shown: false });
  const onScrollMove = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      const { contentOffset, contentSize, layoutMeasurement } =
        event.nativeEvent;
      reveal.current = barRevealOf({
        ...reveal.current,
        y: contentOffset.y,
        inPlaceUntil,
        maxY: contentSize.height - layoutMeasurement.height,
      });
      setRevealed(reveal.current.shown);
      setPastHead(contentOffset.y > inPlaceUntil);
    },
    [inPlaceUntil],
  );
  return { revealed, pastHead, onScrollMove };
}

// 맨 위에 다시 나타난 장르 바(사용자 요청 "따라다니게 하지 말고 위로 올렸을 때 나타나도록"). 검색 동그라미와
// 가운데를 맞추고 오른쪽은 동그라미 자리만큼 비운다. 위에서 내려오며 나타나고, 올라가며 사라진 뒤에는 안의 장르 바를
// 그리지 않아 목록 속 장르 바와 이름이 겹쳐 화면 읽기·키보드 초점에 두 번 잡히지 않는다(동작 줄이기면 바로).
export function RevealedBar({
  shown,
  children,
}: {
  shown: boolean;
  children: ReactElement;
}) {
  const styles = useStyles();
  const reduced = useReducedMotion();
  const appear = useRef(new Animated.Value(0)).current;
  const [present, setPresent] = useState(false);
  useEffect(() => {
    if (shown) setPresent(true);
    const animation = Animated.timing(appear, {
      toValue: shown ? 1 : 0,
      duration: reduced ? 0 : REVEAL_MS,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: nativeDriverEnabled,
    });
    animation.start(({ finished }) => {
      if (finished && !shown) setPresent(false);
    });
    return () => animation.stop();
  }, [appear, shown, reduced]);
  const motion = {
    opacity: appear,
    transform: [
      {
        translateY: appear.interpolate({
          inputRange: [0, 1],
          outputRange: [-(BAR_REVEAL_TOP + GENRE_BAR_HEIGHT), 0],
        }),
      },
    ],
  };
  return (
    <Animated.View
      pointerEvents={shown ? "box-none" : "none"}
      style={[styles.bar, motion]}
    >
      {present && children}
    </Animated.View>
  );
}

const useStyles = themedStyles(() => ({
  bar: {
    position: "absolute",
    top: BAR_REVEAL_TOP,
    left: LIST_SIDE - GENRE_BAR_OUTSET,
    right: LIST_SIDE + SEARCH_ROOM,
  },
}));
