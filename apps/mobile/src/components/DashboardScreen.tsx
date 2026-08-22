import { useMemo, useState } from "react";
import { format } from "date-fns";
import { ChevronLeft, ChevronRight, Plus, RefreshCw, WifiOff } from "lucide-react";
import type { BabyEvent, EventType } from "../types/events";
import {
  countNightWakings,
  deduplicateBothBreasts,
  eventsWithinChartWindow,
  getAwakeState,
} from "../lib/dashboard";
import { ownerDayWindowBounds } from "../lib/events";
import { useEvents } from "../hooks/useEvents";
import { useNetworkStatus } from "../hooks/useNetworkStatus";
import { DiaperChart, FeedingChart, SleepChart, TimelineChart } from "./DashboardCharts";
import { EventCard } from "./EventCard";
import { EventSheet } from "./EventSheet";
import { PullToRefresh } from "./PullToRefresh";
import { QuickLogBar } from "./QuickLogBar";
import { useI18n } from "../i18n/I18nProvider";

type EventFilter = "all" | "sleep" | "feeding" | "diaper";

function elapsedParts(durationMs: number): { hours: number; minutes: number } {
  const totalMinutes = Math.max(0, Math.floor(durationMs / 60_000));
  return { hours: Math.floor(totalMinutes / 60), minutes: totalMinutes % 60 };
}

function matchesFilter(type: EventType, filter: EventFilter): boolean {
  if (filter === "all") return true;
  if (filter === "sleep") return type === "sleep" || type === "wake_up";
  return type === filter;
}

