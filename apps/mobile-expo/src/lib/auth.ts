import * as Linking from "expo-linking";
import { supabase } from "./supabase";

export type AuthCallbackKind = "confirmation" | "password-recovery";

function valuesFromUrl(url: string): URLSearchParams {
  const parsed = new URL(url);
  const values = new URLSearchParams(parsed.search);
  const hash = new URLSearchParams(parsed.hash.replace(/^#/, ""));
  hash.forEach((value, key) => values.set(key, value));
  return values;
}

function callbackKind(url: string): AuthCallbackKind {
  return new URL(url).pathname.includes("reset-callback")
    ? "password-recovery"
    : "confirmation";
}

export async function completeAuthFromUrl(url: string): Promise<AuthCallbackKind | null> {
  const values = valuesFromUrl(url);
  const code = values.get("code");
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) throw error;
    return callbackKind(url);
  }

  const accessToken = values.get("access_token");
  const refreshToken = values.get("refresh_token");
  if (accessToken && refreshToken) {
    const { error } = await supabase.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken,
    });
    if (error) throw error;
    return callbackKind(url);
  }

  return null;
}

export async function initializeNativeAuthLinks(
  onError: (message: string) => void,
  onPasswordRecovery: () => void,
  fallbackError: string
): Promise<() => void> {
  const handleUrl = async (url: string | null) => {
    if (!url) return;
    try {
      const kind = await completeAuthFromUrl(url);
      if (kind === "password-recovery") onPasswordRecovery();
    } catch {
      onError(fallbackError);
    }
  };

  await handleUrl(await Linking.getInitialURL());
  const listener = Linking.addEventListener("url", ({ url }) => {
    void handleUrl(url);
  });
  return () => listener.remove();
}

export function authRedirectUrl(kind: AuthCallbackKind): string {
  const base = process.env.EXPO_PUBLIC_AUTH_REDIRECT_URL?.trim() || "com.babyflow.app://auth";
  const path = kind === "password-recovery" ? "reset-callback" : "callback";
  return `${base.replace(/\/$/, "")}/${path}`;
}
