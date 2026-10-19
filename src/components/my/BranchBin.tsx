import { useState } from "react";
import { Text, View } from "react-native";
import { router } from "expo-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { novels } from "../../api/novels";
import { demoBranchBin } from "../../api/demo";
import type { BinBranch, BranchBin as BranchBinView } from "../../api/types";
import { purgeLabel } from "../../design/branchBin";
import { useSession } from "../../state/session";
import { themedStyles } from "../../theme/themed";
import { Button, ErrorBox, Loading, useUi } from "../ui";
import { SunlightShop } from "../sunlight/SunlightShop";
import { isSunlightShort } from "../sunlight/useSunlight";

// 마이의 나뭇가지 수거함. 한 달 동안 조회가 모자라 나무에서 내려온 내 가지를 살리거나 버린다.
// 무엇이 수거되고 언제 지워지는지는 서버가 정하고, 앱은 받은 목록과 지울 날만 보여 준다.
export function BranchBin() {
  const ui = useUi();
  const { mode } = useSession();
  const client = useQueryClient();
  const isDemo = mode === "demo";
  const [shortReason, setShortReason] = useState<string>();
  const bin = useQuery({
    queryKey: ["branch-bin", mode],
    queryFn: () =>
      isDemo ? Promise.resolve(demoBranchBin()) : novels.branchBin(),
    enabled: isDemo || mode === "authenticated",
  });
  const settle = (next: BranchBinView) => {
    client.setQueryData(["branch-bin", mode], next);
    // 살린 가지는 나무와 읽기 화면에 다시 나타난다.
    for (const key of [
      "sunlight",
      "novels",
      "novel",
      "chapter",
      "chapter-tree",
    ])
      void client.invalidateQueries({ queryKey: [key] });
  };
  // 이미 사라진 가지(NOVEL_BIN_GONE) 등으로 실패해도 목록을 서버와 맞춘다.
  const refreshBin = () =>
    void client.invalidateQueries({ queryKey: ["branch-bin"] });
  const restore = useMutation({
    mutationFn: novels.restoreBranch,
    onSuccess: settle,
    onSettled: refreshBin,
    onError: (error) => {
      if (isSunlightShort(error))
        setShortReason(
          `가지를 살리려면 햇살 ${bin.data?.restoreCost ?? ""}개가 필요해요.`,
        );
    },
  });
  const discard = useMutation({
    mutationFn: novels.discardBranch,
    onSuccess: settle,
    onSettled: refreshBin,
  });
  const busy = restore.isPending || discard.isPending;
  // 햇살이 모자란 경우는 충전 창으로 안내하므로 오류 상자를 따로 띄우지 않는다.
  const restoreError = isSunlightShort(restore.error) ? null : restore.error;
  const actionError = restoreError ?? discard.error;

  const branches = bin.data?.branches ?? [];
  const restoreCost = bin.data?.restoreCost ?? 0;
  return (
    <>
      <Text style={ui.sectionTitle}>나뭇가지 수거함</Text>
      <Text style={ui.hint}>
        한 달 동안 조회가 50회를 넘지 못한 가지는 나무에서 내려와 일주일 동안
        여기에 머물러요. 살리지 않으면 사라지고, 그 자리에 새 가지가 자라요.
      </Text>
      {bin.isPending && <Loading />}
      {!!bin.error && (
        <ErrorBox
          error={bin.error}
          retry={() => {
            void bin.refetch();
          }}
        />
      )}
      {!bin.isPending && !bin.error && branches.length === 0 && (
        <Text style={ui.hint}>수거함이 비어 있어요.</Text>
      )}
      {!!actionError && <ErrorBox error={actionError} />}
      {branches.map((branch) => (
        <BinRow
          key={branch.chapterId}
          branch={branch}
          restoreCost={restoreCost}
          busy={busy}
          onRestore={() =>
            isDemo ? router.push("/login") : restore.mutate(branch.chapterId)
          }
          onDiscard={() =>
            isDemo ? router.push("/login") : discard.mutate(branch.chapterId)
          }
        />
      ))}
      {!!shortReason && (
        <SunlightShop
          reason={shortReason}
          onClose={() => setShortReason(undefined)}
        />
      )}
    </>
  );
}

function BinRow({
  branch,
  restoreCost,
  busy,
  onRestore,
  onDiscard,
}: {
  branch: BinBranch;
  restoreCost: number;
  busy: boolean;
  onRestore: () => void;
  onDiscard: () => void;
}) {
  const ui = useUi();
  const styles = useStyles();
  const [confirmingDiscard, setConfirmingDiscard] = useState(false);
  return (
    <View style={[ui.card, styles.row]}>
      <Text style={styles.source} numberOfLines={1}>
        {`${branch.novelTitle} · ${branch.chapterNumber}장`}
      </Text>
      <Text style={styles.title} numberOfLines={2}>
        {branch.title}
      </Text>
      <Text style={styles.meta}>
        {`조회 ${branch.viewCount} · ${purgeLabel(branch.purgeAt, new Date())}`}
      </Text>
      <Button outline disabled={busy} onPress={onRestore}>
        {`햇살 ${restoreCost}개로 살리기`}
      </Button>
      {/* 버리기는 되돌릴 수 없어 살리기와 떨어뜨리고 한 번 더 묻는다. */}
      <View style={styles.discardArea}>
        {confirmingDiscard ? (
          <>
            <Text style={ui.hint}>
              버리면 이 가지는 바로 사라지고 다시 살릴 수 없어요.
            </Text>
            <Button outline disabled={busy} onPress={onDiscard}>
              버리기
            </Button>
            <Button
              outline
              disabled={busy}
              onPress={() => setConfirmingDiscard(false)}
            >
              그대로 두기
            </Button>
          </>
        ) : (
          <Button outline onPress={() => setConfirmingDiscard(true)}>
            버리기
          </Button>
        )}
      </View>
    </View>
  );
}

const useStyles = themedStyles((colors) => ({
  row: { gap: 4 },
  source: { fontSize: 11, color: colors.green },
  title: { fontSize: 16, fontWeight: "700", color: colors.ink },
  meta: { fontSize: 12, color: colors.muted, marginBottom: 8 },
  discardArea: { marginTop: 14 },
}));
