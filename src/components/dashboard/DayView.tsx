"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { useTranslations } from "next-intl";
import { format, startOfDay, endOfDay, addDays, subDays, isToday } from "date-fns";
import { es, enUS } from "date-fns/locale";
import { useLocale } from "next-intl";
import type { Event } from "@/lib/db/schema";
import { formatTime, formatSleepDuration, diaperTypeLabel, sleepMethodLabel, eventTypeLabel } from "@/lib/utils/format";

const TimelineChart = dynamic(
  () => import("./TimelineChart").then((m) => m.TimelineChart),
  { ssr: false, loading: () => <div className="h-20 flex items-center justify-center text-sm text-gray-400">...</div> }
);

const EVENT_EMOJI: Record<string, string> = {
  sleep: "😴", wake_up: "🌅", feeding: "🍼", diaper: "👶",
};

const EVENT_COLOR_CLASS: Record<string, string> = {
  sleep:   "bg-purple-100 text-purple-700",
  wake_up: "bg-orange-100 text-orange-700",
  feeding: "bg-blue-100 text-blue-700",
  diaper:  "bg-amber-100 text-amber-700",
};

type FilterValue = "all" | "sleeping" | "feeding" | "diaper";

const FILTER_ACTIVE_CLASS: Record<FilterValue, string> = {
  all:      "bg-gray-700 text-white",
  sleeping: "bg-purple-500 text-white",
  feeding:  "bg-blue-500 text-white",
  diaper:   "bg-amber-500 text-white",
};

const FILTER_IDLE_CLASS: Record<FilterValue, string> = {
  all:      "bg-gray-100 text-gray-500 hover:bg-gray-200",
  sleeping: "bg-purple-100 text-purple-700 hover:bg-purple-200",
  feeding:  "bg-blue-100 text-blue-700 hover:bg-blue-200",
  diaper:   "bg-amber-100 text-amber-700 hover:bg-amber-200",
};

function matchesFilter(event: Event, filter: FilterValue): boolean {
  if (filter === "all") return true;
  if (filter === "sleeping") return event.type === "sleep" || event.type === "wake_up";
  return event.type === filter;
}

