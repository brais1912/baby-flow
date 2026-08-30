import type { Session } from "@supabase/supabase-js";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { DashboardScreen } from "./components/DashboardScreen";
import { InsightsScreen } from "./components/InsightsScreen";
import { LoginScreen } from "./components/LoginScreen";
import { ProfileOnboarding } from "./components/ProfileOnboarding";
import { ReminderPanel } from "./components/ReminderPanel";
import { ResetPasswordScreen } from "./components/ResetPasswordScreen";
import { SectionSwitcher, type MobileTab } from "./components/SectionSwitcher";
import { SettingsScreen } from "./components/SettingsScreen";
import { useAuth } from "./hooks/useAuth";
import { useEvents } from "./hooks/useEvents";
import { useProfile } from "./hooks/useProfile";
import { useSleepInsights } from "./hooks/useSleepInsights";
import { useSleepReminder } from "./hooks/useSleepReminder";
import { useSleepSummaryNotificationNavigation } from "./hooks/useSleepSummaryNotificationNavigation";
import { useI18n } from "./i18n/I18nProvider";
import { initializeNativeAuthLinks } from "./lib/auth";
import { clearUserNotificationState } from "./lib/notificationService";
import {
  clearSleepNotificationState,
  reconcileDailySleepSummary,
} from "./lib/sleepNotificationService";
import { ownerDateFromKey } from "./lib/sleepInsights";
import { isSupabaseConfigured } from "./lib/supabase";
import { useTheme } from "./ThemeProvider";
import type { ThemeColors } from "./theme";
import type { BabyProfile } from "./types/profile";
import { AppButton, Banner, Brand, Card } from "./ui/Core";

function useAppStyles() {
  const { colors } = useTheme();
  return useMemo(() => createStyles(colors), [colors]);
}

export function App({
  initialInsightsOwnerDate,
  passwordRecoveryRoute = false,
}: {
  initialInsightsOwnerDate?: string;
  passwordRecoveryRoute?: boolean;
}) {
  const { t } = useI18n();
  const styles = useAppStyles();
  const auth = useAuth(isSupabaseConfigured);
  const { beginPasswordRecovery, session, setError } = auth;
  const authLinkError = t("auth.failed");

  useEffect(() => {
    if (!isSupabaseConfigured) return;
    let disposed = false;
    let cleanup: (() => void) | undefined;
    void initializeNativeAuthLinks(setError, beginPasswordRecovery, authLinkError)
      .then((dispose) => {
        if (disposed) dispose();
        else cleanup = dispose;
      })
      .catch(() => setError(authLinkError));
    return () => {
      disposed = true;
      cleanup?.();
    };
  }, [authLinkError, beginPasswordRecovery, setError]);

  useEffect(() => {
    if (passwordRecoveryRoute && session) beginPasswordRecovery();
  }, [beginPasswordRecovery, passwordRecoveryRoute, session]);

  if (!isSupabaseConfigured) {
    return (
      <SafeAreaView style={styles.centered}>
        <Brand large />
        <Card><Banner>{t("environment.title")}{"\n"}{t("environment.body")}</Banner></Card>
      </SafeAreaView>
    );
  }
  if (auth.loading) return <LoadingState />;
  if (auth.passwordRecovery && auth.session) return <ResetPasswordScreen error={auth.error} onSubmit={auth.updatePassword} />;
  if (!auth.session) {
    return (
      <LoginScreen
        error={auth.error}
        onClearError={() => auth.setError(null)}
        onSignIn={auth.signIn}
        onSignUp={auth.signUp}
        onPasswordReset={auth.requestPasswordReset}
      />
    );
  }
  return (
    <AuthenticatedApp
      initialInsightsOwnerDate={initialInsightsOwnerDate}
      session={auth.session}
      onSignOut={auth.signOut}
    />
  );
}

function AuthenticatedApp({ initialInsightsOwnerDate, session, onSignOut }: {
  initialInsightsOwnerDate?: string;
  session: Session;
  onSignOut: () => Promise<void>;
}) {
  const { t } = useI18n();
  const styles = useAppStyles();
  const profile = useProfile(session.user.id);
  const signOut = useCallback(async () => {
    await Promise.all([
      clearUserNotificationState(),
      clearSleepNotificationState(),
    ]).catch(() => undefined);
    await onSignOut();
  }, [onSignOut]);
  if (profile.loading) return <LoadingState />;
  if (profile.loadError && !profile.profile) {
    return (
      <SafeAreaView style={styles.centered}>
        <Brand large />
        <Card style={styles.stateCard}>
          <Banner>{t("profile.loadError")}</Banner>
          <AppButton label={t("common.retry")} onPress={() => void profile.reload()} />
          <AppButton label={t("settings.signOut")} tone="danger" onPress={() => void signOut().catch(() => undefined)} />
        </Card>
      </SafeAreaView>
    );
  }
  if (!profile.profile) {
    return <ProfileOnboarding saving={profile.saving} error={profile.saveError} onSave={profile.save} onSignOut={signOut} />;
  }
  return (
    <MobileShell
      session={session}
      initialInsightsOwnerDate={initialInsightsOwnerDate}
      profile={profile.profile}
      profileSaving={profile.saving}
      profileError={profile.saveError}
      onSaveProfile={profile.save}
      onSignOut={signOut}
    />
  );
}

