import { setTimeout as delay } from 'node:timers/promises';
import type { Message } from '../../llm/utils/messages.js';
import { COMPACTION_SUMMARY_INSTRUCTION, COMPACTION_SUMMARY_PROMPT } from './compaction-summary-prompt.js';
import { parseCompactionSummary } from './compaction-summary-parser.js';
import {
  CompactionInvocationError,
  type CompactionExecutionMetadata,
  type CompactionSummaryMode,
  type CompressionAttemptObservation,
} from './compaction-execution.js';
import type { ConversationSummaryPort, SummaryAttemptResult, SummaryRequestIdentity } from './conversation-summary-port.js';

export const CACHED_SUMMARY_ATTEMPTS = 2;
export const TRANSCRIPT_SUMMARY_ATTEMPTS = 3;

export type CompactionSummaryInput = Readonly<{
  /** The compaction baseline: the settled conversation the agent would send next. */
  baselineMessages: readonly Message[];
  /** The rendered compactable history, used only by the transcript fallback. */
  transcriptContent: string;
  operationId: string;
  executionTurnId: string;
  signal: AbortSignal;
  observe?: (event: CompressionAttemptObservation) => void;
}>;

type Wait = (ms: number, signal: AbortSignal) => Promise<unknown>;

/**
 * Produces the compaction summary on the agent's own model through its `ConversationSummaryPort`.
 * First the cached summary request (the agent's conversation + one instruction), up to
 * `CACHED_SUMMARY_ATTEMPTS`, unless it would not fit the input budget. Then the transcript
 * request, up to `TRANSCRIPT_SUMMARY_ATTEMPTS`. A response without exactly one valid summary
 * block (including tool calls or a task answer) is a failed attempt.
 */
export class CompactionSummarizer {
  constructor(private readonly port: ConversationSummaryPort,
    private readonly wait: Wait = (ms, signal) => delay(ms, undefined, { signal })) {}

  async summarize(input: CompactionSummaryInput): Promise<string> {
    const { signal } = input;
    let attempt = 0;
    if (this.port.fitsInputBudget(input.baselineMessages, COMPACTION_SUMMARY_INSTRUCTION)) {
      for (let round = 1; round <= CACHED_SUMMARY_ATTEMPTS; round++) {
        signal.throwIfAborted();
        try {
          return await this.attempt(input, ++attempt, 'cached');
        } catch (error) {
          if (signal.aborted) throw error;
        }
      }
    }
    for (let round = 1; round <= TRANSCRIPT_SUMMARY_ATTEMPTS; round++) {
      signal.throwIfAborted();
      try {
        return await this.attempt(input, ++attempt, 'transcript');
      } catch (error) {
        if (signal.aborted || round === TRANSCRIPT_SUMMARY_ATTEMPTS) throw error;
        await this.wait(round * 1000, signal);
      }
    }
    throw new Error('Unreachable compaction summary attempt.');
  }

  private async attempt(input: CompactionSummaryInput, attempt: number, mode: CompactionSummaryMode): Promise<string> {
    const identity: SummaryRequestIdentity = { operationId: input.operationId, executionTurnId: input.executionTurnId, attempt };
    let execution: CompactionExecutionMetadata | null = null;
    this.observe(input, { attempt, mode, outcome: 'started' });
    try {
      const result: SummaryAttemptResult = mode === 'cached'
        ? await this.port.requestCachedSummary(input.baselineMessages, COMPACTION_SUMMARY_INSTRUCTION, identity, input.signal)
        : await this.port.requestTranscriptSummary(COMPACTION_SUMMARY_PROMPT, input.transcriptContent, identity, input.signal);
      execution = result.metadata;
      input.signal.throwIfAborted();
      if (result.hasToolCalls) {
        throw new CompactionInvocationError('summary_tool_call', 'The summary request answered with tool calls.');
      }
      if (result.metadata.completionStatus === 'incomplete') {
        throw new CompactionInvocationError('incomplete_summary', 'Provider reported incomplete compaction output.');
      }
      const body = parseCompactionSummary(result.content);
      this.observe(input, { attempt, mode, outcome: 'succeeded', execution });
      return body;
    } catch (error) {
      execution ??= error instanceof CompactionInvocationError ? error.execution : null;
      const failure = new CompactionInvocationError(input.signal.aborted ? 'cancelled'
        : (error as { code?: string })?.code ?? 'generation_failure',
        error instanceof Error ? error.message : String(error), execution, error);
      this.observe(input, { attempt, mode, outcome: 'failed', ...(execution ? { execution } : {}), code: failure.code });
      throw failure;
    }
  }

  private observe(input: CompactionSummaryInput, event: CompressionAttemptObservation): void {
    try { input.observe?.(event); } catch { /* Diagnostics never alter attempt success/count. */ }
  }
}
