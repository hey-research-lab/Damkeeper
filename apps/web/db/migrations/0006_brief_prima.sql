CREATE TABLE IF NOT EXISTS "project_launches" (
	"chain_id" integer NOT NULL,
	"token_address" text NOT NULL,
	"creator_address" text NOT NULL,
	"factory_address" text NOT NULL,
	"source" text NOT NULL,
	"launch_tx_hash" text NOT NULL,
	"launch_block" bigint NOT NULL,
	"log_index" integer NOT NULL,
	"launched_at" bigint NOT NULL,
	"pair_address" text,
	"liquidity_token" text,
	"status" text DEFAULT 'pending' NOT NULL,
	"metadata_status" text DEFAULT 'pending' NOT NULL,
	CONSTRAINT "project_launches_chain_id_launch_tx_hash_log_index_pk" PRIMARY KEY("chain_id","launch_tx_hash","log_index")
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "project_launches_by_token" ON "project_launches" USING btree ("chain_id","token_address");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "project_launches_by_creator" ON "project_launches" USING btree ("chain_id","creator_address");