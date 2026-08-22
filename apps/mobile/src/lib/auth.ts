import { App } from "@capacitor/app";
import { Capacitor } from "@capacitor/core";
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
  const complete = async (url: string) => {
    const kind = await completeAuthFromUrl(url);
    if (kind === "password-recovery") onPasswordRecovery();
  };

  if (!Capacitor.isNativePlatform()) {
    try {
      await complete(window.location.href);
    } catch {
      onError(fallbackError);
    }
    return () => undefined;
  }

  const handleUrl = async (url: string) => {
    try {
      await complete(url);
    } catch {
      onError(fallbackError);
    }
  };

  const launchUrl = await App.getLaunchUrl();
  if (launchUrl?.url) await handleUrl(launchUrl.url);

  const urlListener = await App.addListener("appUrlOpen", ({ url }) => {
    void handleUrl(url);
  });
  const stateListener = await App.addListener("appStateChange", ({ isActive }) => {
    if (isActive) supabase.auth.startAutoRefresh();
    else supabase.auth.stopAutoRefresh();
  });

  return () => {
    void urlListener.remove();
    void stateListener.remove();
  };
}

export function authRedirectUrl(kind: AuthCallbackKind): string {
  const configured = import.meta.env.VITE_AUTH_REDIRECT_URL?.trim();
  const base = configured || (
    Capacitor.isNativePlatform()
      ? "com.babyflow.app://auth"
      : window.location.origin
  );
  const path = kind === "password-recovery" ? "reset-callback" : "callback";
  return `${base.replace(/\/$/, "")}/${path}`;
}
