import type { BabyEvent, EventInput, EventRow, EventType } from "../types/events";

export const INVALID_SLEEP_SEQUENCE = "INVALID_SLEEP_SEQUENCE";

export function mapEventRow(row: EventRow): BabyEvent {
  return {
    id: row.id,
    userId: row.user_id,
    type: row.type,
    occurredAt: new Date(row.occurred_at),
    notes: row.notes,
    sleepMethod: row.sleep_method,
    sleepCondition: row.sleep_condition,
    sleepRoomTemperature: row.sleep_room_temperature,
    feedingType: row.feeding_type,
    feedingAmountMl: row.feeding_amount_ml,
    feedingDurationMinutes: row.feeding_duration_minutes,
    diaperType: row.diaper_type,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  };
}

export function toEventInsert(userId: string, input: EventInput) {
  return {
    user_id: userId,
    type: input.type,
    occurred_at: input.occurredAt.toISOString(),
    notes: input.notes ?? null,
    sleep_method: input.sleepMethod ?? null,
    sleep_condition: input.sleepCondition ?? null,
    sleep_room_temperature: input.sleepRoomTemperature ?? null,
    feeding_type: input.feedingType ?? null,
    feeding_amount_ml: input.feedingAmountMl ?? null,
    feeding_duration_minutes: input.feedingDurationMinutes ?? null,
    diaper_type: input.diaperType ?? null,
  };
}

export function assertValidSleepSequence(
  events: BabyEvent[],
  nextType: EventType,
  excludedEventId?: string
): void {
  if (nextType !== "sleep" && nextType !== "wake_up") return;

  const latest = events
    .filter((event) =>
      event.id !== excludedEventId &&
      (event.type === "sleep" || event.type === "wake_up")
    )
    .sort((left, right) => right.occurredAt.getTime() - left.occurredAt.getTime())[0];

  if (latest?.type === nextType) {
    throw new Error(`${INVALID_SLEEP_SEQUENCE}:${nextType}`);
  }
}

export interface EventState {
  events: BabyEvent[];
  loading: boolean;
  mutating: boolean;
  error: string | null;
}

export type EventAction =
  | { type: "load-start" }
  | { type: "load-success"; events: BabyEvent[] }
  | { type: "mutation-start" }
  | { type: "mutation-success" }
  | { type: "upsert"; event: BabyEvent }
  | { type: "remove"; eventId: string }
  | { type: "error"; message: string };

export const initialEventState: EventState = {
  events: [],
  loading: true,
  mutating: false,
  error: null,
};

function sortEvents(events: BabyEvent[]): BabyEvent[] {
  return [...events].sort((left, right) => right.occurredAt.getTime() - left.occurredAt.getTime());
}

export function eventReducer(state: EventState, action: EventAction): EventState {
  switch (action.type) {
    case "load-start":
      return { ...state, loading: true, error: null };
    case "load-success":
      return { ...state, events: sortEvents(action.events), loading: false, mutating: false, error: null };
    case "mutation-start":
      return { ...state, mutating: true, error: null };
    case "mutation-success":
      return { ...state, mutating: false, error: null };
    case "upsert":
      return {
        ...state,
        events: sortEvents([...state.events.filter((event) => event.id !== action.event.id), action.event]),
        loading: false,
        mutating: false,
        error: null,
      };
    case "remove":
      return {
        ...state,
        events: state.events.filter((event) => event.id !== action.eventId),
        mutating: false,
        error: null,
      };
    case "error":
      return { ...state, loading: false, mutating: false, error: action.message };
  }
}

export function dayWindowBounds(date: Date, startMinutes: number): { start: Date; end: Date } {
  return ownerDayWindowBounds(dayWindowDate(date, startMinutes), startMinutes);
}

export function dayWindowDate(date: Date, startMinutes: number): Date {
  const owner = new Date(date);
  const boundary = new Date(date);
  boundary.setHours(0, 0, 0, 0);
  boundary.setMinutes(startMinutes);
  if (date < boundary) owner.setDate(owner.getDate() - 1);
  owner.setHours(0, 0, 0, 0);
  return owner;
}

export function ownerDayWindowBounds(ownerDate: Date, startMinutes: number): { start: Date; end: Date } {
  const start = new Date(ownerDate);
  start.setHours(0, 0, 0, 0);
  start.setMinutes(startMinutes);

  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  return { start, end };
}
