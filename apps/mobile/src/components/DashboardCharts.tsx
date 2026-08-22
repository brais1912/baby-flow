import { useEffect, useMemo, useRef, useState } from "react";
import { format } from "date-fns";
import { Maximize2, Minimize2, X } from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { BabyEvent } from "../types/events";
import {
  aggregateDiaperByDay,
  aggregateFeedingByDay,
  aggregateSleepByDay,
  buildTimeline,
} from "../lib/dashboard";
import { ownerDayWindowBounds } from "../lib/events";
import { useI18n } from "../i18n/I18nProvider";
import { formatSleepChartDuration } from "../i18n/format";
import type { MessageKey } from "../i18n/messages";

const eventEmoji: Record<BabyEvent["type"], string> = {
  sleep: "😴",
  wake_up: "🌅",
  feeding: "🍼",
  diaper: "👶",
};

const eventLabelKeys: Record<BabyEvent["type"], MessageKey> = {
  sleep: "event.sleep",
  wake_up: "event.wake",
  feeding: "event.feed",
  diaper: "event.diaper",
};

const detailLabelKeys: Partial<Record<string, MessageKey>> = {
  breast_left: "event.leftBreast",
  breast_right: "event.rightBreast",
  both_breasts: "event.bothBreasts",
  bottle: "event.bottle",
  formula: "event.formula",
  solid: "event.solid",
  pee: "event.pee",
  poop: "event.poop",
  both: "event.both",
  self: "event.self",
  nursing: "event.nursing",
  pacifier: "event.pacifier",
  held: "event.held",
  rocking: "event.rocking",
  sleep_sack: "event.sleepSack",
  pajamas: "event.pajamas",
  bodysuit: "event.bodysuit",
  top_and_bottoms: "event.topAndBottoms",
  swaddle: "event.swaddle",
  other: "common.other",
};

function durationLabel(start: Date, end: Date, t: ReturnType<typeof useI18n>["t"]): string {
  const totalMinutes = Math.max(0, Math.floor((end.getTime() - start.getTime()) / 60_000));
  if (totalMinutes < 60) return t("duration.minutes", { count: totalMinutes });
  return t("duration.hoursMinutes", {
    hours: Math.floor(totalMinutes / 60),
    minutes: totalMinutes % 60,
  });
}

function TimelineEventDetail({ event, wakeUp, onClose }: {
  event: BabyEvent;
  wakeUp: BabyEvent | null;
  onClose: () => void;
}) {
  const { dateLocale, t } = useI18n();
  const details: string[] = [];
  const detailValue = event.type === "feeding"
    ? event.feedingType
    : event.type === "diaper"
      ? event.diaperType
      : event.type === "sleep"
        ? event.sleepMethod
        : null;
  if (detailValue) details.push(t(detailLabelKeys[detailValue] ?? "common.other"));
  if (event.feedingAmountMl) details.push(`${event.feedingAmountMl} ml`);
  if (event.feedingDurationMinutes) details.push(t("duration.minutes", { count: event.feedingDurationMinutes }));
  if (event.sleepCondition) details.push(t(detailLabelKeys[event.sleepCondition] ?? "common.other"));
  if (event.sleepRoomTemperature !== null) details.push(`${event.sleepRoomTemperature}°C`);
  if (event.type === "sleep" && wakeUp) details.push(durationLabel(event.occurredAt, wakeUp.occurredAt, t));
  const time = format(event.occurredAt, "HH:mm", { locale: dateLocale });
  const timeRange = wakeUp
    ? `${time} → ${format(wakeUp.occurredAt, "HH:mm", { locale: dateLocale })}`
    : time;

  return (
    <div className="chart-detail-layer" role="dialog" aria-modal="true" aria-labelledby="timeline-event-title">
      <button className="sheet-backdrop" type="button" onClick={onClose} aria-label={t("common.close")} />
      <section className="chart-detail-modal">
        <header className="sheet-header">
          <div className="timeline-detail-heading">
            <span aria-hidden="true">{eventEmoji[event.type]}</span>
            <div>
              <h2 id="timeline-event-title">{t(eventLabelKeys[event.type])}</h2>
              <time dateTime={event.occurredAt.toISOString()}>{timeRange}</time>
            </div>
          </div>
          <button className="icon-button" type="button" onClick={onClose} title={t("common.close")}>
            <X size={19} />
          </button>
        </header>
        {details.length > 0 && (
          <div className="timeline-detail-pills">
            {details.map((detail, index) => <span key={`${detail}-${index}`}>{detail}</span>)}
          </div>
        )}
        {event.notes && event.notes !== "QuickLog" && (
          <div className="timeline-detail-notes">
            <strong>{t("event.details")}</strong>
            <p>{event.notes}</p>
          </div>
        )}
      </section>
    </div>
  );
}

