"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db/client";
import { foodEntries, type FoodEntry } from "@/lib/db/schema";
import { createClient } from "@/lib/supabase/server";
import { and, eq, desc } from "drizzle-orm";
import { validateFoodEntryInput, type ValidatedFoodInput } from "@/lib/utils/food";
import type { FoodEntryInput } from "@/types/foods";

async function getAuthenticatedUserId(): Promise<string> {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) throw new Error("Unauthorized");
  return user.id;
}

function assertValidatedInput(
  input: FoodEntryInput
): ValidatedFoodInput {
  const result = validateFoodEntryInput(input);
  if (!result.ok) throw new Error(result.error);
  return result.data;
}

export async function createFoodEntry(input: FoodEntryInput) {
  const userId = await getAuthenticatedUserId();
  const data = assertValidatedInput(input);

  await db.insert(foodEntries).values({
    userId,
    name: data.name,
    category: data.category,
    amount: data.amount,
    eatenAt: data.eatenAt,
    notes: data.notes,
  });
  revalidatePath("/", "layout");
}

export async function updateFoodEntry(entryId: string, input: FoodEntryInput) {
  const userId = await getAuthenticatedUserId();
  const data = assertValidatedInput(input);

  await db
    .update(foodEntries)
    .set({
      name: data.name,
      category: data.category,
      amount: data.amount,
      eatenAt: data.eatenAt,
      notes: data.notes,
      updatedAt: new Date(),
    })
    .where(and(eq(foodEntries.id, entryId), eq(foodEntries.userId, userId)));
  revalidatePath("/", "layout");
}

export async function deleteFoodEntry(entryId: string) {
  const userId = await getAuthenticatedUserId();

  await db.delete(foodEntries).where(
    and(eq(foodEntries.id, entryId), eq(foodEntries.userId, userId))
  );
  revalidatePath("/", "layout");
}

export async function getFoodEntries(): Promise<FoodEntry[]> {
  const userId = await getAuthenticatedUserId();

  return db.query.foodEntries.findMany({
    where: eq(foodEntries.userId, userId),
    orderBy: [desc(foodEntries.eatenAt)],
  });
}