import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  KeyboardAvoidingView,
  Platform,
  type TextInputProps,
  type ViewStyle,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { ArrowLeft, ArrowUpRight } from "lucide-react-native";
import { colors } from "../theme";
import type { ReactNode } from "react";
export function Screen({
  children,
  scroll = true,
  title,
  right,
}: {
  children: ReactNode;
  scroll?: boolean;
  title?: string;
  right?: ReactNode;
}) {
  return (
    <SafeAreaView style={ui.screen}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        {title && (
          <View style={ui.top}>
            <Pressable
              accessibilityLabel="뒤로"
              onPress={() =>
                router.canGoBack() ? router.back() : router.replace("/")
              }
              hitSlop={12}
            >
              <ArrowLeft size={22} color={colors.ink} />
            </Pressable>
            <Text style={ui.topTitle}>{title}</Text>
            {right || <View style={{ width: 22 }} />}
          </View>
        )}
        {scroll ? (
          <ScrollView
            contentContainerStyle={ui.content}
            keyboardShouldPersistTaps="handled"
          >
            {children}
          </ScrollView>
        ) : (
          children
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
export function Button({
  children,
  onPress,
  disabled = false,
  outline = false,
}: {
  children: ReactNode;
  onPress: () => void;
  disabled?: boolean;
  outline?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        ui.button,
        outline && ui.outline,
        (disabled || pressed) && { opacity: 0.5 },
      ]}
    >
      <Text style={[ui.buttonText, outline && { color: colors.ink }]}>
        {children}
      </Text>
      <ArrowUpRight size={17} color={outline ? colors.ink : "#fff"} />
    </Pressable>
  );
}
export function Field({ label, ...props }: TextInputProps & { label: string }) {
  return (
    <View style={{ gap: 8, marginBottom: 18 }}>
      <Text style={ui.label}>{label}</Text>
      <TextInput
        accessibilityLabel={label}
        placeholderTextColor={colors.muted}
        {...props}
        style={[
          ui.input,
          props.multiline && { minHeight: 160, textAlignVertical: "top" },
          props.style,
        ]}
      />
    </View>
  );
}
export function Loading() {
  return (
    <View style={{ padding: 45 }}>
      <ActivityIndicator color={colors.green} />
    </View>
  );
}
export function ErrorBox({
  error,
  retry,
}: {
  error: unknown;
  retry?: () => void;
}) {
  return (
    <View style={ui.error}>
      <Text accessibilityRole="alert" style={ui.errorText}>
        {error instanceof Error ? error.message : "요청을 처리하지 못했어요."}
      </Text>
      {retry && (
        <Button outline onPress={retry}>
          다시 시도
        </Button>
      )}
    </View>
  );
}
export function Label({ children }: { children: ReactNode }) {
  return <Text style={ui.eyebrow}>{children}</Text>;
}
export function Card({
  children,
  style,
}: {
  children: ReactNode;
  style?: ViewStyle;
}) {
  return <View style={[ui.card, style]}>{children}</View>;
}
export const ui = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: {
    padding: 24,
    paddingBottom: 45,
    width: "100%",
    maxWidth: 680,
    alignSelf: "center",
  },
  top: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderColor: colors.line,
  },
  topTitle: { fontSize: 15, fontWeight: "600", color: colors.ink },
  heading: {
    fontSize: 31,
    fontWeight: "700",
    color: colors.ink,
    letterSpacing: -1,
    lineHeight: 42,
    marginVertical: 14,
  },
  body: { fontSize: 14, color: colors.muted, lineHeight: 23 },
  eyebrow: {
    fontSize: 10,
    color: colors.green,
    letterSpacing: 2,
    fontWeight: "600",
  },
  button: {
    backgroundColor: colors.ink,
    minHeight: 50,
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderRadius: 14,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 15,
    marginVertical: 6,
  },
  buttonText: { color: "#fff", fontSize: 14, fontWeight: "600" },
  outline: {
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: colors.line,
  },
  label: { fontSize: 13, fontWeight: "600", color: colors.ink },
  input: {
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.paper,
    borderRadius: 13,
    padding: 15,
    fontSize: 15,
    color: colors.ink,
  },
  card: {
    padding: 20,
    borderRadius: 20,
    backgroundColor: colors.paper,
    borderWidth: 1,
    borderColor: colors.line,
    marginBottom: 14,
  },
  error: {
    padding: 16,
    gap: 10,
    backgroundColor: "#FAEBE6",
    borderRadius: 12,
    marginVertical: 12,
  },
  errorText: { color: "#925744", fontSize: 13, lineHeight: 20 },
  sectionTitle: {
    fontSize: 19,
    fontWeight: "700",
    color: colors.ink,
    marginTop: 24,
    marginBottom: 15,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  pill: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.line,
  },
  pillSelected: { backgroundColor: colors.ink, borderColor: colors.ink },
  pillText: { fontSize: 12, color: colors.muted },
  pillTextSelected: { color: "#fff" },
  hint: {
    fontSize: 12,
    lineHeight: 20,
    color: colors.muted,
    marginVertical: 12,
  },
});
