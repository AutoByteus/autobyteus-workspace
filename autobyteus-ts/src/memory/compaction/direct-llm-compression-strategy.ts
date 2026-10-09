import { randomUUID } from 'node:crypto';
import { setTimeout as delay } from 'node:timers/promises';
import type { BaseLLM } from '../../llm/base.js';
import { Message, MessageRole } from '../../llm/utils/messages.js';
import { resolveLlmRequestCapacity } from '../../agent/token-budget.js';
import { estimateMessagesTokens } from './message-budget-strategy.js';
import { COMPACTION_SUMMARY_PROMPT } from './compaction-summary-prompt.js';
import { parseCompactionSummary } from './compaction-summary-parser.js';
import { CompactionInvocationError, type CompactionExecutionMetadata,
  type CompactionCompressionExecution, type CompressionAttemptObservation } from './compaction-execution.js';
import type { CompressionStrategy } from './compression-strategy.js';

export type CompactionLlmFactory = (input: { parentModelIdentifier: string }) => Promise<BaseLLM>;

/** One operation; three total attempts. The host never retries this call. */
export class DirectLlmCompressionStrategy implements CompressionStrategy {
  constructor(private readonly createLlm: CompactionLlmFactory,
    private readonly execution: CompactionCompressionExecution) {}

  async compress(content: string): Promise<string> {
    const { signal } = this.execution;
    for (let attempt = 1; attempt <= 3; attempt++) {
      signal.throwIfAborted();
      try {
        return await this.attempt(content, attempt);
      } catch (error) {
        if (signal.aborted || attempt === 3) throw error;
        await delay(attempt * 1000, undefined, { signal });
      }
    }
    throw new Error('Unreachable compression attempt.');
  }

  private async attempt(content: string, attempt: number): Promise<string> {
    const { signal, getParentModelIdentifier, executionTurnId } = this.execution;
    let llm: BaseLLM | null = null;
    let execution: CompactionExecutionMetadata | null = null;
    this.observe({ attempt, outcome: 'started' });
    try {
      signal.throwIfAborted();
      llm = await this.createLlm({ parentModelIdentifier: getParentModelIdentifier() });
      execution = {
        modelIdentifier: llm.model.modelIdentifier, provider: String(llm.model.provider),
        invocationId: `compaction_${randomUUID()}`, completionStatus: 'unknown',
        completionReason: null, usage: null,
      };
      signal.throwIfAborted();
      const messages = [
        new Message(MessageRole.SYSTEM, { content: COMPACTION_SUMMARY_PROMPT }),
        new Message(MessageRole.USER, { content }),
      ];
      const capacity = resolveLlmRequestCapacity(llm.model, llm.config);
      if (!capacity) throw new CompactionInvocationError('input_capacity_unavailable', 'Compactor input capacity is unavailable.');
      if (estimateMessagesTokens(messages) > capacity.inputBudget) {
        throw new CompactionInvocationError('input_budget_exceeded', 'Selected compaction history exceeds the compactor input budget.');
      }
      const response = await llm.sendMessages(messages,
        { logicalConversationId: execution.invocationId },
        { signal, turnId: executionTurnId, retryMode: 'single_attempt' });
      signal.throwIfAborted();
      execution = { ...execution, completionStatus: response.completionStatus,
        completionReason: response.completionReason, usage: response.usage };
      if (response.completionStatus === 'incomplete') {
        throw new CompactionInvocationError('incomplete_summary', 'Provider reported incomplete compaction output.');
      }
      const body = parseCompactionSummary(response.content);
      this.observe({ attempt, outcome: 'succeeded', execution });
      return body;
    } catch (error) {
      const failure = new CompactionInvocationError(signal.aborted ? 'cancelled' :
        (error as { code?: string })?.code ?? 'generation_failure',
        error instanceof Error ? error.message : String(error), execution, error);
      this.observe({ attempt, outcome: 'failed', ...(execution ? { execution } : {}), code: failure.code });
      throw failure;
    } finally {
      if (llm) await this.cleanup(llm, execution?.invocationId);
    }
  }

  private observe(event: CompressionAttemptObservation): void {
    try { this.execution.observe?.(event); } catch { /* Diagnostics never alter attempt success/count. */ }
  }

  private async cleanup(llm: BaseLLM, invocationId?: string): Promise<void> {
    const controller = new AbortController();
    let timeout: ReturnType<typeof setTimeout> | undefined;
    try {
      // Bound even an embedding implementation that ignores its cleanup signal.
      await Promise.race([
        llm.cleanup({ signal: controller.signal }),
        new Promise<never>((_, reject) => { timeout = setTimeout(() => {
          controller.abort(); reject(new Error('Compaction cleanup timed out.'));
        }, 10_000); }),
      ]);
    } catch {
      try { console.warn('Compaction isolated LLM cleanup failed.', { invocationId }); }
      catch { /* Cannot mask successful content or an invocation error. */ }
    } finally { clearTimeout(timeout); }
  }
}
