"use client";

import { useState, useRef, useEffect } from "react";
import { useTranslations, useLocale } from "next-intl";
import { format, addDays } from "date-fns";
import { es, enUS } from "date-fns/locale";
import { DEFAULT_DAY_WINDOW_START_MINUTES, buildDiaperHeatmap, dayWindowHourTicks, formatHourLabel, type DayIndex } from "@/lib/utils/format";
import type { Event } from "@/lib/db/schema";

const HOUR_BUCKETS = 12;
const MARGIN_LEFT  = 40;
const MARGIN_TOP   = 20;
const CELL_PAD     = 2;

function cellColor(count: number, max: number): string {
  if (count === 0) return "#f9fafb";
  const intensity = count / Math.max(max, 1);
  if (intensity < 0.25) return "#fef3c7";
  if (intensity < 0.5)  return "#fcd34d";
  if (intensity < 0.75) return "#f59e0b";
  return "#d97706";
}

function DetailSheet({ label, count, onClose }: { label: string; count: number; onClose: () => void }) {
  const t = useTranslations("insights");
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/30" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-5 space-y-3" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <p className="font-semibold text-gray-900">👶 {label}</p>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">&times;</button>
        </div>
        <span className="bg-amber-100 text-amber-700 text-sm px-3 py-1.5 rounded-full font-medium inline-block">
          {count} {t("diaperChanges")}
        </span>
      </div>
    </div>
  );
}

export function DiaperHeatmap({ events, weekStart, dayWindowStartMinutes = DEFAULT_DAY_WINDOW_START_MINUTES }: { events: Event[]; weekStart: Date; dayWindowStartMinutes?: number }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [width, setWidth]       = useState(340);
  const [selected, setSelected] = useState<{ label: string; count: number } | null>(null);
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

  const heatmap  = buildDiaperHeatmap(events, weekStart, dayWindowStartMinutes, true);
  const countMap = new Map(heatmap.map((c) => [`${c.dayIdx}-${c.hourBucket}`, c.count]));
  const maxCount = Math.max(1, ...heatmap.map((c) => c.count));

  const plotW = width - MARGIN_LEFT;
  const cellW = plotW / HOUR_BUCKETS;
  const cellH = 28;
  const svgH  = MARGIN_TOP + 7 * cellH + 20;

  const days = Array.from({ length: 7 }, (_, i) => ({
    label:     format(addDays(weekStart, i), "EEE",        { locale: dateFnsLocale }),
    fullLabel: format(addDays(weekStart, i), "EEE d MMM",  { locale: dateFnsLocale }),
    idx: i as DayIndex,
  }));

  const hasData = heatmap.length > 0;
  const hourTicks = dayWindowHourTicks(dayWindowStartMinutes, 2).filter(({ offset }) => offset < 24);

  return (
    <>
      <p className="text-xs text-gray-400 mb-2">{t("heatmapHint")}</p>
      <div ref={containerRef} className="w-full overflow-hidden">
        <svg width={width} height={svgH}>
          {/* Hour labels */}
          {hourTicks.map(({ offset, labelMinutes }) => (
            <text key={offset} x={MARGIN_LEFT + offset / 2 * cellW + cellW / 2} y={MARGIN_TOP - 4}
              textAnchor="middle" fontSize={7} fill="#9ca3af">
              {formatHourLabel(labelMinutes, "")}
            </text>
          ))}

          {/* Day labels */}
          {days.map(({ label, idx }) => (
            <text key={idx} x={MARGIN_LEFT - 4} y={MARGIN_TOP + idx * cellH + cellH / 2}
              textAnchor="end" dominantBaseline="middle" fontSize={9} fill="#6b7280" fontWeight={600}>
              {label}
            </text>
          ))}

          {/* Cells */}
          {days.map(({ fullLabel, idx }) =>
            Array.from({ length: HOUR_BUCKETS }, (_, b) => {
              const count = countMap.get(`${idx}-${b}`) ?? 0;
              const x = MARGIN_LEFT + b * cellW + CELL_PAD;
              const y = MARGIN_TOP  + idx * cellH + CELL_PAD;
              const w = cellW - CELL_PAD * 2;
              const h = cellH - CELL_PAD * 2;
              return (
                <g key={b} style={{ cursor: count > 0 ? "pointer" : "default" }}
                  onClick={() => {
                    if (count === 0) return;
                    const startMinutes = (dayWindowStartMinutes + b * 120) % (24 * 60);
                    const endMinutes = (startMinutes + 120) % (24 * 60);
                    const hourLabel = `${formatHourLabel(startMinutes, "")}–${formatHourLabel(endMinutes, "")}`;
                    setSelected({ label: `${fullLabel} · ${hourLabel}`, count });
                  }}
                >
                  <rect x={x} y={y} width={w} height={h} rx={4} fill={cellColor(count, maxCount)} />
                  {count > 0 && (
                    <text x={x + w / 2} y={y + h / 2} textAnchor="middle" dominantBaseline="middle"
                      fontSize={8} fill={count / maxCount > 0.5 ? "white" : "#d97706"} fontWeight={700}>
                      {count}
                    </text>
                  )}
                </g>
              );
            })
          )}

          {!hasData && (
            <text x={MARGIN_LEFT + plotW / 2} y={MARGIN_TOP + 3.5 * cellH}
              textAnchor="middle" dominantBaseline="middle" fontSize={12} fill="#d1d5db">
              {t("noDiaperData")}
            </text>
          )}
        </svg>

        {/* Legend */}
        <div className="flex items-center gap-2 mt-1 text-xs text-gray-400">
          <span>{t("fewer")}</span>
          {["#fef3c7", "#fcd34d", "#f59e0b", "#d97706"].map((c) => (
            <span key={c} className="w-4 h-4 rounded inline-block" style={{ background: c }} />
          ))}
          <span>{t("more")}</span>
        </div>
      </div>

      {selected && <DetailSheet {...selected} onClose={() => setSelected(null)} />}
    </>
  );
}
