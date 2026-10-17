CREATE TABLE IF NOT EXISTS "referrals" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"referral_code" text NOT NULL,
	"chain_id" integer NOT NULL,
	"project_token" text NOT NULL,
	"project_owner" text,
	"scout_address" text NOT NULL,
	"status" text DEFAULT 'created' NOT NULL,
	"referral_id_hash" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"accepted_at" timestamp with time zone,
	"expires_at" timestamp with time zone,
	"acceptance_tx_hash" text,
	CONSTRAINT "referrals_referral_code_unique" UNIQUE("referral_code"),
	CONSTRAINT "referrals_referral_id_hash_unique" UNIQUE("referral_id_hash")
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "referrals_by_token" ON "referrals" USING btree ("chain_id","project_token");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "referrals_by_scout" ON "referrals" USING btree ("chain_id","scout_address");