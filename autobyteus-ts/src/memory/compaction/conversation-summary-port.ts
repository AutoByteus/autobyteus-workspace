import type { Message } from '../../llm/utils/messages.js';
import type { CompactionExecutionMetadata } from './compaction-execution.js';

/** Identity of one summary attempt; also names its isolated provider conversation and usage event. */
export type SummaryRequestIdentity = Readonly<{
  operationId: string;
  executionTurnId: string;
  /** 1-based and unique across all attempts of one compaction operation. */
  attempt: number;
}>;

export type SummaryAttemptResult = Readonly<{
  content: string;
  hasToolCalls: boolean;
  metadata: CompactionExecutionMetadata;
}>;

/**
 * The agent's request capability, given to compaction by the agent loop. Compaction never
 * holds the LLM, the tools or the notifier; it only asks for summary requests. Each request
 * is exactly one provider call on an isolated provider conversation that is released after
 * the attempt, and its usage is reported to the agent run. A failed call throws.
 */
export interface ConversationSummaryPort {
  /** Whether the agent's model selects the cached summary request; otherwise only the transcript request is used. */
  usesCachedSummary(): boolean;
  /** The agent's conversation request for `messages` (unchanged, cacheable) plus one appended user `instruction`. */
  requestCachedSummary(messages: readonly Message[], instruction: string,
    identity: SummaryRequestIdentity, signal: AbortSignal): Promise<SummaryAttemptResult>;
  /** A one-shot request on the agent's model: `systemPrompt` plus `content`, without tools or caching. */
  requestTranscriptSummary(systemPrompt: string, content: string,
    identity: SummaryRequestIdentity, signal: AbortSignal): Promise<SummaryAttemptResult>;
  /** Whether the cached request (`messages` + an appended `extraText` user message) fits the model's input budget. */
  fitsInputBudget(messages: readonly Message[], extraText: string): boolean;
}
