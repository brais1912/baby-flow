"use client";

import { useState, useTransition } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import type { Event } from "@/lib/db/schema";
import { updateDayWindowStartMinutes } from "@/lib/actions/settings";
import { ALLOWED_DAY_WINDOW_START_MINUTES, dayWindowBounds, dayWindowDate, deduplicateBothBreasts, formatHourLabel } from "@/lib/utils/format";

const DayView = dynamic(
  () => import("./DayView").then((m) => m.DayView),
  { ssr: false, loading: () => <div className="h-48 flex items-center justify-center text-sm text-gray-400">Loading...</div> }
);

const STAT_STYLES = [
  { bg: "bg-gradient-to-br from-purple-50 to-fuchsia-50", border: "border-purple-100" },
  { bg: "bg-gradient-to-br from-blue-50 to-cyan-50",      border: "border-blue-100" },
  { bg: "bg-gradient-to-br from-amber-50 to-orange-50",   border: "border-amber-100" },
];

function StatCard({ label, value, emoji, styleIdx }: { label: string; value: number; emoji: string; styleIdx: number }) {
  const s = STAT_STYLES[styleIdx];
  return (
    <div className={`${s.bg} rounded-2xl border ${s.border} p-4 flex flex-col gap-1`}>
      <span className="text-xl">{emoji}</span>
      <span className="text-3xl font-bold text-gray-900 tabular-nums">{value}</span>
      <span className="text-xs font-medium text-gray-500 leading-tight">{label}</span>
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
  events,
  dayWindowStartMinutes,
}: {
  events: Event[];
  dayWindowStartMinutes: number;
}) {
  const [currentDay, setCurrentDay] = useState(() => dayWindowDate(new Date(), dayWindowStartMinutes));
  const t = useTranslations("dashboard");

  const { start: windowStart, end: windowEnd } = dayWindowBounds(currentDay, dayWindowStartMinutes);
  const dayEvents = deduplicateBothBreasts(events.filter((e) => {
    const d = new Date(e.occurredAt);
    return d >= windowStart && d < windowEnd;
  }));

  const sleepingCount = dayEvents.filter((e) => e.type === "sleep" || e.type === "wake_up").length;
  const feedingCount  = dayEvents.filter((e) => e.type === "feeding").length;
  const diaperCount   = dayEvents.filter((e) => e.type === "diaper").length;

  return (
    <>
      <DayWindowStartSetting value={dayWindowStartMinutes} />

      <div className="grid grid-cols-3 gap-3">
        <StatCard label={t("sleepingEvents")} value={sleepingCount} emoji="😴" styleIdx={0} />
        <StatCard label={t("feedings")}       value={feedingCount}  emoji="🍼" styleIdx={1} />
        <StatCard label={t("diapers")}        value={diaperCount}   emoji="👶" styleIdx={2} />
      </div>

      <DayView events={events} currentDay={currentDay} onDayChange={setCurrentDay} dayWindowStartMinutes={dayWindowStartMinutes} />
    </>
  );
}
