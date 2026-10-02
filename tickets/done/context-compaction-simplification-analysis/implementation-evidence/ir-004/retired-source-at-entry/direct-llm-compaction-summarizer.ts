import { randomUUID } from 'node:crypto';
import type { BaseLLM } from '../../llm/base.js';
import { Message, MessageRole } from '../../llm/utils/messages.js';
import { resolveLlmRequestCapacity } from '../../agent/token-budget.js';
import { estimateMessagesTokens } from './message-budget-strategy.js';
import { COMPACTION_SUMMARY_PROMPT } from './compaction-summary-prompt.js';
import { parseCompactionSummary } from './compaction-summary-parser.js';
import { CompactionInvocationError, type CompactionExecutionMetadata } from './compaction-execution.js';
import { WorkingContextCompactionPromptBuilder } from './working-context-compaction-prompt-builder.js';
import type { WorkingContextMessageUnit } from './working-context-message-unit.js';

export type CompactionLlmFactory = (input: { parentModelIdentifier: string }) => Promise<BaseLLM>;
export type DirectCompactionInput = {
  units: readonly WorkingContextMessageUnit[];
  summaryBudgetTokens: number;
  parentModelIdentifier: string;
  operationId: string;
  executionTurnId: string;
  signal: AbortSignal;
  maxItemChars?: number;
};

export class DirectLlmCompactionSummarizer {
  constructor(private readonly createLlm: CompactionLlmFactory,
    private readonly promptBuilder = new WorkingContextCompactionPromptBuilder()) {}

  async summarize(input: DirectCompactionInput): Promise<{
    summary: string; execution: CompactionExecutionMetadata;
  }> {
    input.signal.throwIfAborted();
    const llm = await this.createLlm({ parentModelIdentifier: input.parentModelIdentifier });
    let execution: CompactionExecutionMetadata = {
      modelIdentifier: llm.model.modelIdentifier, provider: String(llm.model.provider),
      invocationId: `compaction_${randomUUID()}`, completionStatus: 'unknown',
      completionReason: null, usage: null,
    };
    try {
      input.signal.throwIfAborted();
      const history = this.promptBuilder.buildTaskPrompt(input.units, { maxItemChars: input.maxItemChars });
      const messages = [
        new Message(MessageRole.SYSTEM, { content: COMPACTION_SUMMARY_PROMPT }),
        new Message(MessageRole.USER, { content: `Summary budget: ${input.summaryBudgetTokens} tokens.\n\n${history}` }),
      ];
      const capacity = resolveLlmRequestCapacity(llm.model, llm.config);
      if (!capacity) throw new CompactionInvocationError('input_capacity_unavailable', 'Compactor input capacity is unavailable.', execution);
      if (estimateMessagesTokens(messages) > capacity.inputBudget) {
        throw new CompactionInvocationError('input_budget_exceeded', 'Selected compaction history exceeds the compactor input budget.', execution);
      }
      const response = await llm.sendMessages(messages, null,
        { logicalConversationId: execution.invocationId },
        { signal: input.signal, turnId: input.executionTurnId });
      input.signal.throwIfAborted();
      execution = { ...execution, completionStatus: response.completionStatus,
        completionReason: response.completionReason, usage: response.usage };
      if (response.completionStatus === 'incomplete') {
        throw new CompactionInvocationError('incomplete_summary', 'Provider reported incomplete compaction output.', execution);
      }
      return { summary: parseCompactionSummary(response.content), execution };
    } catch (error) {
      if (error instanceof CompactionInvocationError) throw error;
      throw new CompactionInvocationError(input.signal.aborted ? 'cancelled' :
        (error as { code?: string }).code ?? 'generation_failure',
        error instanceof Error ? error.message : String(error), execution, error);
    } finally {
      try { await llm.cleanup({ signal: AbortSignal.timeout(10_000) }); }
      catch {
        try { console.warn('Compaction isolated LLM cleanup failed.', { invocationId: execution.invocationId }); }
        catch { /* Cleanup diagnostics cannot mask the invocation result. */ }
      }
    }
  }
}
