import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import type { NovelSummary } from "../../api/types";
import type { ChapterLink } from "../../design/chapterTree";
import {
  chaptersLabel,
  genresLabel,
  statusLabel,
  writersLabel,
} from "../../theme";
import { StoryTree } from "../StoryTree";
import { CoverThumb } from "../CoverThumb";
import { ErrorBox, Label, useUi } from "../ui";
import { LikeButton, useNovelLike } from "./LikeButton";

// 표지가 있으면 서점처럼 왼쪽에 표지, 오른쪽에 장르·제목·현황을 두고 이야기 나무는 소개 아래에 낮게 남긴다.
function CoverHeader({
  novel,
  nodes,
  like,
  onCoverError,
}: {
  novel: NovelSummary;
  nodes?: ChapterLink[];
  like: ReturnType<typeof useNovelLike>;
  onCoverError: () => void;
}) {
  const ui = useUi();
  return (
    <>
      <View style={styles.coverRow}>
        <CoverThumb novel={novel} width={108} onError={onCoverError} />
        <View style={styles.coverSide}>
          <Label>
            {`${genresLabel(novel)} · ${statusLabel[novel.status]}`}
          </Label>
          <Text style={[ui.heading, styles.coverTitle]}>{novel.title}</Text>
          <Text style={ui.body}>{writersLabel(novel)}</Text>
          <Text style={ui.body}>{chaptersLabel(novel)}</Text>
          <LikeButton novel={novel} busy={like.busy} onPress={like.press} />
        </View>
      </View>
      {!!like.error && <ErrorBox error={like.error} />}
      <Text style={[ui.body, styles.coverDescription]}>
        {novel.description}
      </Text>
      <StoryTree novel={novel} nodes={nodes} height={130} />
    </>
  );
}

// 소설의 나무와 제목·소개·진행 현황, 좋아요.
export function NovelOverview({
  novel,
  nodes,
}: {
  novel: NovelSummary;
  // 회차 나무. 아직 불러오지 못했으면 회차 수만큼 한 줄기로 그린다.
  nodes?: ChapterLink[];
}) {
  const ui = useUi();
  const like = useNovelLike(novel);
  // 표지를 불러오지 못하면 표지 없는 작품과 같은 화면으로 돌아간다.
  const [coverFailed, setCoverFailed] = useState(false);
  if (novel.coverUrl && !coverFailed)
    return (
      <CoverHeader
        novel={novel}
        nodes={nodes}
        like={like}
        onCoverError={() => setCoverFailed(true)}
      />
    );
  return (
    <>
      <View style={styles.header}>
        <StoryTree novel={novel} nodes={nodes} />
        <Label>{`${genresLabel(novel)} · ${statusLabel[novel.status]}`}</Label>
        <Text style={[ui.heading, styles.title]}>{novel.title}</Text>
        <Text style={[ui.body, styles.centered]}>{novel.description}</Text>
      </View>
      <View style={[ui.row, styles.stats]}>
        <Text style={ui.body}>{writersLabel(novel)}</Text>
        <Text style={ui.body}>{chaptersLabel(novel)}</Text>
        <LikeButton novel={novel} busy={like.busy} onPress={like.press} />
      </View>
      {!!like.error && <ErrorBox error={like.error} />}
    </>
  );
}

const styles = StyleSheet.create({
  header: { alignItems: "center" },
  title: { textAlign: "center", fontSize: 27 },
  centered: { textAlign: "center" },
  // 좋아요 버튼의 누르는 영역(44pt)만큼 줄이 높아지므로, 위아래 여백을 줄여 글씨 사이 간격은 그대로 둔다.
  stats: { marginVertical: 15, justifyContent: "center", gap: 25 },
  coverRow: { flexDirection: "row", alignItems: "flex-end", gap: 16 },
  coverSide: { flex: 1, alignItems: "flex-start" },
  coverTitle: { fontSize: 24, marginBottom: 4 },
  coverDescription: { marginTop: 16 },
});
