import type { FoodEntry } from "@/lib/db/schema";
import { isFoodCategory, type FoodCategory, type FoodEntryInput } from "@/types/foods";

export const MAX_FOOD_NAME_LENGTH = 60;
export const MAX_FOOD_AMOUNT_LENGTH = 40;
export const MAX_FOOD_NOTES_LENGTH = 280;

export interface ValidatedFoodInput {
  name: string;
  category: FoodCategory;
  amount?: string;
  eatenAt: Date;
  notes?: string;
}

export type FoodValidationResult =
  | { ok: true; data: ValidatedFoodInput }
  | { ok: false; error: string };

export function validateFoodEntryInput(input: FoodEntryInput): FoodValidationResult {
  const name = input.name.trim();
  if (!name) return { ok: false, error: "name is required" };
  if (name.length > MAX_FOOD_NAME_LENGTH) return { ok: false, error: `name must be ${MAX_FOOD_NAME_LENGTH} characters or fewer` };

  const eatenAt = input.eatenAt instanceof Date ? input.eatenAt : new Date(input.eatenAt);
  if (Number.isNaN(eatenAt.getTime())) return { ok: false, error: "eatenAt must be a valid date" };

  const category = input.category ?? "other";
  if (!isFoodCategory(category)) return { ok: false, error: "invalid category" };

  const amount = input.amount?.trim() || undefined;
  if (amount && amount.length > MAX_FOOD_AMOUNT_LENGTH) {
    return { ok: false, error: `amount must be ${MAX_FOOD_AMOUNT_LENGTH} characters or fewer` };
  }

  const notes = input.notes?.trim() || undefined;
  if (notes && notes.length > MAX_FOOD_NOTES_LENGTH) {
    return { ok: false, error: `notes must be ${MAX_FOOD_NOTES_LENGTH} characters or fewer` };
  }

  return { ok: true, data: { name, category, amount, eatenAt, notes } };
}

export interface FoodDayGroup {
  date: Date;
  items: FoodEntry[];
}

function localDayKey(date: Date): string {
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
}

export function groupFoodEntriesByDay(entries: FoodEntry[]): FoodDayGroup[] {
  const byDay = new Map<string, { date: Date; items: FoodEntry[] }>();

  for (const entry of entries) {
    const date = new Date(entry.eatenAt);
    const key = localDayKey(date);
    const group = byDay.get(key);
    if (group) {
      group.items.push(entry);
    } else {
      byDay.set(key, { date: new Date(date.getFullYear(), date.getMonth(), date.getDate()), items: [entry] });
    }
  }

  return [...byDay.values()]
    .sort((a, b) => b.date.getTime() - a.date.getTime())
    .map((group) => ({
      date: group.date,
      items: group.items.sort(
        (a, b) => new Date(b.eatenAt).getTime() - new Date(a.eatenAt).getTime()
      ),
    }));
}