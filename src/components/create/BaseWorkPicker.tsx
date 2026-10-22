import { useState } from "react";
import { Pressable, View } from "react-native";
import { Text } from "../text";
import { useQuery } from "@tanstack/react-query";
import { novels } from "../../api/novels";
import type { BaseWork } from "../../api/types";
import { themedStyles } from "../../theme/themed";
import { Button, ErrorBox, Loading, useUi } from "../ui";

// 베이스 작품에서 줄거리 가져오기(선택). 고르면 소개와 장르가 채워지고, 채운 소개는 고칠 수 있다.
export function BaseWorkPicker({
  picked,
  onPick,
}: {
  picked?: BaseWork;
  onPick: (work: BaseWork | undefined) => void;
}) {
  const ui = useUi();
  const styles = useStyles();
  const [open, setOpen] = useState(false);
  const works = useQuery({
    queryKey: ["base-works"],
    queryFn: novels.baseWorks,
    enabled: open,
    staleTime: 5 * 60 * 1000,
  });

  if (picked)
    return (
      <View style={styles.picked}>
        <Text style={[ui.body, styles.pickedText]}>
          {`「${picked.title}」의 줄거리를 가져왔어요.`}
        </Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="가져온 줄거리 빼기"
          hitSlop={12}
          onPress={() => onPick(undefined)}
          style={styles.remove}
        >
          <Text style={styles.removeText}>빼기</Text>
        </Pressable>
      </View>
    );
  if (!open)
    return (
      <Button outline onPress={() => setOpen(true)}>
        베이스 작품에서 줄거리 가져오기
      </Button>
    );
  return (
    <View style={styles.list}>
      <Text style={ui.label}>베이스 작품</Text>
      {works.isPending && <Loading />}
      {!!works.error && (
        <ErrorBox
          error={works.error}
          retry={() => {
            void works.refetch();
          }}
        />
      )}
      {works.data?.length === 0 && (
        <Text style={ui.hint}>아직 준비된 베이스 작품이 없어요.</Text>
      )}
      {works.data?.map((work) => (
        <Pressable
          key={work.id}
          accessibilityRole="button"
          accessibilityLabel={`${work.title} 줄거리 가져오기`}
          onPress={() => {
            onPick(work);
            setOpen(false);
          }}
          style={({ pressed }) => [styles.work, pressed && styles.pressed]}
        >
          <Text style={ui.label}>{`${work.title} · ${work.genre}`}</Text>
          <Text style={ui.body} numberOfLines={2}>
            {work.synopsis}
          </Text>
          {!!work.source && <Text style={styles.source}>{work.source}</Text>}
        </Pressable>
      ))}
      <Button outline onPress={() => setOpen(false)}>
        직접 쓸게요
      </Button>
    </View>
  );
}

const useStyles = themedStyles((colors) => ({
  picked: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
    marginVertical: 6,
  },
  pickedText: { flex: 1 },
  remove: { minHeight: 44, minWidth: 44, justifyContent: "center" },
  removeText: { fontSize: 13, color: colors.green, fontWeight: "600" },
  list: { gap: 10, marginVertical: 6 },
  work: {
    padding: 16,
    gap: 6,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.line,
  },
  pressed: { opacity: 0.6 },
  source: { fontSize: 11, color: colors.muted },
}));
