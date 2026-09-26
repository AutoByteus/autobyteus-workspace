import type { CompleteResponse } from '../../llm/utils/response-types.js';
import type { LlmTokenUsageObservation } from '../../llm/utils/llm-token-usage-observation.js';

export type CompactionExecutionMetadata = Readonly<{
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
