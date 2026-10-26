import { useCallback, useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { Draft } from "../../api/types";
import type { WriteTarget } from "./writeTarget";

// 손을 멈추고 이만큼 지나면 저절로 임시저장한다.
export const AUTOSAVE_DELAY_MS = 1200;

interface Manuscript {
  title: string;
  body: string;
}

const sameManuscript = (first: Manuscript, second: Manuscript) =>
  first.title === second.title && first.body === second.body;

// 한 원고의 저장과 발행은 보낸 순서대로 하나씩 처리한다(react-query mutation scope).
// 앞선 저장이 늦게 끝나 나중 원고를 덮거나, 발행과 저장이 엇갈리지 않게 한다.
export function manuscriptScopeOf(target: WriteTarget) {
  return { id: `manuscript:${JSON.stringify(target.draftKey)}` };
}

// 쓰다 멈추면 지금 원고를 임시저장한다(2026-10-26 사용자 결정, 임시저장 버튼 없앰). 저장 주소는 예전 임시저장과 같다.
// 저장하지 못한 원고는 다시 고칠 때까지 저절로 되풀이하지 않고, saveNow로 바로 다시 저장한다.
export function useAutoSave({
  target,
  draft,
  manuscript,
  enabled,
}: {
  target: WriteTarget;
  draft: Draft;
  manuscript: Manuscript;
  // 쓸 수 있고 로그인돼 있으며 발행하는 중이 아닐 때만 저장한다.
  enabled: boolean;
}) {
  const client = useQueryClient();
  const [saved, setSaved] = useState(draft);
  const [failed, setFailed] = useState<Manuscript | null>(null);
  const save = useMutation({
    scope: manuscriptScopeOf(target),
    mutationFn: (sent: Manuscript) =>
      target.save(draft.turnNumber, sent.title, sent.body),
    onSuccess: (updated, sent) => {
      // 보낸 원고를 저장된 원고로 본다. 서버가 돌려준 글이 조금 달라도 같은 원고를 되풀이해 보내지 않는다.
      setSaved({ ...updated, title: sent.title, body: sent.body });
      setFailed(null);
      client.setQueryData(target.draftKey, updated);
    },
    onError: (_error, sent) => setFailed(sent),
  });
  const { title, body } = manuscript;
  const dirty = !sameManuscript({ title, body }, saved);
  const failedHere = !!failed && sameManuscript({ title, body }, failed);
  const { mutate, mutateAsync, reset } = save;

  useEffect(() => {
    if (!enabled || !dirty || save.isPending || failedHere) return;
    const timer = setTimeout(() => mutate({ title, body }), AUTOSAVE_DELAY_MS);
    return () => clearTimeout(timer);
  }, [enabled, dirty, save.isPending, failedHere, mutate, title, body]);

  // 기다리지 않고 지금 원고를 저장한다. 앞선 저장이 돌고 있으면 그 뒤에 보낸다.
  // 저장했으면 null, 못 했으면 그 까닭(서버가 보낸 오류)을 돌려준다.
  const saveNow = useCallback(async () => {
    try {
      await mutateAsync({ title, body });
      return null;
    } catch (cause) {
      return cause ?? new Error("원고를 저장하지 못했어요.");
    }
  }, [mutateAsync, title, body]);

  // 다시 로그인하고 돌아오면 만료 때문에 실패한 저장을 잊고 다시 저절로 저장한다.
  const forgetFailure = useCallback(() => {
    reset();
    setFailed(null);
  }, [reset]);

  return {
    saved,
    dirty,
    // 고친 뒤 손을 멈추기를 기다리는 중
    waiting: enabled && dirty && !failedHere,
    saving: save.isPending,
    failed: failedHere,
    // 지금 원고를 저장하지 못한 까닭
    error: failedHere ? save.error : null,
    saveNow,
    forgetFailure,
  };
}
