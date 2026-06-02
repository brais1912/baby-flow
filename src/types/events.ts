export type EventType = "sleep" | "feeding" | "diaper";

export type SleepMethod = "pacifier" | "held" | "rocking" | "self" | "nursing" | "other";
export type SleepCondition = "sleep_sack" | "pajamas" | "swaddle" | "other";
export type DiaperType = "pee" | "poop" | "both";

export interface SleepEventData {
  method: SleepMethod;
  condition: SleepCondition;
  roomTemperature?: number;
  wokeUpAt?: Date;
}

export interface FeedingEventData {
  amount?: number; // ml
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
