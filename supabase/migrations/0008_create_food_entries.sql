CREATE TYPE "public"."food_category" AS ENUM('fruit', 'vegetable', 'cereal', 'protein', 'dairy', 'other');--> statement-breakpoint
CREATE TABLE "food_entries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"name" text NOT NULL,
	"category" "food_category" DEFAULT 'other' NOT NULL,
	"amount" text,
	"eaten_at" timestamp with time zone NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "food_entries" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY "Users can read their own food entries" ON "food_entries"
	FOR SELECT
	USING (auth.uid() = "user_id");
--> statement-breakpoint
CREATE POLICY "Users can insert their own food entries" ON "food_entries"
	FOR INSERT
	WITH CHECK (auth.uid() = "user_id");
--> statement-breakpoint
CREATE POLICY "Users can update their own food entries" ON "food_entries"
	FOR UPDATE
	USING (auth.uid() = "user_id")
	WITH CHECK (auth.uid() = "user_id");
--> statement-breakpoint
CREATE POLICY "Users can delete their own food entries" ON "food_entries"
	FOR DELETE
	USING (auth.uid() = "user_id");