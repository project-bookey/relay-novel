import { useQuery } from "@tanstack/react-query";
import { Text } from "../text";
import { novels } from "../../api/novels";
import { useSession } from "../../state/session";
import { themedStyles } from "../../theme/themed";
import { ErrorBox, Loading } from "../ui";
import { PaneHead } from "./pane";

// 앞 이야기 팝업: 맡은 열매에서 뻗을 때 이어받은 회차를 읽는다. 길면 판 안에서 넘겨 읽는다.
export function PreviousChapter({
  novelId,
  chapterId,
  onClose,
}: {
  novelId: number;
  chapterId: number;
  onClose: () => void;
}) {
  const styles = useStyles();
  const { mode } = useSession();
  const chapter = useQuery({
    queryKey: ["chapter", novelId, chapterId, mode],
    queryFn: () => novels.chapter(novelId, chapterId),
    enabled: mode === "authenticated",
  });
  if (!chapter.data)
    return (
      <>
        <PaneHead title="앞 이야기" onClose={onClose} />
        {chapter.isLoading && <Loading />}
        {!!chapter.error && (
          <ErrorBox
            error={chapter.error}
            retry={() => {
              void chapter.refetch();
            }}
          />
        )}
        {/* 로그인이 만료되면 앞 이야기를 불러오지 않는다. */}
        {!chapter.isLoading && !chapter.error && (
          <Text style={styles.empty}>
            다시 로그인하면 앞 이야기를 볼 수 있어요.
          </Text>
        )}
      </>
    );
  const { title, body, authorNickname, chapterNumber } = chapter.data;
  return (
    <>
      <PaneHead
        kicker={`이어받은 ${chapterNumber}장`}
        title={title}
        onClose={onClose}
      />
      <Text style={styles.author}>{authorNickname}</Text>
      <Text selectable style={styles.body}>
        {body}
      </Text>
    </>
  );
}

const useStyles = themedStyles((colors) => ({
  author: { fontSize: 13, color: colors.muted, marginTop: 2 },
  empty: { fontSize: 14, lineHeight: 22, color: colors.muted, marginTop: 10 },
  body: { fontSize: 15.5, lineHeight: 28, color: colors.ink, marginTop: 12 },
}));
