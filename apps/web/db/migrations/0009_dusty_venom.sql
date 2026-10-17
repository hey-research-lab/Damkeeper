ALTER TABLE "staking_pools" ADD COLUMN "reward_rate" numeric(78, 0);--> statement-breakpoint
ALTER TABLE "staking_pools" ADD COLUMN "period_finish" bigint;