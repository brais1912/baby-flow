"use client";

import { useState } from "react";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis,
  LineChart, Line, Legend, Tooltip,
} from "recharts";
import { useTranslations, useLocale } from "next-intl";
import type { Event } from "@/lib/db/schema";
import { formatSleepDuration, deduplicateBothBreasts } from "@/lib/utils/format";

const NoTooltip = () => null;

function EmptyChart({ message }: { message: string }) {
  return <div className="h-48 flex items-center justify-center text-sm text-gray-400">{message}</div>;
}

function localeDateKey(date: Date, locale: string) {
  return date.toLocaleDateString(locale === "es" ? "es-ES" : "en-US", { weekday: "short", day: "numeric" });
}

// Small popover that appears near the tap point
function Popover({ tapY, onClose, children }: { tapY: number; onClose: () => void; children: React.ReactNode }) {
  // Position above the tap if near the bottom of the screen, below if near the top
  const nearBottom = tapY > window.innerHeight * 0.6;
  const top = nearBottom ? tapY - 20 : tapY + 20;

  return (
    <div className="fixed inset-0 z-50" onClick={onClose}>
      <div
        className="absolute left-1/2 -translate-x-1/2 bg-white rounded-2xl shadow-xl border border-gray-100 p-4 w-72"
        style={{ top, transform: nearBottom ? "translate(-50%, -100%)" : "translate(-50%, 0)" }}
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
}

// Maps tap X to bar index, accounting for chart left/right margins
function tapBarIndex(e: React.PointerEvent<HTMLDivElement>, barCount: number, marginLeft = 30, marginRight = 10): number {
  const rect = e.currentTarget.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const plotW = rect.width - marginLeft - marginRight;
  const rel = x - marginLeft;
  if (rel < 0 || rel > plotW) return -1;
  return Math.floor((rel / plotW) * barCount);
}

// ── Sleep chart ───────────────────────────────────────────────────────────────

export function SleepChart({ events }: { events: Event[] }) {
  const t = useTranslations("charts");
  const locale = useLocale();
  const now = new Date();
  const [selected, setSelected] = useState<{ label: string; hours: number; duration: string; tapY: number } | null>(null);
  const sorted = [...events].sort((a, b) => new Date(a.occurredAt).getTime() - new Date(b.occurredAt).getTime());

  const usedWakeUpIds = new Set<string>();
  const pairs: { date: Date; ms: number }[] = [];

  sorted.filter((e) => e.type === "sleep").forEach((sleepEvent) => {
    const start = new Date(sleepEvent.occurredAt);
    const wakeUp = sorted.find(
      (e) => e.type === "wake_up" && !usedWakeUpIds.has(e.id) && new Date(e.occurredAt) > start
    );
    const end = wakeUp ? new Date(wakeUp.occurredAt) : now;
    if (wakeUp) usedWakeUpIds.add(wakeUp.id);
    pairs.push({ date: start, ms: end.getTime() - start.getTime() });
  });

  const byDay: Record<string, { label: string; date: Date; ms: number }> = {};
  pairs.forEach(({ date, ms }) => {
    const key = localeDateKey(date, locale);
    if (!byDay[key]) byDay[key] = { label: key, date, ms: 0 };
    byDay[key].ms += ms;
  });

  const sleepBars = Object.values(byDay)
    .sort((a, b) => a.date.getTime() - b.date.getTime())
    .map(({ label, ms }) => ({
      label,
      hours: Math.round((ms / 3600000) * 10) / 10,
      duration: formatSleepDuration(new Date(0), new Date(ms)),
    }));

  if (sleepBars.length === 0) return <EmptyChart message={t("noSleepData")} />;

  return (
    <>
      <div
        className="w-full h-56"
        onPointerUp={(e) => {
          const idx = tapBarIndex(e, sleepBars.length, 30, 10);
          if (idx >= 0 && sleepBars[idx]) setSelected({ ...sleepBars[idx], tapY: e.clientY });
        }}
      >
        <ResponsiveContainer width="100%" height="100%" style={{ pointerEvents: "none" }}>
          <BarChart data={sleepBars} margin={{ top: 20, right: 10, bottom: 5, left: 0 }}>
            <XAxis dataKey="label" tick={{ fontSize: 10 }} />
            <YAxis unit="h" tick={{ fontSize: 10 }} width={30} />
            <Tooltip content={NoTooltip} cursor={false} />
            <Bar dataKey="hours" radius={[4, 4, 0, 0]} isAnimationActive={false} activeBar={false} fill="#a855f7"
              label={{ position: "top", fontSize: 11, fill: "#9333ea", formatter: (v: unknown) => `${v}h` }}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
      {selected && (
        <Popover tapY={selected.tapY} onClose={() => setSelected(null)}>
          <p className="font-bold text-gray-900 mb-2">😴 {selected.label}</p>
          <div className="flex gap-2 flex-wrap">
            <span className="bg-purple-100 text-purple-700 text-sm px-3 py-1.5 rounded-full font-medium">{selected.hours}h {t("total")}</span>
            <span className="bg-gray-100 text-gray-600 text-sm px-3 py-1.5 rounded-full">{selected.duration}</span>
          </div>
        </Popover>
      )}
    </>
  );
}

// ── Feeding chart ─────────────────────────────────────────────────────────────

const BREAST_TYPES = new Set(["breast_left", "breast_right", "both_breasts"]);
const BOTTLE_TYPES = new Set(["bottle", "formula", "solid"]);

export function FeedingChart({ events }: { events: Event[] }) {
  const t = useTranslations("charts");
  const locale = useLocale();
  const [selected, setSelected] = useState<{ label: string; tomas?: number; ml?: number; tapY: number } | null>(null);
  const feedingEvents = deduplicateBothBreasts(events.filter((e) => e.type === "feeding"));

  if (feedingEvents.length === 0) return <EmptyChart message={t("noFeedingData")} />;

  const breastEvents = feedingEvents.filter((e) => e.feedingType && BREAST_TYPES.has(e.feedingType));
  const bottleEvents = feedingEvents.filter((e) => e.feedingType && BOTTLE_TYPES.has(e.feedingType));

  const breastByDay: Record<string, { label: string; date: Date; tomas: number }> = {};
  breastEvents.forEach((e) => {
    const d = new Date(e.occurredAt);
    const day = localeDateKey(d, locale);
    if (!breastByDay[day]) breastByDay[day] = { label: day, date: d, tomas: 0 };
    breastByDay[day].tomas += 1;
  });
  const breastData = Object.values(breastByDay).sort((a, b) => a.date.getTime() - b.date.getTime());

  const bottleData = [...bottleEvents]
    .sort((a, b) => new Date(a.occurredAt).getTime() - new Date(b.occurredAt).getTime())
    .map((e) => ({ label: localeDateKey(new Date(e.occurredAt), locale), ml: e.feedingAmountMl ?? 0 }));

  return (
    <>
      <div className="space-y-4">
        {breastData.length > 0 && (
          <div>
            <p className="text-xs text-gray-400 mb-1">{t("breastfeedingPerDay")}</p>
            <div
              className="w-full h-44"
              onPointerUp={(e) => {
                const idx = tapBarIndex(e, breastData.length, 20, 10);
                if (idx >= 0 && breastData[idx]) setSelected({ label: breastData[idx].label, tomas: breastData[idx].tomas, tapY: e.clientY });
              }}
            >
              <ResponsiveContainer width="100%" height="100%" style={{ pointerEvents: "none" }}>
                <BarChart data={breastData} margin={{ top: 16, right: 10, bottom: 5, left: 0 }}>
                  <XAxis dataKey="label" tick={{ fontSize: 10 }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 10 }} width={20} />
                  <Tooltip content={NoTooltip} cursor={false} />
                  <Bar dataKey="tomas" fill="#818cf8" radius={[4, 4, 0, 0]} isAnimationActive={false} activeBar={false}
                    label={{ position: "top", fontSize: 11, fill: "#6366f1" }} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
        {bottleData.length > 0 && (
          <div>
            <p className="text-xs text-gray-400 mb-1">{t("bottlePerSession")}</p>
            <div
              className="w-full h-44"
              onPointerUp={(e) => {
                const idx = tapBarIndex(e, bottleData.length, 36, 10);
                if (idx >= 0 && bottleData[idx]) setSelected({ label: bottleData[idx].label, ml: bottleData[idx].ml, tapY: e.clientY });
              }}
            >
              <ResponsiveContainer width="100%" height="100%" style={{ pointerEvents: "none" }}>
                <LineChart data={bottleData} margin={{ top: 16, right: 10, bottom: 5, left: 0 }}>
                  <XAxis dataKey="label" tick={{ fontSize: 10 }} />
                  <YAxis unit="ml" tick={{ fontSize: 10 }} width={36} />
                  <Tooltip content={NoTooltip} cursor={false} />
                  <Line type="monotone" dataKey="ml" stroke="#3b82f6" strokeWidth={2} dot={{ r: 4 }} isAnimationActive={false} activeDot={false}
                    label={{ position: "top", fontSize: 11, fill: "#3b82f6", formatter: (v: unknown) => typeof v === "number" && v > 0 ? `${v}ml` : "" }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </div>
      {selected && (
        <Popover tapY={selected.tapY} onClose={() => setSelected(null)}>
          <p className="font-bold text-gray-900 mb-2">🍼 {selected.label}</p>
          <div className="flex gap-2 flex-wrap">
            {selected.tomas !== undefined && (
              <span className="bg-indigo-100 text-indigo-700 text-sm px-3 py-1.5 rounded-full font-medium">{selected.tomas} {t("sessions")}</span>
            )}
            {selected.ml !== undefined && selected.ml > 0 && (
              <span className="bg-blue-100 text-blue-700 text-sm px-3 py-1.5 rounded-full font-medium">{selected.ml} ml</span>
            )}
          </div>
        </Popover>
      )}
    </>
  );
}

// ── Diaper chart ──────────────────────────────────────────────────────────────

export function DiaperChart({ events }: { events: Event[] }) {
  const t = useTranslations("charts");
  const tDiaper = useTranslations("diaperTypes");
  const locale = useLocale();
  const [selected, setSelected] = useState<{ label: string; pee: number; poop: number; both: number; tapY: number } | null>(null);
  const diaperEvents = events.filter((e) => e.type === "diaper");

  if (diaperEvents.length === 0) return <EmptyChart message={t("noDiaperData")} />;

  const byDay: Record<string, { label: string; date: Date; pee: number; poop: number; both: number }> = {};
  diaperEvents.forEach((e) => {
    const d = new Date(e.occurredAt);
    const day = localeDateKey(d, locale);
    if (!byDay[day]) byDay[day] = { label: day, date: d, pee: 0, poop: 0, both: 0 };
    const key = e.diaperType as "pee" | "poop" | "both" | null;
    if (key && key in byDay[day]) byDay[day][key] += 1;
  });
  const barData = Object.values(byDay).sort((a, b) => a.date.getTime() - b.date.getTime());

  return (
    <>
      <div
        className="w-full h-52"
        onPointerUp={(e) => {
          const idx = tapBarIndex(e, barData.length);
          if (idx >= 0 && barData[idx]) setSelected({ ...barData[idx], tapY: e.clientY });
        }}
      >
        <ResponsiveContainer width="100%" height="100%" style={{ pointerEvents: "none" }}>
          <BarChart data={barData} margin={{ top: 5, right: 10, bottom: 5, left: 0 }}>
            <XAxis dataKey="label" tick={{ fontSize: 10 }} />
            <YAxis allowDecimals={false} tick={{ fontSize: 10 }} width={20} />
            <Tooltip content={NoTooltip} cursor={false} />
            <Legend />
            <Bar dataKey="pee"  stackId="a" fill="#fbbf24" name={tDiaper("pee")}  isAnimationActive={false} activeBar={false} />
            <Bar dataKey="poop" stackId="a" fill="#92400e" name={tDiaper("poop")} isAnimationActive={false} activeBar={false} />
            <Bar dataKey="both" stackId="a" fill="#d97706" name={tDiaper("both")} isAnimationActive={false} activeBar={false} radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
      {selected && (
        <Popover tapY={selected.tapY} onClose={() => setSelected(null)}>
          <p className="font-bold text-gray-900 mb-2">👶 {selected.label}</p>
          <div className="flex gap-2 flex-wrap">
            {selected.pee > 0  && <span className="bg-yellow-100 text-yellow-700 text-sm px-3 py-1.5 rounded-full font-medium">💧 {tDiaper("pee")} × {selected.pee}</span>}
            {selected.poop > 0 && <span className="bg-amber-100  text-amber-800  text-sm px-3 py-1.5 rounded-full font-medium">💩 {tDiaper("poop")} × {selected.poop}</span>}
            {selected.both > 0 && <span className="bg-orange-100 text-orange-700 text-sm px-3 py-1.5 rounded-full font-medium">💧💩 {tDiaper("both")} × {selected.both}</span>}
          </div>
        </Popover>
      )}
    </>
  );
}
