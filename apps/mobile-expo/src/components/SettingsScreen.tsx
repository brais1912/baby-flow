import { ScrollView, StyleSheet, Text, View } from "react-native";
import { formatAge } from "../i18n/format";
import { useI18n } from "../i18n/I18nProvider";
import type { Locale } from "../i18n/messages";
import { colors } from "../theme";
import type { BabyProfile } from "../types/profile";
import { AppButton, Card, ChoiceChips, coreStyles } from "../ui/Core";
import { ProfileForm } from "./ProfileForm";

export function SettingsScreen({ email, profile, savingProfile, profileError, onSaveProfile, onSignOut }: {
  email: string | undefined;
  profile: BabyProfile;
  savingProfile: boolean;
  profileError: boolean;
  onSaveProfile: (profile: BabyProfile) => Promise<unknown>;
  onSignOut: () => Promise<void>;
}) {
  const { locale, setLocale, t } = useI18n();
  const languages: { value: Locale; label: string }[] = [
    { value: "en", label: t("settings.english") },
    { value: "es", label: t("settings.spanish") },
  ];

  return (
    <ScrollView style={coreStyles.screen} contentContainerStyle={coreStyles.scrollContent} keyboardShouldPersistTaps="handled">
      <View style={styles.heading}>
        <Text style={coreStyles.eyebrow}>BabyFlow</Text>
        <Text style={coreStyles.title}>{t("settings.title")}</Text>
      </View>

      <Card style={styles.cardGap}>
        <View style={coreStyles.between}>
          <View style={styles.accountCopy}>
            <Text style={styles.cardTitle}>{t("settings.account")}</Text>
            <Text style={coreStyles.muted}>{email}</Text>
          </View>
          <AppButton label={t("settings.signOut")} tone="danger" onPress={() => void onSignOut().catch(() => undefined)} />
        </View>
      </Card>

      <Card style={styles.cardGap}>
        <Text style={styles.cardTitle}>{t("settings.language")}</Text>
        <ChoiceChips
          accessibilityLabel={t("settings.languageOptions")}
          value={locale}
          options={languages}
          onChange={(value) => void setLocale(value)}
        />
      </Card>

      <Card style={styles.cardGap}>
        <View style={styles.accountCopy}>
          <Text style={styles.cardTitle}>{t("settings.babyProfile")}</Text>
          <Text style={coreStyles.muted}>{formatAge(profile.dateOfBirth, locale)}</Text>
        </View>
        <ProfileForm
          key={`${profile.name}:${profile.dateOfBirth}`}
          initialProfile={profile}
          pending={savingProfile}
          saveError={profileError}
          onSave={onSaveProfile}
          submitLabel={t("profile.update")}
        />
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  heading: { gap: 4, paddingHorizontal: 2, paddingTop: 4 },
  cardGap: { gap: 15 },
  accountCopy: { flex: 1, gap: 3 },
  cardTitle: { color: colors.text, fontSize: 16, fontWeight: "800" },
});
