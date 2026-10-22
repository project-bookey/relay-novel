import { useState } from "react";
import { Text } from "../text";
import { useMutation } from "@tanstack/react-query";
import { Button, Card, ErrorBox, useUi } from "../ui";
import {
  applyRewrite,
  rewriteTarget,
  type TextSelection,
} from "./rewriteTarget";

export function WritingAssist({
  body,
  selection,
  disabled,
  rewrite,
  onApply,
}: {
  body: string;
  selection: TextSelection;
  disabled: boolean;
  rewrite: (text: string) => Promise<{ text: string }>;
  onApply: (body: string) => void;
}) {
  const ui = useUi();
  const [error, setError] = useState<Error | null>(null);
  const [applied, setApplied] = useState(false);
  const mutation = useMutation({
    mutationFn: async (target: ReturnType<typeof rewriteTarget>) => {
      const result = await rewrite(target.text);
      return { target, text: result.text };
    },
    retry: false,
  });
  const suggestion = mutation.data;
  const stale = !!suggestion && body !== suggestion.target.body;
  return (
    <Card>
      <Text style={ui.label}>내 문장 다듬기</Text>
      <Text style={ui.hint}>
        의미와 말투를 살려 어색한 표현을 다듬어요. 부분을 선택하면 그 부분만,
        선택하지 않으면 원고 전체를 다듬어요. 한 번에 최대 2,000자까지 보낼 수
        있어요.
      </Text>
      <Text style={ui.hint}>
        누르면 다듬을 글이 AI 서비스로 전송돼요. 제안은 확인한 뒤 적용해 주세요.
      </Text>
      <Button
        outline
        disabled={disabled || mutation.isPending || !body.trim()}
        onPress={() => {
          setError(null);
          setApplied(false);
          try {
            const target = rewriteTarget(body, selection);
            mutation.mutate(target);
          } catch (cause) {
            setError(cause as Error);
          }
        }}
      >
        {mutation.isPending ? "문장을 다듬고 있어요…" : "AI로 문장 다듬기"}
      </Button>
      {!!(error || mutation.error) && (
        <ErrorBox error={error || mutation.error} />
      )}
      {suggestion && (
        <>
          <Text style={ui.label}>다듬기 제안</Text>
          <Text selectable style={ui.body}>
            {suggestion.text}
          </Text>
          {stale && (
            <Text style={ui.hint}>
              요청한 뒤 원고가 바뀌었어요. 현재 원고로 다시 다듬어 주세요.
            </Text>
          )}
          <Button
            disabled={disabled || mutation.isPending || stale}
            onPress={() => {
              try {
                onApply(applyRewrite(body, suggestion.target, suggestion.text));
                mutation.reset();
                setApplied(true);
                setError(null);
              } catch (cause) {
                setError(cause as Error);
              }
            }}
          >
            제안 적용
          </Button>
          <Button
            outline
            disabled={mutation.isPending}
            onPress={() => mutation.reset()}
          >
            제안 닫기
          </Button>
        </>
      )}
      {applied && (
        <Text style={ui.hint}>
          제안을 적용했어요. 임시저장하거나 계속 써 주세요.
        </Text>
      )}
    </Card>
  );
}
