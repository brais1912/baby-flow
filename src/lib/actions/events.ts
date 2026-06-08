"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db/client";
import { events, type NewEvent } from "@/lib/db/schema";
import { createClient } from "@/lib/supabase/server";
import { INVALID_SLEEP_SEQUENCE_PREFIX } from "@/types/events";
import { eq, and, or, gte, lte, desc } from "drizzle-orm";

async function getAuthenticatedUserId(): Promise<string> {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) throw new Error("Unauthorized");
  return user.id;
}

async function assertValidSleepSequence(userId: string, type: "sleep" | "wake_up") {
  const lastSleepPhaseEvent = await db.query.events.findFirst({
    where: and(eq(events.userId, userId), or(eq(events.type, "sleep"), eq(events.type, "wake_up"))),
    orderBy: [desc(events.occurredAt)],
  });

  if (lastSleepPhaseEvent?.type === type) {
    throw new Error(`${INVALID_SLEEP_SEQUENCE_PREFIX}${type}`);
  }
}

export async function createEvent(data: Omit<NewEvent, "id" | "userId" | "createdAt" | "updatedAt">) {
  const userId = await getAuthenticatedUserId();

  if (data.type === "sleep" || data.type === "wake_up") {
    await assertValidSleepSequence(userId, data.type);
  }

  await db.insert(events).values({ ...data, userId });
  revalidatePath("/", "layout");
}

export async function deleteEvent(eventId: string) {
  const userId = await getAuthenticatedUserId();

  await db.delete(events).where(
    and(eq(events.id, eventId), eq(events.userId, userId))
  );
  revalidatePath("/", "layout");
}

export async function getEventsForDateRange(startDate: Date, endDate: Date) {
  const userId = await getAuthenticatedUserId();

  return db.query.events.findMany({
    where: and(
      eq(events.userId, userId),
      gte(events.occurredAt, startDate),
      lte(events.occurredAt, endDate)
    ),
    orderBy: [desc(events.occurredAt)],
  });
}

export async function getRecentEvents(limit = 20) {
  const userId = await getAuthenticatedUserId();

  return db.query.events.findMany({
    where: eq(events.userId, userId),
    orderBy: [desc(events.occurredAt)],
    limit,
  });
}
