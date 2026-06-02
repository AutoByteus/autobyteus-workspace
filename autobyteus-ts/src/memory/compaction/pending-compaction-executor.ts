import { CompactionPreparationError } from '../../agent/compaction/compaction-preparation-error.js';
import { CompactionRuntimeReporter } from '../../agent/compaction/compaction-runtime-reporter.js';
import type { MemoryManager, PendingCompactionRequest } from '../memory-manager.js';
import { CompactionRuntimeSettingsResolver } from './compaction-runtime-settings.js';
import { WorkingContextMessageWindowPlanner } from './working-context-message-window-planner.js';
import { WorkingContextSnapshotRebuilder } from './working-context-snapshot-rebuilder.js';
import type { CompactionAgentExecutionMetadata } from './compaction-agent-runner.js';

export type PendingCompactionExecutionInput = {
  turnId?: string | null;
  systemPrompt: string;
  inputBudgetTokens?: number | null;
};

export type PendingCompactionExecutorOptions = {
  planner?: WorkingContextMessageWindowPlanner;
  snapshotRebuilder?: WorkingContextSnapshotRebuilder;
  reporter?: CompactionRuntimeReporter | null;
  runtimeSettingsResolver?: CompactionRuntimeSettingsResolver;
  inputBudgetTokens?: number | null;
  maxEpisodic?: number;
  maxSemantic?: number;
};

export class PendingCompactionExecutor {
  private readonly planner: WorkingContextMessageWindowPlanner;
  private readonly snapshotRebuilder: WorkingContextSnapshotRebuilder;
  private readonly reporter: CompactionRuntimeReporter | null;
  private readonly runtimeSettingsResolver: CompactionRuntimeSettingsResolver;
  private readonly inputBudgetTokens: number | null;
  private readonly maxEpisodic: number;
  private readonly maxSemantic: number;

  constructor(
    private readonly memoryManager: MemoryManager,
    options: PendingCompactionExecutorOptions = {},
  ) {
    this.planner = options.planner ?? new WorkingContextMessageWindowPlanner();
    this.snapshotRebuilder = options.snapshotRebuilder ?? new WorkingContextSnapshotRebuilder();
    this.reporter = options.reporter ?? null;
    this.runtimeSettingsResolver = options.runtimeSettingsResolver ?? new CompactionRuntimeSettingsResolver();
    this.inputBudgetTokens = options.inputBudgetTokens ?? null;
    this.maxEpisodic = options.maxEpisodic ?? 3;
    this.maxSemantic = options.maxSemantic ?? 20;
  }

