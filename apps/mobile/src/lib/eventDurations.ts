import type { BabyEvent } from "../types/events";

export type EventPhaseDuration = {
  kind: "awake" | "sleep";
  durationMs: number;
};

function latestPreviousEvent(
  event: BabyEvent,
  allEvents: BabyEvent[],
  type: "sleep" | "wake_up"
): BabyEvent | null {
  return allEvents
    .filter((candidate) => candidate.type === type && candidate.occurredAt < event.occurredAt)
    .sort((left, right) => right.occurredAt.getTime() - left.occurredAt.getTime())[0] ?? null;
}

export function eventPhaseDuration(event: BabyEvent, allEvents: BabyEvent[]): EventPhaseDuration | null {
  if (event.type === "sleep") {
    const wake = latestPreviousEvent(event, allEvents, "wake_up");
    return wake ? { kind: "awake", durationMs: event.occurredAt.getTime() - wake.occurredAt.getTime() } : null;
  }
  if (event.type === "wake_up") {
    const sleep = latestPreviousEvent(event, allEvents, "sleep");
    return sleep ? { kind: "sleep", durationMs: event.occurredAt.getTime() - sleep.occurredAt.getTime() } : null;
  }
  return null;
}
