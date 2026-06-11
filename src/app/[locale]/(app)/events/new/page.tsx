"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useTranslations, useLocale } from "next-intl";
import { Suspense } from "react";
import { EventForm } from "@/components/events/EventForm";
import type { EventType } from "@/types/events";

const TYPE_STYLE: Record<EventType, { emoji: string; gradient: string }> = {
  sleep:   { emoji: "😴", gradient: "from-purple-500 to-fuchsia-500" },
  wake_up: { emoji: "🌅", gradient: "from-orange-400 to-amber-400" },
  feeding: { emoji: "🍼", gradient: "from-blue-500 to-cyan-400" },
  diaper:  { emoji: "👶", gradient: "from-amber-400 to-orange-400" },
};

function NewEventContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const t = useTranslations("newEvent");
  const locale = useLocale();
  const type = searchParams.get("type") as EventType | null;

  const titles: Record<EventType, string> = {
    sleep: t("sleep"),
    wake_up: t("wakeUp"),
    feeding: t("feeding"),
    diaper: t("diaper"),
  };

  const style = type ? TYPE_STYLE[type] : null;

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <button
          onClick={() => router.back()}
          className="w-9 h-9 flex items-center justify-center rounded-xl bg-gray-100 text-gray-600 text-lg font-bold active:bg-gray-200 active:scale-90 transition-all duration-150 flex-shrink-0"
          aria-label="Go back"
        >
          ‹
        </button>
        <div className="flex items-center gap-2.5 min-w-0">
          {style && (
            <div className={`w-10 h-10 rounded-2xl bg-gradient-to-br ${style.gradient} flex items-center justify-center text-xl shadow-sm flex-shrink-0`}>
              {style.emoji}
            </div>
          )}
          <div className="min-w-0">
            <h1 className="text-xl font-bold text-gray-900 leading-tight truncate">
              {type ? titles[type] : t("default")}
            </h1>
            <p className="text-xs text-gray-400">{t("subtitle")}</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <EventForm
          key={type ?? "default"}
          initialType={type ?? undefined}
          onSuccess={() => router.push(`/${locale}/dashboard`)}
        />
      </div>
    </div>
  );
}

export default function NewEventPage() {
  return (
    <Suspense>
      <NewEventContent />
    </Suspense>
  );
}
