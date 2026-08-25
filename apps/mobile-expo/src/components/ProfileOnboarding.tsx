import { useMemo } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useI18n } from "../i18n/I18nProvider";
import { useTheme } from "../ThemeProvider";
import type { ThemeColors } from "../theme";
import type { BabyProfile } from "../types/profile";
import { AppButton, Brand, Card, useCoreStyles } from "../ui/Core";
import { ProfileForm } from "./ProfileForm";

export function ProfileOnboarding({ saving, error, onSave, onSignOut }: {
  saving: boolean;
  error: boolean;
  onSave: (profile: BabyProfile) => Promise<unknown>;
  onSignOut: () => Promise<void>;
}) {
  const { t } = useI18n();
  const { colors } = useTheme();
  const coreStyles = useCoreStyles();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const insets = useSafeAreaInsets();
  return (
    <KeyboardAvoidingView style={coreStyles.screen} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView contentContainerStyle={[styles.content, { paddingTop: Math.max(insets.top, 24), paddingBottom: Math.max(insets.bottom, 24) }]} keyboardShouldPersistTaps="handled">
        <View style={styles.heading}>
          <Brand large />
          <Text style={coreStyles.title}>{t("profile.onboardingTitle")}</Text>
          <Text style={coreStyles.subtitle}>{t("profile.onboardingBody")}</Text>
        </View>
        <Card>
          <ProfileForm initialProfile={null} pending={saving} saveError={error} onSave={onSave} submitLabel={t("profile.save")} />
        </Card>
        <AppButton label={t("settings.signOut")} tone="danger" onPress={() => void onSignOut()} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
  content: { flexGrow: 1, justifyContent: "center", paddingHorizontal: 20, gap: 20, backgroundColor: colors.background },
  heading: { alignItems: "center", gap: 10 },
  });
}
