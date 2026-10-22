import { Pressable, StyleSheet } from "react-native";
import { Text } from "../text";
import Svg, { Path } from "react-native-svg";
import { router } from "expo-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { novels } from "../../api/novels";
import type { NovelDetail, NovelLikeView, NovelSummary } from "../../api/types";
import { useSession } from "../../state/session";
import { useColors } from "../../theme/themed";
import { useUi } from "../ui";

const HEART_SIZE = 18;
// 하트는 24칸에 그린다. 화면에서 1.5px 굵기로 보이도록 크기에 맞춰 환산한다.
const HEART_LINE = (1.5 * 24) / HEART_SIZE;
const HEART_PATH =
  "M12 20C12 20 3.5 14.6 3.5 9.1C3.5 6.4 5.6 4.5 8 4.5C9.8 4.5 11.2 5.6 12 7" +
  "C12.8 5.6 14.2 4.5 16 4.5C18.4 4.5 20.5 6.4 20.5 9.1C20.5 14.6 12 20 12 20Z";

// 소설 상세의 좋아요. 이어 쓰기보다 눈에 띄지 않게 작가·장 수와 같은 차분한 글씨로 둔다.
// 누른 상태는 색만이 아니라 빈 하트와 채운 하트로도 구분한다.
export function LikeButton({
  novel,
  busy,
  onPress,
}: {
  novel: NovelSummary;
  busy: boolean;
  onPress: () => void;
}) {
  const ui = useUi();
  const colors = useColors();
  // 웹은 눌림 상태(accessibilityState)를 보조기기에 넘기지 않으므로 이름에 함께 적는다.
  const count = `좋아요 ${novel.likeCount}개`;
  const label = novel.liked ? `${count}, 내가 누름` : count;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      disabled={busy}
      hitSlop={8}
      onPress={onPress}
      style={styles.button}
    >
      <Svg width={HEART_SIZE} height={HEART_SIZE} viewBox="0 0 24 24">
        <Path
          d={HEART_PATH}
          fill={novel.liked ? colors.ink : "none"}
          stroke={novel.liked ? colors.ink : colors.muted}
          strokeWidth={HEART_LINE}
          strokeLinejoin="round"
        />
      </Svg>
      <Text style={ui.body}>{novel.likeCount}</Text>
    </Pressable>
  );
}

// 누르면 하트와 숫자를 바로 바꿔 보여 주고, 서버 응답이 오면 서버의 실제 상태로 맞춘다.
// 실패하면 누르기 전으로 되돌린다. 둘러보기에서는 다른 쓰기 동작처럼 로그인으로 보낸다.
export function useNovelLike(novel: NovelSummary) {
  const { mode } = useSession();
  const client = useQueryClient();
  const detailKey = ["novel", novel.id, mode];

  const mutation = useMutation({
    mutationFn: () => novels.toggleLike(novel.id),
    onMutate: async () => {
      // 진행 중인 상세 새로고침이 끝나며 바꿔 둔 하트를 덮어쓰지 않게 멈춘다.
      await client.cancelQueries({ queryKey: detailKey });
      const before = client.getQueryData<NovelDetail>(detailKey);
      if (before)
        client.setQueryData(detailKey, withLike(before, toggled(before.novel)));
      return { before };
    },
    onError: (_error, _variables, context) => {
      if (context?.before) client.setQueryData(detailKey, context.before);
    },
    onSuccess: (result) => {
      client.setQueryData<NovelDetail>(
        detailKey,
        (current) => current && withLike(current, result),
      );
    },
    // 홈 열매의 반짝이도 바뀐 좋아요 수를 따르도록 목록을 다시 받는다.
    // 다 받을 때까지 기다리면 그동안 버튼이 잠기므로 기다리지 않는다.
    onSettled: () => {
      void client.invalidateQueries({ queryKey: ["novels"] });
      void client.invalidateQueries({ queryKey: ["my-turns"] });
    },
  });

  const press = () => {
    if (mode === "demo") {
      router.push("/login");
      return;
    }
    mutation.mutate();
  };
  return { press, busy: mutation.isPending, error: mutation.error };
}

// 서버 응답을 기다리는 동안 보여 줄, 누른 뒤의 모습
function toggled(novel: NovelSummary): NovelLikeView {
  const liked = !novel.liked;
  const likeCount = Math.max(0, novel.likeCount + (liked ? 1 : -1));
  return { liked, likeCount };
}

function withLike(detail: NovelDetail, like: NovelLikeView): NovelDetail {
  return {
    ...detail,
    novel: { ...detail.novel, liked: like.liked, likeCount: like.likeCount },
  };
}

const styles = StyleSheet.create({
  // 글씨는 작아도 누르는 영역은 44pt 이상으로 잡는다.
  button: {
    minHeight: 44,
    minWidth: 44,
    paddingHorizontal: 6,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
});
