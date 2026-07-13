import type { AgentExternalEventNotifier } from '../events/notifiers.js';
import type {
  WorkingContextCompactionPlanDiagnostics,
  WorkingContextCompactionResultDiagnostics,
} from '../../memory/compaction/working-context-compaction-strategy.js';
import type { CompactionAgentExecutionMetadata } from '../../memory/compaction/compaction-agent-runner.js';

export type CompactionStatusPhase = 'requested' | 'started' | 'completed' | 'failed';

export type CompactionStatusPayload = {
  phase: CompactionStatusPhase;
  turn_id?: string | null;
  compaction_operation_id?: string | null;
  requested_turn_id?: string | null;
  execution_turn_id?: string | null;
  compaction_strategy_id?: string | null;
  compaction_strategy_name?: string | null;
  selected_block_count?: number | null;
  compacted_block_count?: number | null;
  raw_trace_count?: number | null;
  semantic_fact_count?: number | null;
  compaction_agent_definition_id?: string | null;
  compaction_agent_name?: string | null;
  compaction_runtime_kind?: string | null;
  compaction_model_identifier?: string | null;
  compaction_run_id?: string | null;
  compaction_task_id?: string | null;
  error_message?: string | null;
};

export class CompactionRuntimeReporter {
  private planDiagnostics: WorkingContextCompactionPlanDiagnostics | null = null;
  private resultDiagnostics: WorkingContextCompactionResultDiagnostics | null = null;
  private failureMetadata: CompactionAgentExecutionMetadata | null = null;

  constructor(
    private readonly agentId: string,
    private readonly notifier: AgentExternalEventNotifier | null = null
  ) {}

  emitStatus(payload: CompactionStatusPayload): void {
    const enrichedPayload = this.enrichTerminalStatus(payload);
    const logPayload = { agent_id: this.agentId, ...enrichedPayload };

    if (enrichedPayload.phase === 'failed') {
      console.error('compaction_failed', logPayload);
    } else {
      console.info(`compaction_${enrichedPayload.phase}`, logPayload);
    }

    this.notifier?.notifyAgentCompactionStatus?.(enrichedPayload);
    if (enrichedPayload.phase === 'completed' || enrichedPayload.phase === 'failed') {
      this.planDiagnostics = null;
      this.resultDiagnostics = null;
      this.failureMetadata = null;
    }
  }

  recordStrategyPlanDiagnostics(details: WorkingContextCompactionPlanDiagnostics): void {
    this.planDiagnostics = details;
  }

  recordStrategyResultDiagnostics(details: WorkingContextCompactionResultDiagnostics): void {
    this.resultDiagnostics = details;
  }

  recordStrategyFailureMetadata(metadata: CompactionAgentExecutionMetadata | null): void {
    this.failureMetadata = metadata;
  }

  logBudgetEvaluated(payload: Record<string, unknown>, enabled: boolean): void {
    if (!enabled) {
      return;
    }
    console.info('compaction_budget_evaluated', { agent_id: this.agentId, ...payload });
  }

  logBudgetSkippedNoUsage(payload: Record<string, unknown>, enabled: boolean): void {
    if (!enabled) {
      return;
    }
    console.info('compaction_budget_skipped_no_usage', { agent_id: this.agentId, ...payload });
  }

  logExecutionContext(payload: Record<string, unknown>, enabled: boolean): void {
    if (!enabled) {
      return;
    }
    console.info('compaction_execution_context', { agent_id: this.agentId, ...payload });
  }

  logResultSummary(payload: Record<string, unknown>, enabled: boolean): void {
    if (!enabled) {
      return;
    }
    console.info('compaction_result_summary', { agent_id: this.agentId, ...payload });
  }

  private enrichTerminalStatus(payload: CompactionStatusPayload): CompactionStatusPayload {
    if (payload.phase === 'completed' && this.resultDiagnostics) {
      return {
        ...payload,
        selected_block_count: this.resultDiagnostics.selectedUnitCount,
        compacted_block_count: this.resultDiagnostics.compactedUnitCount,
        raw_trace_count: this.resultDiagnostics.rawTraceCount,
        semantic_fact_count: this.resultDiagnostics.semanticFactCount,
        ...(this.resultDiagnostics.compactionMetadata
          ? toStatusMetadata(this.resultDiagnostics.compactionMetadata)
          : {}),
      };
    }
    if (payload.phase === 'failed') {
      return {
        ...payload,
        selected_block_count: this.planDiagnostics?.selectedUnitCount
          ?? payload.selected_block_count,
        raw_trace_count: this.planDiagnostics?.rawTraceCount
          ?? payload.raw_trace_count,
        ...(this.failureMetadata ? toStatusMetadata(this.failureMetadata) : {}),
      };
    }
    return payload;
  }
}

const toStatusMetadata = (
  metadata: CompactionAgentExecutionMetadata,
): Pick<
  CompactionStatusPayload,
  | 'compaction_agent_definition_id'
  | 'compaction_agent_name'
  | 'compaction_runtime_kind'
  | 'compaction_model_identifier'
  | 'compaction_run_id'
  | 'compaction_task_id'
> => ({
  compaction_agent_definition_id: metadata.compactionAgentDefinitionId ?? null,
  compaction_agent_name: metadata.compactionAgentName ?? null,
  compaction_runtime_kind: metadata.runtimeKind ?? null,
  compaction_model_identifier: metadata.modelIdentifier ?? null,
  compaction_run_id: metadata.compactionRunId ?? null,
  compaction_task_id: metadata.taskId ?? null,
});
