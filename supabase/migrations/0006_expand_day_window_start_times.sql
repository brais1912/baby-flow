ALTER TABLE "user_settings"
	DROP CONSTRAINT "user_settings_day_window_start_minutes_allowed";
--> statement-breakpoint
ALTER TABLE "user_settings"
	ADD CONSTRAINT "user_settings_day_window_start_minutes_allowed"
	CHECK ("day_window_start_minutes" IN (0, 480, 540, 600, 660, 720, 1200, 1260, 1320, 1380));
