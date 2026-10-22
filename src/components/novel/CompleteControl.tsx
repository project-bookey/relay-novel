import { Text } from "../text";
import { Button, Card, useUi } from "../ui";

// 완결은 되돌릴 수 없어 한 번 더 묻는다.
export function CompleteControl({
  confirming,
  busy,
  onAsk,
  onCancel,
  onComplete,
}: {
  confirming: boolean;
  busy: boolean;
  onAsk: () => void;
  onCancel: () => void;
  onComplete: () => void;
}) {
  const ui = useUi();
  if (!confirming)
    return (
      <Button outline onPress={onAsk}>
        이야기 완결하기
      </Button>
    );
  return (
    <Card>
      <Text style={ui.label}>이 작품을 완결할까요?</Text>
      <Text style={ui.hint}>
        완결하면 추가 집필이 끝나고, 아직 자리를 맡은 열매도 거둬들여요.
      </Text>
      <Button disabled={busy} onPress={onComplete}>
        완결하기
      </Button>
      <Button outline disabled={busy} onPress={onCancel}>
        계속 이어 쓰기
      </Button>
    </Card>
  );
}
