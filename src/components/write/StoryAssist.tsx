import { useState } from "react";
import { Pressable, Text, View } from "react-native";
import { useMutation } from "@tanstack/react-query";
import type {
  StoryMode,
  StoryRequest,
  StorySuggestions,
} from "../../api/types";
import { Button, Card, ErrorBox, Field, useUi } from "../ui";
import { applyStory, plotPrompt } from "./storySuggestions";

const modes: {
  mode: StoryMode;
  label: string;
  action: string;
  hint: string;
}[] = [
  {
    mode: "CONTINUE",
    label: "이어쓰기",
    action: "다음 문단 제안받기",
    hint: "앞 회차와 지금 쓰는 원고를 이어갈 짧은 문단을 제안해요.",
  },
  {
    mode: "PLOT",
    label: "전개 추천",
    action: "전개 3가지 추천받기",
    hint: "다음에 일어날 사건을 세 가지로 제안해요. 마음에 드는 방향을 골라 이어 써 보세요.",
  },
  {
    mode: "OPENING",
    label: "첫 문단",
    action: "첫 문단 만들기",
    hint: "소재나 분위기를 적으면 이번 장을 여는 첫 문단을 만들어 드려요.",
  },
];

export function StoryAssist({
  body,
  hasPrevious,
  disabled,
  generate,
  onApply,
}: {
  body: string;
  hasPrevious: boolean;
  disabled: boolean;
  generate: (
    request: Omit<StoryRequest, "turnNumber">,
  ) => Promise<StorySuggestions>;
  onApply: (body: string) => void;
}) {
  const ui = useUi();
  const [mode, setMode] = useState<StoryMode>(
    body.trim() || hasPrevious ? "CONTINUE" : "OPENING",
  );
  const [prompt, setPrompt] = useState("");
  const [error, setError] = useState<Error | null>(null);
  const [applied, setApplied] = useState(false);
  const mutation = useMutation({
    mutationFn: async (request: {
      mode: StoryMode;
      body: string;
      seed: string;
      hint: string;
    }) => {
      const result = await generate({
        mode: request.mode,
        body: request.body,
        prompt: request.hint,
      });
      return { ...request, ...result };
    },
    retry: false,
  });
  const choice = modes.find((item) => item.mode === mode)!;
  const result = mutation.data;
  const stale = !!result && (result.body !== body || result.seed !== prompt);
  const allowed = !disabled && !mutation.isPending;
  const hasMaterial =
    mode === "OPENING"
      ? !!prompt.trim()
      : !!(body.trim() || prompt.trim() || hasPrevious);
  const start = (next: StoryMode, hint = prompt) => {
    setError(null);
    setApplied(false);
    setMode(next);
    mutation.mutate({ mode: next, body, seed: prompt, hint });
  };
  return (
    <Card>
      <Text style={ui.label}>다음 이야기가 막힐 때</Text>
      <View
        style={{
          flexDirection: "row",
          flexWrap: "wrap",
          gap: 8,
          marginTop: 14,
        }}
      >
        {modes.map((item) => (
          <Pressable
            key={item.mode}
            accessibilityRole="tab"
            accessibilityLabel={item.label}
            accessibilityState={{
              selected: mode === item.mode,
              disabled: mutation.isPending,
            }}
            disabled={mutation.isPending}
            style={[ui.pill, mode === item.mode && ui.pillSelected]}
            onPress={() => {
              setMode(item.mode);
              mutation.reset();
              setError(null);
              setApplied(false);
            }}
          >
            <Text
              style={[ui.pillText, mode === item.mode && ui.pillTextSelected]}
            >
              {item.label}
            </Text>
          </Pressable>
        ))}
      </View>
      <Text style={ui.hint}>{choice.hint}</Text>
      <Field
        label="소재·분위기·원하는 방향"
        value={prompt}
        onChangeText={setPrompt}
        maxLength={300}
        multiline
        style={{ minHeight: 90 }}
        placeholder={
          mode === "OPENING"
            ? "예: 비 오는 밤, 낯선 편지를 받은 소녀. 잔잔하고 신비롭게."
            : "선택 사항 · 예: 긴장감을 높이고, 인물의 대사를 넣어 주세요."
        }
      />
      <Text style={ui.hint}>
        앞 회차와 원고의 끝부분, 입력한 소재만 AI 서비스로 전송해요. 제안은 직접
        확인하고 넣어 주세요.
      </Text>
      <Button
        outline
        disabled={!allowed || !hasMaterial}
        onPress={() => start(mode)}
      >
        {mutation.isPending ? "이야기를 생각하고 있어요…" : choice.action}
      </Button>
      {!!(error || mutation.error) && (
        <ErrorBox error={error || mutation.error} />
      )}
      {result && (
        <>
          <Text style={ui.hint}>
            {result.mode === "PLOT"
              ? "어떤 방향으로 이어갈까요?"
              : "원고에 넣기 전에 읽어 보세요."}
          </Text>
          {stale && (
            <Text style={ui.hint}>
              요청한 뒤 원고나 소재가 바뀌었어요. 현재 내용으로 다시 제안받아
              주세요.
            </Text>
          )}
          {result.suggestions.map((option, index) => (
            <View key={index} style={{ gap: 8, marginBottom: 16 }}>
              <Text style={ui.label}>{option.title}</Text>
              <Text selectable style={ui.body}>
                {option.text}
              </Text>
              {result.mode === "PLOT" ? (
                <Button
                  disabled={!allowed || stale}
                  onPress={() => start("CONTINUE", plotPrompt(prompt, option))}
                >
                  {`${index + 1}번 전개로 이어쓰기`}
                </Button>
              ) : (
                <Button
                  disabled={!allowed || stale}
                  onPress={() => {
                    try {
                      onApply(
                        applyStory(body, result.body, result.mode, option.text),
                      );
                      mutation.reset();
                      setApplied(true);
                      setError(null);
                    } catch (cause) {
                      setError(cause as Error);
                    }
                  }}
                >
                  {result.mode === "OPENING"
                    ? "원고 맨 앞에 넣기"
                    : "원고 끝에 넣기"}
                </Button>
              )}
            </View>
          ))}
          <Button
            outline
            disabled={mutation.isPending}
            onPress={() => mutation.reset()}
          >
            이야기 제안 닫기
          </Button>
        </>
      )}
      {applied && (
        <Text style={ui.hint}>
          원고에 넣었어요. 마음에 맞게 고친 뒤 임시저장하거나 발행해 주세요.
        </Text>
      )}
    </Card>
  );
}
