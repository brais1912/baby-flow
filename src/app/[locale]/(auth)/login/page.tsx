"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations, useLocale } from "next-intl";
import { createClient } from "@/lib/supabase/browser";
import { LogoWithText } from "@/components/ui/Logo";
import { LanguageSwitcher } from "@/components/ui/LanguageSwitcher";
import { Spinner } from "@/components/ui/Spinner";

const inputClass =
  "w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-purple-400 focus:bg-white focus:border-transparent transition-all";
const labelClass = "block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5";

type Mode = "signin" | "signup" | "forgot";

export default function LoginPage() {
  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const t = useTranslations("login");
  const locale = useLocale();

  function switchMode(next: Mode) {
    setMode(next);
    setError(null);
    setSuccess(null);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    startTransition(async () => {
      const supabase = createClient();

      if (mode === "forgot") {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/${locale}/auth/reset-callback`,
        });
        if (error) { setError(error.message); return; }
        setSuccess(t("resetEmailSent"));
        return;
      }

      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) { setError(error.message); return; }
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          router.replace(`/${locale}/dashboard`);
        } else {
          setSuccess(t("confirmEmail"));
        }
        return;
      }

      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) { setError(t("invalidCredentials")); return; }
      router.replace(`/${locale}/dashboard`);
    });
  }

  const titles: Record<Mode, string> = {
    signin: t("title"),
    signup: t("signUpTitle"),
    forgot: t("forgotTitle"),
  };
  const subtitles: Record<Mode, string> = {
    signin: t("subtitle"),
    signup: t("signUpSubtitle"),
    forgot: t("forgotSubtitle"),
  };
  const submitLabels: Record<Mode, string> = {
    signin: t("signIn"),
    signup: t("signUp"),
    forgot: t("sendReset"),
  };

  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-purple-50 via-white to-fuchsia-50 px-4">
      <div className="absolute top-4 right-4">
        <LanguageSwitcher />
      </div>

      <div className="absolute top-0 left-0 w-64 h-64 bg-purple-200 rounded-full opacity-20 blur-3xl -translate-x-1/2 -translate-y-1/2 pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-80 h-80 bg-fuchsia-200 rounded-full opacity-20 blur-3xl translate-x-1/3 translate-y-1/3 pointer-events-none" />

      <div className="w-full max-w-sm relative">
        <div className="flex justify-center mb-8">
          <LogoWithText />
        </div>

        <div className="bg-white/80 backdrop-blur-sm rounded-3xl shadow-xl shadow-purple-100 border border-white p-6">
          <h2 className="font-bold text-gray-900 text-lg mb-1">{titles[mode]}</h2>
          <p className="text-sm text-gray-400 mb-5">{subtitles[mode]}</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className={labelClass}>{t("email")}</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={t("emailPlaceholder")}
                required
                autoComplete="email"
                className={inputClass}
              />
            </div>

            {mode !== "forgot" && (
              <div>
                <label className={labelClass}>{t("password")}</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={t("passwordPlaceholder")}
                  required
                  minLength={6}
                  autoComplete={mode === "signin" ? "current-password" : "new-password"}
                  className={inputClass}
                />
              </div>
            )}

            {error && (
              <p className="text-xs text-red-500 bg-red-50 border border-red-100 rounded-xl px-3 py-2.5">
                {error}
              </p>
            )}
            {success && (
              <p className="text-xs text-green-600 bg-green-50 border border-green-100 rounded-xl px-3 py-2.5">
                {success}
              </p>
            )}

            <button
              type="submit"
              disabled={isPending}
              className="w-full bg-gradient-to-r from-purple-600 to-fuchsia-600 text-white py-3.5 rounded-xl font-bold text-sm hover:from-purple-700 hover:to-fuchsia-700 disabled:opacity-70 transition-all duration-150 active:scale-[0.98] shadow-md shadow-purple-200 flex items-center justify-center gap-2"
            >
              {isPending && <Spinner className="w-4 h-4" />}
              {submitLabels[mode]}
            </button>
          </form>

          <div className="mt-4 flex flex-col items-center gap-2">
            {mode === "signin" && (
              <>
                <button onClick={() => switchMode("forgot")} className="text-xs text-gray-400 hover:text-purple-600 active:text-purple-600 active:scale-95 transition-all duration-150 px-2 py-1">
                  {t("forgotPassword")}
                </button>
                <button onClick={() => switchMode("signup")} className="text-xs text-gray-400 hover:text-purple-600 active:text-purple-600 active:scale-95 transition-all duration-150 px-2 py-1">
                  {t("noAccount")}
                </button>
              </>
            )}
            {mode === "signup" && (
              <button onClick={() => switchMode("signin")} className="text-xs text-gray-400 hover:text-purple-600 active:text-purple-600 active:scale-95 transition-all duration-150 px-2 py-1">
                {t("hasAccount")}
              </button>
            )}
            {mode === "forgot" && (
              <button onClick={() => switchMode("signin")} className="text-xs text-gray-400 hover:text-purple-600 active:text-purple-600 active:scale-95 transition-all duration-150 px-2 py-1">
                ← {t("backToSignIn")}
              </button>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
