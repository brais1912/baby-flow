"use client";

import { useLocale, useTranslations } from "next-intl";
import { useRouter, usePathname } from "next/navigation";
import { routing } from "@/i18n/routing";

const LOCALE_FLAG: Record<string, string> = {
  en: "🇬🇧",
  es: "🇪🇸",
};

export function LanguageSwitcher() {
  const locale = useLocale();
  const t = useTranslations("language");
  const router = useRouter();
  const pathname = usePathname();

  function switchLocale(next: string) {
    // Replace the current locale prefix in the path
    const segments = pathname.split("/");
    segments[1] = next;
    router.push(segments.join("/"));
  }

  return (
    <div className="flex items-center gap-1">
      {routing.locales.map((l) => {
        const isActive = l === locale;
        return (
          <button
            key={l}
            type="button"
            onClick={() => switchLocale(l)}
            aria-label={t(l)}
            aria-pressed={isActive}
            className={`w-7 h-7 flex items-center justify-center text-sm rounded-full transition-all duration-150 active:scale-90 ${
              isActive
                ? "bg-purple-100 ring-2 ring-purple-300 shadow-sm"
                : "bg-gray-100 opacity-60 hover:opacity-100 active:bg-gray-200"
            }`}
          >
            {LOCALE_FLAG[l]}
          </button>
        );
      })}
    </div>
  );
}