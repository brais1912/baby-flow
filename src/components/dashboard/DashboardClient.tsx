"use client";

import { useState, useRef, useTransition } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { useTranslations, useLocale } from "next-intl";
import { format, subDays } from "date-fns";
import { es, enUS } from "date-fns/locale";
import type { Event } from "@/lib/db/schema";
import { updateDayWindowStartMinutes } from "@/lib/actions/settings";
import { getEventsForDateRange } from "@/lib/actions/events";
import { ALLOWED_DAY_WINDOW_START_MINUTES, chartWindowBounds, countNightWakings, dayWindowBounds, dayWindowDate, deduplicateBothBreasts, eventsWithinChartWindow, formatHourLabel, mergeEvents } from "@/lib/utils/format";
import { Spinner } from "@/components/ui/Spinner";
import { SleepChartWrapper, FeedingChartWrapper, DiaperChartWrapper } from "@/components/dashboard/EventChartsWrapper";

const DayView = dynamic(
  () => import("./DayView").then((m) => m.DayView),
  { ssr: false, loading: () => <div className="h-48 flex items-center justify-center text-sm text-gray-400">Loading...</div> }
);

function SectionHeader({ title, emoji }: { title: string; emoji: string }) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <span className="text-base">{emoji}</span>
      <h2 className="text-sm font-bold text-gray-700 uppercase tracking-wider">{title}</h2>
    </div>
  );
}

function ChartCard({ title, emoji, subtitle, children }: { title: string; emoji: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 min-w-0 w-full">
      <SectionHeader title={title} emoji={emoji} />
      {subtitle && <p className="text-[10px] font-semibold text-gray-400 -mt-2 mb-2">{subtitle}</p>}
      {children}
    </div>
  );
}

const STAT_STYLES = [
  { bg: "bg-gradient-to-br from-purple-50 to-fuchsia-50", border: "border-purple-100" },
  { bg: "bg-gradient-to-br from-indigo-50 to-purple-50",  border: "border-indigo-100" },
  { bg: "bg-gradient-to-br from-blue-50 to-cyan-50",      border: "border-blue-100" },
  { bg: "bg-gradient-to-br from-amber-50 to-orange-50",   border: "border-amber-100" },
];

function StatCard({ label, sublabel, value, emoji, styleIdx }: { label: string; sublabel?: string; value: number; emoji: string; styleIdx: number }) {
  const s = STAT_STYLES[styleIdx];
  return (
    <div className={`${s.bg} rounded-xl border ${s.border} px-3 py-2.5 flex items-center gap-2`}>
      <span className="w-7 h-7 rounded-lg bg-white/70 flex items-center justify-center text-sm leading-none flex-shrink-0">
        {emoji}
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <span className="text-xl font-bold text-gray-900 tabular-nums leading-none">{value}</span>
          {sublabel && (
            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-white/80 text-indigo-700 whitespace-nowrap">
              {sublabel}
            </span>
          )}
        </div>
        <span className="block text-[11px] font-medium text-gray-500 leading-tight mt-0.5">{label}</span>
      </div>
    </div>
  );
}

function DayWindowStartSetting({ value }: { value: number }) {
  const router = useRouter();
  const t = useTranslations("dashboard");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-4 py-3 space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">
          {t("dayStart")}
        </p>
        <div className="flex flex-wrap items-center justify-end gap-2">
          {ALLOWED_DAY_WINDOW_START_MINUTES.map((preset) => {
            const isActive = preset === value;
            return (
              <button
                key={preset}
                type="button"
                disabled={isActive || isPending}
                onClick={() => {
                  setError(null);
                  startTransition(async () => {
                    try {
                      const result = await updateDayWindowStartMinutes(preset);
                      if (result.persisted) {
                        router.refresh();
                      } else {
                        setError(t("saveError"));
                      }
                    } catch {
                      setError(t("saveError"));
                    }
                  });
                }}
                className={`h-9 px-3 rounded-xl text-xs font-bold tabular-nums transition-all active:scale-95 disabled:cursor-default ${
                  isActive
                    ? "bg-purple-600 text-white"
                    : "bg-gray-100 text-gray-600 disabled:opacity-40"
                }`}
                aria-pressed={isActive}
              >
                {formatHourLabel(preset, "")}
              </button>
            );
          })}
        </div>
      </div>
      {error && <p className="text-[10px] font-semibold text-red-500 text-right" aria-live="polite">{error}</p>}
    </div>
  );
}

