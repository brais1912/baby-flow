import { describe, it, expect } from "vitest";
import type { FoodEntry } from "@/lib/db/schema";
import {
  validateFoodEntryInput,
  groupFoodEntriesByDay,
  MAX_FOOD_NAME_LENGTH,
  MAX_FOOD_AMOUNT_LENGTH,
  MAX_FOOD_NOTES_LENGTH,
} from "./food";

function makeEntry(overrides: Partial<FoodEntry>): FoodEntry {
  return {
    id: crypto.randomUUID(),
    userId: "user-1",
    name: "Banana",
    category: "fruit",
    amount: null,
    eatenAt: new Date("2026-06-15T10:00:00"),
    notes: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

describe("validateFoodEntryInput", () => {
  it("accepts a minimal valid input and normalizes empty optionals to undefined", () => {
    const result = validateFoodEntryInput({ name: "  Banana  ", eatenAt: new Date("2026-06-15T10:00:00") });

    expect(result).toMatchObject({
      ok: true,
      data: { name: "Banana", category: "other", amount: undefined, notes: undefined },
    });
  });

  it("preserves trimmed optional fields", () => {
    const result = validateFoodEntryInput({
      name: "Oat porridge",
      category: "cereal",
      amount: " 1/2 bowl ",
      notes: " Loved it ",
      eatenAt: new Date("2026-06-15T10:00:00"),
    });

    expect(result.ok && result.data).toMatchObject({
      name: "Oat porridge",
      category: "cereal",
      amount: "1/2 bowl",
      notes: "Loved it",
    });
  });

  it("rejects when name is empty or whitespace-only", () => {
    for (const name of ["", "   "]) {
      const result = validateFoodEntryInput({ name, eatenAt: new Date() });
      expect(result.ok).toBe(false);
    }
  });

  it("rejects when name exceeds the max length", () => {
    const result = validateFoodEntryInput({
      name: "x".repeat(MAX_FOOD_NAME_LENGTH + 1),
      eatenAt: new Date(),
    });

    expect(result.ok).toBe(false);
  });

  it("rejects an invalid eatenAt value", () => {
    const result = validateFoodEntryInput({ name: "Banana", eatenAt: new Date("not-a-date") });
    expect(result.ok).toBe(false);
  });

  it("accepts an ISO string eatenAt", () => {
    const result = validateFoodEntryInput({ name: "Banana", eatenAt: new Date("2026-06-15T10:00:00") });
    expect(result.ok).toBe(true);
  });

  it("rejects an unknown category", () => {
    const result = validateFoodEntryInput({
      name: "Banana",
      category: "sushi" as never,
      eatenAt: new Date(),
    });

    expect(result.ok).toBe(false);
  });

  it("rejects amount longer than the max length", () => {
    const result = validateFoodEntryInput({
      name: "Banana",
      amount: "x".repeat(MAX_FOOD_AMOUNT_LENGTH + 1),
      eatenAt: new Date(),
    });

    expect(result.ok).toBe(false);
  });

  it("rejects notes longer than the max length", () => {
    const result = validateFoodEntryInput({
      name: "Banana",
      notes: "x".repeat(MAX_FOOD_NOTES_LENGTH + 1),
      eatenAt: new Date(),
    });

    expect(result.ok).toBe(false);
  });
});

describe("groupFoodEntriesByDay", () => {
  const monday = makeEntry({ eatenAt: new Date(2026, 5, 15, 9, 0) });
  const mondayEvening = makeEntry({ eatenAt: new Date(2026, 5, 15, 20, 0), name: "Apple" });
  const sunday = makeEntry({ eatenAt: new Date(2026, 5, 14, 18, 0), name: "Carrot" });

  it("groups entries by local calendar day", () => {
    const groups = groupFoodEntriesByDay([monday, mondayEvening, sunday]);

    expect(groups).toHaveLength(2);
    expect(groups[0].date).toEqual(new Date(2026, 5, 15));
    expect(groups[0].items.map((e) => e.name)).toEqual(["Apple", "Banana"]);
    expect(groups[1].date).toEqual(new Date(2026, 5, 14));
    expect(groups[1].items.map((e) => e.name)).toEqual(["Carrot"]);
  });

  it("sorts groups newest day first", () => {
    const groups = groupFoodEntriesByDay([sunday, monday]);

    expect(groups.map((g) => g.date.getTime())).toEqual([
      new Date(2026, 5, 15).getTime(),
      new Date(2026, 5, 14).getTime(),
    ]);
  });

  it("sorts items within a day newest time first", () => {
    const groups = groupFoodEntriesByDay([monday, mondayEvening]);
    expect(groups[0].items.map((e) => e.name)).toEqual(["Apple", "Banana"]);
  });

  it("returns an empty array for no entries", () => {
    expect(groupFoodEntriesByDay([])).toEqual([]);
  });

  it("uses local date parts, so the day key is not shifted by UTC serialization", () => {
    const lateLocal = makeEntry({ eatenAt: new Date(2026, 5, 15, 23, 30) });
    const groups = groupFoodEntriesByDay([lateLocal]);

    expect(groups[0].date).toEqual(new Date(2026, 5, 15));
  });
});