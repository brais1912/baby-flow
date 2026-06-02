"use client";

import { useState, useTransition, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useTranslations, useLocale } from "next-intl";
import { createClient } from "@/lib/supabase/browser";
import { LogoWithText } from "@/components/ui/Logo";
import { LanguageSwitcher } from "@/components/ui/LanguageSwitcher";
import { Suspense } from "react";

function LoginForm() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const searchParams = useSearchParams();
  const t = useTranslations("login");
  const locale = useLocale();

  useEffect(() => {
    const code = searchParams.get("code");
    if (!code) return;

    const supabase = createClient();
    supabase.auth.exchangeCodeForSession(code).then(({ error }) => {
      if (!error) {
        router.replace(`/${locale}/dashboard`);
      } else {
        setError(t("expiredLink"));
      }
    });
  }, [searchParams, router, locale, t]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: { emailRedirectTo: `${window.location.origin}/${locale}/login` },
      });
      if (error) setError(error.message);
      else setSent(true);
    });
  }

  if (searchParams.get("code")) {
    return (
      <div className="text-center py-4">
        <p className="text-sm text-gray-500">{t("signingIn")}</p>
        {error && <p className="text-xs text-red-600 mt-2">{error}</p>}
      </div>
    );
  }

  return sent ? (
    <div className="text-center">
      <p className="text-2xl mb-2">📬</p>
      <h2 className="font-semibold text-gray-900 mb-1">{t("checkEmail")}</h2>
      <p className="text-sm text-gray-500">{t("magicLinkSent")} <strong>{email}</strong></p>
    </div>
  ) : (
    <>
      <h2 className="font-semibold text-gray-900 mb-1">{t("title")}</h2>
      <p className="text-sm text-gray-500 mb-4">{t("subtitle")}</p>
      <form onSubmit={handleSubmit} className="space-y-3">
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder={t("emailPlaceholder")}
          required
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400"
        />
        {error && <p className="text-xs text-red-600">{error}</p>}
        <button
          type="submit"
          disabled={isPending}
          className="w-full bg-purple-600 text-white py-2.5 rounded-lg font-medium text-sm hover:bg-purple-700 disabled:opacity-50 transition-colors"
        >
          {isPending ? t("sending") : t("send")}
        </button>
      </form>
    </>
  );
}

export default function LoginPage() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-purple-50 to-fuchsia-50 px-4">
      <div className="absolute top-4 right-4">
        <LanguageSwitcher />
      </div>
      <div className="w-full max-w-sm">
        <div className="flex justify-center mb-8">
          <LogoWithText />
        </div>
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <Suspense fallback={<p className="text-sm text-gray-500">...</p>}>
            <LoginForm />
          </Suspense>
        </div>
      </div>
    </main>
  );
}
