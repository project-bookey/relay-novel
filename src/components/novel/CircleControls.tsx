import { Text } from "../text";
import type { NovelDetail } from "../../api/types";
import { Button, Card, useUi } from "../ui";
import { ApplicationList, MemberList } from "./Members";

// 모여 만들기(차례대로 한 줄기) 작품의 작가 명단과 참가·승인·시작.
// 버튼은 모두 서버가 준 권한 필드(canApply·canStart)로만 보인다.
export function CircleControls({
  detail,
  signedIn,
  busy,
  onApply,
  onDecide,
  onStart,
}: {
  detail: NovelDetail;
  signedIn: boolean;
  busy: boolean;
  onApply: () => void;
  onDecide: (userId: number, approved: boolean) => void;
  onStart: () => void;
}) {
  const ui = useUi();
  const { novel } = detail;
  return (
    <>
      <MemberList members={detail.members} />
      {detail.myMembership === "PENDING" && (
        <Card>
          <Text style={ui.body}>
            참가 신청을 보냈어요. 개설자의 승인을 기다리고 있어요.
          </Text>
        </Card>
      )}
      {signedIn && detail.canApply && (
        <Button disabled={busy} onPress={onApply}>
          함께 쓰기 신청하기
        </Button>
      )}
      <ApplicationList
        applications={detail.applications}
        busy={busy}
        onDecide={onDecide}
      />
      {detail.canStart && (
        <Button disabled={busy} onPress={onStart}>
          모인 작가들과 릴레이 시작하기
        </Button>
      )}
      {novel.mine && novel.status === "RECRUITING" && !detail.canStart && (
        <Text style={ui.hint}>
          함께 쓸 작가가 한 명 이상 있어야 릴레이를 시작할 수 있어요.
        </Text>
      )}
    </>
  );
}
