import { StyleSheet, Text, View } from "react-native";
import type { Member } from "../../api/types";
import { colors } from "../../theme";
import { Button, Card, ui } from "../ui";

function memberTitle(member: Member) {
  const roles = [member.nickname];
  if (member.owner) roles.push("개설자");
  return roles.join(" · ");
}

export function MemberList({ members }: { members: Member[] }) {
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

export function ApplicationList({
  applications,
  busy,
  onDecide,
}: {
  applications: Member[];
  busy: boolean;
  onDecide: (userId: number, approved: boolean) => void;
}) {
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

const styles = StyleSheet.create({
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
});
