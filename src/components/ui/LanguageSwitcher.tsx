"use client";

import { useLocale, useTranslations } from "next-intl";
import { useRouter, usePathname } from "next/navigation";
import { routing } from "@/i18n/routing";

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
      {routing.locales.map((l) => (
        <button
          key={l}
          onClick={() => switchLocale(l)}
          className={`text-xs px-2 py-1 rounded-md font-medium transition-all duration-150 active:scale-90 ${
            l === locale
              ? "bg-purple-100 text-purple-700"
              : "text-gray-400 hover:text-gray-600 active:bg-gray-100 active:text-gray-600"
          }`}
        >
          {t(l)}
        </button>
      ))}
    </div>
  );
}
