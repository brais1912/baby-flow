import { useState } from "react";
import { ArrowLeft, LockKeyhole, LogIn, Mail, UserPlus } from "lucide-react";
import { useI18n } from "../i18n/I18nProvider";

type Mode = "signin" | "signup" | "forgot";

export function LoginScreen({ error, onClearError, onSignIn, onSignUp, onPasswordReset }: {
  error: string | null;
  onClearError: () => void;
  onSignIn: (email: string, password: string) => Promise<void>;
  onSignUp: (email: string, password: string) => Promise<boolean>;
  onPasswordReset: (email: string) => Promise<void>;
}) {
  const { t } = useI18n();
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

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
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

  const title = {
    signin: t("auth.signIn"),
    signup: t("auth.signUp"),
    forgot: t("auth.resetPassword"),
  }[mode];
  const subtitle = {
    signin: t("auth.signInSubtitle"),
    signup: t("auth.signUpSubtitle"),
    forgot: t("auth.resetSubtitle"),
  }[mode];
  const submitLabel = {
    signin: t("auth.signIn"),
    signup: t("auth.signUp"),
    forgot: t("auth.sendReset"),
  }[mode];

  return (
    <main className="login-screen">
      <div className="login-brand">
        <span className="brand-mark large" aria-hidden="true" />
        <h1>BabyFlow</h1>
        <p>{subtitle}</p>
      </div>

      <form className="login-form" onSubmit={submit}>
        <h2>{title}</h2>
        <label htmlFor="email">{t("auth.email")}</label>
        <div className="input-with-icon">
          <Mail size={18} aria-hidden="true" />
          <input
            id="email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(changeEvent) => setEmail(changeEvent.target.value)}
            placeholder={t("auth.emailPlaceholder")}
          />
        </div>

        {mode !== "forgot" && (
          <>
            <label htmlFor="password">{t("auth.password")}</label>
            <div className="input-with-icon">
              <LockKeyhole size={18} aria-hidden="true" />
              <input
                id="password"
                type="password"
                autoComplete={mode === "signin" ? "current-password" : "new-password"}
                required
                minLength={6}
                value={password}
                onChange={(changeEvent) => setPassword(changeEvent.target.value)}
                placeholder={t("auth.password")}
              />
            </div>
          </>
        )}

        {success && <p className="success-banner" role="status">{success}</p>}
        {error && <p className="error-banner" role="alert">{error}</p>}
        <button className="primary-button" type="submit" disabled={pending || !email.trim() || (mode !== "forgot" && password.length < 6)}>
          {pending ? <span className="spinner small" aria-label={t("auth.pleaseWait")} /> : mode === "signup" ? <UserPlus size={18} /> : mode === "forgot" ? <Mail size={18} /> : <LogIn size={18} />}
          <span>{pending ? t("auth.pleaseWait") : submitLabel}</span>
        </button>

        <div className="auth-mode-actions">
          {mode === "signin" && (
            <>
              <button type="button" onClick={() => switchMode("forgot")}>{t("auth.forgot")}</button>
              <button type="button" onClick={() => switchMode("signup")}>{t("auth.signUp")}</button>
            </>
          )}
          {mode !== "signin" && (
            <button type="button" onClick={() => switchMode("signin")}>
              <ArrowLeft size={15} />
              {t("auth.backToSignIn")}
            </button>
          )}
        </div>
      </form>
    </main>
  );
}
