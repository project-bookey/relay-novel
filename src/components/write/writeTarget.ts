import { novels } from "../../api/novels";
import type { Chapter, Draft, NovelDetail } from "../../api/types";

// 원고를 어디에 쓰는지. 차례대로 쓰는 회차(모여 만들기, 열매로 퍼뜨리는 작품의 1회차)와
// 받은 열매에서 뻗는 가지는 저장·발행 주소와 낡은 원고를 가르는 번호가 다르다.
export interface WriteTarget {
  kind: "turn" | "branch";
  draftKey: unknown[];
  // 지금 이 원고를 쓸 수 있는지 — 서버가 준 권한 필드만 본다.
  canWrite: (detail: NovelDetail) => boolean;
  // 이 원고의 차례 번호. 서버 초안의 turnNumber와 같아야 한다.
  turnOf: (detail: NovelDetail) => number;
  loadDraft: () => Promise<Draft>;
  rewrite: (turnNumber: number, text: string) => Promise<{ text: string }>;
  save: (turnNumber: number, title: string, body: string) => Promise<Draft>;
  publish: (
    turnNumber: number,
    title: string,
    body: string,
  ) => Promise<Chapter>;
}

export function turnTarget(novelId: number, turnNumber?: number): WriteTarget {
  return {
    kind: "turn",
    draftKey: ["draft", novelId, turnNumber],
    canWrite: (detail) => detail.canWrite,
    turnOf: (detail) => detail.turnNumber,
    loadDraft: () => novels.draft(novelId),
    rewrite: (turn, text) => novels.rewrite(novelId, turn, text),
    save: (turn, title, body) =>
      novels.saveDraft(novelId, { turnNumber: turn, title, body }),
    publish: (turn, title, body) =>
      novels.publish(novelId, { turnNumber: turn, title, body }),
  };
}

// 받은 열매의 초안은 turnNumber 자리에 배달 id가 들어 있다.
export function branchTarget(deliveryId: number): WriteTarget {
  return {
    kind: "branch",
    draftKey: ["delivery-draft", deliveryId],
    canWrite: (detail) => detail.myDeliveryId === deliveryId,
    turnOf: () => deliveryId,
    loadDraft: () => novels.deliveryDraft(deliveryId),
    rewrite: (_turn, text) => novels.rewriteDelivery(deliveryId, text),
    save: (_turn, title, body) =>
      novels.saveDeliveryDraft(deliveryId, { title, body }),
    publish: (_turn, title, body) =>
      novels.publishBranch(deliveryId, { title, body }),
  };
}