  async executeIfRequired(input: PendingCompactionExecutionInput): Promise<boolean> {
    if (!this.memoryManager.compactionRequired) {
      return false;
    }

    const pendingCompactionRequest = this.memoryManager.requirePendingCompactionRequest();
    const lifecycleMetadata = toLifecycleMetadata(pendingCompactionRequest, input.turnId ?? null);
    const runtimeSettings = this.runtimeSettingsResolver.resolve();
    if (!this.memoryManager.compactor) {
      const errorMessage = [
        'Memory compaction failed before dispatch: no compactor agent is configured.',
        'Set AUTOBYTEUS_COMPACTION_AGENT_DEFINITION_ID in Server Settings -> Basics -> Compaction.'
      ].join(' ');
      this.reporter?.emitStatus({
        phase: 'failed',
        turn_id: input.turnId ?? null,
        ...lifecycleMetadata,
        selected_block_count: null,
        compacted_block_count: null,
        error_message: errorMessage,
      });
      throw new CompactionPreparationError(errorMessage);
    }

    const messages = this.memoryManager.getWorkingContextMessages();
    const plan = this.planner.plan({
      messages,
      inputBudgetTokens: input.inputBudgetTokens ?? this.inputBudgetTokens,
    });

    this.reporter?.logExecutionContext({
      turn_id: input.turnId ?? null,
      ...lifecycleMetadata,
      pending_compaction: true,
      selected_unit_count: plan.compactableUnits.length,
      protected_suffix_unit_count: plan.protectedSuffixUnits.length,
      retained_unit_count: plan.retainedUnits.length,
      working_context_message_count: messages.length,
      raw_trace_count: plan.rawTraceIdsToArchive.length,
    }, runtimeSettings.detailedLogsEnabled);

    if (!plan.compactableUnits.length) {
      const errorMessage = 'Memory compaction failed before dispatch: no eligible settled working-context message was available.';
      this.reporter?.emitStatus({
        phase: 'failed',
        turn_id: input.turnId ?? null,
        ...lifecycleMetadata,
        selected_block_count: 0,
        compacted_block_count: 0,
        error_message: errorMessage,
      });
      throw new CompactionPreparationError(errorMessage);
    }

    this.reporter?.emitStatus({
      phase: 'started',
      turn_id: input.turnId ?? null,
      ...lifecycleMetadata,
      selected_block_count: plan.compactableUnits.length,
      compacted_block_count: null,
    });

    try {
      const outcome = await this.memoryManager.compactor.compactWorkingContext(plan);
      const bundle = this.memoryManager.retriever.retrieve(this.maxEpisodic, this.maxSemantic);
      const snapshotMessages = this.snapshotRebuilder.rebuild({
        systemPrompt: input.systemPrompt,
        headMessages: plan.headMessages,
        bundle,
        retainedMessages: plan.retainedMessages,
      });
      this.memoryManager.resetWorkingContextSnapshot(snapshotMessages);
      this.memoryManager.clearCompactionRequest();

      this.reporter?.emitStatus({
        phase: 'completed',
        turn_id: input.turnId ?? null,
        ...lifecycleMetadata,
        selected_block_count: plan.compactableUnits.length,
        compacted_block_count: outcome?.compactedUnitCount ?? plan.compactableUnits.length,
        raw_trace_count: outcome?.rawTraceCount ?? 0,
        semantic_fact_count: outcome?.semanticFactCount ?? 0,
        ...toStatusMetadata(outcome?.compactionMetadata ?? null),
      });
      this.reporter?.logResultSummary({
        turn_id: input.turnId ?? null,
        ...lifecycleMetadata,
        selected_block_count: plan.compactableUnits.length,
        compacted_block_count: outcome?.compactedUnitCount ?? plan.compactableUnits.length,
        episodic_summary_length: outcome?.result.episodicSummary.length ?? 0,
        semantic_fact_count: outcome?.semanticFactCount ?? 0,
        ...toStatusMetadata(outcome?.compactionMetadata ?? null),
      }, runtimeSettings.detailedLogsEnabled);
      return true;
    } catch (error) {
      if (error instanceof CompactionPreparationError) {
        throw error;
      }
      const causeMessage = error instanceof Error ? error.message : String(error);
      const errorMessage = `Memory compaction failed before dispatch: ${causeMessage}`;
      this.reporter?.emitStatus({
        phase: 'failed',
        turn_id: input.turnId ?? null,
        ...lifecycleMetadata,
        selected_block_count: plan.compactableUnits.length,
        compacted_block_count: null,
        ...toStatusMetadata(this.memoryManager.compactor.getLastCompactionExecutionMetadata()),
        error_message: errorMessage,
      });
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

const toStatusMetadata = (
  metadata: CompactionAgentExecutionMetadata | null | undefined,
): Record<string, string | null> => {
  if (!metadata) {
    return {};
  }
  return {
    compaction_agent_definition_id: metadata.compactionAgentDefinitionId ?? null,
    compaction_agent_name: metadata.compactionAgentName ?? null,
    compaction_runtime_kind: metadata.runtimeKind ?? null,
    compaction_model_identifier: metadata.modelIdentifier ?? null,
    compaction_run_id: metadata.compactionRunId ?? null,
    compaction_task_id: metadata.taskId ?? null,
  };
};
