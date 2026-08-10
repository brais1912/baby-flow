ALTER TABLE "events" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY "Users can read their own events" ON "events"
	FOR SELECT
	USING (auth.uid() = "user_id");
--> statement-breakpoint
CREATE POLICY "Users can insert their own events" ON "events"
	FOR INSERT
	WITH CHECK (auth.uid() = "user_id");
--> statement-breakpoint
CREATE POLICY "Users can update their own events" ON "events"
	FOR UPDATE
	USING (auth.uid() = "user_id")
	WITH CHECK (auth.uid() = "user_id");
--> statement-breakpoint
CREATE POLICY "Users can delete their own events" ON "events"
	FOR DELETE
	USING (auth.uid() = "user_id");