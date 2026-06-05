"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db/client";
import { events, type NewEvent } from "@/lib/db/schema";
import { createClient } from "@/lib/supabase/server";
import { eq, and, gte, lte, desc } from "drizzle-orm";

async function getAuthenticatedUserId(): Promise<string> {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) throw new Error("Unauthorized");
  return user.id;
}

export async function createEvent(data: Omit<NewEvent, "id" | "userId" | "createdAt" | "updatedAt">) {
  const userId = await getAuthenticatedUserId();

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
