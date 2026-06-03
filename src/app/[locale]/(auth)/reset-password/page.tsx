"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations, useLocale } from "next-intl";
import { createClient } from "@/lib/supabase/browser";
import { LogoWithText } from "@/components/ui/Logo";

const inputClass =
  "w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-purple-400 focus:bg-white focus:border-transparent transition-all";
const labelClass = "block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5";

export default function ResetPasswordPage() {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const t = useTranslations("login");
  const locale = useLocale();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (password !== confirm) { setError(t("passwordMismatch")); return; }

    startTransition(async () => {
      const supabase = createClient();
      const { error } = await supabase.auth.updateUser({ password });
      if (error) { setError(error.message); return; }
      router.replace(`/${locale}/dashboard`);
    });
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-purple-50 via-white to-fuchsia-50 px-4">
      <div className="absolute top-0 left-0 w-64 h-64 bg-purple-200 rounded-full opacity-20 blur-3xl -translate-x-1/2 -translate-y-1/2 pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-80 h-80 bg-fuchsia-200 rounded-full opacity-20 blur-3xl translate-x-1/3 translate-y-1/3 pointer-events-none" />

      <div className="w-full max-w-sm relative">
        <div className="flex justify-center mb-8">
          <LogoWithText />
        </div>

        <div className="bg-white/80 backdrop-blur-sm rounded-3xl shadow-xl shadow-purple-100 border border-white p-6">
          <h2 className="font-bold text-gray-900 text-lg mb-1">{t("newPasswordTitle")}</h2>
          <p className="text-sm text-gray-400 mb-5">{t("newPasswordSubtitle")}</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className={labelClass}>{t("newPassword")}</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={t("passwordPlaceholder")}
                required
                minLength={6}
                autoComplete="new-password"
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>{t("confirmPassword")}</label>
              <input
                type="password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                placeholder={t("passwordPlaceholder")}
                required
                minLength={6}
                autoComplete="new-password"
                className={inputClass}
              />
            </div>

            {error && (
              <p className="text-xs text-red-500 bg-red-50 border border-red-100 rounded-xl px-3 py-2.5">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={isPending}
              className="w-full bg-gradient-to-r from-purple-600 to-fuchsia-600 text-white py-3.5 rounded-xl font-bold text-sm hover:from-purple-700 hover:to-fuchsia-700 disabled:opacity-50 transition-all active:scale-[0.98] shadow-md shadow-purple-200"
            >
              {isPending ? "..." : t("savePassword")}
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}
