import { useEffect, useState } from "react";
import { Bell, CalendarDays, LogOut, Settings } from "lucide-react";
import { DashboardScreen } from "./components/DashboardScreen";
import { LoginScreen } from "./components/LoginScreen";
import { ResetPasswordScreen } from "./components/ResetPasswordScreen";
import { ReminderPanel } from "./components/ReminderPanel";
import { initializeNativeAuthLinks } from "./lib/auth";
import { useAuth } from "./hooks/useAuth";
import { isSupabaseConfigured } from "./lib/supabase";

type Tab = "events" | "reminders" | "settings";

export function App() {
  const [tab, setTab] = useState<Tab>("events");
  const auth = useAuth(isSupabaseConfigured);

  useEffect(() => {
    if (!isSupabaseConfigured) return;
    let disposed = false;
    let cleanup: (() => void) | undefined;
    void initializeNativeAuthLinks(auth.setError, auth.beginPasswordRecovery).then((dispose) => {
      if (disposed) dispose();
      else cleanup = dispose;
    });
    return () => {
      disposed = true;
      cleanup?.();
    };
  }, [auth.beginPasswordRecovery, auth.setError]);

  if (!isSupabaseConfigured) {
    return (
      <main className="centered-state">
        <Brand />
        <section className="state-panel" role="alert">
          <h1>Mobile environment required</h1>
          <p>Add the Supabase public URL and anonymous key to <code>apps/mobile/.env.local</code>.</p>
        </section>
      </main>
    );
  }

  if (auth.loading) {
    return (
      <main className="centered-state">
        <Brand />
        <span className="spinner" aria-label="Loading" />
      </main>
    );
  }

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

  return (
    <div className="app-shell">
      <header className="app-header">
        <Brand />
        <span className="account-email">{auth.session.user.email}</span>
      </header>

      <main className="app-content">
        {tab === "events" && <DashboardScreen userId={auth.session.user.id} />}
        {tab === "reminders" && <ReminderPanel />}
        {tab === "settings" && (
          <section className="screen settings-screen">
            <div className="screen-heading">
              <p className="eyebrow">BabyFlow</p>
              <h1>Settings</h1>
            </div>
            <div className="settings-row">
              <div>
                <strong>Account</strong>
                <span>{auth.session.user.email}</span>
              </div>
              <button className="icon-command danger" type="button" onClick={() => void auth.signOut()} title="Sign out">
                <LogOut size={19} />
                <span>Sign out</span>
              </button>
            </div>
          </section>
        )}
      </main>

      <nav className="tab-bar" aria-label="Main navigation">
        <TabButton active={tab === "events"} label="Events" onClick={() => setTab("events")} icon={<CalendarDays size={21} />} />
        <TabButton active={tab === "reminders"} label="Reminders" onClick={() => setTab("reminders")} icon={<Bell size={21} />} />
        <TabButton active={tab === "settings"} label="Settings" onClick={() => setTab("settings")} icon={<Settings size={21} />} />
      </nav>
    </div>
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
