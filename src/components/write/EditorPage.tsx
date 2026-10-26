import type { RefObject } from "react";
import {
  Platform,
  ScrollView,
  View,
  type TextInput as NativeTextInput,
} from "react-native";
import { router } from "expo-router";
import { Text, TextInput, WEB_NO_FOCUS_RING } from "../text";
import type { Palette } from "../../theme";
import { themedStyles, useColors } from "../../theme/themed";
import { Button, Card, ErrorBox, useUi } from "../ui";
import { MAX_BODY_LENGTH } from "./limits";
import type { TextSelection } from "./rewriteTarget";
import { DOCK_SPACE } from "./ToolDock";

// 고른 글자 밑은 옅은 노랑, 커서는 진한 노랑. 안드로이드만 둘을 따로 정할 수 있고,
// iOS는 한 색을 주면 고른 글자 밑을 알아서 옅게 칠한다.
function selectionColorsOf(colors: Palette) {
  if (Platform.OS === "android")
    return {
      selectionColor: colors.selectionMark,
      cursorColor: colors.tabMark,
      selectionHandleColor: colors.tabMark,
    };
  return { selectionColor: colors.tabMark };
}

// 원고 한 장: 큰 장 제목과 화면 끝까지 이어지는 본문. 라벨·테두리 없이 안내 글자만 둔다.
// 본문 칸이 스스로 넘겨져야 쓰는 줄이 늘 보여서, 바깥을 넘기지 않고 본문 칸을 남은 높이만큼 채운다.
export function EditorPage({
  title,
  body,
  onTitleChange,
  onBodyChange,
  onSelectionChange,
  bodyInput,
  onBodyFocus,
  notice,
}: {
  title: string;
  body: string;
  onTitleChange: (title: string) => void;
  onBodyChange: (body: string) => void;
  onSelectionChange: (selection: TextSelection) => void;
  bodyInput: RefObject<NativeTextInput | null>;
  onBodyFocus: (focused: boolean) => void;
  notice: NoticeProps;
}) {
  const styles = useStyles();
  const colors = useColors();
  const selectionColors = selectionColorsOf(colors);
  return (
    <View style={styles.page}>
      <EditorNotice {...notice} />
      <TextInput
        accessibilityLabel="이번 장의 제목"
        value={title}
        onChangeText={onTitleChange}
        maxLength={120}
        placeholder="이번 장의 제목"
        placeholderTextColor={colors.muted}
        underlineColorAndroid="transparent"
        returnKeyType="next"
        submitBehavior="submit"
        onSubmitEditing={() => bodyInput.current?.focus()}
        {...selectionColors}
        style={[styles.title, WEB_NO_FOCUS_RING]}
      />
      <TextInput
        ref={bodyInput}
        accessibilityLabel="이어지는 이야기"
        value={body}
        onChangeText={onBodyChange}
        onSelectionChange={(event) =>
          onSelectionChange(event.nativeEvent.selection)
        }
        onFocus={() => onBodyFocus(true)}
        onBlur={() => onBodyFocus(false)}
        multiline
        maxLength={MAX_BODY_LENGTH}
        placeholder="앞선 작가의 문장을 이어, 새로운 장을 시작해 주세요."
        placeholderTextColor={colors.muted}
        underlineColorAndroid="transparent"
        textAlignVertical="top"
        {...selectionColors}
        style={[styles.body, WEB_NO_FOCUS_RING]}
      />
      {/* 키보드 위 도구 줄 자리. 본문이 도구 줄 밑으로 들어가 가려지지 않게 비워 둔다. */}
      <View style={styles.dockSpace} />
    </View>
  );
}

interface NoticeProps {
  sessionExpired: boolean;
  writable: boolean;
  isBranch: boolean;
  // 나가려 했지만 원고를 저장하지 못해 막았을 때 보일 오류
  leaveBlocked: Error | null;
  onDiscard: () => void;
}

// 원고 위에 잠깐 놓는 알림: 로그인 만료, 더는 쓸 수 없음, 저장하지 못해 나가지 못함.
// 여럿이 겹쳐도 본문 칸이 남도록 알림 칸은 화면의 일부까지만 차지하고 넘겨 읽는다.
function EditorNotice({
  sessionExpired,
  writable,
  isBranch,
  leaveBlocked,
  onDiscard,
}: NoticeProps) {
  const ui = useUi();
  const styles = useStyles();
  if (!sessionExpired && writable && !leaveBlocked) return null;
  return (
    <ScrollView style={styles.notices} keyboardShouldPersistTaps="handled">
      {sessionExpired && (
        <Card>
          <Text style={ui.body}>
            로그인이 만료됐어요. 원고는 화면에 남겨 두었으니 다시 로그인한 뒤
            이어서 저장해 주세요.
          </Text>
          <Button onPress={() => router.push("/login?returnBack=1")}>
            다시 로그인
          </Button>
        </Card>
      )}
      {!writable && !sessionExpired && (
        <Card>
          <Text style={ui.body}>
            {isBranch
              ? "이어 쓸 수 있는 시간이 지났거나 서버 확인이 필요해요. 원고는 화면에 남겨 두었으니 복사해 보관해 주세요."
              : "집필 차례가 바뀌었거나 서버 확인이 필요해요. 원고는 화면에 남겨 두었으니 복사해 보관해 주세요."}
          </Text>
        </Card>
      )}
      {!!leaveBlocked && (
        <>
          <ErrorBox error={leaveBlocked} />
          <Button outline onPress={onDiscard}>
            저장하지 않고 나가기
          </Button>
        </>
      )}
    </ScrollView>
  );
}

const useStyles = themedStyles((colors) => ({
  page: {
    flex: 1,
    width: "100%",
    maxWidth: 680,
    alignSelf: "center",
    paddingHorizontal: 26,
    paddingTop: 8,
  },
  title: {
    fontSize: 24,
    fontWeight: "800",
    letterSpacing: -0.6,
    color: colors.ink,
    paddingHorizontal: 0,
    paddingVertical: 6,
    marginBottom: 8,
  },
  body: {
    flex: 1,
    fontSize: 17,
    lineHeight: 30,
    letterSpacing: -0.2,
    color: colors.ink,
    paddingHorizontal: 0,
    paddingTop: 4,
    paddingBottom: 12,
  },
  dockSpace: { height: DOCK_SPACE },
  notices: { flexGrow: 0, maxHeight: "40%", marginBottom: 8 },
}));
