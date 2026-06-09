"use client";

import { useState, useRef, useEffect } from "react";
import { useTranslations } from "next-intl";
import type { Event } from "@/lib/db/schema";
import { formatTime, formatSleepDuration, diaperTypeLabel, sleepMethodLabel } from "@/lib/utils/format";

const EVENT_COLORS: Record<string, string> = {
  sleep: "#a855f7",
  wake_up: "#f97316",
  feeding: "#3b82f6",
  diaper: "#f59e0b",
};

const EVENT_EMOJI: Record<string, string> = {
  sleep: "😴",
  wake_up: "🌅",
  feeding: "🍼",
  diaper: "👶",
};

// Lane index per type — determines Y position
const LANES = ["sleeping", "feeding", "diaper"] as const;
type Lane = typeof LANES[number];

function eventLane(type: string): Lane {
  if (type === "sleep" || type === "wake_up") return "sleeping";
  if (type === "feeding") return "feeding";
  return "diaper";
}

const LANE_LABELS: Record<Lane, string> = {
  sleeping: "😴",
  feeding: "🍼",
  diaper: "👶",
};

interface Props {
  events: Event[];
  visibleEvents?: Event[];
  currentDay: Date;
}

function buildSleepSessions(events: Event[]): Array<{ sleep: Event; wakeUp: Event }> {
  const sorted = [...events].sort((a, b) => new Date(a.occurredAt).getTime() - new Date(b.occurredAt).getTime());
  const sessions: Array<{ sleep: Event; wakeUp: Event }> = [];
  for (let i = 0; i < sorted.length; i++) {
    if (sorted[i].type === "sleep") {
      const wakeUp = sorted.slice(i + 1).find((e) => e.type === "wake_up");
      if (wakeUp) sessions.push({ sleep: sorted[i], wakeUp });
    }
  }
  return sessions;
}

const FEEDING_TYPE_KEY: Record<string, string> = {
  breast_left: "breastLeft", breast_right: "breastRight", both_breasts: "bothBreasts",
  bottle: "bottle", formula: "formula", solid: "solid",
};

const SLEEP_CONDITION_KEY: Record<string, string> = {
  sleep_sack: "sleepSack", pajamas: "pajamas", bodysuit: "bodysuit",
  top_and_bottoms: "topAndBottoms", swaddle: "swaddle", other: "other",
};

function EventDetail({ event, wakeUp, onClose }: { event: Event; wakeUp?: Event; onClose: () => void }) {
  const tFeeding = useTranslations("feedingTypes");
  const tConditions = useTranslations("sleepConditions");

  const detail =
    event.type === "diaper" && event.diaperType
      ? diaperTypeLabel(event.diaperType)
      : event.type === "feeding" && event.feedingType
      ? tFeeding(FEEDING_TYPE_KEY[event.feedingType] ?? event.feedingType)
      : event.sleepMethod
      ? sleepMethodLabel(event.sleepMethod)
      : null;

  const meta: string[] = [];
  if (event.type === "feeding" && event.feedingAmountMl) meta.push(`${event.feedingAmountMl} ml`);
  if (event.type === "feeding" && event.feedingDurationMinutes) meta.push(`${event.feedingDurationMinutes} min`);
  if (event.type === "sleep" && event.sleepCondition) meta.push(tConditions(SLEEP_CONDITION_KEY[event.sleepCondition] ?? event.sleepCondition));
  if (event.type === "sleep" && event.sleepRoomTemperature) meta.push(`${event.sleepRoomTemperature}°C`);
  if (event.type === "sleep" && wakeUp) meta.push(formatSleepDuration(new Date(event.occurredAt), new Date(wakeUp.occurredAt)));

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/30" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-5 space-y-3" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-2xl">{EVENT_EMOJI[event.type]}</span>
            <div>
              <p className="font-semibold text-gray-900 capitalize">{event.type.replace("_", " ")}</p>
              <p className="text-xs text-gray-400">
                {formatTime(new Date(event.occurredAt))}
                {event.type === "sleep" && wakeUp && ` → ${formatTime(new Date(wakeUp.occurredAt))}`}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">&times;</button>
        </div>
        {(detail || meta.length > 0) && (
          <div className="flex flex-wrap gap-2">
            {detail && <span className="bg-gray-100 text-gray-600 text-xs px-2 py-1 rounded-full capitalize">{detail}</span>}
            {meta.map((m) => <span key={m} className="bg-gray-100 text-gray-600 text-xs px-2 py-1 rounded-full capitalize">{m}</span>)}
          </div>
        )}
        {event.notes && (
          <div className="bg-gray-50 rounded-lg px-3 py-2">
            <p className="text-xs text-gray-400 mb-0.5">Nota</p>
            <p className="text-sm text-gray-700">{event.notes}</p>
          </div>
        )}
      </div>
    </div>
  );
}

