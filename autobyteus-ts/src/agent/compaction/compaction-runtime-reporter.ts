import type { AgentExternalEventNotifier } from '../events/notifiers.js';

export type CompactionStatusPhase = 'requested' | 'started' | 'completed' | 'failed';

export type CompactionStatusPayload = {
  phase: CompactionStatusPhase;
  turn_id?: string | null;
  selected_block_count?: number | null;
  compacted_block_count?: number | null;
  raw_trace_count?: number | null;
  semantic_fact_count?: number | null;
  compaction_model_identifier?: string | null;
  error_message?: string | null;
};

export class CompactionRuntimeReporter {
  constructor(
    private readonly agentId: string,
    private readonly notifier: AgentExternalEventNotifier | null = null
  ) {}

  emitStatus(payload: CompactionStatusPayload): void {
    const logPayload = { agent_id: this.agentId, ...payload };

    if (payload.phase === 'failed') {
      console.error('compaction_failed', logPayload);
    } else {
      console.info(`compaction_${payload.phase}`, logPayload);
    }

    this.notifier?.notifyAgentCompactionStatus?.(payload);
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
}
