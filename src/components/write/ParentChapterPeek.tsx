import { useState } from "react";
import { Pressable } from "react-native";
import { Text } from "../text";
import { useQuery } from "@tanstack/react-query";
import { novels } from "../../api/novels";
import { useSession } from "../../state/session";
import { themedStyles } from "../../theme/themed";
import { Card, ErrorBox, Label, Loading, useUi } from "../ui";

// 받은 회차를 편집기 위에 접어 둔다. 이어 쓰다가 앞 이야기를 다시 볼 수 있게 펼칠 수 있다.
export function ParentChapterPeek({
  novelId,
  chapterId,
}: {
  novelId: number;
  chapterId: number;
}) {
  const ui = useUi();
  const styles = useStyles();
  const { mode } = useSession();
  const [open, setOpen] = useState(false);
  const chapter = useQuery({
    queryKey: ["chapter", novelId, chapterId, mode],
    queryFn: () => novels.chapter(novelId, chapterId),
    enabled: mode === "authenticated",
  });
  if (chapter.isLoading) return <Loading />;
  if (chapter.error)
    return (
      <ErrorBox
        error={chapter.error}
        retry={() => {
          void chapter.refetch();
        }}
      />
    );
  if (!chapter.data) return null;
  const { title, body, authorNickname, chapterNumber } = chapter.data;
  return (
    <Card>
      <Label>{`이어받은 ${chapterNumber}장`}</Label>
      <Text style={[ui.label, styles.title]}>
        {`${title} · ${authorNickname}`}
      </Text>
      <Text style={styles.body} numberOfLines={open ? undefined : 3}>
        {body}
      </Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={open ? "앞 이야기 접기" : "앞 이야기 펼쳐 읽기"}
        onPress={() => setOpen(!open)}
        hitSlop={12}
        style={styles.toggle}
      >
        <Text style={styles.toggleText}>
          {open ? "접기" : "앞 이야기 펼쳐 읽기"}
        </Text>
      </Pressable>
    </Card>
  );
}

const useStyles = themedStyles((colors) => ({
  title: { marginTop: 8 },
  body: { fontSize: 14, lineHeight: 24, color: colors.ink, marginTop: 8 },
  toggle: { minHeight: 44, justifyContent: "center" },
  toggleText: { fontSize: 13, color: colors.green, fontWeight: "600" },
}));
