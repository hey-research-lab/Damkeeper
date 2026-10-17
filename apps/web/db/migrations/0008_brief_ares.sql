CREATE TABLE IF NOT EXISTS "conversions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"referral_id" uuid NOT NULL,
	"kind" text NOT NULL,
	"chain_id" integer NOT NULL,
	"manager_address" text NOT NULL,
	"position_id" bigint NOT NULL,
	"status" text DEFAULT 'verified' NOT NULL,
	"rejection_reason" text,
	"reward_points" integer DEFAULT 0 NOT NULL,
	"policy_version" text DEFAULT 'v1' NOT NULL,
	"detected_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "conversions_by_position_unique" ON "conversions" USING btree ("chain_id","manager_address","position_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "conversions_by_referral" ON "conversions" USING btree ("referral_id");