import { Text, View } from "react-native";
import type { Member } from "../../api/types";
import { themedStyles } from "../../theme/themed";
import { Button, Card, useUi } from "../ui";

function memberTitle(member: Member) {
  const roles = [member.nickname];
  if (member.owner) roles.push("개설자");
  return roles.join(" · ");
}

export function MemberList({ members }: { members: Member[] }) {
  const ui = useUi();
  const styles = useStyles();
  return (
    <>
      <Text style={ui.sectionTitle}>함께 쓰는 작가들</Text>
      <View style={styles.members}>
        {members.map((member) => (
          <View key={member.userId} style={styles.member}>
            <Text style={styles.memberName}>
              {memberTitle(member)}
              {member.currentWriter ? " ✦" : ""}
            </Text>
          </View>
        ))}
      </View>
    </>
  );
}

// 열매로 퍼뜨리는 작품에는 참가자 명단이 없어, 회차를 쓴 작가를 쓴 순서대로 보여 준다.
export function AuthorList({ names }: { names: string[] }) {
  const ui = useUi();
  const styles = useStyles();
  if (!names.length) return null;
  return (
    <>
      <Text style={ui.sectionTitle}>이어 쓴 작가들</Text>
      <View style={styles.members}>
        {names.map((name) => (
          <View key={name} style={styles.member}>
            <Text style={styles.memberName}>{name}</Text>
          </View>
        ))}
      </View>
    </>
  );
}

export function ApplicationList({
  applications,
  busy,
  onDecide,
}: {
  applications: Member[];
  busy: boolean;
  onDecide: (userId: number, approved: boolean) => void;
}) {
  const ui = useUi();
  const styles = useStyles();
  if (!applications.length) return null;
  return (
    <>
      <Text style={ui.sectionTitle}>참가 신청</Text>
      {applications.map((applicant) => (
        <Card key={applicant.userId}>
          <Text style={ui.label}>{applicant.nickname}</Text>
          <View style={styles.decision}>
            <View style={styles.decisionButton}>
              <Button
                disabled={busy}
                onPress={() => onDecide(applicant.userId, true)}
              >
                승인
              </Button>
            </View>
            <View style={styles.decisionButton}>
              <Button
                outline
                disabled={busy}
                onPress={() => onDecide(applicant.userId, false)}
              >
                거절
              </Button>
            </View>
          </View>
        </Card>
      ))}
    </>
  );
}

const useStyles = themedStyles((colors) => ({
  members: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 18,
  },
  member: {
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.line,
  },
  memberName: { fontSize: 12, color: colors.ink },
  decision: { flexDirection: "row", gap: 10 },
  decisionButton: { flex: 1 },
}));
