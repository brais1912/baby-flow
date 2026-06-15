CREATE TABLE "user_settings" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"day_window_start_minutes" integer DEFAULT 720 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "user_settings_day_window_start_minutes_allowed" CHECK ("day_window_start_minutes" IN (0, 480, 540, 600, 660, 720))
);
--> statement-breakpoint
ALTER TABLE "user_settings" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY "Users can read their own settings" ON "user_settings"
	FOR SELECT
	USING (auth.uid() = "user_id");
--> statement-breakpoint
CREATE POLICY "Users can insert their own settings" ON "user_settings"
	FOR INSERT
	WITH CHECK (auth.uid() = "user_id");
--> statement-breakpoint
CREATE POLICY "Users can update their own settings" ON "user_settings"
	FOR UPDATE
	USING (auth.uid() = "user_id")
	WITH CHECK (auth.uid() = "user_id");
