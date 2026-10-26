import { View } from "react-native";
import { useQuery } from "@tanstack/react-query";
import { novels } from "../../api/novels";
import { demoStories } from "../../api/demo";
import { newsByUrgency, type MyNews } from "../../design/fruitSections";
import { useSession } from "../../state/session";
import { NewsRow } from "./NewsRow";
import { ErrorBox, Loading } from "../ui";

// 마이의 내 할 일: 내 차례(GET /my-turns)와 내가 맡은 자리(GET /deliveries)를 마감이 가까운 순으로 모두.
// 상자 없이 줄만 두고(사용자 요청 "이어 쓰기는 박스 지워줘"), 가장 급한 줄의 "이어 쓰기"만 진하게 강조한다.
// 할 일이 없으면 자리를 비운다(고를 것을 줄인다).
export function MyTodo() {
  const { mode } = useSession();
  const isDemo = mode === "demo";
  const turns = useQuery({
    queryKey: ["my-turns", mode],
    queryFn: novels.turns,
    enabled: mode === "authenticated",
  });
  const deliveries = useQuery({
    queryKey: ["deliveries", mode],
    queryFn: novels.deliveries,
    enabled: mode === "authenticated",
  });
  if (!isDemo && (turns.isPending || deliveries.isPending)) return <Loading />;
  if (!isDemo && (turns.error || deliveries.error))
    return (
      <ErrorBox
        error={turns.error ?? deliveries.error}
        retry={() => {
          void turns.refetch();
          void deliveries.refetch();
        }}
      />
    );
  // 둘러보기에는 맡은 자리가 없고, 예시 작품 가운데 내 차례인 작품만 있다.
  const todo = isDemo
    ? newsByUrgency(
        demoStories.filter((story) => story.myTurn),
        [],
      )
    : newsByUrgency(turns.data ?? [], deliveries.data ?? []);
  if (todo.length === 0) return null;
  return (
    <View>
      {todo.map((news, index) => (
        <NewsRow key={keyOf(news)} news={news} quiet={index > 0} />
      ))}
    </View>
  );
}

function keyOf(news: MyNews) {
  if (news.kind === "turn") return `turn-${news.story.id}`;
  return `claim-${news.delivery.deliveryId}`;
}
