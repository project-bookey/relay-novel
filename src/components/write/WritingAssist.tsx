import { useState } from "react";
import { View } from "react-native";
import { Text } from "../text";
import { useMutation } from "@tanstack/react-query";
import { ErrorBox } from "../ui";
import {
  applyRewrite,
  passageOf,
  rewriteTarget,
  type TextSelection,
} from "./rewriteTarget";
import { PaneButton, PaneHead, PaneNote, usePaneStyles } from "./pane";

// 다듬기 팝업: 고른 부분(없으면 원고 전체)을 AI로 다듬어 원래 글과 견주어 본 뒤 바꾼다.
export function WritingAssist({
  body,
  selection,
  disabled,
  rewrite,
  onApply,
  onClose,
}: {
  body: string;
  selection: TextSelection;
  disabled: boolean;
  rewrite: (text: string) => Promise<{ text: string }>;
  onApply: (body: string) => void;
  onClose: () => void;
}) {
  const pane = usePaneStyles();
  const [error, setError] = useState<Error | null>(null);
  const mutation = useMutation({
    mutationFn: async (target: ReturnType<typeof rewriteTarget>) => {
      const result = await rewrite(target.text);
      return { target, text: result.text };
    },
    retry: false,
  });
  const suggestion = mutation.data;
  const stale = !!suggestion && body !== suggestion.target.body;
  const passage = passageOf(body, selection);
  const canRequest = !disabled && !mutation.isPending && !!body.trim();
  const request = () => {
    setError(null);
    try {
      mutation.mutate(rewriteTarget(body, selection));
    } catch (cause) {
      setError(cause as Error);
    }
  };
  const apply = () => {
    if (!suggestion) return;
    try {
      onApply(applyRewrite(body, suggestion.target, suggestion.text));
      mutation.reset();
      setError(null);
    } catch (cause) {
      setError(cause as Error);
    }
  };

  return (
    <>
      <PaneHead
        kicker={passage.selected ? "고른 부분" : "원고 전체"}
        title="문장 다듬기"
        onClose={onClose}
      />
      {suggestion ? (
        <>
          <Text style={pane.label}>다듬은 부분</Text>
          <Text style={pane.quote} numberOfLines={4}>
            {suggestion.target.text}
          </Text>
          <Text style={pane.label}>이렇게 다듬어 봤어요</Text>
          <Text selectable style={pane.suggestion}>
            {suggestion.text}
          </Text>
          {stale && (
            <Text style={pane.warning}>
              요청한 뒤 원고가 바뀌었어요. 현재 원고로 다시 다듬어 주세요.
            </Text>
          )}
          <View style={pane.actions}>
            <PaneButton
              grow
              disabled={disabled || mutation.isPending || stale}
              onPress={apply}
            >
              바꾸기
            </PaneButton>
            <PaneButton grow quiet disabled={!canRequest} onPress={request}>
              다시 다듬기
            </PaneButton>
          </View>
        </>
      ) : (
        <>
          <Text style={pane.label}>
            {passage.selected ? "고른 부분" : "원고 전체"}
          </Text>
          <Text style={pane.quote} numberOfLines={4}>
            {passage.text || "먼저 다듬을 이야기를 적어 주세요."}
          </Text>
          <View style={pane.stack}>
            <PaneButton disabled={!canRequest} onPress={request}>
              {mutation.isPending
                ? "문장을 다듬고 있어요…"
                : "AI로 문장 다듬기"}
            </PaneButton>
          </View>
        </>
      )}
      {!!(error || mutation.error) && (
        <ErrorBox error={error || mutation.error} />
      )}
      <PaneNote>
        누르면 다듬을 글이 AI 서비스로 전송돼요. 원고에서 부분을 고르면 그
        부분만, 고르지 않으면 원고 전체를 한 번에 2,000자까지 보내요.
      </PaneNote>
    </>
  );
}
