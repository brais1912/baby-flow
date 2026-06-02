"use client";

import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip,
  LineChart, Line, PieChart, Pie, Cell, Legend,
} from "recharts";
import { useTranslations, useLocale } from "next-intl";
import type { Event } from "@/lib/db/schema";
import { formatSleepDuration } from "@/lib/utils/format";

function EmptyChart({ message }: { message: string }) {
  return <div className="h-48 flex items-center justify-center text-sm text-gray-400">{message}</div>;
}

function localeDateKey(date: Date, locale: string) {
  return date.toLocaleDateString(locale === "es" ? "es-ES" : "en-US", { weekday: "short", day: "numeric" });
}

// ── Sleep chart ───────────────────────────────────────────────────────────────

export function SleepChart({ events }: { events: Event[] }) {
  const t = useTranslations("charts");
  const locale = useLocale();
  const sorted = [...events].sort((a, b) => new Date(a.occurredAt).getTime() - new Date(b.occurredAt).getTime());

  const sleepBars = sorted
    .filter((e) => e.type === "sleep")
    .map((sleepEvent) => {
      const start = new Date(sleepEvent.occurredAt);
      const nextWakeUp = sorted.find((e) => e.type === "wake_up" && new Date(e.occurredAt) > start);
      if (!nextWakeUp) return null;
      const end = new Date(nextWakeUp.occurredAt);
      const hours = Math.round(((end.getTime() - start.getTime()) / 3600000) * 10) / 10;
      return {
        label: localeDateKey(start, locale),
        hours: Math.max(0, hours),
        duration: formatSleepDuration(start, end),
      };
    })
    .filter(Boolean) as { label: string; hours: number; duration: string }[];

  if (sleepBars.length === 0) return <EmptyChart message={t("noSleepData")} />;

  return (
    <div className="w-full h-48">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={sleepBars} margin={{ top: 5, right: 10, bottom: 5, left: 0 }}>
          <XAxis dataKey="label" tick={{ fontSize: 10 }} />
          <YAxis unit="h" tick={{ fontSize: 10 }} width={30} />
          <Tooltip formatter={(value, _, props) => [`${value}h (${props.payload.duration})`, t("duration")]} />
          <Bar dataKey="hours" fill="#a855f7" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

// ── Feeding chart ─────────────────────────────────────────────────────────────

const BREAST_TYPES = new Set(["breast_left", "breast_right"]);

export function FeedingChart({ events }: { events: Event[] }) {
  const t = useTranslations("charts");
  const locale = useLocale();
  const feedingEvents = events.filter((e) => e.type === "feeding");

  if (feedingEvents.length === 0) return <EmptyChart message={t("noFeedingData")} />;

  const bottleEvents = feedingEvents.filter((e) => e.feedingType && !BREAST_TYPES.has(e.feedingType));
  const breastEvents = feedingEvents.filter((e) => e.feedingType && BREAST_TYPES.has(e.feedingType));

  const breastByDay: Record<string, { label: string; left: number; right: number }> = {};
  breastEvents.forEach((e) => {
    const day = localeDateKey(new Date(e.occurredAt), locale);
    if (!breastByDay[day]) breastByDay[day] = { label: day, left: 0, right: 0 };
    if (e.feedingType === "breast_left") breastByDay[day].left += 1;
    if (e.feedingType === "breast_right") breastByDay[day].right += 1;
  });
  const breastData = Object.values(breastByDay);

  const bottleData = bottleEvents.map((e) => ({
    label: localeDateKey(new Date(e.occurredAt), locale),
    ml: e.feedingAmountMl ?? 0,
  }));

  return (
    <div className="space-y-4">
      {breastData.length > 0 && (
        <div>
          <p className="text-xs text-gray-400 mb-1">{t("breastfeedingPerDay")}</p>
          <div className="w-full h-44">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={breastData} margin={{ top: 5, right: 10, bottom: 5, left: 0 }}>
                <XAxis dataKey="label" tick={{ fontSize: 10 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 10 }} width={20} />
                <Tooltip formatter={(v, name) => [v, name === "left" ? t("left") : t("right")]} />
                <Legend formatter={(v) => (v === "left" ? t("left") : t("right"))} />
                <Bar dataKey="left" stackId="a" fill="#818cf8" />
                <Bar dataKey="right" stackId="a" fill="#c4b5fd" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
      {bottleData.length > 0 && (
        <div>
          <p className="text-xs text-gray-400 mb-1">{t("bottlePerSession")}</p>
          <div className="w-full h-44">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={bottleData} margin={{ top: 5, right: 10, bottom: 5, left: 0 }}>
                <XAxis dataKey="label" tick={{ fontSize: 10 }} />
                <YAxis unit="ml" tick={{ fontSize: 10 }} width={36} />
                <Tooltip formatter={(v) => [`${v} ml`, t("amount")]} />
                <Line type="monotone" dataKey="ml" stroke="#3b82f6" strokeWidth={2} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Diaper chart ──────────────────────────────────────────────────────────────

const DIAPER_COLORS: Record<string, string> = { pee: "#fbbf24", poop: "#92400e", both: "#d97706" };

export function DiaperChart({ events }: { events: Event[] }) {
  const t = useTranslations("charts");
  const locale = useLocale();
  const diaperEvents = events.filter((e) => e.type === "diaper");

  if (diaperEvents.length === 0) return <EmptyChart message={t("noDiaperData")} />;

  const counts: Record<string, number> = { pee: 0, poop: 0, both: 0 };
  diaperEvents.forEach((e) => { if (e.diaperType) counts[e.diaperType] = (counts[e.diaperType] ?? 0) + 1; });
  const pieData = Object.entries(counts).filter(([, v]) => v > 0).map(([name, value]) => ({ name, value }));

  const dailyCounts = diaperEvents.reduce<Record<string, number>>((acc, e) => {
    const day = localeDateKey(new Date(e.occurredAt), locale);
    acc[day] = (acc[day] ?? 0) + 1;
    return acc;
  }, {});
  const barData = Object.entries(dailyCounts).map(([label, count]) => ({ label, count }));

  return (
    <div className="grid grid-cols-2 gap-4">
      <div className="w-full h-48">
        <p className="text-xs text-gray-400 mb-1 text-center">{t("byType")}</p>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={60} label={({ name, value }) => `${name} (${value})`} labelLine={false}>
              {pieData.map((entry) => <Cell key={entry.name} fill={DIAPER_COLORS[entry.name] ?? "#6b7280"} />)}
            </Pie>
            <Tooltip />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <div className="w-full h-48">
        <p className="text-xs text-gray-400 mb-1 text-center">{t("perDay")}</p>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={barData} margin={{ top: 5, right: 5, bottom: 5, left: 0 }}>
            <XAxis dataKey="label" tick={{ fontSize: 10 }} />
            <YAxis allowDecimals={false} tick={{ fontSize: 10 }} width={20} />
            <Tooltip formatter={(v) => [v, t("changes")]} />
            <Bar dataKey="count" fill="#f59e0b" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
