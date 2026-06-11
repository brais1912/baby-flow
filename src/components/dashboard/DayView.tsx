"use client";

import { useState, useTransition } from "react";
import dynamic from "next/dynamic";
import { useTranslations } from "next-intl";
import { format, startOfDay, addDays, subDays } from "date-fns";
import { es, enUS } from "date-fns/locale";
import { useLocale } from "next-intl";
import type { Event } from "@/lib/db/schema";
import { formatTime, formatSleepDuration, deduplicateBothBreasts } from "@/lib/utils/format";
import { deleteEvent } from "@/lib/actions/events";
import { Spinner } from "@/components/ui/Spinner";

const TimelineChart = dynamic(
  () => import("./TimelineChart").then((m) => m.TimelineChart),
  { ssr: false, loading: () => <div className="h-16 flex items-center justify-center text-sm text-gray-300">...</div> }
);

const EVENT_EMOJI: Record<string, string> = {
  sleep: "😴", wake_up: "🌅", feeding: "🍼", diaper: "👶",
};

const EVENT_STYLE: Record<string, { pill: string; dot: string; card: string }> = {
  sleep:   { pill: "bg-purple-100 text-purple-700", dot: "bg-purple-400", card: "border-l-purple-400" },
  wake_up: { pill: "bg-orange-100 text-orange-600", dot: "bg-orange-400", card: "border-l-orange-400" },
  feeding: { pill: "bg-blue-100 text-blue-600",     dot: "bg-blue-400",   card: "border-l-blue-400" },
  diaper:  { pill: "bg-amber-100 text-amber-700",   dot: "bg-amber-400",  card: "border-l-amber-400" },
};

type FilterValue = "all" | "sleeping" | "feeding" | "diaper";

const FILTER_ACTIVE: Record<FilterValue, string> = {
  all:      "bg-gray-800 text-white shadow-sm",
  sleeping: "bg-purple-500 text-white shadow-sm",
  feeding:  "bg-blue-500 text-white shadow-sm",
  diaper:   "bg-amber-500 text-white shadow-sm",
};

const FILTER_IDLE: Record<FilterValue, string> = {
  all:      "bg-gray-100 text-gray-500",
  sleeping: "bg-purple-50 text-purple-600",
  feeding:  "bg-blue-50 text-blue-600",
  diaper:   "bg-amber-50 text-amber-600",
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
      both_breasts: "both_breasts",
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
      return `${formatTime(new Date(prevSleep.occurredAt))} → ${formatTime(wakeTime)} · ${formatSleepDuration(new Date(prevSleep.occurredAt), wakeTime)}`;
    }
  }
  return "";
}

