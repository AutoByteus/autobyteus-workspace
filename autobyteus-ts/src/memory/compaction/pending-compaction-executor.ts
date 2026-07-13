import { CompactionPreparationError } from '../../agent/compaction/compaction-preparation-error.js';
import { CompactionRuntimeReporter } from '../../agent/compaction/compaction-runtime-reporter.js';
import type { MemoryManager, PendingCompactionRequest } from '../memory-manager.js';
import {
  WorkingContextCompactionOutputValidationError,
  WorkingContextCompactionOutputValidator,
} from './working-context-compaction-output-validator.js';
import type { WorkingContextCompactionStrategyResolver } from './working-context-compaction-strategy-resolver.js';

export type PendingCompactionExecutionInput = {
  turnId?: string | null;
};

export type PendingCompactionExecutorOptions = {
  strategyResolver: WorkingContextCompactionStrategyResolver;
  outputValidator?: WorkingContextCompactionOutputValidator;
  reporter?: CompactionRuntimeReporter | null;
};

export class PendingCompactionExecutor {
  private readonly outputValidator: WorkingContextCompactionOutputValidator;
  private readonly reporter: CompactionRuntimeReporter | null;

  constructor(
    private readonly memoryManager: MemoryManager,
    private readonly options: PendingCompactionExecutorOptions,
  ) {
    this.outputValidator = options.outputValidator ?? new WorkingContextCompactionOutputValidator();
    this.reporter = options.reporter ?? null;
  }

  async executeIfRequired(input: PendingCompactionExecutionInput = {}): Promise<boolean> {
    if (!this.memoryManager.compactionRequired) return false;

    const pendingRequest = this.memoryManager.requirePendingCompactionRequest();
    const lifecycleMetadata = toLifecycleMetadata(pendingRequest, input.turnId ?? null);
    let strategyIdentity: Record<string, string | null> = {
      compaction_strategy_id: null,
      compaction_strategy_name: null,
    };

    try {
      const strategy = this.options.strategyResolver.resolve();
      strategyIdentity = {
        compaction_strategy_id: strategy.id,
        compaction_strategy_name: strategy.name,
      };
      const baseline = this.memoryManager.getWorkingContext();
      const strategyInput = baseline.copy();

      this.reporter?.emitStatus({
        phase: 'started',
        turn_id: input.turnId ?? null,
        ...lifecycleMetadata,
        ...strategyIdentity,
        selected_block_count: null,
        compacted_block_count: null,
      });

      const next = await strategy.compact(strategyInput);
      this.outputValidator.assertValid(baseline, strategyInput, next);
      this.memoryManager.replaceWorkingContext(next);
      this.memoryManager.clearCompactionRequest();
      this.reporter?.emitStatus({
        phase: 'completed',
        turn_id: input.turnId ?? null,
        ...lifecycleMetadata,
        ...strategyIdentity,
        selected_block_count: null,
        compacted_block_count: null,
      });
      return true;
    } catch (error) {
      const causeMessage = error instanceof Error ? error.message : String(error);
      const invariantPrefix = error instanceof WorkingContextCompactionOutputValidationError
        ? `[${error.code}] `
        : '';
      const errorMessage = `Memory compaction failed before dispatch: ${invariantPrefix}${causeMessage}`;
      this.reporter?.emitStatus({
        phase: 'failed',
        turn_id: input.turnId ?? null,
        ...lifecycleMetadata,
        ...strategyIdentity,
        selected_block_count: null,
        compacted_block_count: null,
        error_message: errorMessage,
      });
      if (error instanceof CompactionPreparationError) throw error;
      throw new CompactionPreparationError(errorMessage, error);
    }
  }
}

const toLifecycleMetadata = (
  pendingCompactionRequest: PendingCompactionRequest,
  executionTurnId: string | null,
): Record<string, string | null> => ({
  compaction_operation_id: pendingCompactionRequest.operationId,
  requested_turn_id: pendingCompactionRequest.requestedTurnId,
  execution_turn_id: executionTurnId,
});
