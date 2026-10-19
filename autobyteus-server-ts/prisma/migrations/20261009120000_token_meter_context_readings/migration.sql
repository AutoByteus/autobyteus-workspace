-- Runtime-reported compaction threshold for the latest context reading (token-meter-accuracy D-7).
ALTER TABLE "token_usage_run_records" ADD COLUMN "context_compaction_threshold_tokens" BIGINT;

-- Claude Agent SDK readings written before this release summed every model call of a turn
-- (DEC-005). They cannot be recomputed, so they are cleared. Totals and costs stay untouched.
UPDATE "token_usage_run_records"
SET "latest_prompt_tokens" = NULL,
    "effective_context_window_tokens" = NULL,
    "context_window_usage_percent" = NULL
WHERE "latest_runtime_kind" = 'claude_agent_sdk';
