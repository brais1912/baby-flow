import { useMemo, useState } from "react";
import { format } from "date-fns";
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
  const timeline = useMemo(
    () => buildTimeline(events, ownerDate, startMinutes, now),
    [events, now, ownerDate, startMinutes]
  );
  const bounds = ownerDayWindowBounds(ownerDate, startMinutes);
  const plotStart = 54;
  const plotWidth = 642;
  const x = (date: Date) =>
    plotStart + ((date.getTime() - bounds.start.getTime()) / (bounds.end.getTime() - bounds.start.getTime())) * plotWidth;
  const ticks = Array.from({ length: 9 }, (_, index) => index * 3);
  const empty = timeline.sleeps.length === 0 && timeline.points.length === 0;

  return (
    <section className="timeline-panel">
      <header className="chart-header">
        <div>
          <h2><span aria-hidden="true">◷</span>{t("chart.timeline")}</h2>
          <p>{format(bounds.start, "HH:mm", { locale: dateLocale })} - {format(bounds.end, "HH:mm", { locale: dateLocale })}</p>
        </div>
      </header>
      <div className="timeline-scroll">
        <svg className="timeline-chart" viewBox="0 0 720 148" role="img" aria-label={t("chart.timelineAria")}>
          {[
            { label: t("chart.sleepLane"), y: 22 },
            { label: t("chart.feedingLane"), y: 60 },
            { label: t("chart.diaperLane"), y: 98 },
          ].map((lane, index) => (
            <g key={lane.label}>
              <rect x="0" y={lane.y - 15} width="720" height="30" fill={index % 2 === 0 ? "#faf9fc" : "#ffffff"} />
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

          {timeline.sleeps.map((sleep) => (
            <rect
              key={sleep.id}
              x={x(sleep.start)}
              y="15"
              width={Math.max(4, x(sleep.end) - x(sleep.start))}
              height="14"
              rx="7"
              className="timeline-sleep"
            />
          ))}

          {timeline.points.map((point) => (
            <g key={point.id}>
              <circle
                cx={x(point.occurredAt)}
                cy={point.type === "feeding" ? 60 : 98}
                r="9"
                className={`timeline-point ${point.type}`}
              />
              <text
                x={x(point.occurredAt)}
                y={point.type === "feeding" ? 60 : 98}
                textAnchor="middle"
                dominantBaseline="central"
                className="timeline-point-label"
              >{point.type === "feeding" ? t("chart.feedingShort") : t("chart.diaperShort")}</text>
            </g>
          ))}

          {empty && <text x="375" y="61" textAnchor="middle" className="timeline-empty">{t("dashboard.noEvents")}</text>}
        </svg>
      </div>
    </section>
  );
}

export function SleepChart({ events, ownerDate, startMinutes, now }: {
  events: BabyEvent[];
  ownerDate: Date;
  startMinutes: number;
  now: Date;
}) {
  const { dateLocale, t } = useI18n();
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
            <BarChart data={data} margin={{ top: 14, right: 4, bottom: 0, left: -14 }}>
              <CartesianGrid vertical={false} stroke="#ebe8ef" />
              <XAxis dataKey="label" interval={1} tick={{ fontSize: 10, fill: "#77717d" }} axisLine={false} tickLine={false} />
              <YAxis unit="h" tick={{ fontSize: 10, fill: "#77717d" }} axisLine={false} tickLine={false} />
              <Tooltip formatter={(value) => [`${Number(value).toFixed(1)} h`, t("event.sleep")]} />
              <Bar dataKey="hours" fill="#8b5bc8" radius={[4, 4, 0, 0]} isAnimationActive={false} />
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
