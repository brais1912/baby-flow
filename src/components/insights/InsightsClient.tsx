"use client";

import { useState, useTransition } from "react";
import dynamic from "next/dynamic";
import { useRouter, usePathname } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { format, addDays } from "date-fns";
import { es, enUS } from "date-fns/locale";
import { startOfWeekMonday, endOfWeekSunday } from "@/lib/utils/format";
import type { Event } from "@/lib/db/schema";
import { Spinner } from "@/components/ui/Spinner";

const SleepSwimLane   = dynamic(() => import("./SleepSwimLane").then((m) => m.SleepSwimLane),   { ssr: false, loading: () => <ChartSkeleton /> });
const WeekTotalsChart = dynamic(() => import("./WeekTotalsChart").then((m) => m.WeekTotalsChart), { ssr: false, loading: () => <ChartSkeleton /> });
const FeedingHeatmap  = dynamic(() => import("./FeedingHeatmap").then((m) => m.FeedingHeatmap),  { ssr: false, loading: () => <ChartSkeleton /> });
const DiaperHeatmap   = dynamic(() => import("./DiaperHeatmap").then((m) => m.DiaperHeatmap),    { ssr: false, loading: () => <ChartSkeleton /> });

function ChartSkeleton() {
  return <div className="h-48 flex items-center justify-center text-sm text-gray-300 animate-pulse">Loading…</div>;
}

function SectionCard({ title, emoji, children }: { title: string; emoji: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 min-w-0 w-full">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-base">{emoji}</span>
        <h2 className="text-sm font-bold text-gray-700 uppercase tracking-wider">{title}</h2>
      </div>
      {children}
    </div>
  );
}

export function InsightsClient({ events, weekStart: weekStartISO }: { events: Event[]; weekStart: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const locale = useLocale();
  const dateFnsLocale = locale === "es" ? es : enUS;
  const t = useTranslations("insights");

  const weekStart = new Date(weekStartISO);
  const weekEnd   = endOfWeekSunday(weekStart);

  const [activeTab, setActiveTab] = useState<"sleep" | "totals" | "heatmap" | "diaper">("sleep");
  const [isPending, startTransition] = useTransition();

  function navigate(dir: "prev" | "next") {
    const next = startOfWeekMonday(addDays(weekStart, dir === "prev" ? -1 : 7));
    const params = new URLSearchParams({ week: next.toISOString() });
    startTransition(() => {
      router.push(`${pathname}?${params.toString()}`);
    });
  }

  const isoWeek = format(weekStart, "w");
  const weekLabel = `${t("week")} ${isoWeek} · ${format(weekStart, "d MMM", { locale: dateFnsLocale })} – ${format(weekEnd, "d MMM", { locale: dateFnsLocale })}`;
  const isCurrentWeek = startOfWeekMonday(new Date()).getTime() === weekStart.getTime();

  const TABS: { key: typeof activeTab; label: string; emoji: string }[] = [
    { key: "sleep",   label: t("tabSleep"),   emoji: "😴" },
    { key: "totals",  label: t("tabTotals"),  emoji: "📊" },
    { key: "heatmap", label: t("tabHeatmap"), emoji: "🍼" },
    { key: "diaper",  label: t("tabDiaper"),  emoji: "👶" },
  ];

  return (
    <div className="space-y-4">
      {/* Week navigator */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-4 py-3 flex items-center justify-between">
        <button
          onClick={() => navigate("prev")}
          disabled={isPending}
          className="w-9 h-9 flex items-center justify-center rounded-xl bg-gray-100 text-gray-600 text-lg font-bold active:bg-gray-200 active:scale-90 transition-all duration-150 disabled:opacity-50"
          aria-label={t("prevWeek")}
        >
          ‹
        </button>
        <span className="text-sm font-bold text-gray-800 text-center flex items-center justify-center gap-2">
          {isPending && <Spinner className="w-3.5 h-3.5 text-purple-500" />}
          {weekLabel}
        </span>
        <button
          onClick={() => navigate("next")}
          disabled={isCurrentWeek || isPending}
          className="w-9 h-9 flex items-center justify-center rounded-xl bg-gray-100 text-gray-600 text-lg font-bold active:bg-gray-200 active:scale-90 transition-all duration-150 disabled:opacity-25"
          aria-label={t("nextWeek")}
        >
          ›
        </button>
      </div>

      {/* Tab switcher */}
      <div className="flex gap-2">
        {TABS.map(({ key, label, emoji }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className={`flex-1 flex flex-col items-center gap-0.5 py-2.5 rounded-2xl text-xs font-semibold border-2 transition-all active:scale-95 ${
              activeTab === key
                ? "border-purple-500 bg-purple-50 text-purple-700"
                : "border-gray-200 bg-white text-gray-500"
            }`}
          >
            <span className="text-lg">{emoji}</span>
            {label}
          </button>
        ))}
      </div>

      {/* Charts */}
      <div className={`space-y-4 transition-opacity duration-200 ${isPending ? "opacity-50" : ""}`}>
      {activeTab === "sleep" && (
        <SectionCard title={t("sleepTitle")} emoji="😴">
          <SleepSwimLane events={events} weekStart={weekStart} />
        </SectionCard>
      )}

      {activeTab === "totals" && (
        <SectionCard title={t("totalsTitle")} emoji="📊">
          <WeekTotalsChart events={events} weekStart={weekStart} />
        </SectionCard>
      )}

      {activeTab === "heatmap" && (
        <SectionCard title={t("heatmapTitle")} emoji="🍼">
          <FeedingHeatmap events={events} weekStart={weekStart} />
        </SectionCard>
      )}

      {activeTab === "diaper" && (
        <SectionCard title={t("diaperTitle")} emoji="👶">
          <DiaperHeatmap events={events} weekStart={weekStart} />
        </SectionCard>
      )}
      </div>
    </div>
  );
}