function MobileShell({ initialInsightsOwnerDate, session, profile, profileSaving, profileError, onSaveProfile, onSignOut }: {
  initialInsightsOwnerDate?: string;
  session: Session;
  profile: BabyProfile;
  profileSaving: boolean;
  profileError: boolean;
  onSaveProfile: (profile: BabyProfile) => Promise<BabyProfile>;
  onSignOut: () => Promise<void>;
}) {
  const { locale } = useI18n();
  const styles = useAppStyles();
  const insets = useSafeAreaInsets();
  const requestedInsightsDate = initialInsightsOwnerDate
    ? ownerDateFromKey(initialInsightsOwnerDate)
    : null;
  const [tab, setTab] = useState<MobileTab>(requestedInsightsDate ? "insights" : "events");
  const [selectedInsightsDate, setSelectedInsightsDate] = useState<Date | null>(requestedInsightsDate);
  const contentBottomInset = Math.max(insets.bottom, 10) + 16;
  const events = useEvents(session.user.id, profile);
  const sleepReminder = useSleepReminder({ profile, event: events.sleepPhase, ready: events.sleepPhaseReady });
  const sleepInsights = useSleepInsights({
    userId: session.user.id,
    profile,
    startMinutes: events.dayWindowStartMinutes,
    refreshToken: events.insightsRevision,
  });

  useEffect(() => {
    if (sleepInsights.summaries.length > 0 && !sleepInsights.loading) {
      void reconcileDailySleepSummary({
        summaries: sleepInsights.summaries,
        startMinutes: sleepInsights.startMinutes,
        profile,
        locale,
      }).catch(() => undefined);
    }
  }, [locale, profile, sleepInsights.loading, sleepInsights.startMinutes, sleepInsights.summaries]);

  const openSleepSummary = useCallback((ownerDate: Date) => {
    setSelectedInsightsDate(ownerDate);
    setTab("insights");
  }, []);
  useSleepSummaryNotificationNavigation(openSleepSummary);

  return (
    <SafeAreaView style={styles.shell} edges={["top"]}>
      <View style={styles.header}>
        <Brand />
        <SectionSwitcher
          activeTab={tab}
          onSelect={setTab}
        />
      </View>
      <View style={styles.content}>
        {tab === "events" ? (
          <DashboardScreen
            data={events}
            babyName={profile.name}
          />
        ) : null}
        {tab === "reminders" ? (
          <ReminderPanel
            profile={profile}
            sleepReminder={sleepReminder}
            sleepInsights={sleepInsights}
            bottomContentInset={contentBottomInset}
          />
        ) : null}
        {tab === "insights" ? (
          <InsightsScreen
            data={sleepInsights}
            profile={profile}
            selectedOwnerDate={selectedInsightsDate}
            onSelectOwnerDate={setSelectedInsightsDate}
            bottomContentInset={contentBottomInset}
          />
        ) : null}
        {tab === "settings" ? (
          <SettingsScreen
            dayWindowStartMinutes={events.dayWindowStartMinutes}
            email={session.user.email}
            profile={profile}
            savingProfile={profileSaving}
            profileError={profileError}
            onSaveDayWindow={events.saveDayWindowStart}
            onSaveProfile={onSaveProfile}
            onSignOut={onSignOut}
            bottomContentInset={contentBottomInset}
          />
        ) : null}
      </View>
    </SafeAreaView>
  );
}

function LoadingState() {
  const { t } = useI18n();
  const { colors } = useTheme();
  const styles = useAppStyles();
  return (
    <SafeAreaView style={styles.centered}>
      <Brand large />
      <ActivityIndicator accessibilityLabel={t("common.loading")} size="large" color={colors.primary} />
    </SafeAreaView>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
  shell: { flex: 1, backgroundColor: colors.background },
  header: { minHeight: 54, flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12, paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: colors.border, backgroundColor: colors.surface },
  content: { flex: 1 },
  centered: { flex: 1, backgroundColor: colors.background, alignItems: "center", justifyContent: "center", gap: 22, paddingHorizontal: 24 },
  stateCard: { width: "100%", gap: 12 },
  });
}
