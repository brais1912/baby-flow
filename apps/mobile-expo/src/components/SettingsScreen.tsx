import { useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { formatAge } from "../i18n/format";
import { useI18n } from "../i18n/I18nProvider";
import type { Locale } from "../i18n/messages";
import { ALLOWED_DAY_WINDOW_START_MINUTES } from "../lib/events";
import { colors } from "../theme";
import type { BabyProfile } from "../types/profile";
import { AppButton, Banner, Card, ChoiceChips, coreStyles } from "../ui/Core";
import { ProfileForm } from "./ProfileForm";

export function SettingsScreen({
  dayWindowStartMinutes,
  email,
  profile,
  savingProfile,
  profileError,
  onSaveDayWindow,
  onSaveProfile,
  onSignOut,
}: {
  dayWindowStartMinutes: number;
  email: string | undefined;
  profile: BabyProfile;
  savingProfile: boolean;
  profileError: boolean;
  onSaveDayWindow: (startMinutes: number) => Promise<void>;
  onSaveProfile: (profile: BabyProfile) => Promise<unknown>;
  onSignOut: () => Promise<void>;
}) {
  const { locale, setLocale, t } = useI18n();
  const [dayWindowDraft, setDayWindowDraft] = useState(dayWindowStartMinutes);
  const [dayWindowPending, setDayWindowPending] = useState(false);
  const [dayWindowMessage, setDayWindowMessage] = useState<"saved" | "error" | null>(null);
  const languages: { value: Locale; label: string }[] = [
    { value: "en", label: t("settings.english") },
    { value: "es", label: t("settings.spanish") },
  ];
  const dayWindowOptions = ALLOWED_DAY_WINDOW_START_MINUTES.map((minutes) => ({
    value: String(minutes),
    label: `${String(Math.floor(minutes / 60)).padStart(2, "0")}:00`,
  }));
  const dayWindowTime = `${String(Math.floor(dayWindowDraft / 60)).padStart(2, "0")}:00`;

  async function saveDayWindow() {
    setDayWindowPending(true);
    setDayWindowMessage(null);
    try {
      await onSaveDayWindow(dayWindowDraft);
      setDayWindowMessage("saved");
    } catch {
      setDayWindowMessage("error");
    } finally {
      setDayWindowPending(false);
    }
  }

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
          <Text style={styles.cardTitle}>{t("settings.dayWindow")}</Text>
          <Text style={coreStyles.body}>{t("settings.dayWindowDescription", { time: dayWindowTime })}</Text>
          <Text style={coreStyles.muted}>{t("settings.dayWindowShared")}</Text>
        </View>
        <ChoiceChips
          accessibilityLabel={t("settings.dayWindowOptions")}
          value={String(dayWindowDraft)}
          options={dayWindowOptions}
          disabled={dayWindowPending}
          onChange={(value) => {
            setDayWindowDraft(Number(value));
            setDayWindowMessage(null);
          }}
        />
        {dayWindowMessage ? (
          <Banner tone={dayWindowMessage === "saved" ? "success" : "error"}>
            {t(dayWindowMessage === "saved" ? "settings.dayWindowSaved" : "settings.dayWindowError")}
          </Banner>
        ) : null}
        <AppButton
          label={dayWindowPending ? t("common.saving") : t("settings.saveDayWindow")}
          loading={dayWindowPending}
          disabled={dayWindowDraft === dayWindowStartMinutes}
          onPress={() => void saveDayWindow()}
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
