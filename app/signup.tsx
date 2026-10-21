import { useState } from "react";
import { Text } from "react-native";
import { router } from "expo-router";
import { useMutation, useQuery } from "@tanstack/react-query";
import { auth } from "../src/api/auth";
import { useSession } from "../src/state/session";
import { EmailCodeField } from "../src/components/auth/EmailCodeField";
import {
  ConsentBox,
  isConsentComplete,
  toSignupConsent,
  type ConsentState,
} from "../src/components/auth/ConsentBox";
import {
  NICKNAME_MAX,
  PASSWORD_MAX,
  PASSWORD_MIN,
  fieldOfError,
  isEmail,
  type SignupField,
} from "../src/components/auth/authRules";
import {
  Button,
  Card,
  ErrorBox,
  Field,
  Label,
  Loading,
  Screen,
  useUi,
} from "../src/components/ui";

// 회원가입. 북키 계정과 같은 계정이라 가입 방식(이메일 코드·본인인증)은 서버 설정을 따른다.
export default function Signup() {
  const ui = useUi();
  const session = useSession();
  const config = useQuery({
    queryKey: ["signup-config"],
    queryFn: auth.signupConfig,
  });
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [codeVerified, setCodeVerified] = useState(false);
  const [nickname, setNickname] = useState("");
  const [password, setPassword] = useState("");
  const [consent, setConsent] = useState<ConsentState>({ age: false });
  const [validation, setValidation] = useState("");
  const needsCode = config.data?.verification === "EMAIL_CODE";
  const signup = useMutation({
    mutationFn: () =>
      auth.signup({
        email: email.trim(),
        password,
        nickname: nickname.trim(),
        code: needsCode ? code : undefined,
        consent: toSignupConsent(consent),
      }),
    onSuccess: async (tokens) => {
      await session.authenticate({
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
      });
      // 가입하면 바로 관심 장르를 고른다. 홈 열매를 고를 때 쓴다.
      if (router.canDismiss()) router.dismissAll();
      router.replace({ pathname: "/genres", params: { onboarding: "1" } });
    },
  });
  const serverField = fieldOfError(signup.error);
  const errorOf = (field: SignupField) =>
    serverField === field && signup.error instanceof Error
      ? signup.error.message
      : undefined;

  function submit() {
    const message = checkForm();
    setValidation(message);
    if (!message) signup.mutate();
  }
  function checkForm() {
    if (!isEmail(email.trim())) return "이메일 주소를 다시 확인해 주세요.";
    if (needsCode && !codeVerified)
      return "이메일 인증 코드를 먼저 확인해 주세요.";
    const name = nickname.trim();
    if (!name || name.length > NICKNAME_MAX)
      return "닉네임을 50자 안으로 적어 주세요.";
    if (password.length < PASSWORD_MIN || password.length > PASSWORD_MAX)
      return "비밀번호는 8~72자로 정해 주세요.";
    if (!isConsentComplete(consent))
      return "필수 항목(만 14세 이상, 이용약관, 개인정보 수집·이용)에 모두 동의해 주세요.";
    return "";
  }

  if (config.isPending)
    return (
      <Screen title="회원가입">
        <Loading />
      </Screen>
    );
  if (config.error)
    return (
      <Screen title="회원가입">
        <ErrorBox
          error={config.error}
          retry={() => {
            void config.refetch();
          }}
        />
      </Screen>
    );
  // 휴대폰 본인인증은 북키 앱에서도 아직 연결 전이라 여기서는 안내만 한다.
  if (config.data.verification === "IDENTITY")
    return (
      <Screen title="회원가입">
        <Card>
          <Text style={ui.body}>
            지금은 휴대폰 본인인증으로만 가입할 수 있어요. 북키 앱에서 가입한 뒤
            같은 계정으로 로그인해 주세요.
          </Text>
          <Button outline onPress={() => router.back()}>
            로그인으로 돌아가기
          </Button>
        </Card>
      </Screen>
    );

  return (
    <Screen title="회원가입">
      <Label>JOIN THE RELAY</Label>
      <Text style={ui.heading}>북키 계정을{"\n"}만들어 주세요.</Text>
      <Text style={[ui.body, { marginBottom: 24 }]}>
        북키와 같은 계정이라 북키 앱에서도 그대로 로그인할 수 있어요.
      </Text>
      <Field
        label="이메일"
        value={email}
        onChangeText={(value) => {
          setEmail(value);
          setCodeVerified(false);
        }}
        keyboardType="email-address"
        autoCapitalize="none"
        autoComplete="email"
      />
      {!!errorOf("email") && <ErrorBox error={new Error(errorOf("email"))} />}
      {needsCode && (
        <EmailCodeField
          email={email}
          code={code}
          onChangeCode={setCode}
          verified={codeVerified}
          onVerified={setCodeVerified}
          serverError={errorOf("code")}
        />
      )}
      <Field
        label="닉네임"
        value={nickname}
        onChangeText={setNickname}
        maxLength={NICKNAME_MAX}
        autoComplete="nickname"
      />
      {!!errorOf("nickname") && (
        <ErrorBox error={new Error(errorOf("nickname"))} />
      )}
      <Field
        label="비밀번호"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        maxLength={PASSWORD_MAX}
        autoComplete="new-password"
        placeholder="8자 이상"
      />
      <ConsentBox value={consent} onChange={setConsent} />
      {!!validation && <ErrorBox error={new Error(validation)} />}
      {!!signup.error && !serverField && <ErrorBox error={signup.error} />}
      <Button
        onPress={submit}
        disabled={
          signup.isPending ||
          !isConsentComplete(consent) ||
          (needsCode && !codeVerified)
        }
      >
        {signup.isPending ? "가입하는 중…" : "이메일로 회원가입"}
      </Button>
    </Screen>
  );
}
