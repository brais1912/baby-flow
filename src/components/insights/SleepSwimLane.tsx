"use client";

import { useState, useRef, useEffect } from "react";
import { useTranslations, useLocale } from "next-intl";
import { format, addDays } from "date-fns";
import { es, enUS } from "date-fns/locale";
import { DEFAULT_DAY_WINDOW_START_MINUTES, buildWeeklySleepSessions, dayWindowBounds, dayWindowHourTicks, dayWindowOffsetMinutes, formatHourLabel, formatSleepDuration, type SleepSession, type DayIndex } from "@/lib/utils/format";
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

export function SleepSwimLane({ events, weekStart, dayWindowStartMinutes = DEFAULT_DAY_WINDOW_START_MINUTES }: { events: Event[]; weekStart: Date; dayWindowStartMinutes?: number }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(340);
  const [isExpanded, setIsExpanded] = useState(false);
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

  useEffect(() => {
    if (!scrollRef.current) return;
    scrollRef.current.scrollLeft = 0;
  }, [isExpanded, weekStart]);

  const sessions = buildWeeklySleepSessions(events, weekStart, dayWindowStartMinutes);
  const svgWidth = isExpanded ? Math.max(width * 2.4, 1200) : width;
  const plotW    = svgWidth - MARGIN_LEFT;
  const svgH     = 7 * DAY_HEIGHT + MARGIN_TOP + MARGIN_BOT;

  const toOffsetHours = (date: Date) => {
    return dayWindowOffsetMinutes(date, dayWindowStartMinutes) / 60;
  };
  const toX = (date: Date) => MARGIN_LEFT + (toOffsetHours(date) / 24) * plotW;
  const tickX = (offsetH: number) => MARGIN_LEFT + (offsetH / 24) * plotW;
  const hourTicks = dayWindowHourTicks(dayWindowStartMinutes, isExpanded ? 1 : 3);

  const days = Array.from({ length: 7 }, (_, i) => {
    const d = addDays(weekStart, i);
    return { label: format(d, "EEE d", { locale: dateFnsLocale }), idx: i as DayIndex };
  });

  const rowY = (idx: DayIndex) => MARGIN_TOP + idx * DAY_HEIGHT + DAY_HEIGHT / 2;

  const hasSessions = Object.values(sessions).some((s) => s.length > 0);

  return (
    <>
      <div ref={containerRef} className="w-full">
        <div className="flex items-center justify-between gap-3 mb-2">
          <p className="text-xs text-gray-400">{t("sleepHint")}</p>
          <button
            type="button"
            onClick={() => setIsExpanded((expanded) => !expanded)}
            className="h-8 w-8 shrink-0 rounded-lg bg-white text-gray-500 shadow-sm ring-1 ring-gray-200 flex items-center justify-center active:scale-95 transition-all hover:text-gray-800"
            aria-label={isExpanded ? "Collapse sleep timeline" : "Expand sleep timeline"}
            title={isExpanded ? "Collapse sleep timeline" : "Expand sleep timeline"}
          >
            {isExpanded ? (
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                <path fillRule="evenodd" d="M5.22 14.78a.75.75 0 0 1 0-1.06L8.94 10 5.22 6.28a.75.75 0 0 1 1.06-1.06L10 8.94l3.72-3.72a.75.75 0 1 1 1.06 1.06L11.06 10l3.72 3.72a.75.75 0 1 1-1.06 1.06L10 11.06l-3.72 3.72a.75.75 0 0 1-1.06 0Z" clipRule="evenodd" />
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                <path fillRule="evenodd" d="M5.25 3A2.25 2.25 0 0 0 3 5.25v3a.75.75 0 0 0 1.5 0v-3a.75.75 0 0 1 .75-.75h3a.75.75 0 0 0 0-1.5h-3Zm6.5 0a.75.75 0 0 0 0 1.5h3a.75.75 0 0 1 .75.75v3a.75.75 0 0 0 1.5 0v-3A2.25 2.25 0 0 0 14.75 3h-3Zm4.5 8a.75.75 0 0 0-.75.75v3a.75.75 0 0 1-.75.75h-3a.75.75 0 0 0 0 1.5h3A2.25 2.25 0 0 0 17 14.75v-3a.75.75 0 0 0-.75-.75Zm-12.5 0a.75.75 0 0 1 .75.75v3a.75.75 0 0 0 .75.75h3a.75.75 0 0 1 0 1.5h-3A2.25 2.25 0 0 1 3 14.75v-3a.75.75 0 0 1 .75-.75Z" clipRule="evenodd" />
              </svg>
            )}
          </button>
        </div>
        <div
          ref={scrollRef}
          className={isExpanded ? "overflow-x-auto overscroll-x-contain pb-2" : "overflow-hidden"}
          tabIndex={isExpanded ? 0 : undefined}
          aria-label={isExpanded ? "Expanded sleep timeline" : undefined}
        >
          <svg width={svgWidth} height={svgH} className="overflow-visible">
            {/* Row backgrounds */}
            {days.map(({ idx }) => (
              <rect
                key={idx}
                x={0} y={MARGIN_TOP + idx * DAY_HEIGHT}
                width={svgWidth} height={DAY_HEIGHT}
                fill={idx % 2 === 0 ? "#fafafa" : "#ffffff"}
              />
            ))}

            {/* Vertical hour grid */}
            {hourTicks.map(({ offset }) => (
              <line
                key={offset}
                x1={tickX(offset)} y1={MARGIN_TOP}
                x2={tickX(offset)} y2={svgH - MARGIN_BOT}
                stroke={offset % 12 === 0 ? "#e5e7eb" : "#f3f4f6"} strokeWidth={1}
              />
            ))}

            {/* Hour labels */}
            {hourTicks.filter(({ offset }) => offset < 24).map(({ offset, labelMinutes }) => (
              <text key={offset} x={tickX(offset)} y={svgH - 6} textAnchor="middle" fontSize={8} fill="#9ca3af">
                {formatHourLabel(labelMinutes, "")}
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
                const windowEnd = dayWindowBounds(addDays(weekStart, idx), dayWindowStartMinutes).end;
                const x1  = Math.min(toX(session.start), svgWidth - 2);
                const x2  = session.end.getTime() === windowEnd.getTime() ? svgWidth - 2 : Math.min(toX(session.end), svgWidth - 2);
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
        </div>

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
