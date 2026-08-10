export const FOOD_CATEGORIES = ["fruit", "vegetable", "cereal", "protein", "dairy", "other"] as const;

export type FoodCategory = (typeof FOOD_CATEGORIES)[number];

export interface FoodEntryInput {
  name: string;
  category?: FoodCategory;
  amount?: string;
  eatenAt: Date;
  notes?: string;
}

export function isFoodCategory(value: string): value is FoodCategory {
  return (FOOD_CATEGORIES as readonly string[]).includes(value);
}