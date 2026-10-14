import { useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { useMutation } from "@tanstack/react-query";
import { auth } from "../../api/auth";
import type { EmailCode } from "../../api/types";
import { colors } from "../../theme";
import { Button, Field, ui } from "../ui";
import { CODE_LENGTH, formatRemaining, isCode, isEmail } from "./authRules";

// 이메일 인증 코드 받기·확인. 코드는 여기서 확인만 하고, 가입할 때 같은 코드를 다시 보낸다.
// 남은 시간은 서버가 준 expiresInSec으로 센다. 다시 받기는 기다림 없이 되고, 1시간 상한은 서버가 센다.
export function EmailCodeField({
  email,
  code,
  onChangeCode,
  verified,
  onVerified,
  serverError,
}: {
  email: string;
  code: string;
  onChangeCode: (code: string) => void;
  verified: boolean;
  onVerified: (verified: boolean) => void;
  // 가입 요청에서 돌아온 코드 오류
  serverError?: string;
}) {
  const [issued, setIssued] = useState<EmailCode & { at: number }>();
  const [now, setNow] = useState(Date.now());
  const [message, setMessage] = useState("");
  const send = useMutation({
    mutationFn: () => auth.sendEmailCode(email.trim()),
    onSuccess: (result) => {
      setIssued({ ...result, at: Date.now() });
      onVerified(false);
      setMessage("");
    },
    onError: (error) =>
      setMessage(
        error instanceof Error ? error.message : "인증 코드를 보내지 못했어요.",
      ),
  });
  const verify = useMutation({
    mutationFn: () => auth.verifyEmailCode(email.trim(), code),
    onSuccess: () => {
      onVerified(true);
      setMessage("");
    },
    onError: (error) =>
      setMessage(
        error instanceof Error
          ? error.message
          : "인증 코드를 확인하지 못했어요.",
      ),
  });
  useEffect(() => {
    if (!issued || verified) return;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [issued, verified]);

  const remaining = issued ? issued.expiresInSec - (now - issued.at) / 1000 : 0;
  const expired = !!issued && !verified && remaining <= 0;
  const used = issued
    ? issued.sendLimit - (issued.resendsLeft ?? issued.sendLimit)
    : 0;
  const shownMessage = expired
    ? "입력 시간이 지났어요. 코드를 다시 받아 주세요."
    : serverError || message;

  return (
    <View style={styles.block}>
      <Button
        outline
        disabled={!isEmail(email.trim()) || send.isPending}
        onPress={() => send.mutate()}
      >
        {issued
          ? `코드 다시 받기 (${used}/${issued.sendLimit})`
          : "인증 코드 받기"}
      </Button>
      {!!issued && (
        <>
          <Field
            label="이메일 인증 코드"
            value={code}
            onChangeText={(value) => {
              onChangeCode(value.replace(/\D/g, ""));
              onVerified(false);
            }}
            keyboardType="number-pad"
            maxLength={CODE_LENGTH}
            autoComplete="one-time-code"
            placeholder="6자리 숫자"
          />
          {!!issued.devCode && (
            <Text style={ui.hint}>{`개발 서버 코드 ${issued.devCode}`}</Text>
          )}
          {verified ? (
            <Text style={styles.verified}>이메일을 확인했어요.</Text>
          ) : (
            <View style={ui.row}>
              <Text style={ui.hint}>
                {expired
                  ? "시간 초과"
                  : `남은 시간 ${formatRemaining(remaining)}`}
              </Text>
              <Button
                outline
                disabled={!isCode(code) || expired || verify.isPending}
                onPress={() => verify.mutate()}
              >
                코드 확인
              </Button>
            </View>
          )}
        </>
      )}
      {!!shownMessage && (
        <Text accessibilityRole="alert" style={[ui.errorText, styles.error]}>
          {shownMessage}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  block: { marginBottom: 18 },
  verified: { fontSize: 13, color: colors.green, fontWeight: "600" },
  error: { marginTop: 6 },
});
