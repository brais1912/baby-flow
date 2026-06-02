import { pgTable, text, timestamp, uuid, real, pgEnum } from "drizzle-orm/pg-core";

export const eventTypeEnum = pgEnum("event_type", ["sleep", "feeding", "diaper"]);
export const sleepMethodEnum = pgEnum("sleep_method", ["pacifier", "held", "rocking", "self", "nursing", "other"]);
export const sleepConditionEnum = pgEnum("sleep_condition", ["sleep_sack", "pajamas", "swaddle", "other"]);
export const diaperTypeEnum = pgEnum("diaper_type", ["pee", "poop", "both"]);
export const feedingTypeEnum = pgEnum("feeding_type", ["breast_left", "breast_right", "bottle", "formula", "solid"]);

export const events = pgTable("events", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull(),
  type: eventTypeEnum("type").notNull(),
  occurredAt: timestamp("occurred_at", { withTimezone: true }).notNull(),
  notes: text("notes"),

  // Sleep fields
  sleepMethod: sleepMethodEnum("sleep_method"),
  sleepCondition: sleepConditionEnum("sleep_condition"),
  sleepRoomTemperature: real("sleep_room_temperature"),
  sleepWokeUpAt: timestamp("sleep_woke_up_at", { withTimezone: true }),

  // Feeding fields
  feedingType: feedingTypeEnum("feeding_type"),
  feedingAmountMl: real("feeding_amount_ml"),
  feedingDurationMinutes: real("feeding_duration_minutes"),

  // Diaper fields
  diaperType: diaperTypeEnum("diaper_type"),

  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export type Event = typeof events.$inferSelect;
export type NewEvent = typeof events.$inferInsert;
