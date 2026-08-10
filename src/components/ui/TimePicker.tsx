"use client";

import { useTranslations } from "next-intl";
import { format, subDays, startOfDay, isToday, isYesterday } from "date-fns";
import { es, enUS } from "date-fns/locale";
import { useLocale } from "next-intl";

const selectClass = "flex-1 rounded-xl border border-gray-200 bg-gray-50 px-3 py-3 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-purple-400 focus:bg-white focus:border-transparent transition-all text-center appearance-none";

export interface TimeValue {
  dayOffset: number;
  hour: number;
  minute: number;
}

export function buildDate(dayOffset: number, hour: number, minute: number): Date {
  const d = subDays(startOfDay(new Date()), dayOffset);
  d.setHours(hour, minute, 0, 0);
  return d;
}

export function nowPicker(): TimeValue {
  const now = new Date();
  const minute = Math.floor(now.getMinutes() / 5) * 5;
  return { dayOffset: 0, hour: now.getHours(), minute };
}

export function TimePicker({ value, onChange, ns = "eventForm" }: {
  value: TimeValue;
  onChange: (v: TimeValue) => void;
  ns?: string;
}) {
  const t = useTranslations(ns);
  const locale = useLocale();
  const dateFnsLocale = locale === "es" ? es : enUS;

  const dayOptions = [0, 1, 2].map((offset) => {
    const d = subDays(new Date(), offset);
    const label = isToday(d)
      ? t("today")
      : isYesterday(d)
      ? t("yesterday")
      : format(d, "EEE d MMM", { locale: dateFnsLocale });
    return { offset, label };
  });

  return (
    <div className="space-y-2">
      {/* Day selector */}
      <div className="flex gap-2">
        {dayOptions.map(({ offset, label }) => (
          <button
            key={offset}
            type="button"
            onClick={() => onChange({ ...value, dayOffset: offset })}
            className={`flex-1 py-2.5 rounded-xl text-xs font-semibold border-2 transition-all active:scale-95 ${
              value.dayOffset === offset
                ? "border-purple-500 bg-purple-50 text-purple-700"
                : "border-gray-200 bg-white text-gray-500"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Hour + minute selects */}
      <div className="flex gap-2 items-center">
        <select
          value={value.hour}
          onChange={(e) => onChange({ ...value, hour: Number(e.target.value) })}
          className={selectClass}
          aria-label={t("hour")}
        >
          {Array.from({ length: 24 }, (_, i) => (
            <option key={i} value={i}>{String(i).padStart(2, "0")}</option>
          ))}
        </select>
        <span className="text-xl font-bold text-gray-400 flex-shrink-0">:</span>
        <select
          value={value.minute}
          onChange={(e) => onChange({ ...value, minute: Number(e.target.value) })}
          className={selectClass}
          aria-label={t("minute")}
        >
          {[0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55].map((m) => (
            <option key={m} value={m}>{String(m).padStart(2, "0")}</option>
          ))}
        </select>
      </div>
    </div>
  );
}