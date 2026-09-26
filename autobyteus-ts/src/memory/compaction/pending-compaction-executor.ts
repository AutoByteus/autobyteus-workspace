import type { TurnStartOrigin } from '../../agent/event-inbox/agent-event-inbox-entry.js';
import { CompactionPreparationError } from '../../agent/compaction/compaction-preparation-error.js';
import { CompactionRuntimeReporter, type CompactionStatusPayload } from '../../agent/compaction/compaction-runtime-reporter.js';
import type { MemoryManager } from '../memory-manager.js';
import { CompactionInvocationError } from './compaction-execution.js';
import type { DirectLlmCompactionSummarizer } from './direct-llm-compaction-summarizer.js';
import { WorkingContextMessageWindowPlanner } from './working-context-message-window-planner.js';
import { WorkingContextCompactionOutputValidator } from './working-context-compaction-output-validator.js';
import { estimateMessagesTokens } from './message-budget-strategy.js';
import { Message, MessageRole } from '../../llm/utils/messages.js';

export type PendingCompactionExecutionInput = {
  turnId: string; turnOrigin: TurnStartOrigin;
  parentModelIdentifier: string; signal: AbortSignal;
};
export type PendingCompactionExecutorOptions = {
  summarizer: DirectLlmCompactionSummarizer;
  maxItemChars?: number;
  planner?: WorkingContextMessageWindowPlanner;
  outputValidator?: WorkingContextCompactionOutputValidator;
  reporter?: CompactionRuntimeReporter | null;
};

export class PendingCompactionExecutor {
  private readonly planner: WorkingContextMessageWindowPlanner;
  private readonly validator: WorkingContextCompactionOutputValidator;
  constructor(private readonly memoryManager: MemoryManager,
    private readonly options: PendingCompactionExecutorOptions) {
    this.planner = options.planner ?? new WorkingContextMessageWindowPlanner();
    this.validator = options.outputValidator ?? new WorkingContextCompactionOutputValidator();
  }

  async executeIfAuthorized(input: PendingCompactionExecutionInput): Promise<boolean> {
    const gate = this.memoryManager.getPendingCompactionGate();
    if (gate.kind === 'none') return false;
    const begin = this.memoryManager.beginPendingCompactionAttempt({
      operationId: gate.operationId, turnId: input.turnId, turnOrigin: input.turnOrigin,
    });
    if (!begin.authorized) throw new CompactionPreparationError(`Memory compaction execution was not authorized (${begin.code}).`);
    const pending = begin.request;
    let status: Omit<CompactionStatusPayload, 'phase'> = {
      turn_id: input.turnId, compaction_operation_id: pending.operationId,
      requested_turn_id: pending.requestedTurnId, execution_turn_id: input.turnId,
    };
    try {
      input.signal.throwIfAborted();
      const baseline = this.memoryManager.captureCompactionBaseline();
      const source = baseline.context.copy();
      const plan = this.planner.plan({ messages: source.buildMessages(), planningBudget: pending.planningBudget });
      status = { ...status, selected_block_count: plan.compactableUnits.length,
        raw_trace_count: plan.rawTraceIdsToArchive.length };
      this.emit({ ...status, phase: 'started' });
      const result = await this.options.summarizer.summarize({
        units: plan.compactableUnits,
        summaryBudgetTokens: plan.budgetAssessment.replacementMemoryReserveTokens,
        parentModelIdentifier: input.parentModelIdentifier, operationId: pending.operationId,
        executionTurnId: input.turnId, signal: input.signal, maxItemChars: this.options.maxItemChars,
      });
      input.signal.throwIfAborted();
      status = { ...status, compaction_model_identifier: result.execution.modelIdentifier,
        summarizer_provider: result.execution.provider, compaction_invocation_id: result.execution.invocationId,
        completion_status: result.execution.completionStatus, completion_reason: result.execution.completionReason,
        summary_char_count: result.summary.length,
        summary_token_count: estimateMessagesTokens([new Message(MessageRole.USER, { content: result.summary })]),
      };
      const accepted = this.memoryManager.prepareCompaction(baseline, {
        selectedNewRawTraceIds: plan.rawTraceIdsToArchive, retainedMessages: plan.retainedMessages,
        summary: result.summary, execution: result.execution, budgetAssessment: plan.budgetAssessment,
      });
      this.validator.assertValid(baseline.context, source, accepted, plan);
      this.memoryManager.commitAcceptedCompaction(accepted, input.signal);
    } catch (error) {
      const kind = (error as { code?: string }).code ?? 'execution_failure';
      this.memoryManager.retainCompactionFailure(pending.operationId, input.turnId, kind);
      const metadata = error instanceof CompactionInvocationError ? error.execution : null;
      const message = `Memory compaction failed before dispatch [${kind}]: ${error instanceof Error ? error.message : String(error)}`;
      this.emit({ ...status, phase: 'failed', error_message: message,
        ...(metadata ? { compaction_model_identifier: metadata.modelIdentifier,
          summarizer_provider: metadata.provider, compaction_invocation_id: metadata.invocationId,
          completion_status: metadata.completionStatus, completion_reason: metadata.completionReason } : {}) });
      throw new CompactionPreparationError(message, error);
    }
    // Outside the failure path: durable success cannot become a semantic retry.
    this.emit({ ...status, phase: 'completed', compacted_block_count: status.selected_block_count });
    return true;
  }

  private emit(payload: CompactionStatusPayload): void {
    try { this.options.reporter?.emitStatus(payload); } catch { /* Observability cannot alter attempt state. */ }
  }
}
