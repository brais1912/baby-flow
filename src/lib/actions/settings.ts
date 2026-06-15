"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db/client";
import { userSettings } from "@/lib/db/schema";
import { createClient } from "@/lib/supabase/server";
import { DEFAULT_DAY_WINDOW_START_MINUTES, isValidDayWindowStartMinutes } from "@/lib/utils/format";
import { eq } from "drizzle-orm";

async function getAuthenticatedUserId(): Promise<string> {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) throw new Error("Unauthorized");
  return user.id;
}

function isMissingSettingsTableError(err: unknown): boolean {
  if (!err || typeof err !== "object") return false;
  if ("code" in err && err.code === "42P01") return true;
  if ("cause" in err && isMissingSettingsTableError(err.cause)) return true;
  return err instanceof Error && err.message.includes('relation "user_settings" does not exist');
}

export async function getDayWindowStartMinutes(): Promise<number> {
  const userId = await getAuthenticatedUserId();
  let settings: { dayWindowStartMinutes: number } | undefined;

  try {
    settings = await db.query.userSettings.findFirst({
      where: eq(userSettings.userId, userId),
      columns: { dayWindowStartMinutes: true },
    });
  } catch (err) {
    if (!isMissingSettingsTableError(err)) throw err;
  }

  return settings && isValidDayWindowStartMinutes(settings.dayWindowStartMinutes)
    ? settings.dayWindowStartMinutes
    : DEFAULT_DAY_WINDOW_START_MINUTES;
}

export async function updateDayWindowStartMinutes(dayWindowStartMinutes: number): Promise<{ persisted: boolean }> {
  const userId = await getAuthenticatedUserId();
  if (!isValidDayWindowStartMinutes(dayWindowStartMinutes)) {
    throw new Error("Invalid day window start time");
  }

  try {
    await db
      .insert(userSettings)
      .values({ userId, dayWindowStartMinutes })
      .onConflictDoUpdate({
        target: userSettings.userId,
        set: { dayWindowStartMinutes, updatedAt: new Date() },
      });
  } catch (err) {
    if (!isMissingSettingsTableError(err)) throw err;
    return { persisted: false };
  }

  revalidatePath("/", "layout");
  return { persisted: true };
}
