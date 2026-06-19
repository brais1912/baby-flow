"use client";

import { useState, useRef, useEffect } from "react";
import { useTranslations } from "next-intl";
import type { Event } from "@/lib/db/schema";
import { DEFAULT_DAY_WINDOW_START_MINUTES, dayWindowBounds, dayWindowHourTicks, dayWindowOffsetMinutes, formatHourLabel, formatTime, formatSleepDuration } from "@/lib/utils/format";

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
  dayWindowStartMinutes?: number;
  isExpanded?: boolean;
}

function buildSleepSessions(events: Event[]): Array<{ sleep: Event; wakeUp: Event }> {
  const sorted = [...events].sort((a, b) => new Date(a.occurredAt).getTime() - new Date(b.occurredAt).getTime());
  const sessions: Array<{ sleep: Event; wakeUp: Event }> = [];
  const usedWakeIds = new Set<string>();
  for (let i = 0; i < sorted.length; i++) {
    if (sorted[i].type === "sleep") {
      const wakeUp = sorted.slice(i + 1).find((e) => e.type === "wake_up" && !usedWakeIds.has(e.id));
      if (wakeUp) {
        usedWakeIds.add(wakeUp.id);
        sessions.push({ sleep: sorted[i], wakeUp });
      }
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
  const tEventTypes = useTranslations("eventTypes");
  const tFeeding = useTranslations("feedingTypes");
  const tConditions = useTranslations("sleepConditions");
  const tMethods = useTranslations("sleepMethods");
  const tDiaper = useTranslations("diaperTypes");
  const tDayView = useTranslations("dayView");

  const detail =
    event.type === "diaper" && event.diaperType
      ? tDiaper(event.diaperType)
      : event.type === "feeding" && event.feedingType
      ? tFeeding(FEEDING_TYPE_KEY[event.feedingType] ?? event.feedingType)
      : event.sleepMethod
      ? tMethods(event.sleepMethod)
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
              <p className="font-semibold text-gray-900">{tEventTypes(event.type === "wake_up" ? "wakeUp" : event.type)}</p>
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
            <p className="text-xs text-gray-400 mb-0.5">{tDayView("details")}</p>
            <p className="text-sm text-gray-700">{event.notes}</p>
          </div>
        )}
      </div>
    </div>
  );
}

