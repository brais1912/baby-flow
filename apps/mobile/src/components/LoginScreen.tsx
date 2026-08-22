import { useState } from "react";
import { ArrowLeft, LockKeyhole, LogIn, Mail, UserPlus } from "lucide-react";

type Mode = "signin" | "signup" | "forgot";

export function LoginScreen({ error, onClearError, onSignIn, onSignUp, onPasswordReset }: {
  error: string | null;
  onClearError: () => void;
  onSignIn: (email: string, password: string) => Promise<void>;
  onSignUp: (email: string, password: string) => Promise<boolean>;
  onPasswordReset: (email: string) => Promise<void>;
}) {
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
        setSuccess("Check your email. We sent a password reset link.");
      } else if (mode === "signup") {
        const confirmationRequired = await onSignUp(email.trim(), password);
        if (confirmationRequired) setSuccess("Check your email to confirm your account.");
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
    signin: "Sign in",
    signup: "Create account",
    forgot: "Reset password",
  }[mode];
  const subtitle = {
    signin: "Enter your email and password",
    signup: "Choose an email and password",
    forgot: "Enter the email for your account",
  }[mode];
  const submitLabel = {
    signin: "Sign in",
    signup: "Create account",
    forgot: "Send reset link",
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
        <label htmlFor="email">Email</label>
        <div className="input-with-icon">
          <Mail size={18} aria-hidden="true" />
          <input
            id="email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(changeEvent) => setEmail(changeEvent.target.value)}
            placeholder="you@example.com"
          />
        </div>

        {mode !== "forgot" && (
          <>
            <label htmlFor="password">Password</label>
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
                placeholder="Password"
              />
            </div>
          </>
        )}

        {success && <p className="success-banner" role="status">{success}</p>}
        {error && <p className="error-banner" role="alert">{error}</p>}
        <button className="primary-button" type="submit" disabled={pending || !email.trim() || (mode !== "forgot" && password.length < 6)}>
          {pending ? <span className="spinner small" aria-label="Submitting" /> : mode === "signup" ? <UserPlus size={18} /> : mode === "forgot" ? <Mail size={18} /> : <LogIn size={18} />}
          <span>{pending ? "Please wait" : submitLabel}</span>
        </button>

        <div className="auth-mode-actions">
          {mode === "signin" && (
            <>
              <button type="button" onClick={() => switchMode("forgot")}>Forgot password?</button>
              <button type="button" onClick={() => switchMode("signup")}>Create account</button>
            </>
          )}
          {mode !== "signin" && (
            <button type="button" onClick={() => switchMode("signin")}>
              <ArrowLeft size={15} />
              Back to sign in
            </button>
          )}
        </div>
      </form>
    </main>
  );
}
