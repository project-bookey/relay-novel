import { useState } from "react";
import {
  Modal,
  Pressable,
  ScrollView,
  Text,
  View,
  type NativeScrollEvent,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useQuery } from "@tanstack/react-query";
import { auth } from "../../api/auth";
import type { LegalKey, SignupConsent } from "../../api/types";
import { themedStyles } from "../../theme/themed";
import { Button, ErrorBox, Loading, useUi } from "../ui";

// 가입 동의. 만 14세·이용약관·개인정보 수집·이용은 필수, 광고성 정보 수신은 선택이다.
// 북키 앱처럼 이용약관과 개인정보 문서는 끝까지 읽어야 동의할 수 있다.
export interface ConsentState {
  age: boolean;
  terms?: string; // 동의한 문서 버전
  privacy?: string;
  marketing?: string;
}

export function isConsentComplete(state: ConsentState) {
  return state.age && !!state.terms && !!state.privacy;
}

export function toSignupConsent(state: ConsentState): SignupConsent {
  return {
    ageConfirmed: state.age,
    termsAgreed: !!state.terms,
    termsVersion: state.terms,
    privacyAgreed: !!state.privacy,
    privacyVersion: state.privacy,
    marketingAgreed: !!state.marketing,
    marketingVersion: state.marketing,
  };
}

type AgreeField = "terms" | "privacy" | "marketing";

const rows: { field: AgreeField; doc: LegalKey; label: string }[] = [
  { field: "terms", doc: "terms", label: "[필수] 이용약관" },
  {
    field: "privacy",
    doc: "privacy-consent",
    label: "[필수] 개인정보 수집·이용",
  },
  { field: "marketing", doc: "marketing", label: "[선택] 광고성 정보 수신" },
];

export function ConsentBox({
  value,
  onChange,
}: {
  value: ConsentState;
  onChange: (state: ConsentState) => void;
}) {
  const styles = useStyles();
  const [reading, setReading] = useState<(typeof rows)[number]>();
  return (
    <View style={styles.box}>
      <CheckRow
        label="[필수] 만 14세 이상입니다"
        checked={value.age}
        onPress={() => onChange({ ...value, age: !value.age })}
      />
      {rows.map((row) => (
        <CheckRow
          key={row.field}
          label={row.label}
          checked={!!value[row.field]}
          // 동의를 끄는 것은 바로, 켜는 것은 문서를 연 뒤에 한다.
          onPress={() =>
            value[row.field]
              ? onChange({ ...value, [row.field]: undefined })
              : setReading(row)
          }
        />
      ))}
      <LegalSheet
        // 문서마다 새로 만들어 "끝까지 읽음"을 처음부터 다시 센다.
        key={reading?.doc ?? "closed"}
        docKey={reading?.doc}
        mustReadToEnd={reading?.field !== "marketing"}
        onClose={() => setReading(undefined)}
        onAgree={(version) => {
          if (reading) onChange({ ...value, [reading.field]: version });
          setReading(undefined);
        }}
      />
    </View>
  );
}

function CheckRow({
  label,
  checked,
  onPress,
}: {
  label: string;
  checked: boolean;
  onPress: () => void;
}) {
  const styles = useStyles();
  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked }}
      accessibilityLabel={label}
      onPress={onPress}
      style={styles.row}
    >
      <View style={[styles.check, checked && styles.checked]}>
        {checked && <Text style={styles.checkMark}>✓</Text>}
      </View>
      <Text style={styles.label}>{label}</Text>
    </Pressable>
  );
}

// 끝까지 내렸다고 볼 여유(px)
const END_MARGIN = 40;

function reachedEnd({
  layoutMeasurement,
  contentOffset,
  contentSize,
}: NativeScrollEvent) {
  return (
    layoutMeasurement.height + contentOffset.y >=
    contentSize.height - END_MARGIN
  );
}

function LegalSheet({
  docKey,
  mustReadToEnd,
  onClose,
  onAgree,
}: {
  docKey?: LegalKey;
  mustReadToEnd: boolean;
  onClose: () => void;
  onAgree: (version: string) => void;
}) {
  const ui = useUi();
  const styles = useStyles();
  const [readToEnd, setReadToEnd] = useState(false);
  const [viewportHeight, setViewportHeight] = useState(0);
  const [contentHeight, setContentHeight] = useState(0);
  // 내릴 것 없이 화면에 다 들어가는 문서는 바로 읽은 것으로 본다.
  const fitsOnScreen =
    viewportHeight > 0 &&
    contentHeight > 0 &&
    contentHeight <= viewportHeight + END_MARGIN;
  const doc = useQuery({
    queryKey: ["legal", docKey],
    queryFn: () => auth.legal(docKey as LegalKey),
    enabled: !!docKey,
    staleTime: 60 * 60 * 1000,
  });
  const hasRead = readToEnd || fitsOnScreen;
  const canAgree = !!doc.data && (!mustReadToEnd || hasRead);
  return (
    <Modal visible={!!docKey} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={styles.sheet}>
        <Text style={[ui.sectionTitle, styles.sheetTitle]}>
          {doc.data?.title ?? "약관"}
        </Text>
        {doc.isPending && <Loading />}
        {!!doc.error && (
          <ErrorBox
            error={doc.error}
            retry={() => {
              void doc.refetch();
            }}
          />
        )}
        {!!doc.data && (
          <ScrollView
            style={styles.document}
            onScroll={(event) => {
              if (reachedEnd(event.nativeEvent)) setReadToEnd(true);
            }}
            onLayout={(event) =>
              setViewportHeight(event.nativeEvent.layout.height)
            }
            onContentSizeChange={(_width, height) => setContentHeight(height)}
            scrollEventThrottle={100}
          >
            <Text style={styles.documentText}>{doc.data.body}</Text>
          </ScrollView>
        )}
        {mustReadToEnd && !hasRead && !!doc.data && (
          <Text style={ui.hint}>끝까지 읽으면 동의할 수 있어요.</Text>
        )}
        <Button
          disabled={!canAgree}
          onPress={() => {
            if (doc.data) onAgree(doc.data.version);
          }}
        >
          동의하기
        </Button>
        <Button outline onPress={onClose}>
          닫기
        </Button>
      </SafeAreaView>
    </Modal>
  );
}

const useStyles = themedStyles((colors) => ({
  box: { marginVertical: 12, gap: 2 },
  row: { flexDirection: "row", alignItems: "center", gap: 12, minHeight: 48 },
  check: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: colors.muted,
    alignItems: "center",
    justifyContent: "center",
  },
  checked: { backgroundColor: colors.ink, borderColor: colors.ink },
  checkMark: { color: colors.paper, fontSize: 13, fontWeight: "700" },
  label: { flex: 1, fontSize: 14, color: colors.ink },
  sheet: { flex: 1, padding: 24, backgroundColor: colors.background },
  sheetTitle: { marginTop: 0 },
  document: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 13,
    padding: 15,
    marginBottom: 12,
  },
  documentText: { fontSize: 13, lineHeight: 22, color: colors.ink },
}));