export function TimelineChart({ events, visibleEvents, currentDay, dayWindowStartMinutes = DEFAULT_DAY_WINDOW_START_MINUTES, isExpanded = false }: Props) {
  const [selected, setSelected] = useState<Event | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(600);

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
  }, [isExpanded, currentDay]);

  const visible = visibleEvents ?? events;
  const visibleIds = new Set(visible.map((e) => e.id));

  const { start: windowStart, end: windowEnd } = dayWindowBounds(currentDay, dayWindowStartMinutes);

  const sessionEvents = events.filter((e) => {
    const t = new Date(e.occurredAt);
    return t >= windowStart && t < windowEnd;
  });

  const allSessions = buildSleepSessions(sessionEvents);
  const sessionSleepIds = new Set(allSessions.map((s) => s.sleep.id));
  const sessionWakeUpIds = new Set(allSessions.map((s) => s.wakeUp.id));
  const sleepSessions = allSessions.filter(
    (s) => visibleIds.has(s.sleep.id) || visibleIds.has(s.wakeUp.id)
  );

  const previousWindowStart = new Date(windowStart.getTime() - 24 * 60 * 60 * 1000);
  const allSorted = [...events].sort((a, b) => new Date(a.occurredAt).getTime() - new Date(b.occurredAt).getTime());
  const crossBoundarySessions: Array<{ sleep: Event; wakeUp: Event }> = [];
  allSorted
    .filter((e) => {
      const t = new Date(e.occurredAt);
      return e.type === "sleep" && t >= previousWindowStart && t < windowStart;
    })
    .forEach((sleepEvent) => {
      const nextWake = allSorted.find(
        (e) => e.type === "wake_up" && new Date(e.occurredAt) > new Date(sleepEvent.occurredAt)
      );
      if (nextWake && !sessionWakeUpIds.has(nextWake.id)) {
        const wakeTime = new Date(nextWake.occurredAt);
        if (wakeTime >= windowStart && wakeTime < windowEnd) {
          crossBoundarySessions.push({ sleep: sleepEvent, wakeUp: nextWake });
        }
      }
    });

  // Sleeps inside the window with no paired wake-up in this window.
  // Two sub-cases tracked separately:
  //   - crossedBoundary: wake-up exists but is after windowEnd → bar from sleep to right edge
  //   - stillSleeping: no wake-up event exists at all → bar from sleep to now
  const orphanSleeps = visible
    .filter((e) => {
      if (e.type !== "sleep") return false;
      if (sessionSleepIds.has(e.id)) return false;
      const t = new Date(e.occurredAt);
      return t >= windowStart && t < windowEnd;
    })
    .map((e) => {
      const t = new Date(e.occurredAt);
      const nextWake = allSorted.find(
        (w) => w.type === "wake_up" && new Date(w.occurredAt) > t
      );
      const crossedBoundary = nextWake !== undefined && new Date(nextWake.occurredAt) >= windowEnd;
      const stillSleeping = nextWake === undefined;
      return { event: e, crossedBoundary, stillSleeping };
    })
    .filter(({ crossedBoundary, stillSleeping }) => crossedBoundary || stillSleeping);
  const orphanSleepIds = new Set(orphanSleeps.map(({ event }) => event.id));

  const standaloneEvents = visible.filter(
    (e) => !sessionSleepIds.has(e.id) && !sessionWakeUpIds.has(e.id) && !orphanSleepIds.has(e.id)
      && new Date(e.occurredAt) >= windowStart && new Date(e.occurredAt) < windowEnd
  );

  const selectedWakeUp = selected?.type === "sleep"
    ? (sleepSessions.find((s) => s.sleep.id === selected.id) ?? crossBoundarySessions.find((s) => s.sleep.id === selected.id))?.wakeUp
    : undefined;

  // Which lanes are actually visible
  const activeLanes = LANES.filter((lane) => {
    if (lane === "sleeping") return sleepSessions.length > 0 || crossBoundarySessions.length > 0 || orphanSleeps.length > 0 || standaloneEvents.some((e) => e.type === "sleep" || e.type === "wake_up");
    if (lane === "feeding") return standaloneEvents.some((e) => e.type === "feeding");
    return standaloneEvents.some((e) => e.type === "diaper");
  });

  const isEmpty = sleepSessions.length === 0 && crossBoundarySessions.length === 0 && orphanSleeps.length === 0 && standaloneEvents.length === 0;

  // Layout
  const marginLeft = 28;
  const marginRight = 12;
  const marginBottom = 20;
  const laneHeight = 28;
  const lanePad = 10;
  const numLanes = isEmpty ? 1 : Math.max(1, activeLanes.length);
  const svgHeight = numLanes * laneHeight + lanePad + marginBottom;
  const svgWidth = isExpanded ? Math.max(width * 2.4, 1200) : width;
  const plotW = svgWidth - marginLeft - marginRight;
  const barH = 12;

  const laneY = (lane: Lane) => {
    const idx = activeLanes.indexOf(lane);
    return lanePad + idx * laneHeight + laneHeight / 2;
  };

  const toOffsetMins = (date: Date) => {
    return dayWindowOffsetMinutes(date, dayWindowStartMinutes);
  };
  const toX = (date: Date) => marginLeft + (toOffsetMins(date) / (24 * 60)) * plotW;
  const tickX = (offsetH: number) => marginLeft + (offsetH / 24) * plotW;
  const hourTicks = dayWindowHourTicks(dayWindowStartMinutes, isExpanded ? 1 : 3);

  return (
    <>
      <div ref={containerRef} className="w-full">
        <div
          ref={scrollRef}
          className={isExpanded ? "overflow-x-auto overscroll-x-contain pb-2" : "overflow-hidden"}
          tabIndex={isExpanded ? 0 : undefined}
          aria-label={isExpanded ? "Expanded timeline" : undefined}
        >
          <svg width={svgWidth} height={svgHeight}>
          {/* Lane backgrounds + labels */}
          {activeLanes.map((lane, i) => {
            const y = lanePad + i * laneHeight;
            return (
              <g key={lane}>
                <rect x={0} y={y} width={svgWidth} height={laneHeight}
                  fill={i % 2 === 0 ? "#fafafa" : "#ffffff"} />
                <text x={marginLeft - 4} y={y + laneHeight / 2} textAnchor="end"
                  dominantBaseline="middle" fontSize={12} fill="#9ca3af">
                  {LANE_LABELS[lane]}
                </text>
              </g>
            );
          })}

          {/* Vertical hour grid lines */}
          {hourTicks.map(({ offset, labelMinutes }) => (
            <line key={offset}
              x1={tickX(offset)} y1={lanePad}
              x2={tickX(offset)} y2={svgHeight - marginBottom}
              stroke={labelMinutes % (12 * 60) === 0 ? "#e5e7eb" : "#f3f4f6"} strokeWidth={1} />
          ))}

          {/* Hour labels */}
          {hourTicks.map(({ offset, labelMinutes }) => (
            <text key={offset} x={tickX(offset)} y={svgHeight - 4} textAnchor="middle" fontSize={9} fill="#9ca3af">
              {formatHourLabel(labelMinutes, "")}
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
            const x1 = toX(new Date(sleep.occurredAt));
            const x2 = toX(new Date(wakeUp.occurredAt));
            const isSelected = selected?.id === sleep.id;
            const color = "#a855f7";
            const opacity = isSelected ? 1 : 0.75;
            const crossesBoundary = x2 < x1;
            const xBoundaryRight = tickX(24);
            const xBoundaryLeft = tickX(0);
            if (crossesBoundary) {
              return (
                <g key={i} style={{ cursor: "pointer" }} onClick={() => setSelected(isSelected ? null : sleep)}>
                  <rect x={x1} y={y - barH / 2} width={Math.max(4, xBoundaryRight - x1)} height={barH} rx={barH / 2} fill={color} opacity={opacity} />
                  <circle cx={x1} cy={y} r={5} fill={color} stroke="white" strokeWidth={1.5} />
                  <rect x={xBoundaryLeft} y={y - barH / 2} width={Math.max(4, x2 - xBoundaryLeft)} height={barH} rx={barH / 2} fill={color} opacity={opacity} />
                  <circle cx={x2} cy={y} r={5} fill="#f97316" stroke="white" strokeWidth={1.5} />
                </g>
              );
            }
            return (
              <g key={i} style={{ cursor: "pointer" }} onClick={() => setSelected(isSelected ? null : sleep)}>
                {isSelected && (
                  <rect x={x1 - 2} y={y - barH / 2 - 2} width={Math.max(6, x2 - x1) + 4} height={barH + 4}
                    rx={barH / 2 + 2} fill={color} opacity={0.2} />
                )}
                <rect x={x1} y={y - barH / 2} width={Math.max(6, x2 - x1)} height={barH}
                  rx={barH / 2} fill={color} opacity={opacity} />
                <circle cx={x1} cy={y} r={5} fill={color} stroke="white" strokeWidth={1.5} />
                <circle cx={x2} cy={y} r={5} fill="#f97316" stroke="white" strokeWidth={1.5} />
              </g>
            );
          })}

          {/* Cross-boundary sessions: sleep started before this window, wake-up in this window */}
          {crossBoundarySessions.map(({ sleep, wakeUp }, i) => {
            const y = laneY("sleeping");
            const x2 = toX(new Date(wakeUp.occurredAt));
            const xBoundaryLeft = tickX(0);
            return (
              <g key={`cn-${i}`} style={{ cursor: "pointer" }} onClick={() => setSelected(selected?.id === sleep.id ? null : sleep)}>
                <rect x={xBoundaryLeft} y={y - barH / 2} width={Math.max(4, x2 - xBoundaryLeft)} height={barH} rx={barH / 2} fill="#a855f7" opacity={0.75} />
                <circle cx={x2} cy={y} r={5} fill="#f97316" stroke="white" strokeWidth={1.5} />
              </g>
            );
          })}

          {/* Orphan sleeps: crossed boundary (→ right edge) or still sleeping (→ now) */}
          {orphanSleeps.map(({ event: sleep, crossedBoundary }, i) => {
            const y = laneY("sleeping");
            const x1 = toX(new Date(sleep.occurredAt));
            const xEnd = crossedBoundary ? tickX(24) : Math.min(toX(new Date()), tickX(24));
            return (
              <g key={`os-${i}`} style={{ cursor: "pointer" }} onClick={() => setSelected(selected?.id === sleep.id ? null : sleep)}>
                <rect x={x1} y={y - barH / 2} width={Math.max(4, xEnd - x1)} height={barH} rx={barH / 2} fill="#a855f7" opacity={0.75} />
                <circle cx={x1} cy={y} r={5} fill="#a855f7" stroke="white" strokeWidth={1.5} />
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
      </div>

      {selected && <EventDetail event={selected} wakeUp={selectedWakeUp} onClose={() => setSelected(null)} />}
    </>
  );
}