function eventDetail(event: Event, allEvents: Event[], tMethods: (k: string) => string, tDiaper: (k: string) => string, tFeeding: (k: string) => string): string {
  if (event.type === "diaper" && event.diaperType) return tDiaper(event.diaperType === "both" ? "both" : event.diaperType);
  if (event.type === "feeding" && event.feedingType) {
    const keyMap: Record<string, string> = {
      breast_left: "breastLeft", breast_right: "breastRight",
      bottle: "bottle", formula: "formula", solid: "solid",
    };
    const type = tFeeding(keyMap[event.feedingType] ?? event.feedingType);
    const ml = event.feedingAmountMl ? ` · ${event.feedingAmountMl} ml` : "";
    const min = event.feedingDurationMinutes ? ` · ${event.feedingDurationMinutes} min` : "";
    return `${type}${ml}${min}`;
  }
  if (event.type === "sleep" && event.sleepMethod) {
    return tMethods(event.sleepMethod === "bottle" ? "bottle" : event.sleepMethod);
  }
  if (event.type === "wake_up") {
    const wakeTime = new Date(event.occurredAt);
    const prevSleep = [...allEvents]
      .filter((e) => e.type === "sleep" && new Date(e.occurredAt) < wakeTime)
      .sort((a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime())[0];
    if (prevSleep) {
      return `😴 ${formatTime(new Date(prevSleep.occurredAt))} → 🌅 ${formatTime(wakeTime)} · ${formatSleepDuration(new Date(prevSleep.occurredAt), wakeTime)}`;
    }
  }
  return "";
}

export function DayView({ events }: { events: Event[] }) {
  const [currentDay, setCurrentDay] = useState(() => startOfDay(new Date()));
  const [filter, setFilter] = useState<FilterValue>("all");
  const t = useTranslations("dayView");
  const tFilters = useTranslations("filters");
  const tMethods = useTranslations("sleepMethods");
  const tDiaper = useTranslations("diaperTypes");
  const tFeeding = useTranslations("feedingTypes");
  const locale = useLocale();
  const dateFnsLocale = locale === "es" ? es : enUS;

  const canGoForward = !isToday(currentDay);

  const dayEvents = events
    .filter((e) => {
      const t = new Date(e.occurredAt);
      return t >= startOfDay(currentDay) && t <= endOfDay(currentDay);
    })
    .sort((a, b) => new Date(a.occurredAt).getTime() - new Date(b.occurredAt).getTime());

  const filteredEvents = dayEvents.filter((e) => matchesFilter(e, filter));

  const FILTERS: { value: FilterValue; label: string; emoji: string }[] = [
    { value: "all",      label: tFilters("all"),      emoji: "📋" },
    { value: "sleeping", label: tFilters("sleeping"),  emoji: "😴" },
    { value: "feeding",  label: tFilters("feeding"),   emoji: "🍼" },
    { value: "diaper",   label: tFilters("diaper"),    emoji: "👶" },
  ];

  function navigate(dir: "prev" | "next") {
    setCurrentDay((d) => dir === "prev" ? subDays(d, 1) : addDays(d, 1));
    setFilter("all");
  }

  function filterCount(f: FilterValue) {
    return dayEvents.filter((e) => matchesFilter(e, f)).length;
  }

  return (
    <div className="bg-white rounded-xl border border-gray-100 p-4 space-y-4">
      {/* Day navigation */}
      <div className="flex items-center justify-between">
        <button onClick={() => navigate("prev")} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 text-lg leading-none transition-colors" aria-label="Previous day">‹</button>
        <span className="text-sm font-semibold text-gray-800">
          {isToday(currentDay) ? t("today") : format(currentDay, "EEEE, d MMM", { locale: dateFnsLocale })}
        </span>
        <button onClick={() => navigate("next")} disabled={!canGoForward} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 text-lg leading-none transition-colors disabled:opacity-30 disabled:cursor-not-allowed" aria-label="Next day">›</button>
      </div>

      {/* Filters */}
      <div className="flex gap-2 flex-wrap">
        {FILTERS.map(({ value, label, emoji }) => (
          <button
            key={value}
            onClick={() => setFilter(value)}
            className={`flex items-center gap-1 text-xs px-3 py-1.5 rounded-full font-medium transition-all ${filter === value ? FILTER_ACTIVE_CLASS[value] : FILTER_IDLE_CLASS[value]}`}
          >
            {emoji} {label}
            {value !== "all" && <span className="ml-1 opacity-70">{filterCount(value)}</span>}
          </button>
        ))}
      </div>

      {/* Table */}
      {filteredEvents.length === 0 ? (
        <p className="text-sm text-gray-400 text-center py-2">
          {dayEvents.length === 0 ? t("noEvents") : t("noEventsFilter")}
        </p>
      ) : (
        <table className="w-full text-sm">
          <thead>
            <tr className="text-xs text-gray-400 border-b border-gray-100">
              <th className="text-left pb-2 font-medium w-16">{t("time")}</th>
              <th className="text-left pb-2 font-medium w-24">{t("type")}</th>
              <th className="text-left pb-2 font-medium">{t("details")}</th>
            </tr>
          </thead>
          <tbody>
            {filteredEvents.map((event) => (
              <tr key={event.id} className="border-b border-gray-50 last:border-0">
                <td className="py-2 text-gray-500 tabular-nums">{formatTime(new Date(event.occurredAt))}</td>
                <td className="py-2">
                  <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium ${EVENT_COLOR_CLASS[event.type]}`}>
                    {EVENT_EMOJI[event.type]} {eventTypeLabel(event.type)}
                  </span>
                </td>
                <td className="py-2 text-gray-500 capitalize text-xs">
                  <span>{eventDetail(event, dayEvents, tMethods, tDiaper, tFeeding)}</span>
                  {event.notes && <span className="block italic text-gray-400 mt-0.5">{event.notes}</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {/* Timeline */}
      <div className="pt-2 border-t border-gray-50">
        <p className="text-xs text-gray-400 mb-2">{t("timeline")}</p>
        <TimelineChart events={events} visibleEvents={filteredEvents} currentDay={currentDay} />
        <div className="flex gap-4 mt-2 text-xs text-gray-400">
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-purple-500 inline-block" /> {tFilters("sleeping")}</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-500 inline-block" /> {tFilters("feeding")}</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-500 inline-block" /> {tFilters("diaper")}</span>
        </div>
      </div>
    </div>
  );
}
