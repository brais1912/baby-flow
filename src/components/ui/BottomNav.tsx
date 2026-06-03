"use client";

import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { usePathname } from "next/navigation";

const ACTIONS = [
  { type: "sleep",   emoji: "😴", color: "text-purple-600", bg: "bg-purple-50", activeBg: "bg-purple-100 ring-2 ring-purple-300" },
  { type: "wake_up", emoji: "🌅", color: "text-orange-500", bg: "bg-orange-50", activeBg: "bg-orange-100 ring-2 ring-orange-300" },
  { type: "feeding", emoji: "🍼", color: "text-blue-500",   bg: "bg-blue-50",   activeBg: "bg-blue-100 ring-2 ring-blue-300" },
  { type: "diaper",  emoji: "👶", color: "text-amber-500",  bg: "bg-amber-50",  activeBg: "bg-amber-100 ring-2 ring-amber-300" },
] as const;

export function BottomNav() {
  const locale = useLocale();
  const t = useTranslations("nav");
  const pathname = usePathname();

  const labels: Record<string, string> = {
    sleep: t("sleep"),
    wake_up: t("wakeUp"),
    feeding: t("feeding"),
    diaper: t("diaper"),
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-20 bg-white/90 backdrop-blur-md border-t border-gray-100 safe-area-pb">
      <div className="max-w-2xl mx-auto px-3 h-20 flex items-center justify-around gap-1">
        {ACTIONS.map(({ type, emoji, color, bg, activeBg }) => {
          const href = `/${locale}/events/new?type=${type}`;
          const isActive = pathname.includes(`/events/new`) && pathname.includes(`type=${type}`) || (typeof window !== "undefined" && window.location.search.includes(`type=${type}`));
          return (
            <Link
              key={type}
              href={href}
              className={`flex flex-col items-center gap-1 flex-1 py-2 px-1 rounded-2xl transition-all active:scale-95 ${isActive ? activeBg : bg} ${color}`}
            >
              <span className="text-2xl leading-none">{emoji}</span>
              <span className="text-[10px] font-semibold tracking-wide uppercase opacity-80">{labels[type]}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