export function TimelineChart({ events, visibleEvents, currentDay }: Props) {
  const [selected, setSelected] = useState<Event | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(600);

  useEffect(() => {
    if (!containerRef.current) return;
    const ro = new ResizeObserver((entries) => setWidth(entries[0].contentRect.width));
    ro.observe(containerRef.current);
    setWidth(containerRef.current.offsetWidth);
    return () => ro.disconnect();
  }, []);

  const visible = visibleEvents ?? events;
  const visibleIds = new Set(visible.map((e) => e.id));

  const dayStart = new Date(currentDay); dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(currentDay); dayEnd.setHours(23, 59, 59, 999);
  // Look back 24h to pair overnight sleeps that started yesterday but wake up today
  const prevDayStart = new Date(dayStart.getTime() - 24 * 60 * 60 * 1000);
  const nextDayEnd = new Date(dayEnd.getTime() + 24 * 60 * 60 * 1000);

  const sessionEvents = events.filter((e) => {
    const t = new Date(e.occurredAt);
    if (e.type === "wake_up") return t >= dayStart && t <= nextDayEnd;
    if (e.type === "sleep") return t >= prevDayStart && t <= dayEnd;
    return t >= dayStart && t <= dayEnd;
  });

  const allSessions = buildSleepSessions(sessionEvents);
  const sessionSleepIds = new Set(allSessions.map((s) => s.sleep.id));
  const sessionWakeUpIds = new Set(allSessions.map((s) => s.wakeUp.id));
  // Include overnight sessions whose wake-up is today, even if the sleep started yesterday
  const sleepSessions = allSessions.filter(
    (s) => visibleIds.has(s.sleep.id) || visibleIds.has(s.wakeUp.id)
  );

  const standaloneEvents = visible.filter(
    (e) => !sessionSleepIds.has(e.id) && !sessionWakeUpIds.has(e.id)
      && new Date(e.occurredAt) >= dayStart && new Date(e.occurredAt) <= dayEnd
  );

  const selectedWakeUp = selected?.type === "sleep"
    ? sleepSessions.find((s) => s.sleep.id === selected.id)?.wakeUp
    : undefined;

  // Which lanes are actually visible
  const activeLanes = LANES.filter((lane) => {
    if (lane === "sleeping") return sleepSessions.length > 0 || standaloneEvents.some((e) => e.type === "sleep" || e.type === "wake_up");
    if (lane === "feeding") return standaloneEvents.some((e) => e.type === "feeding");
    return standaloneEvents.some((e) => e.type === "diaper");
  });

  const isEmpty = sleepSessions.length === 0 && standaloneEvents.length === 0;

  // Layout
  const marginLeft = 28;
  const marginRight = 12;
  const marginBottom = 20;
  const laneHeight = 28;
  const lanePad = 10;
  const numLanes = isEmpty ? 1 : Math.max(1, activeLanes.length);
  const svgHeight = numLanes * laneHeight + lanePad + marginBottom;
  const plotW = width - marginLeft - marginRight;
  const barH = 12;

  const laneY = (lane: Lane) => {
    const idx = activeLanes.indexOf(lane);
    return lanePad + idx * laneHeight + laneHeight / 2;
  };

  const hourTicks = Array.from({ length: 25 }, (_, i) => i);
  const tickX = (hour: number) => marginLeft + (hour / 24) * plotW;
  const toX = (date: Date) => {
    const minutes = date.getHours() * 60 + date.getMinutes();
    return marginLeft + (minutes / (24 * 60)) * plotW;
  };

  return (
    <>
      <div ref={containerRef} className="w-full">
        <svg width={width} height={svgHeight}>
          {/* Lane backgrounds + labels */}
          {activeLanes.map((lane, i) => {
            const y = lanePad + i * laneHeight;
            return (
              <g key={lane}>
                <rect x={0} y={y} width={width} height={laneHeight}
                  fill={i % 2 === 0 ? "#fafafa" : "#ffffff"} />
                <text x={marginLeft - 4} y={y + laneHeight / 2} textAnchor="end"
                  dominantBaseline="middle" fontSize={12} fill="#9ca3af">
                  {LANE_LABELS[lane]}
                </text>
              </g>
            );
          })}

          {/* Vertical hour grid lines */}
          {hourTicks.map((h) => (
            <line key={h}
              x1={tickX(h)} y1={lanePad}
              x2={tickX(h)} y2={svgHeight - marginBottom}
              stroke={h % 6 === 0 ? "#e5e7eb" : "#f3f4f6"} strokeWidth={1} />
          ))}

          {/* Hour labels */}
          {hourTicks.filter((h) => h % 3 === 0).map((h) => (
            <text key={h} x={tickX(h)} y={svgHeight - 4} textAnchor="middle" fontSize={9} fill="#9ca3af">
              {`${String(h).padStart(2, "0")}:00`}
            </text>
          ))}

          {isEmpty && (
            <text x={marginLeft + plotW / 2} y={lanePad + laneHeight / 2} textAnchor="middle"
              dominantBaseline="middle" fontSize={11} fill="#d1d5db">
              No events
            </text>
          )}

          {/* Sleep session bars */}
          {sleepSessions.map(({ sleep, wakeUp }, i) => {
            const y = laneY("sleeping");
            const sleepDate = new Date(sleep.occurredAt);
            // Clamp to 00:00 if sleep started yesterday (overnight carryover)
            const displayStart = sleepDate < dayStart ? dayStart : sleepDate;
            const isOvernight = sleepDate < dayStart;
            const x1 = toX(displayStart);
            const x2 = toX(new Date(wakeUp.occurredAt));
            const barW = Math.max(6, x2 - x1);
            const isSelected = selected?.id === sleep.id;
            return (
              <g key={i} style={{ cursor: "pointer" }} onClick={() => setSelected(isSelected ? null : sleep)}>
                {isSelected && (
                  <rect x={x1 - 2} y={y - barH / 2 - 2} width={barW + 4} height={barH + 4}
                    rx={barH / 2 + 2} fill="#a855f7" opacity={0.2} />
                )}
                <rect x={x1} y={y - barH / 2} width={barW} height={barH}
                  rx={barH / 2} fill="#a855f7" opacity={isSelected ? 1 : 0.75} />
                {/* No start dot for overnight carryover — sleep started off-screen */}
                {!isOvernight && <circle cx={x1} cy={y} r={5} fill="#a855f7" stroke="white" strokeWidth={1.5} />}
                <circle cx={x2} cy={y} r={5} fill="#f97316" stroke="white" strokeWidth={1.5} />
              </g>
            );
          })}

          {/* Standalone dots */}
          {standaloneEvents.map((event, i) => {
            const lane = eventLane(event.type);
            if (!activeLanes.includes(lane)) return null;
            const y = laneY(lane);
            const x = toX(new Date(event.occurredAt));
            const isSelected = selected?.id === event.id;
            const color = EVENT_COLORS[event.type] ?? "#6b7280";
            return (
              <g key={i} style={{ cursor: "pointer" }} onClick={() => setSelected(isSelected ? null : event)}>
                {isSelected && <circle cx={x} cy={y} r={11} fill={color} opacity={0.2} />}
                <circle cx={x} cy={y} r={isSelected ? 7 : 5} fill={color} stroke="white" strokeWidth={2} />
              </g>
            );
          })}
        </svg>
      </div>

      {selected && <EventDetail event={selected} wakeUp={selectedWakeUp} onClose={() => setSelected(null)} />}
    </>
  );
}
