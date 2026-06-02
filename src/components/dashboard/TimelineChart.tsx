"use client";

import dynamic from "next/dynamic";
import type { Event } from "@/lib/db/schema";
import { formatTime } from "@/lib/utils/format";

// Recharts is large — load client-only
const ResponsiveContainer = dynamic(
  () => import("recharts").then((m) => m.ResponsiveContainer),
  { ssr: false }
);
const ScatterChart = dynamic(
  () => import("recharts").then((m) => m.ScatterChart),
  { ssr: false }
);
const Scatter = dynamic(() => import("recharts").then((m) => m.Scatter), { ssr: false });
const XAxis = dynamic(() => import("recharts").then((m) => m.XAxis), { ssr: false });
const YAxis = dynamic(() => import("recharts").then((m) => m.YAxis), { ssr: false });
const Tooltip = dynamic(() => import("recharts").then((m) => m.Tooltip), { ssr: false });
const Cell = dynamic(() => import("recharts").then((m) => m.Cell), { ssr: false });

const EVENT_COLORS: Record<string, string> = {
  sleep: "#a855f7",
  feeding: "#3b82f6",
  diaper: "#f59e0b",
};

const EVENT_EMOJI: Record<string, string> = {
  sleep: "😴",
  feeding: "🍼",
  diaper: "👶",
};

interface ChartPoint {
  x: number; // hours since midnight (0-24)
  y: number; // day offset (0 = today, -1 = yesterday, etc.)
  type: string;
  label: string;
  raw: Event;
}

interface Props {
  events: Event[];
  days?: number;
}

function toChartPoints(events: Event[], days: number): ChartPoint[] {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return events.map((e) => {
    const date = new Date(e.occurredAt);
    const dayStart = new Date(date);
    dayStart.setHours(0, 0, 0, 0);
    const dayOffset = Math.round((dayStart.getTime() - today.getTime()) / 86400000);

    return {
      x: date.getHours() + date.getMinutes() / 60,
      y: Math.max(-days + 1, Math.min(0, dayOffset)),
      type: e.type,
      label: `${EVENT_EMOJI[e.type]} ${formatTime(date)}`,
      raw: e,
    };
  });
}

function CustomTooltip({ active, payload }: { active?: boolean; payload?: Array<{ payload: ChartPoint }> }) {
  if (!active || !payload?.length) return null;
  const point = payload[0].payload;
  const date = new Date(point.raw.occurredAt);
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-2 text-xs shadow-lg">
      <p className="font-semibold capitalize">{point.type}</p>
      <p className="text-gray-500">{formatTime(date)}</p>
    </div>
  );
}

export function TimelineChart({ events, days = 7 }: Props) {
  const points = toChartPoints(events, days);

  const dayLabels = Array.from({ length: days }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (days - 1 - i));
    return d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
  });

  return (
    <div className="w-full h-64">
      <ResponsiveContainer width="100%" height="100%">
        <ScatterChart margin={{ top: 10, right: 20, bottom: 10, left: 80 }}>
          <XAxis
            type="number"
            dataKey="x"
            domain={[0, 24]}
            tickCount={9}
            tickFormatter={(v) => `${String(Math.floor(v)).padStart(2, "0")}:00`}
            tick={{ fontSize: 11 }}
          />
          <YAxis
            type="number"
            dataKey="y"
            domain={[-(days - 1), 0]}
            ticks={Array.from({ length: days }, (_, i) => -(days - 1 - i))}
            tickFormatter={(v) => dayLabels[v + days - 1] ?? ""}
            tick={{ fontSize: 11 }}
            width={76}
          />
          <Tooltip content={<CustomTooltip />} />
          <Scatter data={points} shape="circle">
            {points.map((point, index) => (
              <Cell key={index} fill={EVENT_COLORS[point.type] ?? "#6b7280"} />
            ))}
          </Scatter>
        </ScatterChart>
      </ResponsiveContainer>
    </div>
  );
}