function ChartPanel({ title, icon, ownerDate, children }: {
  title: string;
  icon: string;
  ownerDate: Date;
  children: React.ReactNode;
}) {
  const { dateLocale, t } = useI18n();
  const first = new Date(ownerDate);
  first.setDate(first.getDate() - 9);
  return (
    <section className="chart-panel">
      <header className="chart-header">
        <div>
          <h2><span aria-hidden="true">{icon}</span>{title}</h2>
          <p>{t("chart.range", {
            start: format(first, "d MMM", { locale: dateLocale }),
            end: format(ownerDate, "d MMM", { locale: dateLocale }),
          })}</p>
        </div>
      </header>
      {children}
    </section>
  );
}

function EmptyChart({ children }: { children: React.ReactNode }) {
  return <div className="chart-empty">{children}</div>;
}

export function TimelineChart({ events, ownerDate, startMinutes, now = new Date() }: {
  events: BabyEvent[];
  ownerDate: Date;
  startMinutes: number;
  now?: Date;
}) {
  const { dateLocale, t } = useI18n();
  const [expanded, setExpanded] = useState(false);
  const [selected, setSelected] = useState<{ event: BabyEvent; wakeUp: BabyEvent | null } | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const timeline = useMemo(
    () => buildTimeline(events, ownerDate, startMinutes, now),
    [events, now, ownerDate, startMinutes]
  );
  const bounds = ownerDayWindowBounds(ownerDate, startMinutes);
  const viewWidth = expanded ? 1200 : 720;
  const plotStart = 54;
  const plotWidth = viewWidth - plotStart - 24;
  const x = (date: Date) =>
    plotStart + ((date.getTime() - bounds.start.getTime()) / (bounds.end.getTime() - bounds.start.getTime())) * plotWidth;
  const ticks = Array.from(
    { length: expanded ? 25 : 9 },
    (_, index) => expanded ? index : index * 3
  );
  const empty = timeline.sleeps.length === 0 && timeline.points.length === 0;
  const eventsById = useMemo(() => new Map(events.map((event) => [event.id, event])), [events]);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollLeft = 0;
  }, [expanded, ownerDate]);

  function selectEvent(eventId: string, wakeId: string | null = null) {
    const event = eventsById.get(eventId);
    if (!event) return;
    setSelected((current) => current?.event.id === eventId
      ? null
      : { event, wakeUp: wakeId ? eventsById.get(wakeId) ?? null : null });
  }

  function keySelect(keyEvent: React.KeyboardEvent<SVGGElement>, eventId: string, wakeId: string | null = null) {
    if (keyEvent.key !== "Enter" && keyEvent.key !== " ") return;
    keyEvent.preventDefault();
    selectEvent(eventId, wakeId);
  }

  return (
    <section className="timeline-panel">
      <header className="chart-header">
        <div>
          <h2><span aria-hidden="true">◷</span>{t("chart.timeline")}</h2>
          <p>{format(bounds.start, "HH:mm", { locale: dateLocale })} - {format(bounds.end, "HH:mm", { locale: dateLocale })}</p>
        </div>
        <button
          className="icon-button"
          type="button"
          onClick={() => setExpanded((current) => !current)}
          aria-controls="mobile-day-timeline"
          aria-expanded={expanded}
          aria-label={expanded ? t("chart.collapseTimeline") : t("chart.expandTimeline")}
          title={expanded ? t("chart.collapseTimeline") : t("chart.expandTimeline")}
        >
          {expanded ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
        </button>
      </header>
      <div
        id="mobile-day-timeline"
        ref={scrollRef}
        className={expanded ? "timeline-scroll expanded" : "timeline-scroll"}
        tabIndex={expanded ? 0 : undefined}
        aria-label={expanded ? t("chart.expandedTimeline") : undefined}
      >
        <svg className={expanded ? "timeline-chart expanded" : "timeline-chart"} viewBox={`0 0 ${viewWidth} 148`} role="img" aria-label={t("chart.timelineAria")}>
          {[
            { label: t("chart.sleepLane"), y: 22 },
            { label: t("chart.feedingLane"), y: 60 },
            { label: t("chart.diaperLane"), y: 98 },
          ].map((lane, index) => (
            <g key={lane.label}>
              <rect x="0" y={lane.y - 15} width={viewWidth} height="30" fill={index % 2 === 0 ? "#faf9fc" : "#ffffff"} />
              <text x="47" y={lane.y} textAnchor="end" dominantBaseline="middle" className="timeline-lane-label">{lane.label}</text>
            </g>
          ))}

          {ticks.map((hour) => {
            const tickX = plotStart + (hour / 24) * plotWidth;
            const labelHour = (Math.floor(startMinutes / 60) + hour) % 24;
            return (
              <g key={hour}>
                <line x1={tickX} y1="7" x2={tickX} y2="113" className="timeline-grid-line" />
                <text x={tickX} y="135" textAnchor="middle" className="timeline-hour">{String(labelHour).padStart(2, "0")}:00</text>
              </g>
            );
          })}

          {timeline.sleeps.map((sleep) => {
            const startX = x(sleep.start);
            const width = Math.max(4, x(sleep.end) - startX);
            const event = eventsById.get(sleep.id);
            if (!event) return null;
            const wakeUp = sleep.wakeId ? eventsById.get(sleep.wakeId) : null;
            const ariaLabel = wakeUp
              ? t("chart.sleepEventAria", {
                  start: format(event.occurredAt, "HH:mm", { locale: dateLocale }),
                  end: format(wakeUp.occurredAt, "HH:mm", { locale: dateLocale }),
                })
              : t("chart.eventAria", {
                  event: t(eventLabelKeys[event.type]),
                  time: format(event.occurredAt, "HH:mm", { locale: dateLocale }),
                });
            return (
              <g
                key={sleep.id}
                className="timeline-interactive"
                role="button"
                tabIndex={0}
                aria-label={ariaLabel}
                onClick={() => selectEvent(sleep.id, sleep.wakeId)}
                onKeyDown={(keyEvent) => keySelect(keyEvent, sleep.id, sleep.wakeId)}
              >
                <rect x={startX} y="7" width={width} height="30" rx="7" className="timeline-hit-area" />
                <rect x={startX} y="15" width={width} height="14" rx="7" className="timeline-sleep" />
              </g>
            );
          })}

          {timeline.points.map((point) => {
            const event = eventsById.get(point.id);
            if (!event) return null;
            const pointX = x(point.occurredAt);
            const pointY = point.type === "feeding" ? 60 : 98;
            return (
              <g
                key={point.id}
                className="timeline-interactive"
                role="button"
                tabIndex={0}
                aria-label={t("chart.eventAria", {
                  event: t(eventLabelKeys[event.type]),
                  time: format(event.occurredAt, "HH:mm", { locale: dateLocale }),
                })}
                onClick={() => selectEvent(point.id)}
                onKeyDown={(keyEvent) => keySelect(keyEvent, point.id)}
              >
                <circle cx={pointX} cy={pointY} r="18" className="timeline-hit-area" />
                <circle
                  cx={pointX}
                  cy={pointY}
                  r="9"
                  className={`timeline-point ${point.type}`}
                />
                <text
                  x={pointX}
                  y={pointY}
                  textAnchor="middle"
                  dominantBaseline="central"
                  className="timeline-point-label"
                >{point.type === "feeding" ? t("chart.feedingShort") : t("chart.diaperShort")}</text>
              </g>
            );
          })}

          {empty && <text x={plotStart + plotWidth / 2} y="61" textAnchor="middle" className="timeline-empty">{t("dashboard.noEvents")}</text>}
        </svg>
      </div>
      {selected && <TimelineEventDetail event={selected.event} wakeUp={selected.wakeUp} onClose={() => setSelected(null)} />}
    </section>
  );
}

