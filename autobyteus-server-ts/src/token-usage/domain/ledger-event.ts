import type { TokenUsageUpdatedPayload } from "../../agent-execution/domain/agent-run-token-usage.js";

export type TokenUsageLedgerEvent = TokenUsageUpdatedPayload & {
  persisted_at?: string | null;
};

export type TokenUsageLedgerSummary = {
  runId?: string | null;
  events: TokenUsageLedgerEvent[];
};
