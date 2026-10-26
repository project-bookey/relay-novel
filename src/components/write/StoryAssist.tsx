import { useState } from "react";
import { Pressable, View } from "react-native";
import { Text, TextInput, WEB_NO_FOCUS_RING } from "../text";
import { useMutation } from "@tanstack/react-query";
import type {
  StoryMode,
  StoryRequest,
  StorySuggestions,
} from "../../api/types";
import { themedStyles, useColors } from "../../theme/themed";
import { ErrorBox } from "../ui";
import { applyStory, plotPrompt } from "./storySuggestions";
import { PaneButton, PaneHead, PaneNote, usePaneStyles } from "./pane";
import { StorySuggestionList } from "./StorySuggestionList";

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

// 이야기 제안 팝업: 이어쓰기·전개 추천·첫 문단 가운데 하나를 골라 제안받고, 읽어 본 뒤 원고에 넣는다.
export function StoryAssist({
  body,
  hasPrevious,
  disabled,
  generate,
  onApply,
  onClose,
}: {
  body: string;
  hasPrevious: boolean;
  disabled: boolean;
  generate: (
    request: Omit<StoryRequest, "turnNumber">,
  ) => Promise<StorySuggestions>;
  onApply: (body: string) => void;
  onClose: () => void;
}) {
  const pane = usePaneStyles();
  const styles = useStyles();
  const colors = useColors();
  const [mode, setMode] = useState<StoryMode>(
    body.trim() || hasPrevious ? "CONTINUE" : "OPENING",
  );
  const [prompt, setPrompt] = useState("");
  const [error, setError] = useState<Error | null>(null);
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
    setMode(next);
    mutation.mutate({ mode: next, body, seed: prompt, hint });
  };
  const insert = (text: string) => {
    if (!result) return;
    try {
      onApply(applyStory(body, result.body, result.mode, text));
      mutation.reset();
      setError(null);
    } catch (cause) {
      setError(cause as Error);
    }
  };

  return (
    <>
      <PaneHead title="이야기 제안" onClose={onClose} />
      <View style={styles.modes}>
        {modes.map((item) => {
          const selected = mode === item.mode;
          return (
            <Pressable
              key={item.mode}
              accessibilityRole="tab"
              accessibilityLabel={item.label}
              accessibilityState={{
                selected,
                disabled: mutation.isPending,
              }}
              disabled={mutation.isPending}
              style={[styles.mode, selected && styles.modeSelected]}
              onPress={() => {
                setMode(item.mode);
                mutation.reset();
                setError(null);
              }}
            >
              <Text
                style={[styles.modeText, selected && styles.modeTextSelected]}
              >
                {item.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
      <Text style={[pane.hint, styles.modeHint]}>{choice.hint}</Text>
      <View style={styles.field}>
        <Text style={styles.fieldLabel}>
          {mode === "OPENING" ? "소재·분위기" : "소재·분위기 (선택)"}
        </Text>
        <TextInput
          accessibilityLabel="소재·분위기·원하는 방향"
          value={prompt}
          onChangeText={setPrompt}
          maxLength={300}
          multiline
          placeholderTextColor={colors.muted}
          underlineColorAndroid="transparent"
          style={[styles.fieldInput, WEB_NO_FOCUS_RING]}
          placeholder={
            mode === "OPENING"
              ? "예: 비 오는 밤, 낯선 편지를 받은 소녀. 잔잔하고 신비롭게."
              : "예: 긴장감을 높이고, 인물의 대사를 넣어 주세요."
          }
        />
      </View>
      <View style={pane.stack}>
        <PaneButton
          disabled={!allowed || !hasMaterial}
          onPress={() => start(mode)}
        >
          {mutation.isPending ? "이야기를 생각하고 있어요…" : choice.action}
        </PaneButton>
      </View>
      {!!(error || mutation.error) && (
        <ErrorBox error={error || mutation.error} />
      )}
      {!!result && (
        <StorySuggestionList
          mode={result.mode}
          suggestions={result.suggestions}
          stale={stale}
          allowed={allowed}
          onPickPlot={(option) => start("CONTINUE", plotPrompt(prompt, option))}
          onInsert={insert}
        />
      )}
      <PaneNote>
        앞 회차와 원고의 끝부분, 적은 소재만 AI 서비스로 전송해요. 전개를 고르면
        그 방향으로 이어 쓸 문단을 먼저 보여 드려요.
      </PaneNote>
    </>
  );
}

const useStyles = themedStyles((colors) => ({
  // 방식마다 안내가 한 줄·두 줄이라, 탭을 바꿀 때 팝업 높이가 흔들리지 않게 늘 두 줄 자리를 잡아 둔다
  // (줄 높이 22 × 2, 사용자 요청).
  modeHint: { minHeight: 44 },
  // 세 가지 제안 방식. 옅은 바탕 칸 안에서 고른 것만 유리 방울로 띄운다.
  modes: {
    flexDirection: "row",
    gap: 4,
    padding: 4,
    marginTop: 6,
    borderRadius: 26,
    backgroundColor: colors.searchField,
  },
  mode: {
    flex: 1,
    minHeight: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  modeSelected: {
    backgroundColor: colors.lensFill,
    boxShadow: colors.lensShadow,
  },
  modeText: { fontSize: 14, color: colors.muted },
  modeTextSelected: { color: colors.ink, fontWeight: "800" },
  field: {
    marginTop: 12,
    paddingHorizontal: 14,
    paddingTop: 9,
    paddingBottom: 6,
    borderRadius: 14,
    backgroundColor: colors.lensFill,
    borderWidth: 1,
    borderColor: colors.lensEdge,
    boxShadow: colors.lensShadow,
  },
  fieldLabel: { fontSize: 11.5, color: colors.muted },
  fieldInput: {
    minHeight: 48,
    paddingTop: 2,
    paddingBottom: 4,
    paddingHorizontal: 0,
    fontSize: 15,
    lineHeight: 22,
    color: colors.ink,
    textAlignVertical: "top",
  },
}));
