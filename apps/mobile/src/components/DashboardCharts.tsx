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

function rangeLabel(ownerDate: Date): string {
  const first = new Date(ownerDate);
  first.setDate(first.getDate() - 9);
  return `${format(first, "d MMM")} - ${format(ownerDate, "d MMM")}`;
}

function ChartPanel({ title, icon, ownerDate, children }: {
  title: string;
  icon: string;
  ownerDate: Date;
  children: React.ReactNode;
}) {
  return (
    <section className="chart-panel">
      <header className="chart-header">
        <div>
          <h2><span aria-hidden="true">{icon}</span>{title}</h2>
          <p>{rangeLabel(ownerDate)}</p>
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
          <h2><span aria-hidden="true">◷</span>Day timeline</h2>
          <p>{format(bounds.start, "HH:mm")} - {format(bounds.end, "HH:mm")}</p>
        </div>
      </header>
      <div className="timeline-scroll">
        <svg className="timeline-chart" viewBox="0 0 720 148" role="img" aria-label="Events across the selected day">
          {[
            { label: "Sleep", y: 22 },
            { label: "Feed", y: 60 },
            { label: "Diaper", y: 98 },
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
              >{point.type === "feeding" ? "F" : "D"}</text>
            </g>
          ))}

          {empty && <text x="375" y="61" textAnchor="middle" className="timeline-empty">No events in this day</text>}
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
  const data = useMemo(
    () => aggregateSleepByDay(events, ownerDate, startMinutes, now).map((day) => ({
      label: format(day.date, "d MMM"),
      hours: day.hours,
    })),
    [events, now, ownerDate, startMinutes]
  );
  const hasData = data.some(({ hours }) => hours > 0);

  return (
    <ChartPanel title="Sleep duration" icon="😴" ownerDate={ownerDate}>
      {!hasData ? <EmptyChart>No sleep data in this range</EmptyChart> : (
        <div className="chart-canvas">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 14, right: 4, bottom: 0, left: -14 }}>
              <CartesianGrid vertical={false} stroke="#ebe8ef" />
              <XAxis dataKey="label" interval={1} tick={{ fontSize: 10, fill: "#77717d" }} axisLine={false} tickLine={false} />
              <YAxis unit="h" tick={{ fontSize: 10, fill: "#77717d" }} axisLine={false} tickLine={false} />
              <Tooltip formatter={(value) => [`${Number(value).toFixed(1)} h`, "Sleep"]} />
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
  const [mode, setMode] = useState<"breast" | "bottle">("breast");
  const data = useMemo(
    () => aggregateFeedingByDay(events, ownerDate, startMinutes).map((day) => ({
      label: format(day.date, "d MMM"),
      breast: day.breastSessions,
      bottleSessions: day.bottleSessions,
      bottle: day.bottleMl,
    })),
    [events, ownerDate, startMinutes]
  );
  const hasFeedingData = data.some(({ breast, bottleSessions }) => breast > 0 || bottleSessions > 0);

  return (
    <ChartPanel title="Feeding" icon="🍼" ownerDate={ownerDate}>
      {!hasFeedingData ? <EmptyChart>No feeding data in this range</EmptyChart> : (
        <>
          <div className="chart-segmented" role="group" aria-label="Feeding chart metric">
            <button type="button" className={mode === "breast" ? "active" : ""} onClick={() => setMode("breast")}>Breast sessions</button>
            <button type="button" className={mode === "bottle" ? "active" : ""} onClick={() => setMode("bottle")}>Bottle ml</button>
          </div>
          <div className="chart-canvas">
            {mode === "breast" ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data} margin={{ top: 14, right: 4, bottom: 0, left: -22 }}>
                  <CartesianGrid vertical={false} stroke="#ebe8ef" />
                  <XAxis dataKey="label" interval={1} tick={{ fontSize: 10, fill: "#77717d" }} axisLine={false} tickLine={false} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: "#77717d" }} axisLine={false} tickLine={false} />
                  <Tooltip formatter={(value) => [Number(value), "Sessions"]} />
                  <Bar dataKey="breast" fill="#3989ce" radius={[4, 4, 0, 0]} isAnimationActive={false} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data} margin={{ top: 14, right: 12, bottom: 0, left: -8 }}>
                  <CartesianGrid vertical={false} stroke="#ebe8ef" />
                  <XAxis dataKey="label" interval={1} tick={{ fontSize: 10, fill: "#77717d" }} axisLine={false} tickLine={false} />
                  <YAxis unit="ml" tick={{ fontSize: 10, fill: "#77717d" }} axisLine={false} tickLine={false} />
                  <Tooltip formatter={(value) => [`${Number(value)} ml`, "Bottle"]} />
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
  const data = useMemo(
    () => aggregateDiaperByDay(events, ownerDate, startMinutes).map((day) => ({
      label: format(day.date, "d MMM"),
      pee: day.pee,
      poop: day.poop,
      both: day.both,
    })),
    [events, ownerDate, startMinutes]
  );
  const hasData = data.some(({ pee, poop, both }) => pee > 0 || poop > 0 || both > 0);

  return (
    <ChartPanel title="Diaper changes" icon="👶" ownerDate={ownerDate}>
      {!hasData ? <EmptyChart>No diaper data in this range</EmptyChart> : (
        <div className="chart-canvas chart-canvas-with-legend">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 8, right: 4, bottom: 0, left: -22 }}>
              <CartesianGrid vertical={false} stroke="#ebe8ef" />
              <XAxis dataKey="label" interval={1} tick={{ fontSize: 10, fill: "#77717d" }} axisLine={false} tickLine={false} />
              <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: "#77717d" }} axisLine={false} tickLine={false} />
              <Tooltip />
              <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
              <Bar dataKey="pee" stackId="diaper" fill="#e8b923" name="Pee" isAnimationActive={false} />
              <Bar dataKey="poop" stackId="diaper" fill="#98623a" name="Poop" isAnimationActive={false} />
              <Bar dataKey="both" stackId="diaper" fill="#e47a36" name="Both" radius={[4, 4, 0, 0]} isAnimationActive={false} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </ChartPanel>
  );
}
