import { useMemo, useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useI18n } from "../i18n/I18nProvider";
import { useTheme } from "../ThemeProvider";
import type { ThemeColors } from "../theme";
import { AppButton, Banner, Brand, Card, Field, TextField, useCoreStyles } from "../ui/Core";

type Mode = "signin" | "signup" | "forgot";

export function LoginScreen({ error, onClearError, onSignIn, onSignUp, onPasswordReset }: {
  error: string | null;
  onClearError: () => void;
  onSignIn: (email: string, password: string) => Promise<void>;
  onSignUp: (email: string, password: string) => Promise<boolean>;
  onPasswordReset: (email: string) => Promise<void>;
}) {
  const { t } = useI18n();
  const { colors } = useTheme();
  const coreStyles = useCoreStyles();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const insets = useSafeAreaInsets();
  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [pending, setPending] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);

  function switchMode(next: Mode) {
    setMode(next);
    setSuccess(null);
    onClearError();
  }

  async function submit() {
    setPending(true);
    setSuccess(null);
    try {
      if (mode === "forgot") {
        await onPasswordReset(email.trim());
        setSuccess(t("auth.resetSent"));
      } else if (mode === "signup") {
        const confirmationRequired = await onSignUp(email.trim(), password);
        if (confirmationRequired) setSuccess(t("auth.confirmSent"));
      } else {
        await onSignIn(email.trim(), password);
      }
    } catch {
      setSuccess(null);
    } finally {
      setPending(false);
    }
  }

  const title = mode === "signin" ? t("auth.signIn") : mode === "signup" ? t("auth.signUp") : t("auth.resetPassword");
  const subtitle = mode === "signin" ? t("auth.signInSubtitle") : mode === "signup" ? t("auth.signUpSubtitle") : t("auth.resetSubtitle");
  const submitLabel = mode === "signin" ? t("auth.signIn") : mode === "signup" ? t("auth.signUp") : t("auth.sendReset");
  const disabled = !email.trim() || (mode !== "forgot" && password.length < 6);

  return (
    <KeyboardAvoidingView style={coreStyles.screen} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={[styles.content, { paddingTop: Math.max(insets.top, 28), paddingBottom: Math.max(insets.bottom, 28) }]}
      >
        <View style={styles.brandBlock}>
          <Brand large />
          <Text style={coreStyles.subtitle}>{subtitle}</Text>
        </View>
        <Card style={styles.form}>
          <Text style={styles.formTitle}>{title}</Text>
          <Field label={t("auth.email")}>
            <TextField
              accessibilityLabel={t("auth.email")}
              autoCapitalize="none"
              keyboardType="email-address"
              onChangeText={setEmail}
              placeholder={t("auth.emailPlaceholder")}
              value={email}
            />
          </Field>
          {mode !== "forgot" ? (
            <Field label={t("auth.password")}>
              <TextField
                accessibilityLabel={t("auth.password")}
                autoCapitalize="none"
                onChangeText={setPassword}
                placeholder={t("auth.password")}
                secureTextEntry
                value={password}
              />
            </Field>
          ) : null}
          {success ? <Banner tone="success">{success}</Banner> : null}
          {error ? <Banner>{error}</Banner> : null}
          <AppButton label={pending ? t("auth.pleaseWait") : submitLabel} loading={pending} disabled={disabled} onPress={() => void submit()} />
          {mode === "signin" ? (
            <View style={styles.modeActions}>
              <AppButton label={t("auth.forgot")} tone="text" onPress={() => switchMode("forgot")} />
              <AppButton label={t("auth.signUp")} tone="text" onPress={() => switchMode("signup")} />
            </View>
          ) : (
            <AppButton label={t("auth.backToSignIn")} tone="text" onPress={() => switchMode("signin")} />
          )}
        </Card>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
  content: { flexGrow: 1, justifyContent: "center", paddingHorizontal: 20, gap: 24, backgroundColor: colors.background },
  brandBlock: { alignItems: "center", gap: 12 },
  form: { gap: 15 },
  formTitle: { color: colors.text, fontSize: 22, fontWeight: "800" },
  modeActions: { flexDirection: "row", justifyContent: "space-between", gap: 4 },
  });
}
