CREATE TYPE "public"."diaper_type" AS ENUM('pee', 'poop', 'both');--> statement-breakpoint
CREATE TYPE "public"."event_type" AS ENUM('sleep', 'feeding', 'diaper');--> statement-breakpoint
CREATE TYPE "public"."feeding_type" AS ENUM('breast_left', 'breast_right', 'bottle', 'formula', 'solid');--> statement-breakpoint
CREATE TYPE "public"."sleep_condition" AS ENUM('sleep_sack', 'pajamas', 'swaddle', 'other');--> statement-breakpoint
CREATE TYPE "public"."sleep_method" AS ENUM('pacifier', 'held', 'rocking', 'self', 'nursing', 'other');--> statement-breakpoint
CREATE TABLE "events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"type" "event_type" NOT NULL,
	"occurred_at" timestamp with time zone NOT NULL,
	"notes" text,
	"sleep_method" "sleep_method",
	"sleep_condition" "sleep_condition",
	"sleep_room_temperature" real,
	"sleep_woke_up_at" timestamp with time zone,
	"feeding_type" "feeding_type",
	"feeding_amount_ml" real,
	"feeding_duration_minutes" real,
	"diaper_type" "diaper_type",
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
