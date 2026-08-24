import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../types/database";
import type { BabyEvent, EventInput } from "../types/events";
import {
  assertValidSleepSequence,
  DEFAULT_DAY_WINDOW_START_MINUTES,
  isValidDayWindowStartMinutes,
  mapEventRow,
  toEventInsert,
} from "./events";

type Client = SupabaseClient<Database>;

export async function getDayWindowStartMinutes(client: Client, userId: string): Promise<number> {
  const { data, error } = await client
    .from("user_settings")
    .select("day_window_start_minutes")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) throw error;
  return data && isValidDayWindowStartMinutes(data.day_window_start_minutes)
    ? data.day_window_start_minutes
    : DEFAULT_DAY_WINDOW_START_MINUTES;
}

export async function updateDayWindowStartMinutes(
  client: Client,
  userId: string,
  dayWindowStartMinutes: number
): Promise<void> {
  if (!isValidDayWindowStartMinutes(dayWindowStartMinutes)) {
    throw new Error("INVALID_DAY_WINDOW_START");
  }
  const { error } = await client
    .from("user_settings")
    .upsert({
      user_id: userId,
      day_window_start_minutes: dayWindowStartMinutes,
      updated_at: new Date().toISOString(),
    }, { onConflict: "user_id" });

  if (error) throw error;
}

export async function fetchEvents(
  client: Client,
  userId: string,
  start: Date,
  end: Date
): Promise<BabyEvent[]> {
  const { data, error } = await client
    .from("events")
    .select("*")
    .eq("user_id", userId)
    .gte("occurred_at", start.toISOString())
    .lt("occurred_at", end.toISOString())
    .order("occurred_at", { ascending: false });

  if (error) throw error;
  return (data ?? []).map(mapEventRow);
}

export async function fetchLatestSleepPhase(
  client: Client,
  userId: string,
  excludedEventId?: string
): Promise<BabyEvent | null> {
  let query = client
    .from("events")
    .select("*")
    .eq("user_id", userId)
    .in("type", ["sleep", "wake_up"])
    .order("occurred_at", { ascending: false })
    .limit(1);

  if (excludedEventId) query = query.neq("id", excludedEventId);

  const { data, error } = await query;
  if (error) throw error;
  return data?.[0] ? mapEventRow(data[0]) : null;
}

export async function createEvent(
  client: Client,
  userId: string,
  input: EventInput
): Promise<BabyEvent> {
  if (input.type === "sleep" || input.type === "wake_up") {
    const latest = await fetchLatestSleepPhase(client, userId);
    assertValidSleepSequence(latest ? [latest] : [], input.type);
  }

  const { data, error } = await client
    .from("events")
    .insert(toEventInsert(userId, input))
    .select("*")
    .single();

  if (error) throw error;
  return mapEventRow(data);
}

export async function updateEventTime(
  client: Client,
  userId: string,
  event: BabyEvent,
  occurredAt: Date
): Promise<BabyEvent> {
  if (event.type === "sleep" || event.type === "wake_up") {
    const latest = await fetchLatestSleepPhase(client, userId, event.id);
    assertValidSleepSequence(
      latest ? [latest] : [],
      event.type
    );
  }

  const { data, error } = await client
    .from("events")
    .update({
      occurred_at: occurredAt.toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", event.id)
    .eq("user_id", userId)
    .select("*")
    .single();

  if (error) throw error;
  return mapEventRow(data);
}

export async function deleteEvent(client: Client, userId: string, eventId: string): Promise<void> {
  const { error } = await client
    .from("events")
    .delete()
    .eq("id", eventId)
    .eq("user_id", userId);

  if (error) throw error;
}
