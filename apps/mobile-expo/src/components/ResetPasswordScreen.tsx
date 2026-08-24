import { useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useI18n } from "../i18n/I18nProvider";
import { colors } from "../theme";
import { AppButton, Banner, Brand, Card, Field, TextField, coreStyles } from "../ui/Core";

export function ResetPasswordScreen({ error, onSubmit }: {
  error: string | null;
  onSubmit: (password: string) => Promise<void>;
}) {
  const { t } = useI18n();
  const insets = useSafeAreaInsets();
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [pending, setPending] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  async function submit() {
    if (password !== confirmation) {
      setLocalError(t("auth.passwordMismatch"));
      return;
    }
    setPending(true);
    setLocalError(null);
    try {
      await onSubmit(password);
    } catch {
      return;
    } finally {
      setPending(false);
    }
  }

  return (
    <KeyboardAvoidingView style={coreStyles.screen} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView contentContainerStyle={[styles.content, { paddingTop: Math.max(insets.top, 28), paddingBottom: Math.max(insets.bottom, 28) }]} keyboardShouldPersistTaps="handled">
        <View style={styles.brandBlock}>
          <Brand large />
          <Text style={coreStyles.subtitle}>{t("auth.chooseNewPassword")}</Text>
        </View>
        <Card style={styles.form}>
          <Text style={styles.formTitle}>{t("auth.setNewPassword")}</Text>
          <Field label={t("auth.newPassword")}>
            <TextField accessibilityLabel={t("auth.newPassword")} autoCapitalize="none" value={password} onChangeText={setPassword} secureTextEntry />
          </Field>
          <Field label={t("auth.confirmPassword")}>
            <TextField accessibilityLabel={t("auth.confirmPassword")} autoCapitalize="none" value={confirmation} onChangeText={setConfirmation} secureTextEntry />
          </Field>
          {localError || error ? <Banner>{localError ?? error}</Banner> : null}
          <AppButton label={pending ? t("common.saving") : t("auth.savePassword")} loading={pending} disabled={password.length < 6 || confirmation.length < 6} onPress={() => void submit()} />
        </Card>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  content: { flexGrow: 1, justifyContent: "center", paddingHorizontal: 20, gap: 24, backgroundColor: colors.background },
  brandBlock: { alignItems: "center", gap: 12 },
  form: { gap: 15 },
  formTitle: { color: colors.text, fontSize: 22, fontWeight: "800" },
});
