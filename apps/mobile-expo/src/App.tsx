import type { Session } from "@supabase/supabase-js";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { DashboardScreen } from "./components/DashboardScreen";
import { InsightsScreen } from "./components/InsightsScreen";
import { LoginScreen } from "./components/LoginScreen";
import { ProfileOnboarding } from "./components/ProfileOnboarding";
import { ReminderPanel } from "./components/ReminderPanel";
import { ResetPasswordScreen } from "./components/ResetPasswordScreen";
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
import {
  mostRecentlyCompletedOwnerDate,
  ownerDateFromKey,
  ownerDateKey,
} from "./lib/sleepInsights";
import { isSupabaseConfigured } from "./lib/supabase";
import { colors, shadows } from "./theme";
import type { BabyProfile } from "./types/profile";
import { AppButton, Banner, Brand, Card, coreStyles } from "./ui/Core";

type Tab = "events" | "reminders" | "insights" | "settings";

export function App({
  initialInsightsOwnerDate,
  passwordRecoveryRoute = false,
}: {
  initialInsightsOwnerDate?: string;
  passwordRecoveryRoute?: boolean;
}) {
  const { t } = useI18n();
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
  const { locale, t } = useI18n();
  const requestedInsightsDate = initialInsightsOwnerDate
    ? ownerDateFromKey(initialInsightsOwnerDate)
    : null;
  const [tab, setTab] = useState<Tab>(requestedInsightsDate ? "insights" : "events");
  const [selectedInsightsDate, setSelectedInsightsDate] = useState<Date | null>(requestedInsightsDate);
  const events = useEvents(session.user.id, profile);
  const sleepReminder = useSleepReminder({ profile, event: events.sleepPhase, ready: events.sleepPhaseReady });
  const sleepInsights = useSleepInsights({
    userId: session.user.id,
    profile,
    startMinutes: events.dayWindowStartMinutes,
    refreshToken: events.insightsRevision,
  });
  const completedSummary = useMemo(() => {
    const completed = mostRecentlyCompletedOwnerDate(new Date(), events.dayWindowStartMinutes);
    return sleepInsights.summaries.find(
      (summary) => ownerDateKey(summary.ownerDate) === ownerDateKey(completed)
    ) ?? null;
  }, [events.dayWindowStartMinutes, sleepInsights.summaries]);

  useEffect(() => {
    if (completedSummary && !sleepInsights.loading) {
      void reconcileDailySleepSummary({ summary: completedSummary, profile, locale }).catch(() => undefined);
    }
  }, [completedSummary, locale, profile, sleepInsights.loading]);

  const openSleepSummary = useCallback((ownerDate: Date) => {
    setSelectedInsightsDate(ownerDate);
    setTab("insights");
  }, []);
  useSleepSummaryNotificationNavigation(openSleepSummary);

  return (
    <SafeAreaView style={styles.shell} edges={["top", "bottom"]}>
      <View style={styles.header}>
        <Brand />
        <Text numberOfLines={1} style={styles.email}>{session.user.email}</Text>
      </View>
      <View style={styles.content}>
        {tab === "events" ? <DashboardScreen data={events} babyName={profile.name} /> : null}
        {tab === "reminders" ? <ReminderPanel profile={profile} sleepReminder={sleepReminder} sleepInsights={sleepInsights} /> : null}
        {tab === "insights" ? (
          <InsightsScreen
            data={sleepInsights}
            profile={profile}
            selectedOwnerDate={selectedInsightsDate}
            onSelectOwnerDate={setSelectedInsightsDate}
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
          />
        ) : null}
      </View>
      <View style={styles.tabBar} accessibilityLabel={t("nav.main")} accessibilityRole="tablist">
        <TabButton active={tab === "events"} label={t("nav.events")} icon="◷" onPress={() => setTab("events")} />
        <TabButton active={tab === "reminders"} label={t("nav.reminders")} icon="♧" onPress={() => setTab("reminders")} />
        <TabButton active={tab === "insights"} label={t("nav.insights")} icon="⌁" onPress={() => setTab("insights")} />
        <TabButton active={tab === "settings"} label={t("nav.settings")} icon="⚙" onPress={() => setTab("settings")} />
      </View>
    </SafeAreaView>
  );
}

function TabButton({ active, label, icon, onPress }: { active: boolean; label: string; icon: string; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="tab" accessibilityState={{ selected: active }} onPress={onPress} style={({ pressed }) => [styles.tab, active && styles.activeTab, pressed && styles.pressed]}>
      <Text style={[styles.tabIcon, active && styles.activeTabText]}>{icon}</Text>
      <Text style={[styles.tabText, active && styles.activeTabText]}>{label}</Text>
    </Pressable>
  );
}

function LoadingState() {
  const { t } = useI18n();
  return (
    <SafeAreaView style={styles.centered}>
      <Brand large />
      <ActivityIndicator accessibilityLabel={t("common.loading")} size="large" color={colors.primary} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  shell: { flex: 1, backgroundColor: colors.surface },
  header: { minHeight: 54, flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12, paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: colors.border, backgroundColor: colors.surface },
  email: { flex: 1, textAlign: "right", color: colors.textMuted, fontSize: 11 },
  content: { flex: 1 },
  tabBar: { flexDirection: "row", minHeight: 62, borderTopWidth: 1, borderTopColor: colors.border, backgroundColor: colors.surface, paddingHorizontal: 8, paddingTop: 5, ...shadows.card },
  tab: { flex: 1, alignItems: "center", justifyContent: "center", gap: 2, borderRadius: 14 },
  activeTab: { backgroundColor: colors.primarySoft },
  tabIcon: { color: colors.textMuted, fontSize: 20 },
  tabText: { color: colors.textMuted, fontSize: 10, fontWeight: "700" },
  activeTabText: { color: colors.primaryDark },
  pressed: { opacity: 0.65 },
  centered: { ...coreStyles.screen, alignItems: "center", justifyContent: "center", gap: 22, paddingHorizontal: 24 },
  stateCard: { width: "100%", gap: 12 },
});
