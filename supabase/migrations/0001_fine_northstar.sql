ALTER TYPE "public"."event_type" ADD VALUE 'wake_up' BEFORE 'feeding';--> statement-breakpoint
ALTER TABLE "events" DROP COLUMN "sleep_woke_up_at";