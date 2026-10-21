import { useEffect, useState } from "react";
import { router } from "expo-router";
import type {
  Chapter,
  ChapterNode,
  NovelDelivery,
  NovelDetail,
} from "../../api/types";
import { branchesFrom } from "../../design/chapterTree";
import { Button, ErrorBox } from "../ui";
import { ClaimBranch } from "./ClaimBranch";
import { SelfContinue } from "./SelfContinue";

// 이 회차를 읽은 사람이 이어 쓸 수 있는 길. 모두 서버가 준 값(canWrite·myDeliveryId·canClaim·canSelfContinue)만 따른다.
export interface ContinueOptions {
  // 모여 만들기에서 내 차례 — 마지막 회차를 읽은 다음 작가
  turn: boolean;
  // 열매로 퍼뜨리는 작품의 첫 작가 — 줄기 끝 회차에서 줄기를 잇는다
  trunk: boolean;
  // 이 회차에 이미 자리를 맡아 둠
  held: boolean;
  // 이 회차에서 새로 자리를 맡을 수 있음
  claim: boolean;
  // 내가 쓴 회차라 햇살로 이어 쓸 수 있음
  self: boolean;
}

export function continueOptionsOf(
  chapter: Chapter,
  nodes: ChapterNode[],
  detail: NovelDetail | undefined,
  myDelivery: NovelDelivery | undefined,
): ContinueOptions {
  const branching = detail?.novel.mode === "OPEN";
  // 회차 나무를 아직 받지 못했으면 끝 회차인지 몰라 차례·줄기 이어 쓰기를 보이지 않는다.
  const treeKnown = nodes.length > 0;
  const isLast = treeKnown && branchesFrom(nodes, chapter.id).length === 0;
  const isTrunkTip =
    chapter.trunk &&
    treeKnown &&
    !nodes.some((node) => node.parentChapterId === chapter.id && node.trunk);
  const held = !!detail?.myDeliveryId && myDelivery?.chapterId === chapter.id;
  return {
    turn: !!detail?.canWrite && !branching && isLast,
    trunk: !!detail?.canWrite && branching && isTrunkTip,
    held,
    // 이미 맡은 열매가 있으면 그쪽이 먼저다.
    claim: chapter.canClaim && !held,
    self: chapter.canSelfContinue && !held,
  };
}

export function canContinue(options: ContinueOptions) {
  return (
    options.turn ||
    options.trunk ||
    options.held ||
    options.claim ||
    options.self
  );
}

// 읽기 화면 아래의 이어 쓰기 동작들. 자리 맡기가 거절되면(자리가 찼거나 이미 맡은 열매가 있음) 버튼이 사라져도
// 서버가 보낸 까닭은 남겨 둔다.
export function ContinueActions({
  chapter,
  options,
  deliveryId,
}: {
  chapter: Chapter;
  options: ContinueOptions;
  // 이미 맡아 둔 열매
  deliveryId?: number;
}) {
  const [refusal, setRefusal] = useState<unknown>();
  useEffect(() => setRefusal(undefined), [chapter.id]);
  const write = (params: { id: number; deliveryId?: number }) =>
    router.push({ pathname: "/novel/write", params });

  return (
    <>
      {options.turn && (
        <Button onPress={() => write({ id: chapter.novelId })}>
          이제 당신의 이야기 이어 쓰기
        </Button>
      )}
      {options.trunk && (
        <Button onPress={() => write({ id: chapter.novelId })}>
          줄기 이어 쓰기
        </Button>
      )}
      {options.held && (
        <Button onPress={() => write({ id: chapter.novelId, deliveryId })}>
          이 회차에서 가지 뻗어 이어 쓰기
        </Button>
      )}
      {options.claim && (
        <ClaimBranch chapter={chapter} onRefused={setRefusal} />
      )}
      {!!refusal && <ErrorBox error={refusal} />}
      {options.self && <SelfContinue chapter={chapter} />}
    </>
  );
}
