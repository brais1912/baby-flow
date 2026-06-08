export type EventType = "sleep" | "wake_up" | "feeding" | "diaper";

// Server Actions can only propagate an Error's `message` to the client, so
// invalid-sleep-sequence errors are encoded as a prefixed message and parsed
// back into a structured form here.
export const INVALID_SLEEP_SEQUENCE_PREFIX = "INVALID_SLEEP_SEQUENCE:";

export function parseInvalidSleepSequenceError(message: string): "sleep" | "wake_up" | null {
  if (!message.startsWith(INVALID_SLEEP_SEQUENCE_PREFIX)) return null;
  const type = message.slice(INVALID_SLEEP_SEQUENCE_PREFIX.length);
  return type === "sleep" || type === "wake_up" ? type : null;
}

export type SleepMethod = "pacifier" | "held" | "rocking" | "self" | "nursing" | "bottle" | "other";
export type SleepCondition = "sleep_sack" | "pajamas" | "swaddle" | "other";
export type DiaperType = "pee" | "poop" | "both";

export interface SleepEventData {
  method: SleepMethod;
  condition: SleepCondition;
  roomTemperature?: number;
}

export interface FeedingEventData {
  amount?: number;
  durationMinutes?: number;
  type: "breast_left" | "breast_right" | "bottle" | "formula" | "solid";
}

export interface DiaperEventData {
  type: DiaperType;
}

export interface BabyEvent {
  id: string;
  userId: string;
  type: EventType;
  occurredAt: Date;
  notes?: string;
  sleepData?: SleepEventData;
  feedingData?: FeedingEventData;
  diaperData?: DiaperEventData;
  createdAt: Date;
  updatedAt: Date;
}