export function SleepChart({ events, ownerDate, startMinutes, now }: {
  events: BabyEvent[];
  ownerDate: Date;
  startMinutes: number;
  now: Date;
}) {
  const { dateLocale, locale, t } = useI18n();
  const data = useMemo(
    () => aggregateSleepByDay(events, ownerDate, startMinutes, now).map((day) => ({
      label: format(day.date, "d MMM", { locale: dateLocale }),
      hours: day.hours,
    })),
    [dateLocale, events, now, ownerDate, startMinutes]
  );
  const hasData = data.some(({ hours }) => hours > 0);

  return (
    <ChartPanel title={t("chart.sleepDuration")} icon="😴" ownerDate={ownerDate}>
      {!hasData ? <EmptyChart>{t("chart.noSleep")}</EmptyChart> : (
        <div className="chart-canvas">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 28, right: 4, bottom: 0, left: -14 }}>
              <CartesianGrid vertical={false} stroke="#ebe8ef" />
              <XAxis dataKey="label" interval={1} tick={{ fontSize: 10, fill: "#77717d" }} axisLine={false} tickLine={false} />
              <YAxis unit="h" tick={{ fontSize: 10, fill: "#77717d" }} axisLine={false} tickLine={false} />
              <Tooltip formatter={(value) => [formatSleepChartDuration(Number(value), locale), t("event.sleep")]} />
              <Bar
                dataKey="hours"
                fill="#8b5bc8"
                radius={[4, 4, 0, 0]}
                isAnimationActive={false}
                label={{
                  position: "top",
                  fill: "#6f389d",
                  fontSize: 10,
                  fontWeight: 750,
                  formatter: (value: unknown) => formatSleepChartDuration(Number(value), locale),
                }}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </ChartPanel>
  );
}

