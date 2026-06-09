"use client";

import { useState, useRef, useEffect } from "react";
import { useTranslations, useLocale } from "next-intl";
import { format, addDays } from "date-fns";
import { es, enUS } from "date-fns/locale";
import { buildWeeklySleepSessions, formatSleepDuration, type SleepSession, type DayIndex } from "@/lib/utils/format";
import type { Event } from "@/lib/db/schema";

const DAY_HEIGHT  = 36;
const MARGIN_LEFT = 36;
const MARGIN_TOP  = 8;
const MARGIN_BOT  = 24;
const BAR_H       = 14;

function DetailSheet({ session, dayLabel, onClose }: { session: SleepSession; dayLabel: string; onClose: () => void }) {
  const t = useTranslations("insights");
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/30" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-5 space-y-3" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-2xl">😴</span>
            <div>
              <p className="font-semibold text-gray-900">{dayLabel}</p>
              <p className="text-xs text-gray-400">
                {format(session.start, "HH:mm")} → {format(session.end, "HH:mm")}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">&times;</button>
        </div>
        <div className="flex flex-wrap gap-2">
          <span className="bg-purple-100 text-purple-700 text-sm px-3 py-1.5 rounded-full font-medium">
            {formatSleepDuration(session.start, session.end)}
          </span>
          {session.isQuicklog && (
            <span className="bg-fuchsia-50 text-fuchsia-600 text-xs px-2.5 py-1.5 rounded-full border border-fuchsia-100">
              ⚡ QuickLog
            </span>
          )}
        </div>
        <p className="text-xs text-gray-400">{t("tapToClose")}</p>
      </div>
    </div>
  );
}

export function SleepSwimLane({ events, weekStart }: { events: Event[]; weekStart: Date }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(340);
  const [selected, setSelected] = useState<{ session: SleepSession; dayLabel: string } | null>(null);
  const locale = useLocale();
  const dateFnsLocale = locale === "es" ? es : enUS;
  const t = useTranslations("insights");

  useEffect(() => {
    if (!containerRef.current) return;
    const ro = new ResizeObserver((entries) => setWidth(entries[0].contentRect.width));
    ro.observe(containerRef.current);
    setWidth(containerRef.current.offsetWidth);
    return () => ro.disconnect();
  }, []);

  const sessions = buildWeeklySleepSessions(events, weekStart);
  const plotW    = width - MARGIN_LEFT;
  const svgH     = 7 * DAY_HEIGHT + MARGIN_TOP + MARGIN_BOT;

  // X axis represents a 24-hour window starting at 12:00 (noon) of each row's day.
  // Clock hours 12–23 → offsets 0–11; clock hours 0–11 → offsets 12–23.
  const toOffsetHours = (date: Date) => {
    const h = date.getHours() + date.getMinutes() / 60;
    return h >= 12 ? h - 12 : h + 12;
  };
  const toX = (date: Date) => MARGIN_LEFT + (toOffsetHours(date) / 24) * plotW;
  const tickX = (offsetH: number) => MARGIN_LEFT + (offsetH / 24) * plotW;
  // { offset: position on axis, label: clock hour to display }
  const hourTicks = [
    { offset: 0, label: 12 }, { offset: 3, label: 15 }, { offset: 6, label: 18 },
    { offset: 9, label: 21 }, { offset: 12, label: 0 }, { offset: 15, label: 3 },
    { offset: 18, label: 6 }, { offset: 21, label: 9 }, { offset: 24, label: 12 },
  ];

  const days = Array.from({ length: 7 }, (_, i) => {
    const d = addDays(weekStart, i);
    return { label: format(d, "EEE d", { locale: dateFnsLocale }), idx: i as DayIndex };
  });

  const rowY = (idx: DayIndex) => MARGIN_TOP + idx * DAY_HEIGHT + DAY_HEIGHT / 2;

  const hasSessions = Object.values(sessions).some((s) => s.length > 0);

  return (
    <>
      <div ref={containerRef} className="w-full overflow-hidden">
        <p className="text-xs text-gray-400 mb-2">{t("sleepHint")}</p>
        <svg width={width} height={svgH} className="overflow-visible">
          {/* Row backgrounds */}
          {days.map(({ idx }) => (
            <rect
              key={idx}
              x={0} y={MARGIN_TOP + idx * DAY_HEIGHT}
              width={width} height={DAY_HEIGHT}
              fill={idx % 2 === 0 ? "#fafafa" : "#ffffff"}
            />
          ))}

          {/* Vertical hour grid */}
          {hourTicks.map(({ offset, label }) => (
            <line
              key={offset}
              x1={tickX(offset)} y1={MARGIN_TOP}
              x2={tickX(offset)} y2={svgH - MARGIN_BOT}
              stroke={offset % 12 === 0 ? "#e5e7eb" : "#f3f4f6"} strokeWidth={1}
            />
          ))}

          {/* Hour labels */}
          {hourTicks.filter(({ offset }) => offset < 24).map(({ offset, label }) => (
            <text key={offset} x={tickX(offset)} y={svgH - 6} textAnchor="middle" fontSize={8} fill="#9ca3af">
              {`${String(label).padStart(2, "0")}h`}
            </text>
          ))}

          {/* Day labels */}
          {days.map(({ label, idx }) => (
            <text key={idx} x={MARGIN_LEFT - 4} y={rowY(idx)} textAnchor="end" dominantBaseline="middle" fontSize={9} fill="#6b7280" fontWeight={600}>
              {label}
            </text>
          ))}

          {/* Empty state */}
          {!hasSessions && (
            <text x={MARGIN_LEFT + plotW / 2} y={MARGIN_TOP + 3.5 * DAY_HEIGHT} textAnchor="middle" dominantBaseline="middle" fontSize={12} fill="#d1d5db">
              {t("noSleepData")}
            </text>
          )}

          {/* Sleep bars */}
          {days.map(({ idx }) =>
            sessions[idx].map((session, si) => {
              const x1  = Math.min(toX(session.start), width - 2);
              const x2  = Math.min(toX(session.end),   width - 2);
              const barW = Math.max(4, x2 - x1);
              const cy  = rowY(idx);
              return (
                <g
                  key={si}
                  style={{ cursor: "pointer" }}
                  onClick={() => setSelected({ session, dayLabel: days[idx].label })}
                >
                  <rect
                    x={x1} y={cy - BAR_H / 2}
                    width={barW} height={BAR_H}
                    rx={BAR_H / 2}
                    fill={session.isQuicklog ? "#d8b4fe" : "#a855f7"}
                    opacity={0.85}
                  />
                  {/* start dot */}
                  <circle cx={x1} cy={cy} r={4} fill={session.isQuicklog ? "#d8b4fe" : "#a855f7"} stroke="white" strokeWidth={1.5} />
                  {/* end dot */}
                  <circle cx={x1 + barW} cy={cy} r={4} fill="#f97316" stroke="white" strokeWidth={1.5} />
                </g>
              );
            })
          )}
        </svg>

        {/* Legend */}
        <div className="flex gap-4 mt-2 text-xs text-gray-400">
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-sm bg-purple-400 inline-block" />{t("sleep")}
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-sm bg-purple-200 inline-block" />⚡ QuickLog
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-orange-400 inline-block" />{t("wakeUp")}
          </span>
        </div>
      </div>

      {selected && (
        <DetailSheet
          session={selected.session}
          dayLabel={selected.dayLabel}
          onClose={() => setSelected(null)}
        />
      )}
    </>
  );
}
