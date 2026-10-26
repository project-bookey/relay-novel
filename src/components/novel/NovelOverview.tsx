import { useState } from "react";
import { StyleSheet, View } from "react-native";
import { Text } from "../text";
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
import { FavoriteButton, useNovelFavorite } from "./FavoriteButton";

// 좋아요 하트와 그 바로 옆의 즐겨찾기 책갈피(시안 reference/sian/favorite-button C "하트 옆").
// 작품에 내가 한 반응을 한곳에 모으되, 둘은 모양(하트·책갈피)으로 구분한다.
function Reactions({
  novel,
  like,
  favorite,
}: {
  novel: NovelSummary;
  like: ReturnType<typeof useNovelLike>;
  favorite: ReturnType<typeof useNovelFavorite>;
}) {
  return (
    <View style={styles.reactions}>
      <LikeButton novel={novel} busy={like.busy} onPress={like.press} />
      {favorite.available && (
        <FavoriteButton
          favorited={favorite.favorited}
          busy={favorite.busy}
          onPress={favorite.press}
        />
      )}
    </View>
  );
}

function ReactionErrors({
  like,
  favorite,
}: {
  like: ReturnType<typeof useNovelLike>;
  favorite: ReturnType<typeof useNovelFavorite>;
}) {
  return (
    <>
      {!!like.error && <ErrorBox error={like.error} />}
      {!!favorite.error && <ErrorBox error={favorite.error} />}
    </>
  );
}

// 표지가 있으면 서점처럼 왼쪽에 표지, 오른쪽에 장르·제목·현황을 두고 이야기 나무는 소개 아래에 낮게 남긴다.
function CoverHeader({
  novel,
  nodes,
  like,
  favorite,
  onCoverError,
}: {
  novel: NovelSummary;
  nodes?: ChapterLink[];
  like: ReturnType<typeof useNovelLike>;
  favorite: ReturnType<typeof useNovelFavorite>;
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
          <Reactions novel={novel} like={like} favorite={favorite} />
        </View>
      </View>
      <ReactionErrors like={like} favorite={favorite} />
      <Text style={[ui.body, styles.coverDescription]}>
        {novel.description}
      </Text>
      <StoryTree novel={novel} nodes={nodes} height={130} />
    </>
  );
}

// 소설의 나무와 제목·소개·진행 현황, 좋아요·즐겨찾기.
export function NovelOverview({
  novel,
  nodes,
  onFavoriteChange,
}: {
  novel: NovelSummary;
  // 회차 나무. 아직 불러오지 못했으면 회차 수만큼 한 줄기로 그린다.
  nodes?: ChapterLink[];
  // 즐겨찾기에 담거나 뺀 뒤(서버가 받은 뒤) 알린다. 화면이 알림을 띄운다.
  onFavoriteChange?: (favorited: boolean) => void;
}) {
  const ui = useUi();
  const like = useNovelLike(novel);
  const favorite = useNovelFavorite(novel, onFavoriteChange);
  // 표지를 불러오지 못하면 표지 없는 작품과 같은 화면으로 돌아간다.
  const [coverFailed, setCoverFailed] = useState(false);
  if (novel.coverUrl && !coverFailed)
    return (
      <CoverHeader
        novel={novel}
        nodes={nodes}
        like={like}
        favorite={favorite}
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
        <Reactions novel={novel} like={like} favorite={favorite} />
      </View>
      <ReactionErrors like={like} favorite={favorite} />
    </>
  );
}

const styles = StyleSheet.create({
  header: { alignItems: "center" },
  title: { textAlign: "center", fontSize: 27 },
  centered: { textAlign: "center" },
  // 좋아요 버튼의 누르는 영역(44pt)만큼 줄이 높아지므로, 위아래 여백을 줄여 글씨 사이 간격은 그대로 둔다.
  // 좁은 화면(360)에서는 하트·책갈피 묶음이 다음 줄로 내려가도록 줄을 넘긴다.
  stats: {
    marginVertical: 15,
    justifyContent: "center",
    gap: 25,
    flexWrap: "wrap",
    rowGap: 4,
  },
  coverRow: { flexDirection: "row", alignItems: "flex-end", gap: 16 },
  coverSide: { flex: 1, alignItems: "flex-start" },
  coverTitle: { fontSize: 24, marginBottom: 4 },
  coverDescription: { marginTop: 16 },
  // 하트와 책갈피는 한 묶음이라 다른 현황 글씨보다 가깝게 둔다.
  reactions: { flexDirection: "row", alignItems: "center", gap: 2 },
});
