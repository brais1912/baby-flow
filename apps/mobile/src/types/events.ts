export const EVENT_TYPES = ["sleep", "wake_up", "feeding", "diaper"] as const;
export type EventType = (typeof EVENT_TYPES)[number];

export type SleepMethod = "pacifier" | "held" | "rocking" | "self" | "nursing" | "bottle" | "other";
export type SleepCondition = "sleep_sack" | "pajamas" | "bodysuit" | "top_and_bottoms" | "swaddle" | "other";
export type FeedingType = "breast_left" | "breast_right" | "both_breasts" | "bottle" | "formula" | "solid";
export type DiaperType = "pee" | "poop" | "both";

export interface BabyEvent {
  id: string;
  userId: string;
  type: EventType;
  occurredAt: Date;
  notes: string | null;
  sleepMethod: SleepMethod | null;
  sleepCondition: SleepCondition | null;
  sleepRoomTemperature: number | null;
  feedingType: FeedingType | null;
  feedingAmountMl: number | null;
  feedingDurationMinutes: number | null;
  diaperType: DiaperType | null;
  createdAt: Date;
  updatedAt: Date;
}

export type EventRow = {
  id: string;
  user_id: string;
  type: EventType;
  occurred_at: string;
  notes: string | null;
  sleep_method: SleepMethod | null;
  sleep_condition: SleepCondition | null;
  sleep_room_temperature: number | null;
  feeding_type: FeedingType | null;
  feeding_amount_ml: number | null;
  feeding_duration_minutes: number | null;
  diaper_type: DiaperType | null;
  created_at: string;
  updated_at: string;
};

export interface EventInput {
  type: EventType;
  occurredAt: Date;
  notes?: string | null;
  sleepMethod?: SleepMethod | null;
  sleepCondition?: SleepCondition | null;
  sleepRoomTemperature?: number | null;
  feedingType?: FeedingType | null;
  feedingAmountMl?: number | null;
  feedingDurationMinutes?: number | null;
  diaperType?: DiaperType | null;
}
