import { Pressable, StyleSheet } from "react-native";
import Svg, { Path } from "react-native-svg";
import { router } from "expo-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { novels } from "../../api/novels";
import type {
  NovelDetail,
  NovelFavoriteView,
  NovelSummary,
} from "../../api/types";
import { useSession } from "../../state/session";
import { useColors } from "../../theme/themed";

const BOOKMARK_SIZE = 18;
// 책갈피는 24칸에 그린다. 좋아요 하트와 같은 1.5px 굵기로 보이도록 크기에 맞춰 환산한다.
const BOOKMARK_LINE = (1.5 * 24) / BOOKMARK_SIZE;
const BOOKMARK_PATH = "M19 21L12 17L5 21V5A2 2 0 0 1 7 3H17A2 2 0 0 1 19 5Z";

// 소설 상세의 즐겨찾기(2026-10-26 사용자 결정 — 좋아요와 따로, 시안 reference/sian/favorite-button C "하트 옆").
// 하트 바로 옆에 같은 차분한 색의 책갈피로 두고, 담으면 채운 책갈피가 된다(색만이 아니라 모양으로도 구분).
export function FavoriteButton({
  favorited,
  busy,
  onPress,
}: {
  favorited: boolean;
  busy: boolean;
  onPress: () => void;
}) {
  const colors = useColors();
  return (
    <Pressable
      accessibilityRole="button"
      // 웹은 눌림 상태(accessibilityState)를 보조기기에 넘기지 않으므로 할 일을 이름에 적는다.
      accessibilityLabel={favorited ? "즐겨찾기에서 빼기" : "즐겨찾기에 담기"}
      disabled={busy}
      // 왼쪽은 넓히지 않는다 — 바로 옆 좋아요 버튼의 누르는 영역과 겹치지 않게.
      hitSlop={{ top: 8, bottom: 8, right: 8 }}
      onPress={onPress}
      style={styles.button}
    >
      <Svg width={BOOKMARK_SIZE} height={BOOKMARK_SIZE} viewBox="0 0 24 24">
        <Path
          d={BOOKMARK_PATH}
          fill={favorited ? colors.ink : "none"}
          stroke={favorited ? colors.ink : colors.muted}
          strokeWidth={BOOKMARK_LINE}
          strokeLinejoin="round"
        />
      </Svg>
    </Pressable>
  );
}

// 누르면 바로 채우거나 비우고, 서버 응답이 오면 서버의 실제 상태로 맞춘 뒤 onChange로 알린다(화면이 알림을 띄운다).
// 응답 전에 화면을 떠났으면 알리지 않는다(mutate에 넘긴 콜백은 화면이 사라지면 불리지 않는다).
// 실패하면 누르기 전으로 되돌린다. 둘러보기에서는 다른 쓰기 동작처럼 로그인으로 보낸다.
export function useNovelFavorite(
  novel: NovelSummary,
  onChange?: (favorited: boolean) => void,
) {
  const { mode } = useSession();
  const client = useQueryClient();
  const detailKey = ["novel", novel.id, mode];

  const mutation = useMutation({
    mutationFn: () => novels.toggleFavorite(novel.id),
    onMutate: async () => {
      // 진행 중인 상세 새로고침이 끝나며 바꿔 둔 책갈피를 덮어쓰지 않게 멈춘다.
      await client.cancelQueries({ queryKey: detailKey });
      const before = client.getQueryData<NovelDetail>(detailKey);
      if (before)
        client.setQueryData(
          detailKey,
          withFavorite(before, { favorited: !before.novel.favorited }),
        );
      return { before };
    },
    onError: (_error, _variables, context) => {
      if (context?.before) client.setQueryData(detailKey, context.before);
    },
    onSuccess: (result) => {
      client.setQueryData<NovelDetail>(
        detailKey,
        (current) => current && withFavorite(current, result),
      );
    },
    // 목록의 작품 요약에도 담았는지가 실리므로 기다리지 않고 다시 받게 한다.
    onSettled: () => {
      void client.invalidateQueries({ queryKey: ["novels"] });
    },
  });

  const press = () => {
    if (mode === "demo") {
      router.push("/login");
      return;
    }
    mutation.mutate(undefined, {
      onSuccess: (result) => onChange?.(result.favorited),
    });
  };
  return {
    // 즐겨찾기를 모르는 예전 서버는 이 값을 보내지 않는다. 그때는 눌러도 서버가 받지 못하니 버튼을 숨긴다.
    available: novel.favorited !== undefined,
    favorited: !!novel.favorited,
    press,
    busy: mutation.isPending,
    error: mutation.error,
  };
}

function withFavorite(
  detail: NovelDetail,
  favorite: NovelFavoriteView,
): NovelDetail {
  return {
    ...detail,
    novel: { ...detail.novel, favorited: favorite.favorited },
  };
}

const styles = StyleSheet.create({
  // 아이콘은 작아도 누르는 영역은 44pt 이상으로 잡는다.
  button: {
    minHeight: 44,
    minWidth: 44,
    alignItems: "center",
    justifyContent: "center",
  },
});
