"use client";

import { useState } from "react";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend } from "recharts";
import { useTranslations, useLocale } from "next-intl";
import { format, addDays } from "date-fns";
import { es, enUS } from "date-fns/locale";
import { DEFAULT_DAY_WINDOW_START_MINUTES, buildWeekDayTotals, type DayIndex } from "@/lib/utils/format";
import type { Event } from "@/lib/db/schema";

function DetailSheet({ day, sleepH, feedings, diapers, onClose }: {
  day: string; sleepH: number; feedings: number; diapers: number; onClose: () => void;
}) {
  const t = useTranslations("insights");
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/30" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-5 space-y-3" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <p className="font-semibold text-gray-900">📊 {day}</p>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">&times;</button>
        </div>
        <div className="flex flex-wrap gap-2">
          <span className="bg-purple-100 text-purple-700 text-sm px-3 py-1.5 rounded-full font-medium">😴 {sleepH}h {t("sleep")}</span>
          <span className="bg-blue-100 text-blue-700 text-sm px-3 py-1.5 rounded-full font-medium">🍼 {feedings} {t("feedings")}</span>
          <span className="bg-amber-100 text-amber-700 text-sm px-3 py-1.5 rounded-full font-medium">👶 {diapers} {t("diapers")}</span>
        </div>
      </div>
    </div>
  );
}

const NoTooltip = () => null;

function tapBarIndex(e: React.PointerEvent<HTMLDivElement>, barCount: number, marginLeft = 24, marginRight = 8): number {
  const rect = e.currentTarget.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const plotW = rect.width - marginLeft - marginRight;
  const rel = x - marginLeft;
  if (rel < 0 || rel > plotW) return -1;
  return Math.floor((rel / plotW) * barCount);
}

export function WeekTotalsChart({ events, weekStart, dayWindowStartMinutes = DEFAULT_DAY_WINDOW_START_MINUTES }: { events: Event[]; weekStart: Date; dayWindowStartMinutes?: number }) {
  const t = useTranslations("insights");
  const locale = useLocale();
  const dateFnsLocale = locale === "es" ? es : enUS;
  const [selected, setSelected] = useState<{ day: string; sleepH: number; feedings: number; diapers: number } | null>(null);

  const totals = buildWeekDayTotals(events, weekStart, dayWindowStartMinutes);

  const data = Array.from({ length: 7 }, (_, i) => {
    const idx  = i as DayIndex;
    const d    = addDays(weekStart, i);
    const day  = totals[idx];
    return {
      day:      format(d, "EEE", { locale: dateFnsLocale }),
      fullDay:  format(d, "EEE d MMM", { locale: dateFnsLocale }),
      sleepH:   Math.round((day.sleepMs / 3600000) * 10) / 10,
      feedings: day.feedings,
      diapers:  day.diapers,
    };
  });

  return (
    <>
      <p className="text-xs text-gray-400 mb-3">{t("totalsHint")}</p>
      <div
        className="w-full h-56"
        onPointerUp={(e) => {
          const idx = tapBarIndex(e, 7);
          if (idx >= 0 && data[idx]) {
            const d = data[idx];
            setSelected({ day: d.fullDay, sleepH: d.sleepH, feedings: d.feedings, diapers: d.diapers });
          }
        }}
      >
        <ResponsiveContainer width="100%" height="100%" style={{ pointerEvents: "none" }}>
          <BarChart data={data} margin={{ top: 10, right: 8, bottom: 5, left: 0 }}>
            <XAxis dataKey="day" tick={{ fontSize: 10 }} />
            <YAxis tick={{ fontSize: 10 }} width={24} />
            <Tooltip content={NoTooltip} cursor={false} />
            <Legend wrapperStyle={{ fontSize: 10 }} />
            <Bar dataKey="sleepH"   name={`😴 ${t("sleep")} (h)`} fill="#a855f7" radius={[3, 3, 0, 0]} isAnimationActive={false} activeBar={false} />
            <Bar dataKey="feedings" name={`🍼 ${t("feedings")}`}   fill="#3b82f6" radius={[3, 3, 0, 0]} isAnimationActive={false} activeBar={false} />
            <Bar dataKey="diapers"  name={`👶 ${t("diapers")}`}    fill="#f59e0b" radius={[3, 3, 0, 0]} isAnimationActive={false} activeBar={false} />
          </BarChart>
        </ResponsiveContainer>
      </div>
      {selected && <DetailSheet {...selected} onClose={() => setSelected(null)} />}
    </>
  );
}
