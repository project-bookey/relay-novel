import { useState } from "react";
import { Text } from "react-native";
import { Redirect, router } from "expo-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { novels } from "../src/api/novels";
import { useSession } from "../src/state/session";
import {
  Screen,
  Label,
  Field,
  Button,
  ErrorBox,
  ui,
} from "../src/components/ui";
export default function Join() {
  const { mode } = useSession(),
    client = useQueryClient();
  const [code, setCode] = useState("");
  const mutation = useMutation({
    mutationFn: novels.join,
    onSuccess: (d) => {
      void client.invalidateQueries({ queryKey: ["novels"] });
      router.replace(`/novel/${d.novel.id}`);
    },
  });
  if (mode !== "authenticated") return <Redirect href="/login" />;
  return (
    <Screen title="초대 코드로 참가">
      <Label>AN INVITATION TO IMAGINE</Label>
      <Text style={ui.heading}>당신을 기다리는{"\n"}이야기가 있어요.</Text>
      <Text style={[ui.body, { marginBottom: 28 }]}>
        전달받은 초대 코드를 입력해 주세요.{"\n"}개설자가 승인하면 집필 순서에
        합류할 수 있어요.
      </Text>
      <Field
        label="초대 코드"
        value={code}
        onChangeText={setCode}
        autoCapitalize="none"
        autoCorrect={false}
        maxLength={32}
        placeholder="32자리 초대 코드"
      />
      {!!mutation.error && <ErrorBox error={mutation.error} />}
      <Button
        onPress={() => mutation.mutate(code.trim())}
        disabled={!code.trim() || mutation.isPending}
      >
        {mutation.isPending ? "신청하는 중…" : "참가 신청하기"}
      </Button>
    </Screen>
  );
}
