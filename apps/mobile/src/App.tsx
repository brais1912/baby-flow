import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { Bell, CalendarDays, Settings } from "lucide-react";
import { DashboardScreen } from "./components/DashboardScreen";
import { LoginScreen } from "./components/LoginScreen";
import { ProfileOnboarding } from "./components/ProfileOnboarding";
import { ResetPasswordScreen } from "./components/ResetPasswordScreen";
import { ReminderPanel } from "./components/ReminderPanel";
import { SettingsScreen } from "./components/SettingsScreen";
import { useAuth } from "./hooks/useAuth";
import { useProfile } from "./hooks/useProfile";
import { useEvents } from "./hooks/useEvents";
import { useSleepReminder } from "./hooks/useSleepReminder";
import { useI18n } from "./i18n/I18nProvider";
import { initializeNativeAuthLinks } from "./lib/auth";
import { isSupabaseConfigured } from "./lib/supabase";
import type { BabyProfile } from "./types/profile";

type Tab = "events" | "reminders" | "settings";

export function App() {
  const { t } = useI18n();
  const auth = useAuth(isSupabaseConfigured);

  useEffect(() => {
    if (!isSupabaseConfigured) return;
    let disposed = false;
    let cleanup: (() => void) | undefined;
    void initializeNativeAuthLinks(
      auth.setError,
      auth.beginPasswordRecovery,
      t("auth.failed")
    ).then((dispose) => {
      if (disposed) dispose();
      else cleanup = dispose;
    });
    return () => {
      disposed = true;
      cleanup?.();
    };
  }, [auth.beginPasswordRecovery, auth.setError, t]);

  if (!isSupabaseConfigured) {
    return (
      <main className="centered-state">
        <Brand />
        <section className="state-panel" role="alert">
          <h1>{t("environment.title")}</h1>
          <p>{t("environment.body")}</p>
        </section>
      </main>
    );
  }

  if (auth.loading) return <LoadingState />;
  if (auth.passwordRecovery) {
    return <ResetPasswordScreen error={auth.error} onSubmit={auth.updatePassword} />;
  }
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

  return <AuthenticatedApp session={auth.session} onSignOut={auth.signOut} />;
}

function AuthenticatedApp({ session, onSignOut }: {
  session: Session;
  onSignOut: () => Promise<void>;
}) {
  const { t } = useI18n();
  const profile = useProfile(session.user.id);

  if (profile.loading) return <LoadingState />;
  if (profile.loadError && !profile.profile) {
    return (
      <main className="centered-state">
        <Brand />
        <section className="state-panel" role="alert">
          <p>{t("profile.loadError")}</p>
          <button className="primary-button" type="button" onClick={() => void profile.reload()}>{t("common.retry")}</button>
          <button className="secondary-button danger" type="button" onClick={() => void onSignOut()}>{t("settings.signOut")}</button>
        </section>
      </main>
    );
  }
  if (!profile.profile) {
    return (
      <ProfileOnboarding
        saving={profile.saving}
        error={profile.saveError}
        onSave={profile.save}
        onSignOut={onSignOut}
      />
    );
  }

  return (
    <MobileShell
      session={session}
      profile={profile.profile}
      profileSaving={profile.saving}
      profileError={profile.saveError}
      onSaveProfile={profile.save}
      onSignOut={onSignOut}
    />
  );
}

function MobileShell({ session, profile, profileSaving, profileError, onSaveProfile, onSignOut }: {
  session: Session;
  profile: BabyProfile;
  profileSaving: boolean;
  profileError: boolean;
  onSaveProfile: (profile: BabyProfile) => Promise<BabyProfile>;
  onSignOut: () => Promise<void>;
}) {
  const { t } = useI18n();
  const [tab, setTab] = useState<Tab>("events");
  const events = useEvents(session.user.id);
  const sleepReminder = useSleepReminder({
    profile,
    event: events.sleepPhase,
    ready: events.sleepPhaseReady,
  });

  return (
    <div className="app-shell">
      <header className="app-header">
        <Brand />
        <span className="account-email">{session.user.email}</span>
      </header>

      <main className="app-content">
        {tab === "events" && <DashboardScreen data={events} babyName={profile.name} />}
        {tab === "reminders" && <ReminderPanel profile={profile} sleepReminder={sleepReminder} />}
        {tab === "settings" && (
          <SettingsScreen
            email={session.user.email}
            profile={profile}
            savingProfile={profileSaving}
            profileError={profileError}
            onSaveProfile={onSaveProfile}
            onSignOut={onSignOut}
          />
        )}
      </main>

      <nav className="tab-bar" aria-label={t("nav.main")}>
        <TabButton active={tab === "events"} label={t("nav.events")} onClick={() => setTab("events")} icon={<CalendarDays size={21} />} />
        <TabButton active={tab === "reminders"} label={t("nav.reminders")} onClick={() => setTab("reminders")} icon={<Bell size={21} />} />
        <TabButton active={tab === "settings"} label={t("nav.settings")} onClick={() => setTab("settings")} icon={<Settings size={21} />} />
      </nav>
    </div>
  );
}

function LoadingState() {
  const { t } = useI18n();
  return (
    <main className="centered-state">
      <Brand />
      <span className="spinner" aria-label={t("common.loading")} />
    </main>
  );
}

function Brand() {
  return (
    <div className="brand" aria-label="BabyFlow">
      <span className="brand-mark" aria-hidden="true" />
      <span>BabyFlow</span>
    </div>
  );
}

function TabButton({ active, label, onClick, icon }: {
  active: boolean;
  label: string;
  onClick: () => void;
  icon: React.ReactNode;
}) {
  return (
    <button className={active ? "tab-button active" : "tab-button"} type="button" onClick={onClick} aria-current={active ? "page" : undefined}>
      {icon}
      <span>{label}</span>
    </button>
  );
}
