ALTER TABLE "token_usage_ledger_events" ADD COLUMN "team_name" TEXT;
ALTER TABLE "token_usage_ledger_events" ADD COLUMN "agent_name" TEXT;
ALTER TABLE "token_usage_ledger_events" ADD COLUMN "run_summary" TEXT;
ALTER TABLE "token_usage_ledger_events" ADD COLUMN "run_created_at" DATETIME;
ALTER TABLE "token_usage_ledger_events" ADD COLUMN "member_name" TEXT;
