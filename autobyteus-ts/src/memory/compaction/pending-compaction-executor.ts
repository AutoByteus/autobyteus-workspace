import type { CompactionExecutionSite, CompactionRecoveryBlock } from './compaction-recovery.js';
import { CompactionPreparationError } from '../../agent/compaction/compaction-preparation-error.js';
import { CompactionRuntimeReporter, type CompactionStatusPayload } from '../../agent/compaction/compaction-runtime-reporter.js';
import type { MemoryManager } from '../memory-manager.js';
import { CompactionContentBuilder } from './compaction-content-builder.js';
import { validateCompactionSummaryBody } from './compaction-summary-parser.js';
import type { CompressionStrategyFactory } from './memory-compaction-configuration.js';
import { WorkingContextMessageWindowPlanner } from './working-context-message-window-planner.js';
import { WorkingContextCompactionOutputValidator } from './working-context-compaction-output-validator.js';
import { estimateMessagesTokens } from './message-budget-strategy.js';
import { Message, MessageRole } from '../../llm/utils/messages.js';

export type PendingCompactionExecutionInput = {
  executionSite: CompactionExecutionSite;
  turnId: string;
  getParentModelIdentifier: () => string; signal: AbortSignal;
};
export type PendingCompactionExecutorOptions = {
  createCompressionStrategy: CompressionStrategyFactory;
  maxItemChars?: number;
  onRecoveryStateChanged?: (previous: CompactionRecoveryBlock | null) => void;
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
    const previousRecovery = this.memoryManager.getCompactionRecovery();
    const begin = this.memoryManager.beginPendingCompactionAttempt({
      operationId: gate.operationId, turnId: input.turnId,
    });
    if (!begin.authorized) throw new CompactionPreparationError(`Memory compaction execution was not authorized (${begin.code}).`);
    const pending = begin.request;
    let status: Omit<CompactionStatusPayload, 'phase'> = {
      turn_id: input.turnId, compaction_operation_id: pending.operationId,
      requested_turn_id: pending.requestedTurnId, execution_turn_id: input.turnId,
    };
    let terminal = false;
    const finish = (payload: CompactionStatusPayload) => {
      if (terminal) return;
      terminal = true;
      this.emit(payload);
    };
    const onAbort = () => finish({ ...status, phase: 'stopped' });
    input.signal.addEventListener('abort', onAbort, { once: true });
    try {
      if (input.signal.aborted) onAbort();
      this.publishRecovery();
      input.signal.throwIfAborted();
      const baseline = this.memoryManager.captureCompactionBaseline();
      const source = baseline.context.copy();
      const plan = this.planner.plan({ messages: source.buildMessages(), planningBudget: pending.planningBudget });
      status = { ...status, selected_block_count: plan.compactableUnits.length,
        raw_trace_count: plan.rawTraceIdsToArchive.length };
      this.emit({ ...status, phase: 'started' });
      const content = new CompactionContentBuilder().build(plan.compactableUnits, { maxItemChars: this.options.maxItemChars });
      const strategy = this.options.createCompressionStrategy({
        operationId: pending.operationId, executionTurnId: input.turnId,
        signal: input.signal, getParentModelIdentifier: input.getParentModelIdentifier,
        observe: (event) => {
          const metadata = event.execution;
          if (metadata) status = { ...status, compaction_model_identifier: metadata.modelIdentifier,
            summarizer_provider: metadata.provider, compaction_invocation_id: metadata.invocationId,
            completion_status: metadata.completionStatus, completion_reason: metadata.completionReason };
        },
      });
      input.signal.throwIfAborted();
      const result = await strategy.compress(content);
      input.signal.throwIfAborted();
      const summary = validateCompactionSummaryBody(result);
      status = { ...status, summary_char_count: summary.length,
        summary_token_count: estimateMessagesTokens([new Message(MessageRole.USER, { content: summary })]),
      };
      const accepted = this.memoryManager.prepareCompaction(baseline, {
        selectedNewRawTraceIds: plan.rawTraceIdsToArchive, retainedMessages: plan.retainedMessages,
        summary, budgetAssessment: plan.budgetAssessment,
      });
      this.validator.assertValid(baseline.context, source, accepted, plan);
      this.memoryManager.commitAcceptedCompaction(accepted, input.signal);
      // Latch durable success before observers can synchronously abort the owner.
      finish({ ...status, phase: 'completed', compacted_block_count: status.selected_block_count });
    } catch (error) {
      const kind = (error as { code?: string }).code ?? 'execution_failure';
      this.memoryManager.retainCompactionFailure(pending.operationId, input.turnId, kind, input.executionSite);
      const message = `Memory compaction failed before dispatch [${kind}]: ${error instanceof Error ? error.message : String(error)}`;
      finish({ ...status, phase: 'failed', error_message: message });
      throw new CompactionPreparationError(message, error);
    } finally {
      input.signal.removeEventListener('abort', onAbort);
    }
    this.publishRecovery(previousRecovery);
    return true;
  }

  private publishRecovery(previous: CompactionRecoveryBlock | null = null): void {
    try { this.options.onRecoveryStateChanged?.(previous); } catch { /* Projection is not commit authority. */ }
  }

  private emit(payload: CompactionStatusPayload): void {
    try { this.options.reporter?.emitStatus(payload); } catch { /* Observability cannot alter attempt state. */ }
  }
}
