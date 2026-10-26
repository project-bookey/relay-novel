import { useState, type ComponentType, type ReactNode } from "react";
import {
  Animated,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
  useWindowDimensions,
} from "react-native";
import { Text } from "../text";
import { themedStyles, useColors } from "../../theme/themed";
import { useReducedMotion } from "../fruitMotion";
import { useOpenness, usePanelHeight, useShownPane } from "./dockMotion";
import { PANE_RADIUS, PaneGlass } from "./pane";

export interface DockTool<Key extends string> {
  key: Key;
  label: string;
  Icon: ComponentType<{ size?: number; color?: string; strokeWidth?: number }>;
}

// 닫힌 도구 줄(캡슐)의 높이와 도구 하나의 너비. 도구 칸은 44 이상으로 둔다.
const CLOSED_HEIGHT = 52;
const TOOL_WIDTH = 104;
const ROW_INSET = 4;
// 펼친 판이 화면 가장자리·위쪽과 띄우는 거리, 넓은 화면에서 판이 넓어지는 한계
const SIDE_GAP = 12;
const TOP_GAP = 12;
const MAX_OPEN_WIDTH = 520;
// 원고 아래쪽에서 도구 줄까지의 거리. 원고 칸은 이만큼과 도구 줄 높이를 비워 두고 끝난다.
export const DOCK_GAP = 10;
export const DOCK_SPACE = CLOSED_HEIGHT + DOCK_GAP * 2;

// 판이 거의 다 펼쳐진 뒤에 내용이 떠오른다.
const CONTENT_FROM = 0.4;

// 키보드 바로 위 가운데의 유리 도구 줄(사용자가 고른 시안 reference/sian/write-focus A).
// 도구를 누르면 캡슐이 그대로 위로 늘어나 짙은 유리 판이 되고, 판 바닥에 남은 도구 줄로 다른 도구로 바로 넘어간다.
// 다시 누르거나 ✕·바깥을 누르면 거꾸로 접혀 캡슐로 돌아온다(움직임은 dockMotion.ts).
// 키보드 위에 붙도록 키보드만큼 줄어드는 칸 안에 두고, 판도 그 칸 높이까지만 자란다.
// 도구 내용(panes)은 닫혀 있는 동안에도 그대로 두어, 받아 둔 제안이 판을 닫았다 열어도 남는다.
export function ToolDock<Key extends string>({
  tools,
  active,
  onSelect,
  onClose,
  panes,
}: {
  tools: DockTool<Key>[];
  active: Key | null;
  onSelect: (key: Key) => void;
  onClose: () => void;
  panes: Record<Key, ReactNode>;
}) {
  const styles = useStyles();
  const window = useWindowDimensions();
  const reduced = useReducedMotion();
  const [areaHeight, setAreaHeight] = useState(0);
  const [contentHeight, setContentHeight] = useState(0);
  const shown = useShownPane(active, reduced);
  const openness = useOpenness(active !== null, reduced);
  const closedWidth = tools.length * TOOL_WIDTH + ROW_INSET * 2;
  const openWidth = Math.min(window.width - SIDE_GAP * 2, MAX_OPEN_WIDTH);
  const maxHeight = Math.max(CLOSED_HEIGHT, areaHeight - TOP_GAP - DOCK_GAP);
  const targetHeight =
    active === null
      ? CLOSED_HEIGHT
      : Math.min(contentHeight + CLOSED_HEIGHT, maxHeight);
  const height = usePanelHeight(targetHeight, active !== null, reduced);

  const width = openness.interpolate({
    inputRange: [0, 1],
    outputRange: [closedWidth, Math.max(closedWidth, openWidth)],
  });
  const contentStyle = {
    opacity: Animated.multiply(
      openness.interpolate({
        inputRange: [0, CONTENT_FROM, 1],
        outputRange: [0, 0, 1],
      }),
      shown.fade,
    ),
    transform: [
      {
        translateY: openness.interpolate({
          inputRange: [0, 1],
          outputRange: [10, 0],
        }),
      },
    ],
  };

  return (
    <View
      pointerEvents="box-none"
      style={StyleSheet.absoluteFill}
      onLayout={(event) => setAreaHeight(event.nativeEvent.layout.height)}
    >
      {active !== null && (
        // 바깥을 누르면 닫는 판. 원고를 가리지 않도록 투명하고, 화면 읽기는 판 안의 닫기 버튼을 쓴다.
        <Pressable
          accessible={false}
          importantForAccessibility="no"
          focusable={false}
          onPress={onClose}
          style={StyleSheet.absoluteFill}
        />
      )}
      <View pointerEvents="box-none" style={styles.anchor}>
        <Animated.View
          accessibilityViewIsModal={active !== null}
          style={[styles.panel, { width, height }]}
        >
          <PaneGlass tintOpacity={openness} />
          <View style={[StyleSheet.absoluteFill, styles.clip]}>
            <View
              pointerEvents={active === null ? "none" : "auto"}
              style={styles.contentArea}
            >
              <Animated.View
                style={[styles.content, { width: openWidth }, contentStyle]}
              >
                <ScrollView
                  keyboardShouldPersistTaps="handled"
                  contentContainerStyle={styles.scroll}
                  onContentSizeChange={(_, measuredHeight) =>
                    setContentHeight(measuredHeight)
                  }
                >
                  {tools.map(({ key }) => (
                    <View
                      key={key}
                      style={{ display: shown.key === key ? "flex" : "none" }}
                    >
                      {panes[key]}
                    </View>
                  ))}
                </ScrollView>
              </Animated.View>
            </View>
            <View style={styles.row}>
              {tools.map((tool) => (
                <ToolButton
                  key={tool.key}
                  tool={tool}
                  selected={active === tool.key}
                  onPress={() =>
                    active === tool.key ? onClose() : onSelect(tool.key)
                  }
                />
              ))}
            </View>
          </View>
        </Animated.View>
      </View>
    </View>
  );
}