export function DashboardScreen({ data, babyName }: {
  data: ReturnType<typeof useEvents>;
  babyName: string;
}) {
  const { dateLocale, t } = useI18n();
  const online = useNetworkStatus();
  const [sheet, setSheet] = useState<{ mode: "create" } | { mode: "edit"; event: BabyEvent } | null>(null);
  const [filter, setFilter] = useState<EventFilter>("all");
  const now = new Date();
  const bounds = useMemo(
    () => ownerDayWindowBounds(data.selectedDay, data.dayWindowStartMinutes),
    [data.dayWindowStartMinutes, data.selectedDay]
  );
  const chartEvents = useMemo(
    () => eventsWithinChartWindow(data.events, data.selectedDay, data.dayWindowStartMinutes),
    [data.dayWindowStartMinutes, data.events, data.selectedDay]
  );
  const visibleEvents = useMemo(
    () => data.dayEvents.filter((event) => matchesFilter(event.type, filter)),
    [data.dayEvents, filter]
  );
  const awakeState = data.isToday ? getAwakeState(data.events, now) : null;
  const sleepEventCount = data.dayEvents.filter((event) => event.type === "sleep" || event.type === "wake_up").length;
  const feedingCount = deduplicateBothBreasts(data.dayEvents.filter((event) => event.type === "feeding")).length;
  const diaperCount = data.dayEvents.filter((event) => event.type === "diaper").length;
  const nightWakings = countNightWakings(data.events, data.selectedDay);
  const chartNow = data.isToday ? now : bounds.end;
  const elapsed = awakeState ? elapsedParts(awakeState.durationMs) : null;
  const duration = elapsed
    ? elapsed.hours === 0
      ? t("duration.minutes", { count: elapsed.minutes })
      : t("duration.hoursMinutes", elapsed)
    : "";

  return (
    <PullToRefresh onRefresh={data.reload}>
      <section className="screen dashboard-screen">
        <div className="screen-heading dashboard-heading">
          <div>
            <p className="eyebrow">{format(bounds.start, "EEE d MMM, HH:mm", { locale: dateLocale })} - {format(bounds.end, "EEE d MMM, HH:mm", { locale: dateLocale })}</p>
            <h1>{data.isToday ? t("dashboard.todayFor", { name: babyName }) : format(data.selectedDay, "EEEE, d MMMM", { locale: dateLocale })}</h1>
          </div>
          <button className="icon-command" type="button" disabled={!online} onClick={() => setSheet({ mode: "create" })} title={t("dashboard.newDetailed")}>
            <Plus size={20} />
            <span>{t("dashboard.new")}</span>
          </button>
        </div>

        <div className="day-navigator" aria-label={t("dashboard.selectDay")}>
          <button className="icon-button" type="button" onClick={() => void data.selectAdjacentDay(-1)} disabled={data.loading} title={t("dashboard.previousDay")}>
            <ChevronLeft size={20} />
          </button>
          <button className="day-navigator-label" type="button" onClick={() => void data.goToToday()} disabled={data.isToday || data.loading}>
            <strong>{data.isToday ? t("dashboard.currentDay") : format(data.selectedDay, "d MMM yyyy", { locale: dateLocale })}</strong>
            <span>{data.isToday ? t("dashboard.latestActivity") : t("dashboard.returnToday")}</span>
          </button>
          <button className="icon-button" type="button" onClick={() => void data.selectAdjacentDay(1)} disabled={data.isToday || data.loading} title={t("dashboard.nextDay")}>
            <ChevronRight size={20} />
          </button>
        </div>

        {!online && (
          <div className="offline-banner" role="status">
            <WifiOff size={17} />
            <span>{t("dashboard.offline")}</span>
          </div>
        )}

        {awakeState && (
          <div className={`status-strip ${awakeState.isAwake ? "awake" : "sleep"}`}>
            <span className="status-dot" />
            <div>
              <strong>{awakeState.isAwake ? t("dashboard.awake") : t("dashboard.sleeping")}</strong>
              <span>{t("dashboard.since", { time: format(awakeState.since, "HH:mm", { locale: dateLocale }), duration })}</span>
            </div>
          </div>
        )}

        {data.error && (
          <div className="error-banner error-with-action" role="alert">
            <span>{data.error}</span>
            <button className="icon-button" type="button" onClick={() => void data.reload()} title={t("common.retry")}>
              <RefreshCw size={17} />
            </button>
          </div>
        )}

        <div className="stats-grid" aria-label={t("dashboard.dayTotals")}>
          <Stat label={t("dashboard.sleepEvents")} value={sleepEventCount} icon="😴" tone="sleep" />
          <Stat label={t("dashboard.nightWakings")} value={nightWakings} icon="🌙" tone="night" />
          <Stat label={t("dashboard.feedings")} value={feedingCount} icon="🍼" tone="feeding" />
          <Stat label={t("dashboard.diapers")} value={diaperCount} icon="👶" tone="diaper" />
        </div>

        <div className="events-heading">
          <div className="section-title">
            <h2>{t("dashboard.events")}</h2>
            <span>{visibleEvents.length}</span>
          </div>
          <div className="event-filters" role="group" aria-label={t("dashboard.filterEvents")}>
            {([
              ["all", t("dashboard.filterAll")],
              ["sleep", t("dashboard.filterSleep")],
              ["feeding", t("dashboard.filterFeed")],
              ["diaper", t("dashboard.filterDiaper")],
            ] as const).map(([value, label]) => (
              <button key={value} type="button" className={filter === value ? "active" : ""} onClick={() => setFilter(value)}>{label}</button>
            ))}
          </div>
        </div>

        {data.loading && data.events.length === 0 ? (
          <div className="list-loading" aria-label={t("dashboard.loadingEvents")}>
            <span className="skeleton-line" />
            <span className="skeleton-line" />
            <span className="skeleton-line" />
          </div>
        ) : visibleEvents.length === 0 ? (
          <div className="empty-state">
            <span aria-hidden="true">🌙</span>
            <strong>{data.dayEvents.length === 0 ? t("dashboard.noEvents") : t("dashboard.noMatching")}</strong>
          </div>
        ) : (
          <div className="event-list">
            {visibleEvents.map((event) => (
              <EventCard
                key={event.id}
                event={event}
                allEvents={data.events}
                pending={data.mutating}
                onEdit={(selected) => setSheet({ mode: "edit", event: selected })}
                onDelete={data.remove}
              />
            ))}
          </div>
        )}

        {data.loading && data.events.length === 0 ? (
          <div className="dashboard-loading" aria-label={t("dashboard.loadingDashboard")}>
            <span className="skeleton-chart" />
            <span className="skeleton-chart" />
          </div>
        ) : (
          <>
            <TimelineChart
              events={data.events}
              ownerDate={data.selectedDay}
              startMinutes={data.dayWindowStartMinutes}
              now={chartNow}
            />
            <SleepChart
              events={chartEvents}
              ownerDate={data.selectedDay}
              startMinutes={data.dayWindowStartMinutes}
              now={chartNow}
            />
            <FeedingChart
              events={chartEvents}
              ownerDate={data.selectedDay}
              startMinutes={data.dayWindowStartMinutes}
            />
            <DiaperChart
              events={chartEvents}
              ownerDate={data.selectedDay}
              startMinutes={data.dayWindowStartMinutes}
            />
          </>
        )}

      </section>

      <QuickLogBar disabled={!online || data.mutating} onCreate={data.create} />

      {sheet && (
        <EventSheet
          event={sheet.mode === "edit" ? sheet.event : null}
          pending={data.mutating}
          error={data.error}
          onClose={() => setSheet(null)}
          onCreate={data.create}
          onUpdateTime={data.updateTime}
        />
      )}
    </PullToRefresh>
  );
}

function Stat({ label, value, icon, tone }: {
  label: string;
  value: number;
  icon: string;
  tone: "sleep" | "night" | "feeding" | "diaper";
}) {
  return (
    <div className={`stat-item ${tone}`}>
      <span className="stat-icon" aria-hidden="true">{icon}</span>
      <div>
        <strong>{value}</strong>
        <span>{label}</span>
      </div>
    </div>
  );
}
