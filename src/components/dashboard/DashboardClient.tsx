"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { startOfDay, subDays } from "date-fns";
import { useTranslations } from "next-intl";
import type { Event } from "@/lib/db/schema";
import { deduplicateBothBreasts } from "@/lib/utils/format";

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

export function DashboardClient({ events }: { events: Event[] }) {
  const [currentDay, setCurrentDay] = useState(() => {
    const now = new Date();
    return now.getHours() < 12 ? startOfDay(subDays(now, 1)) : startOfDay(now);
  });
  const t = useTranslations("dashboard");

  const windowStart = new Date(currentDay); windowStart.setHours(12, 0, 0, 0);
  const windowEnd = new Date(windowStart.getTime() + 24 * 60 * 60 * 1000);
  const dayEvents = deduplicateBothBreasts(events.filter((e) => {
    const d = new Date(e.occurredAt);
    return d >= windowStart && d < windowEnd;
  }));

  const sleepingCount = dayEvents.filter((e) => e.type === "sleep" || e.type === "wake_up").length;
  const feedingCount  = dayEvents.filter((e) => e.type === "feeding").length;
  const diaperCount   = dayEvents.filter((e) => e.type === "diaper").length;

  return (
    <>
      <div className="grid grid-cols-3 gap-3">
        <StatCard label={t("sleepingEvents")} value={sleepingCount} emoji="😴" styleIdx={0} />
        <StatCard label={t("feedings")}       value={feedingCount}  emoji="🍼" styleIdx={1} />
        <StatCard label={t("diapers")}        value={diaperCount}   emoji="👶" styleIdx={2} />
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
        <DayView events={events} currentDay={currentDay} onDayChange={setCurrentDay} />
      </div>
    </>
  );
}