function ToolButton<Key extends string>({
  tool,
  selected,
  onPress,
}: {
  tool: DockTool<Key>;
  selected: boolean;
  onPress: () => void;
}) {
  const styles = useStyles();
  const colors = useColors();
  const { Icon } = tool;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={tool.label}
      accessibilityState={{ selected, expanded: selected }}
      onPress={onPress}
      style={({ pressed }) => [
        styles.tool,
        selected && styles.toolSelected,
        pressed && styles.pressed,
      ]}
    >
      <Icon size={20} color={colors.ink} strokeWidth={2} />
      <Text numberOfLines={1} style={styles.toolText}>
        {tool.label}
      </Text>
    </Pressable>
  );
}

const useStyles = themedStyles((colors) => ({
  anchor: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: DOCK_GAP,
    alignItems: "center",
  },
  panel: { borderRadius: PANE_RADIUS },
  clip: { borderRadius: PANE_RADIUS, overflow: "hidden" },
  // 판이 펼쳐지는 동안 글자가 줄을 바꾸지 않도록 내용은 처음부터 펼친 판 너비로 두고 가운데에 맞춘다.
  contentArea: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: CLOSED_HEIGHT,
    alignItems: "center",
  },
  content: { flex: 1 },
  scroll: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 8 },
  row: {
    position: "absolute",
    left: ROW_INSET,
    right: ROW_INSET,
    bottom: ROW_INSET,
    height: CLOSED_HEIGHT - ROW_INSET * 2,
    flexDirection: "row",
    gap: 2,
  },
  tool: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    borderRadius: 22,
  },
  // 지금 펼친 도구 아래에 깔리는 유리 방울(아래 바의 '지금 있는 곳'과 같은 값)
  toolSelected: {
    backgroundColor: colors.lensFill,
    boxShadow: colors.lensShadow,
  },
  toolText: { fontSize: 13.5, fontWeight: "700", color: colors.ink },
  pressed: { opacity: 0.5 },
}));
