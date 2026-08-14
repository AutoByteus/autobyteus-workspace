import type { TurnStartOrigin } from '../../agent/event-inbox/agent-event-inbox-entry.js';
import { CompactionPreparationError } from '../../agent/compaction/compaction-preparation-error.js';
import { CompactionRuntimeReporter } from '../../agent/compaction/compaction-runtime-reporter.js';
import type { MemoryManager, PendingCompactionRequest } from '../memory-manager.js';
import { CompactionResponseRepairExhaustedError } from './agent-compaction-summarizer.js';
import { CompactionAgentRunnerError } from './compaction-agent-runner.js';
import { CompactionPlanningError } from './working-context-message-window-planner.js';
import {
  WorkingContextCompactionOutputValidationError,
  WorkingContextCompactionOutputValidator,
} from './working-context-compaction-output-validator.js';
import type { WorkingContextCompactionStrategyResolver } from './working-context-compaction-strategy-resolver.js';

export type PendingCompactionExecutionInput = {
  turnId: string;
  turnOrigin: TurnStartOrigin;
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

  async executeIfAuthorized(input: PendingCompactionExecutionInput): Promise<boolean> {
    const gate = this.memoryManager.getPendingCompactionGate();
    if (gate.kind === 'none') return false;
    const begin = this.memoryManager.beginPendingCompactionAttempt({
      operationId: gate.operationId,
      turnId: input.turnId,
      turnOrigin: input.turnOrigin,
    });
    if (!begin.authorized) {
      throw new CompactionPreparationError(
        `Memory compaction execution was not authorized (${begin.code}).`,
      );
    }

    const pendingRequest = begin.request;
    const lifecycleMetadata = toLifecycleMetadata(pendingRequest, input.turnId);
    let strategyIdentity: Record<string, string | null> = {
      compaction_strategy_id: null,
      compaction_strategy_name: null,
    };

    try {
      const strategy = this.options.strategyResolver.resolve({
        planningBudget: pendingRequest.planningBudget,
      });
      strategyIdentity = {
        compaction_strategy_id: strategy.id,
        compaction_strategy_name: strategy.name,
      };
      const baseline = this.memoryManager.captureCompactionBaseline();
      const strategyInput = baseline.context.copy();

      this.reporter?.emitStatus({
        phase: 'started',
        turn_id: input.turnId,
        ...lifecycleMetadata,
        ...strategyIdentity,
        selected_block_count: null,
        compacted_block_count: null,
      });

      const proposal = await strategy.propose(strategyInput);
      const accepted = this.memoryManager.prepareCompaction(baseline, proposal);
      this.outputValidator.assertValid(baseline.context, strategyInput, accepted);
      this.memoryManager.commitAcceptedCompaction(accepted);
      this.reporter?.emitStatus({
        phase: 'completed',
        turn_id: input.turnId,
        ...lifecycleMetadata,
        ...strategyIdentity,
        selected_block_count: null,
        compacted_block_count: null,
      });
      return true;
    } catch (error) {
      const errorKind = classifyCompactionFailure(error);
      this.memoryManager.retainCompactionFailure(
        pendingRequest.operationId,
        input.turnId,
        errorKind,
      );
      const causeMessage = error instanceof Error ? error.message : String(error);
      const errorMessage = `Memory compaction failed before dispatch [${errorKind}]: ${causeMessage}`;
      this.reporter?.emitStatus({
        phase: 'failed',
        turn_id: input.turnId,
        ...lifecycleMetadata,
        ...strategyIdentity,
        selected_block_count: null,
        compacted_block_count: null,
        error_message: errorMessage,
      });
      throw new CompactionPreparationError(errorMessage, error);
    }
  }
}

const classifyCompactionFailure = (error: unknown): string => {
  if (error instanceof CompactionAgentRunnerError) return `runner_${error.kind}`;
  if (error instanceof CompactionResponseRepairExhaustedError) return 'response_repair_exhausted';
  if (error instanceof CompactionPlanningError) return error.code;
  if (error instanceof WorkingContextCompactionOutputValidationError) return error.code;
  return 'execution_failure';
};

const toLifecycleMetadata = (
  pendingCompactionRequest: PendingCompactionRequest,
  executionTurnId: string,
): Record<string, string | null> => ({
  compaction_operation_id: pendingCompactionRequest.operationId,
  requested_turn_id: pendingCompactionRequest.requestedTurnId,
  execution_turn_id: executionTurnId,
});