export function FeedingChart({ events, ownerDate, startMinutes }: {
  events: BabyEvent[];
  ownerDate: Date;
  startMinutes: number;
}) {
  const { dateLocale, t } = useI18n();
  const [mode, setMode] = useState<"breast" | "bottle">("breast");
  const data = useMemo(
    () => aggregateFeedingByDay(events, ownerDate, startMinutes).map((day) => ({
      label: format(day.date, "d MMM", { locale: dateLocale }),
      breast: day.breastSessions,
      bottleSessions: day.bottleSessions,
      bottle: day.bottleMl,
    })),
    [dateLocale, events, ownerDate, startMinutes]
  );
  const hasFeedingData = data.some(({ breast, bottleSessions }) => breast > 0 || bottleSessions > 0);

  return (
    <ChartPanel title={t("chart.feeding")} icon="🍼" ownerDate={ownerDate}>
      {!hasFeedingData ? <EmptyChart>{t("chart.noFeeding")}</EmptyChart> : (
        <>
          <div className="chart-segmented" role="group" aria-label={t("chart.metric")}>
            <button type="button" className={mode === "breast" ? "active" : ""} onClick={() => setMode("breast")}>{t("chart.breastSessions")}</button>
            <button type="button" className={mode === "bottle" ? "active" : ""} onClick={() => setMode("bottle")}>{t("chart.bottleMl")}</button>
          </div>
          <div className="chart-canvas">
            {mode === "breast" ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data} margin={{ top: 14, right: 4, bottom: 0, left: -22 }}>
                  <CartesianGrid vertical={false} stroke="#ebe8ef" />
                  <XAxis dataKey="label" interval={1} tick={{ fontSize: 10, fill: "#77717d" }} axisLine={false} tickLine={false} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: "#77717d" }} axisLine={false} tickLine={false} />
                  <Tooltip formatter={(value) => [Number(value), t("chart.sessions")]} />
                  <Bar dataKey="breast" fill="#3989ce" radius={[4, 4, 0, 0]} isAnimationActive={false} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data} margin={{ top: 14, right: 12, bottom: 0, left: -8 }}>
                  <CartesianGrid vertical={false} stroke="#ebe8ef" />
                  <XAxis dataKey="label" interval={1} tick={{ fontSize: 10, fill: "#77717d" }} axisLine={false} tickLine={false} />
                  <YAxis unit="ml" tick={{ fontSize: 10, fill: "#77717d" }} axisLine={false} tickLine={false} />
                  <Tooltip formatter={(value) => [`${Number(value)} ml`, t("event.bottle")]} />
                  <Line dataKey="bottle" type="monotone" stroke="#2374b8" strokeWidth={2.5} dot={{ r: 3, fill: "#2374b8" }} isAnimationActive={false} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </>
      )}
    </ChartPanel>
  );
}

export function DiaperChart({ events, ownerDate, startMinutes }: {
  events: BabyEvent[];
  ownerDate: Date;
  startMinutes: number;
}) {
  const { dateLocale, t } = useI18n();
  const data = useMemo(
    () => aggregateDiaperByDay(events, ownerDate, startMinutes).map((day) => ({
      label: format(day.date, "d MMM", { locale: dateLocale }),
      pee: day.pee,
      poop: day.poop,
      both: day.both,
    })),
    [dateLocale, events, ownerDate, startMinutes]
  );
  const hasData = data.some(({ pee, poop, both }) => pee > 0 || poop > 0 || both > 0);

  return (
    <ChartPanel title={t("chart.diaperChanges")} icon="👶" ownerDate={ownerDate}>
      {!hasData ? <EmptyChart>{t("chart.noDiaper")}</EmptyChart> : (
        <div className="chart-canvas chart-canvas-with-legend">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 8, right: 4, bottom: 0, left: -22 }}>
              <CartesianGrid vertical={false} stroke="#ebe8ef" />
              <XAxis dataKey="label" interval={1} tick={{ fontSize: 10, fill: "#77717d" }} axisLine={false} tickLine={false} />
              <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: "#77717d" }} axisLine={false} tickLine={false} />
              <Tooltip />
              <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
              <Bar dataKey="pee" stackId="diaper" fill="#e8b923" name={t("event.pee")} isAnimationActive={false} />
              <Bar dataKey="poop" stackId="diaper" fill="#98623a" name={t("event.poop")} isAnimationActive={false} />
              <Bar dataKey="both" stackId="diaper" fill="#e47a36" name={t("event.both")} radius={[4, 4, 0, 0]} isAnimationActive={false} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </ChartPanel>
  );
}
