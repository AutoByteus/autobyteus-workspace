import type { CompleteResponse } from '../../llm/utils/response-types.js';
import type { LlmTokenUsageObservation } from '../../llm/utils/llm-token-usage-observation.js';

/** `cached`: the agent's own conversation request plus the summary instruction. `transcript`: the fallback. */
export type CompactionSummaryMode = 'cached' | 'transcript';

export type CompactionExecutionMetadata = Readonly<{
  mode: CompactionSummaryMode;
  modelIdentifier: string;
  provider: string;
  invocationId: string;
  completionStatus: CompleteResponse['completionStatus'];
  completionReason: string | null;
  usage: LlmTokenUsageObservation | null;
}>;

export class CompactionInvocationError extends Error {
  constructor(readonly code: string, message: string,
    readonly execution: CompactionExecutionMetadata | null = null,
    readonly cause: unknown = null) {
    super(message); this.name = 'CompactionInvocationError';
  }
}

export type CompressionAttemptObservation = Readonly<{
  attempt: number;
  mode: CompactionSummaryMode;
  outcome: 'started' | 'succeeded' | 'failed';
  execution?: CompactionExecutionMetadata;
  code?: string;
}>;
