import { useState } from "react";
import { Text, View, Pressable, StyleSheet } from "react-native";
import { Redirect, router, useLocalSearchParams } from "expo-router";
import { auth } from "../src/api/auth";
import { useSession } from "../src/state/session";
import { HomeTree } from "../src/components/HomeTree";
import {
  Button,
  ErrorBox,
  Field,
  Label,
  Screen,
  useUi,
} from "../src/components/ui";
export default function Login() {
  const ui = useUi();
  const session = useSession();
  // 쓰던 원고 화면에서 다시 로그인하러 왔으면 그 화면으로 돌아간다.
  const { returnBack } = useLocalSearchParams<{ returnBack?: string }>();
  const [email, setEmail] = useState(""),
    [password, setPassword] = useState(""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState<unknown>();
  // 이미 로그인했으면(가입 직후 뒤로 가기 등) 홈으로 보낸다. 원고 화면에서 다시 로그인하러 온 경우는 제외한다.
  if (session.mode === "authenticated" && returnBack !== "1")
    return <Redirect href="/" />;
  async function submit() {
    setBusy(true);
    setError(undefined);
    try {
      await session.authenticate(await auth.login(email.trim(), password));
      const canReturn = returnBack === "1" && router.canGoBack();
      if (canReturn) router.back();
      else router.replace("/");
    } catch (e) {
      setError(e);
    } finally {
      setBusy(false);
    }
  }
  return (
    <Screen>
      <View style={{ paddingTop: 15 }}>
        <Label>RELAY NOVEL</Label>
        <HomeTree />
        <Text style={ui.heading}>너의 한 문장,{"\n"}우리의 다음 이야기.</Text>
        <Text style={[ui.body, { marginBottom: 26 }]}>
          {"작은 상상들이 만나\n하나의 세계가 되는 곳."}
        </Text>
        <Field
          label="Bookey 계정 이메일"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          autoComplete="email"
        />
        <Field
          label="비밀번호"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          autoComplete="current-password"
          onSubmitEditing={() => {
            if (email && password && !busy) void submit();
          }}
        />
        {!!error && <ErrorBox error={error} />}
        <Button
          onPress={() => {
            void submit();
          }}
          disabled={busy || !email.trim() || !password}
        >
          {busy ? "로그인 중…" : "로그인하고 이야기 이어가기"}
        </Button>
        <Text style={ui.hint}>Bookey 계정으로 로그인해요.</Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="처음이라면 회원가입"
          onPress={() => router.push("/signup")}
          style={styles.signup}
        >
          <Text style={ui.label}>처음이라면 회원가입</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          onPress={() => {
            session.demo();
            // 원고 화면에서 왔다면 그 화면이 스택에 남지 않게 처음으로 되돌린다.
            if (router.canDismiss()) router.dismissAll();
            router.replace("/");
          }}
          style={{ padding: 16, alignItems: "center" }}
        >
          <Text style={ui.body}>먼저 둘러보기 →</Text>
        </Pressable>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  signup: { minHeight: 48, alignItems: "center", justifyContent: "center" },
});
