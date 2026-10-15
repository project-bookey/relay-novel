import { Pressable, Text, View } from "react-native";
import { useQuery } from "@tanstack/react-query";
import { follows } from "../../api/follows";
import { themedStyles } from "../../theme/themed";
import { ErrorBox, Loading, useUi } from "../ui";

// 나를 빼고 고를 수 있는 작가 수. 나까지 열 명이 함께 쓴다.
export const MAX_INVITEES = 9;

// 모여 만들기에서 함께 쓸 작가 고르기. 팔로우한 작가만 고를 수 있다(서버도 같은 규칙으로 막는다).
export function FollowPicker({
  selected,
  onChange,
}: {
  selected: number[];
  onChange: (userIds: number[]) => void;
}) {
  const ui = useUi();
  const styles = useStyles();
  const following = useQuery({
    queryKey: ["follows", "following"],
    queryFn: () => follows.following(0),
  });
  const people = following.data?.content ?? [];
  const full = selected.length >= MAX_INVITEES;
  const toggle = (userId: number) => {
    if (selected.includes(userId))
      onChange(selected.filter((id) => id !== userId));
    else if (!full) onChange([...selected, userId]);
  };

  return (
    <View style={styles.block}>
      <View style={ui.row}>
        <Text style={ui.label}>함께 쓸 작가</Text>
        <Text style={styles.count}>
          {`${selected.length}/${MAX_INVITEES}명`}
        </Text>
      </View>
      {following.isPending && <Loading />}
      {!!following.error && (
        <ErrorBox
          error={following.error}
          retry={() => {
            void following.refetch();
          }}
        />
      )}
      {!following.isPending && !following.error && people.length === 0 && (
        <Text style={ui.hint}>
          팔로우한 작가가 없어요. 북키에서 작가를 팔로우하면 여기서 고를 수
          있어요.
        </Text>
      )}
      {people.map((person) => {
        const checked = selected.includes(person.userId);
        const disabled = !checked && full;
        return (
          <Pressable
            key={person.userId}
            accessibilityRole="checkbox"
            accessibilityState={{ checked, disabled }}
            accessibilityLabel={person.nickname}
            disabled={disabled}
            onPress={() => toggle(person.userId)}
            style={[styles.person, disabled && styles.disabled]}
          >
            <View style={[styles.box, checked && styles.boxChecked]}>
              {checked && <Text style={styles.check}>✓</Text>}
            </View>
            <Text style={styles.name}>{person.nickname}</Text>
            {person.mutual && <Text style={styles.mutual}>맞팔로우</Text>}
          </Pressable>
        );
      })}
      {!!following.data?.hasNext && (
        <Text style={ui.hint}>최근에 팔로우한 50명까지 보여요.</Text>
      )}
      {full && (
        <Text style={ui.hint}>나까지 열 명이 모였어요. 더 고를 수 없어요.</Text>
      )}
    </View>
  );
}

const useStyles = themedStyles((colors) => ({
  block: { marginTop: 10, gap: 4 },
  count: { fontSize: 12, color: colors.muted },
  person: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    minHeight: 48,
  },
  disabled: { opacity: 0.4 },
  box: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: colors.muted,
    alignItems: "center",
    justifyContent: "center",
  },
  boxChecked: { backgroundColor: colors.ink, borderColor: colors.ink },
  check: { color: colors.paper, fontSize: 13, fontWeight: "700" },
  name: { flex: 1, fontSize: 14, color: colors.ink },
  mutual: { fontSize: 11, color: colors.muted },
}));