export function DashboardClient({
  events: initialEvents,
  dayWindowStartMinutes,
  initialRangeStart,
  initialRangeEnd,
}: {
  events: Event[];
  dayWindowStartMinutes: number;
  initialRangeStart: Date;
  initialRangeEnd: Date;
}) {
  const [currentDay, setCurrentDay] = useState(() => dayWindowDate(new Date(), dayWindowStartMinutes));
  const [events, setEvents] = useState<Event[]>(initialEvents);
  const [loadError, setLoadError] = useState(false);
  const [isPending, startTransition] = useTransition();
  const loadedBounds = useRef({ start: initialRangeStart, end: initialRangeEnd });
  const t = useTranslations("dashboard");
  const tCharts = useTranslations("charts");
  const locale = useLocale();
  const dateFnsLocale = locale === "es" ? es : enUS;

  const { start: windowStart, end: windowEnd } = dayWindowBounds(currentDay, dayWindowStartMinutes);
  const dayEvents = deduplicateBothBreasts(events.filter((e) => {
    const d = new Date(e.occurredAt);
    return d >= windowStart && d < windowEnd;
  }));

  const sleepingCount = dayEvents.filter((e) => e.type === "sleep" || e.type === "wake_up").length;
  const nightWakings = countNightWakings(events, currentDay);
  const feedingCount  = dayEvents.filter((e) => e.type === "feeding").length;
  const diaperCount   = dayEvents.filter((e) => e.type === "diaper").length;

  const chartEvents = eventsWithinChartWindow(events, currentDay, dayWindowStartMinutes);
  const isCurrentDayToday = dayWindowDate(new Date(), dayWindowStartMinutes).getTime() === currentDay.getTime();
  const sleepChartNow = isCurrentDayToday ? new Date() : windowEnd;
  const chartRangeLabel = `${format(subDays(currentDay, 9), "d MMM", { locale: dateFnsLocale })} – ${format(currentDay, "d MMM", { locale: dateFnsLocale })}`;

  function loadAround(day: Date) {
    const { start: chartStart, end: chartEnd } = chartWindowBounds(day, dayWindowStartMinutes);
    const { start, end } = loadedBounds.current;
    if (chartStart >= start && chartEnd <= end) return;

    const dayMs = 24 * 60 * 60 * 1000;
    const fetchStart = new Date(Math.min(chartStart.getTime(), start.getTime()) - 7 * dayMs);
    const fetchEnd = new Date(Math.max(chartEnd.getTime(), end.getTime()));
    loadedBounds.current = { start: fetchStart, end: fetchEnd };

    setLoadError(false);
    startTransition(async () => {
      try {
        const fetched = await getEventsForDateRange(fetchStart, fetchEnd);
        setEvents((prev) => mergeEvents(prev, fetched));
      } catch {
        setLoadError(true);
        loadedBounds.current = { start, end };
      }
    });
  }

  function handleDayChange(nextDay: Date) {
    setCurrentDay(nextDay);
    loadAround(nextDay);
  }

  return (
    <>
      <DayWindowStartSetting value={dayWindowStartMinutes} />

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard label={t("sleepingEvents")} value={sleepingCount} emoji="😴" styleIdx={0} />
        <StatCard label={t("nightWakings")} sublabel={t("nightWindow")} value={nightWakings} emoji="🌙" styleIdx={1} />
        <StatCard label={t("feedings")}       value={feedingCount}  emoji="🍼" styleIdx={2} />
        <StatCard label={t("diapers")}        value={diaperCount}   emoji="👶" styleIdx={3} />
      </div>

      <div className="relative">
        <DayView events={events} currentDay={currentDay} onDayChange={handleDayChange} dayWindowStartMinutes={dayWindowStartMinutes} />
        {isPending && (
          <div className="pointer-events-none absolute inset-0 flex items-start justify-center pt-44">
            <div className="flex items-center gap-2 rounded-full bg-gray-900/80 text-white text-xs font-semibold px-4 py-2 shadow-lg">
              <Spinner />
              {t("loading")}
            </div>
          </div>
        )}
        {loadError && (
          <div className="mt-3 flex items-center justify-between gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-xs font-semibold text-red-600">
            <span>{t("loadError")}</span>
            <button
              type="button"
              onClick={() => loadAround(currentDay)}
              className="flex-shrink-0 rounded-lg bg-red-100 px-3 py-1.5 text-red-700 active:bg-red-200 active:scale-95 transition-all duration-150"
            >
              {t("retry")}
            </button>
          </div>
        )}
      </div>

      <ChartCard title={tCharts("sleepDuration")} emoji="😴" subtitle={chartRangeLabel}>
        <SleepChartWrapper events={chartEvents} dayWindowStartMinutes={dayWindowStartMinutes} now={sleepChartNow} />
      </ChartCard>

      <ChartCard title={tCharts("feedingAmounts")} emoji="🍼" subtitle={chartRangeLabel}>
        <FeedingChartWrapper events={chartEvents} dayWindowStartMinutes={dayWindowStartMinutes} />
      </ChartCard>

      <ChartCard title={tCharts("diaperChanges")} emoji="👶" subtitle={chartRangeLabel}>
        <DiaperChartWrapper events={chartEvents} dayWindowStartMinutes={dayWindowStartMinutes} />
      </ChartCard>
    </>
  );
}
