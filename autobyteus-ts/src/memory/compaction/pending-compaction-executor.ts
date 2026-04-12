import { CompactionPreparationError } from '../../agent/compaction/compaction-preparation-error.js';
import { CompactionRuntimeReporter } from '../../agent/compaction/compaction-runtime-reporter.js';
import type { MemoryManager } from '../memory-manager.js';
import { CompactionSnapshotBuilder } from '../compaction-snapshot-builder.js';
import { CompactionRuntimeSettingsResolver } from './compaction-runtime-settings.js';
import { CompactionWindowPlanner } from './compaction-window-planner.js';

export type PendingCompactionExecutionInput = {
  turnId?: string | null;
  systemPrompt: string;
  activeModelIdentifier?: string | null;
};

export type PendingCompactionExecutorOptions = {
  snapshotBuilder?: CompactionSnapshotBuilder;
  planner?: CompactionWindowPlanner;
  reporter?: CompactionRuntimeReporter | null;
  runtimeSettingsResolver?: CompactionRuntimeSettingsResolver;
  fallbackCompactionModelIdentifier?: string | null;
  maxEpisodic?: number;
  maxSemantic?: number;
};

export class PendingCompactionExecutor {
  private readonly snapshotBuilder: CompactionSnapshotBuilder;
  private readonly planner: CompactionWindowPlanner;
  private readonly reporter: CompactionRuntimeReporter | null;
  private readonly runtimeSettingsResolver: CompactionRuntimeSettingsResolver;
  private readonly fallbackCompactionModelIdentifier: string | null;
  private readonly maxEpisodic: number;
  private readonly maxSemantic: number;

  constructor(
    private readonly memoryManager: MemoryManager,
    options: PendingCompactionExecutorOptions = {},
  ) {
    this.snapshotBuilder = options.snapshotBuilder ?? new CompactionSnapshotBuilder();
    this.planner = options.planner ?? new CompactionWindowPlanner(undefined, undefined, this.memoryManager.compactionPolicy.maxItemChars);
    this.reporter = options.reporter ?? null;
    this.runtimeSettingsResolver = options.runtimeSettingsResolver ?? new CompactionRuntimeSettingsResolver();
    this.fallbackCompactionModelIdentifier =
      typeof options.fallbackCompactionModelIdentifier === 'string' && options.fallbackCompactionModelIdentifier.trim().length > 0
        ? options.fallbackCompactionModelIdentifier.trim()
        : null;
    this.maxEpisodic = options.maxEpisodic ?? 3;
    this.maxSemantic = options.maxSemantic ?? 20;
  }

  async executeIfRequired(input: PendingCompactionExecutionInput): Promise<boolean> {
    if (!this.memoryManager.compactionRequired || !this.memoryManager.compactor) {
      return false;
    }

    const runtimeSettings = this.runtimeSettingsResolver.resolve();
    const resolvedCompactionModelIdentifier =
      runtimeSettings.compactionModelIdentifier
      ?? input.activeModelIdentifier
      ?? this.fallbackCompactionModelIdentifier;
    const rawTraces = this.memoryManager.listRawTracesOrdered();
    const plan = this.planner.plan(rawTraces, input.turnId ?? null);

    this.reporter?.logExecutionContext({
      turn_id: input.turnId ?? null,
      pending_compaction: true,
      selected_block_count: plan.selectedBlockCount,
      frontier_block_count: plan.frontierBlocks.length,
      raw_trace_count: rawTraces.length,
      compaction_model_identifier: resolvedCompactionModelIdentifier,
    }, runtimeSettings.detailedLogsEnabled);

    if (!plan.selectedBlockCount) {
      const errorMessage = 'Memory compaction failed before dispatch: no eligible settled block was available.';
      this.reporter?.emitStatus({
        phase: 'failed',
        turn_id: input.turnId ?? null,
        selected_block_count: 0,
        compacted_block_count: 0,
        compaction_model_identifier: resolvedCompactionModelIdentifier,
        error_message: errorMessage,
      });
      throw new CompactionPreparationError(errorMessage);
    }

    this.reporter?.emitStatus({
      phase: 'started',
      turn_id: input.turnId ?? null,
      selected_block_count: plan.selectedBlockCount,
      compacted_block_count: null,
      compaction_model_identifier: resolvedCompactionModelIdentifier,
    });

    try {
      const outcome = await this.memoryManager.compactor.compact(plan);
      const bundle = this.memoryManager.retriever.retrieve(this.maxEpisodic, this.maxSemantic);
      const snapshotMessages = this.snapshotBuilder.build(input.systemPrompt, bundle, plan, {
        maxItemChars: this.memoryManager.compactionPolicy.maxItemChars,
      });
      this.memoryManager.resetWorkingContextSnapshot(snapshotMessages);
      this.memoryManager.clearCompactionRequest();

      this.reporter?.emitStatus({
        phase: 'completed',
        turn_id: input.turnId ?? null,
        selected_block_count: plan.selectedBlockCount,
        compacted_block_count: outcome?.compactedBlockCount ?? plan.compactedBlockCount,
        raw_trace_count: outcome?.rawTraceCount ?? 0,
        semantic_fact_count: outcome?.semanticFactCount ?? 0,
        compaction_model_identifier: resolvedCompactionModelIdentifier,
      });
      this.reporter?.logResultSummary({
        turn_id: input.turnId ?? null,
        selected_block_count: plan.selectedBlockCount,
        compacted_block_count: outcome?.compactedBlockCount ?? plan.compactedBlockCount,
        episodic_summary_length: outcome?.result.episodicSummary.length ?? 0,
        semantic_fact_count: outcome?.semanticFactCount ?? 0,
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
        selected_block_count: plan.selectedBlockCount,
        compacted_block_count: null,
        compaction_model_identifier: resolvedCompactionModelIdentifier,
        error_message: errorMessage,
      });
      throw new CompactionPreparationError(errorMessage, error);
    }
  }
}
