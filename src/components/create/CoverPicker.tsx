import { useEffect, useRef, useState } from "react";
import { Image, Pressable, Text, View } from "react-native";
import { useMutation, useQuery } from "@tanstack/react-query";
import * as ImagePicker from "expo-image-picker";
import {
  novels,
  type CoverImage,
  type CoverGenerationRequest,
} from "../../api/novels";
import { themedStyles } from "../../theme/themed";
import { Button, ErrorBox, useUi } from "../ui";

// 서버가 받는 가장 큰 표지 사진(10MB)
const COVER_MAX_BYTES = 10 * 1024 * 1024;
const COVER_TYPES = ["image/jpeg", "image/png", "image/webp"];

// 고른 표지. id는 서버에 다 올라간 뒤에 생긴다.
export interface PickedCover {
  uri: string;
  id?: number;
}

function toCoverImage(asset: ImagePicker.ImagePickerAsset): CoverImage {
  const type = asset.mimeType ?? "image/jpeg";
  const extension = type.split("/")[1] ?? "jpg";
  return {
    uri: asset.uri,
    name: asset.fileName ?? `cover.${extension}`,
    type,
    file: asset.file,
  };
}

// 서버가 거절할 사진을 미리 알려 준다. 형식을 모르면 서버 판정에 맡긴다.
function problemOf(asset: ImagePicker.ImagePickerAsset) {
  const size = asset.fileSize ?? asset.file?.size ?? 0;
  if (size > COVER_MAX_BYTES) return "사진은 10MB까지 올릴 수 있어요.";
  if (asset.mimeType && !COVER_TYPES.includes(asset.mimeType))
    return "표지는 JPG·PNG·WebP 사진만 쓸 수 있어요.";
  return "";
}

// 작품 표지(선택). 고르자마자 올려 두고, 만들 때 받은 id를 함께 보낸다.
export function CoverPicker({
  picked,
  onChange,
  story,
  onBusyChange,
}: {
  picked?: PickedCover;
  onChange: (cover: PickedCover | undefined) => void;
  story?: CoverGenerationRequest;
  onBusyChange?: (busy: boolean) => void;
}) {
  const ui = useUi();
  const styles = useStyles();
  const [problem, setProblem] = useState("");
  // 올리는 중에 다른 사진을 고르면 먼저 고른 사진의 결과는 버린다.
  const latest = useRef<CoverImage | undefined>(undefined);
  const upload = useMutation({
    mutationFn: novels.uploadCover,
    onSuccess: (cover, image) => {
      if (latest.current === image) onChange({ uri: image.uri, id: cover.id });
    },
  });
  const config = useQuery({
    queryKey: ["cover-generation-config"],
    queryFn: novels.coverGenerationConfig,
    enabled: !!story,
    staleTime: 30_000,
    retry: false,
  });
  const generate = useMutation({
    mutationFn: novels.generateCover,
    // 응답이 끊겼어도 이미지 API에서 생성됐을 수 있어 자동 재시도하지 않는다.
    retry: false,
    onSuccess: (cover) => {
      latest.current = undefined;
      upload.reset();
      setProblem("");
      onChange({ uri: cover.url, id: cover.id });
    },
  });
  const busy = upload.isPending || generate.isPending;
  useEffect(() => {
    onBusyChange?.(busy);
  }, [busy, onBusyChange]);
  const canGenerate =
    !!story?.title.trim() &&
    !!story?.description.trim() &&
    !!story?.genre.trim();

  const choose = async () => {
    if (busy) return;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [3, 4],
      quality: 0.85,
      // iOS가 HEIC 원본을 넘기지 않고 서버가 받는 JPEG로 바꿔 주게 한다.
      preferredAssetRepresentationMode:
        ImagePicker.UIImagePickerPreferredAssetRepresentationMode.Compatible,
    });
    const asset = result.canceled ? undefined : result.assets[0];
    if (!asset) return;
    const found = problemOf(asset);
    setProblem(found);
    if (found) return;
    const image = toCoverImage(asset);
    generate.reset();
    latest.current = image;
    onChange({ uri: image.uri });
    upload.mutate(image);
  };
  const remove = () => {
    if (busy) return;
    latest.current = undefined;
    upload.reset();
    generate.reset();
    onChange(undefined);
  };
  const retry = () => {
    if (latest.current) upload.mutate(latest.current);
  };

  return (
    <View style={styles.empty}>
      {!picked ? (
        <Button outline disabled={busy} onPress={() => void choose()}>
          표지 사진 고르기
        </Button>
      ) : (
        <View style={styles.picked}>
          <View style={styles.row}>
            <Image
              source={{ uri: picked.uri }}
              style={[styles.cover, busy && styles.uploading]}
              accessibilityLabel="고른 표지"
            />
            <View style={styles.side}>
              <Text style={ui.hint}>
                {upload.isPending
                  ? "표지를 올리는 중이에요…"
                  : generate.isPending
                    ? "새 표지를 만들고 있어요…"
                    : "표지를 골랐어요."}
              </Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="표지 바꾸기"
                hitSlop={8}
                disabled={busy}
                onPress={() => void choose()}
                style={styles.action}
              >
                <Text style={styles.actionText}>바꾸기</Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="표지 빼기"
                hitSlop={8}
                disabled={busy}
                onPress={remove}
                style={styles.action}
              >
                <Text style={styles.removeText}>빼기</Text>
              </Pressable>
            </View>
          </View>
        </View>
      )}
      {story && config.data?.available && (
        <>
          <Button
            outline
            disabled={busy || !canGenerate}
            onPress={() =>
              generate.mutate({
                title: story.title.trim(),
                description: story.description.trim(),
                genre: story.genre.trim(),
              })
            }
          >
            {generate.isPending
              ? "표지를 만들고 있어요…"
              : picked
                ? "AI로 새 표지 만들기"
                : "AI로 표지 만들기"}
          </Button>
          <Text style={ui.hint}>
            {canGenerate
              ? `제목과 소개에 어울리는 표지를 만들어요. 생성 시도는 24시간에 ${config.data.dailyLimit}번까지 할 수 있어요.`
              : "제목과 소개를 먼저 적어 주세요."}
          </Text>
        </>
      )}
      {!!problem && <ErrorBox error={new Error(problem)} />}
      {!!upload.error && <ErrorBox error={upload.error} retry={retry} />}
      {!!generate.error && <ErrorBox error={generate.error} />}
    </View>
  );
}

const useStyles = themedStyles((colors) => ({
  empty: { gap: 10, marginVertical: 6 },
  picked: { gap: 10, marginVertical: 6 },
  row: { flexDirection: "row", gap: 16, alignItems: "flex-end" },
  // 책 표지 비율(3:4)
  cover: {
    width: 96,
    height: 128,
    borderRadius: 10,
    backgroundColor: colors.line,
  },
  uploading: { opacity: 0.5 },
  side: { flex: 1, gap: 2 },
  action: { minHeight: 44, minWidth: 44, justifyContent: "center" },
  actionText: { fontSize: 13, color: colors.green, fontWeight: "600" },
  removeText: { fontSize: 13, color: colors.muted, fontWeight: "600" },
}));
