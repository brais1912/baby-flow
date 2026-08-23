import type { Session } from "@supabase/supabase-js";
import { useCallback, useEffect, useState } from "react";
import { useI18n } from "../i18n/I18nProvider";
import { authRedirectUrl } from "../lib/auth";
import { supabase } from "../lib/supabase";

export function useAuth(enabled: boolean) {
  const { t } = useI18n();
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(enabled);
  const [error, setError] = useState<string | null>(null);
  const [passwordRecovery, setPasswordRecovery] = useState(false);

  useEffect(() => {
    if (!enabled) return;
    let active = true;
    void supabase.auth.getSession().then(({ data, error: sessionError }) => {
      if (!active) return;
      if (sessionError) setError(t("auth.genericError"));
      setSession(data.session);
      setLoading(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setLoading(false);
    });
    return () => {
      active = false;
      listener.subscription.unsubscribe();
    };
  }, [enabled, t]);

  async function signIn(email: string, password: string): Promise<void> {
    setError(null);
    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
    if (signInError) {
      setError(t("auth.invalidCredentials"));
      throw signInError;
    }
  }

  async function signUp(email: string, password: string): Promise<boolean> {
    setError(null);
    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: authRedirectUrl("confirmation") },
    });
    if (signUpError) {
      setError(t("auth.genericError"));
      throw signUpError;
    }
    return data.session === null;
  }

  async function requestPasswordReset(email: string): Promise<void> {
    setError(null);
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: authRedirectUrl("password-recovery"),
    });
    if (resetError) {
      setError(t("auth.genericError"));
      throw resetError;
    }
  }

  async function updatePassword(password: string): Promise<void> {
    setError(null);
    const { error: updateError } = await supabase.auth.updateUser({ password });
    if (updateError) {
      setError(t("auth.genericError"));
      throw updateError;
    }
    setPasswordRecovery(false);
  }

  const beginPasswordRecovery = useCallback(() => setPasswordRecovery(true), []);

  async function signOut(): Promise<void> {
    const { error: signOutError } = await supabase.auth.signOut();
    if (signOutError) {
      setError(t("auth.genericError"));
      throw signOutError;
    }
  }

  return {
    session,
    loading,
    error,
    passwordRecovery,
    setError,
    beginPasswordRecovery,
    signIn,
    signUp,
    requestPasswordReset,
    updatePassword,
    signOut,
  };
}
