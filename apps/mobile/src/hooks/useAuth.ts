import type { Session } from "@supabase/supabase-js";
import { useCallback, useEffect, useState } from "react";
import { authRedirectUrl } from "../lib/auth";
import { supabase } from "../lib/supabase";

export function useAuth(enabled: boolean) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(enabled);
  const [error, setError] = useState<string | null>(null);
  const [passwordRecovery, setPasswordRecovery] = useState(false);

  useEffect(() => {
    if (!enabled) return;

    let active = true;
    void supabase.auth.getSession().then(({ data, error: sessionError }) => {
      if (!active) return;
      if (sessionError) setError(sessionError.message);
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
  }, [enabled]);

  async function signIn(email: string, password: string): Promise<void> {
    setError(null);
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (signInError) {
      setError("Invalid email or password.");
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
      setError(signUpError.message);
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
      setError(resetError.message);
      throw resetError;
    }
  }

  async function updatePassword(password: string): Promise<void> {
    setError(null);
    const { error: updateError } = await supabase.auth.updateUser({ password });
    if (updateError) {
      setError(updateError.message);
      throw updateError;
    }
    setPasswordRecovery(false);
  }

  const beginPasswordRecovery = useCallback(() => {
    setPasswordRecovery(true);
  }, []);

  async function signOut(): Promise<void> {
    const { error: signOutError } = await supabase.auth.signOut();
    if (signOutError) {
      setError(signOutError.message);
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
