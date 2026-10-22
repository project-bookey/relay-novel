import { StyleSheet } from "react-native";
import { Text } from "../text";
import type { NovelMode } from "../../api/types";
import { MAX_BODY_LENGTH } from "../write/limits";
import { Field, useUi } from "../ui";

// 다음에 무엇이 일어나는지. 1회차는 작품과 함께 올라가 홈의 열매가 되거나 다음 작가에게 넘어간다.
function afterPublishHint(mode: NovelMode) {
  if (mode === "OPEN")
    return "만들면 1회차가 바로 올라가 다른 사람들의 홈에 이어 쓸 수 있는 열매로 놓여요. 올린 회차는 수정할 수 없어요.";
  return "만들면 1회차가 바로 올라가고 다음 작가에게 차례가 넘어가요. 올린 회차는 수정할 수 없어요.";
}

// 작품을 만드는 사람이 쓰는 1회차. 회차 없는 작품이 열매로 떨어지지 않게 작품과 함께 올린다.
export function FirstChapterFields({
  mode,
  title,
  body,
  onChange,
}: {
  mode: NovelMode;
  title: string;
  body: string;
  onChange: (changes: { firstTitle?: string; firstBody?: string }) => void;
}) {
  const ui = useUi();
  return (
    <>
      <Field
        label="1회차 제목"
        value={title}
        onChangeText={(value) => onChange({ firstTitle: value })}
        maxLength={120}
        placeholder="첫 장의 이름"
      />
      <Field
        label="1회차 이야기"
        value={body}
        onChangeText={(value) => onChange({ firstBody: value })}
        multiline
        maxLength={MAX_BODY_LENGTH}
        style={styles.bodyInput}
        placeholder="이야기의 첫 장을 직접 써 주세요. 다음 작가는 이 장에서 이어 써요."
      />
      <Text style={ui.hint}>
        {`${body.length.toLocaleString()} / ${MAX_BODY_LENGTH.toLocaleString()}자 · ${afterPublishHint(mode)}`}
      </Text>
    </>
  );
}

const styles = StyleSheet.create({
  bodyInput: { minHeight: 240, lineHeight: 27 },
});
