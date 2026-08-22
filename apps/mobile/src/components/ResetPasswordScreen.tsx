import { useState } from "react";
import { Save } from "lucide-react";

export function ResetPasswordScreen({ error, onSubmit }: {
  error: string | null;
  onSubmit: (password: string) => Promise<void>;
}) {
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [pending, setPending] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (password !== confirmation) {
      setLocalError("Passwords do not match.");
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
    <main className="login-screen">
      <div className="login-brand">
        <span className="brand-mark large" aria-hidden="true" />
        <h1>BabyFlow</h1>
        <p>Choose a new password for your account</p>
      </div>

      <form className="login-form" onSubmit={(event) => void submit(event)}>
        <h2>Set new password</h2>
        <label htmlFor="new-password">New password</label>
        <input
          id="new-password"
          type="password"
          autoComplete="new-password"
          required
          minLength={6}
          value={password}
          onChange={(event) => setPassword(event.target.value)}
        />
        <label htmlFor="confirm-password">Confirm password</label>
        <input
          id="confirm-password"
          type="password"
          autoComplete="new-password"
          required
          minLength={6}
          value={confirmation}
          onChange={(event) => setConfirmation(event.target.value)}
        />
        {(localError || error) && <p className="error-banner" role="alert">{localError ?? error}</p>}
        <button className="primary-button" type="submit" disabled={pending || password.length < 6 || confirmation.length < 6}>
          {pending ? <span className="spinner small" aria-label="Saving" /> : <Save size={18} />}
          <span>{pending ? "Saving" : "Save new password"}</span>
        </button>
      </form>
    </main>
  );
}