export function DayView({ events, currentDay: controlledDay, onDayChange }: {
  events: Event[];
  currentDay?: Date;
  onDayChange?: (day: Date) => void;
}) {
  const [internalDay, setInternalDay] = useState(() => {
    const now = new Date();
    // If before noon, the active window started yesterday at 12:00
    return now.getHours() < 12 ? startOfDay(subDays(now, 1)) : startOfDay(now);
  });
  const currentDay = controlledDay ?? internalDay;
  const [filter, setFilter] = useState<FilterValue>("all");
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const t = useTranslations("dayView");
  const tFilters = useTranslations("filters");
  const tEventTypes = useTranslations("eventTypes");
  const tMethods = useTranslations("sleepMethods");
  const tDiaper = useTranslations("diaperTypes");
  const tFeeding = useTranslations("feedingTypes");
  const locale = useLocale();
  const dateFnsLocale = locale === "es" ? es : enUS;

  const windowStart = new Date(currentDay); windowStart.setHours(12, 0, 0, 0);
  const windowEnd = new Date(windowStart.getTime() + 24 * 60 * 60 * 1000);
  const canGoForward = windowEnd <= new Date();

  const dayEvents = deduplicateBothBreasts(
    events
      .filter((e) => {
        const d = new Date(e.occurredAt);
        return d >= windowStart && d < windowEnd;
      })
      .sort((a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime())
  );

  const filteredEvents = dayEvents.filter((e) => matchesFilter(e, filter));

  const FILTERS: { value: FilterValue; label: string; emoji: string }[] = [
    { value: "all",      label: tFilters("all"),     emoji: "📋" },
    { value: "sleeping", label: tFilters("sleeping"), emoji: "😴" },
    { value: "feeding",  label: tFilters("feeding"),  emoji: "🍼" },
    { value: "diaper",   label: tFilters("diaper"),   emoji: "👶" },
  ];

  function navigate(dir: "prev" | "next") {
    const next = dir === "prev" ? subDays(currentDay, 1) : addDays(currentDay, 1);
    setInternalDay(next);
    onDayChange?.(next);
    setFilter("all");
  }

  function filterCount(f: FilterValue) {
    return dayEvents.filter((e) => matchesFilter(e, f)).length;
  }

  return (
    <div className="space-y-4">
      {/* Day navigation */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate("prev")}
          className="w-10 h-10 flex items-center justify-center rounded-xl bg-gray-100 text-gray-600 text-lg font-bold active:bg-gray-200 active:scale-90 transition-all duration-150"
          aria-label="Previous day"
        >
          ‹
        </button>
        <span className="text-center leading-tight">
          <span className="text-sm font-bold text-gray-800 block">
            {format(windowStart, "EEE d MMM, HH:mm", { locale: dateFnsLocale })}
          </span>
          <span className="text-xs text-gray-400 block">
            {format(windowEnd, "EEE d MMM, HH:mm", { locale: dateFnsLocale })}
          </span>
        </span>
        <button
          onClick={() => navigate("next")}
          disabled={!canGoForward}
          className="w-10 h-10 flex items-center justify-center rounded-xl bg-gray-100 text-gray-600 text-lg font-bold active:bg-gray-200 active:scale-90 transition-all duration-150 disabled:opacity-25 disabled:cursor-not-allowed"
          aria-label="Next day"
        >
          ›
        </button>
      </div>

      {/* Filters */}
      <div className="flex gap-2 overflow-x-auto pb-0.5 scrollbar-none">
        {FILTERS.map(({ value, label, emoji }) => (
          <button
            key={value}
            onClick={() => setFilter(value)}
            className={`flex-shrink-0 flex items-center gap-1.5 text-xs px-3.5 py-2 rounded-full font-semibold transition-all active:scale-95 ${filter === value ? FILTER_ACTIVE[value] : FILTER_IDLE[value]}`}
          >
            <span>{emoji}</span>
            <span>{label}</span>
            {value !== "all" && (
              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${filter === value ? "bg-white/20" : "bg-white/60"}`}>
                {filterCount(value)}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Event cards */}
      {filteredEvents.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-3xl mb-2">🌙</p>
          <p className="text-sm text-gray-400">
            {dayEvents.length === 0 ? t("noEvents") : t("noEventsFilter")}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {filteredEvents.map((event) => {
            const style = EVENT_STYLE[event.type] ?? EVENT_STYLE.diaper;
            const detail = eventDetail(event, dayEvents, tMethods, tDiaper, tFeeding);
            const isConfirming = confirmDeleteId === event.id;
            const isDeleting = isPending && isConfirming;

            return (
              <div
                key={event.id}
                className={`bg-white rounded-xl border border-gray-100 border-l-4 ${style.card} px-4 py-3 shadow-sm transition-opacity ${isDeleting ? "opacity-40" : ""}`}
              >
                {isConfirming ? (
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-sm text-gray-600">{t("deleteConfirm")}</span>
                    <div className="flex gap-2 flex-shrink-0">
                      <button
                        onClick={() => setConfirmDeleteId(null)}
                        className="text-xs px-3 py-1.5 rounded-lg bg-gray-100 text-gray-600 font-medium active:bg-gray-200 active:scale-95 transition-all duration-150"
                      >
                        {t("deleteCancelButton")}
                      </button>
                      <button
                        disabled={isDeleting}
                        onClick={() => {
                          startTransition(async () => {
                            await deleteEvent(event.id);
                            setConfirmDeleteId(null);
                          });
                        }}
                        className="text-xs px-3 py-1.5 rounded-lg bg-red-500 text-white font-medium active:bg-red-600 active:scale-95 transition-all duration-150 disabled:opacity-50 flex items-center gap-1.5"
                      >
                        {isDeleting && <Spinner className="w-3 h-3" />}
                        {t("deleteConfirmButton")}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-start gap-3">
                    <span className="text-xl mt-0.5 leading-none">{EVENT_EMOJI[event.type]}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${style.pill}`}>
                          {tEventTypes(event.type === "wake_up" ? "wakeUp" : event.type)}
                        </span>
                        {event.notes === "QuickLog" ? (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-fuchsia-50 text-fuchsia-500 border border-fuchsia-100 flex items-center gap-1">
                            ⚡ QuickLog
                          </span>
                        ) : (
                          detail && <span className="text-xs text-gray-500 truncate">{detail}</span>
                        )}
                      </div>
                      {event.notes && event.notes !== "QuickLog" && (
                        <p className="text-xs text-gray-400 italic mt-1 truncate">{event.notes}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0 mt-0.5">
                      <span className="text-xs text-gray-400 tabular-nums font-medium">
                        {formatTime(new Date(event.occurredAt))}
                      </span>
                      <button
                        onClick={() => setConfirmDeleteId(event.id)}
                        className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-300 hover:text-red-400 hover:bg-red-50 active:bg-red-100 active:scale-90 transition-all duration-150"
                        aria-label="Delete event"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                          <path fillRule="evenodd" d="M8.75 1A2.75 2.75 0 0 0 6 3.75v.443c-.795.077-1.584.176-2.365.298a.75.75 0 1 0 .23 1.482l.149-.022.841 10.518A2.75 2.75 0 0 0 7.596 19h4.807a2.75 2.75 0 0 0 2.742-2.53l.841-10.52.149.023a.75.75 0 0 0 .23-1.482A41.03 41.03 0 0 0 14 4.193V3.75A2.75 2.75 0 0 0 11.25 1h-2.5ZM10 4c.84 0 1.673.025 2.5.075V3.75c0-.69-.56-1.25-1.25-1.25h-2.5c-.69 0-1.25.56-1.25 1.25v.325C8.327 4.025 9.16 4 10 4ZM8.58 7.72a.75.75 0 0 0-1.5.06l.3 7.5a.75.75 0 1 0 1.5-.06l-.3-7.5Zm4.34.06a.75.75 0 1 0-1.5-.06l-.3 7.5a.75.75 0 1 0 1.5.06l.3-7.5Z" clipRule="evenodd" />
                        </svg>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Timeline */}
      <div className="pt-3 border-t border-gray-100">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">{t("timeline")}</p>
        <TimelineChart events={events} visibleEvents={filteredEvents} currentDay={currentDay} />
        <div className="flex gap-4 mt-2 text-xs text-gray-400">
          <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-purple-400 inline-block" />{tFilters("sleeping")}</span>
          <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-blue-400 inline-block" />{tFilters("feeding")}</span>
          <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-amber-400 inline-block" />{tFilters("diaper")}</span>
        </div>
      </div>
    </div>
  );
}
