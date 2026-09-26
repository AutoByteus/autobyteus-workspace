import type { AgentExternalEventNotifier } from '../events/notifiers.js';
export type CompactionStatusPhase = 'requested' | 'started' | 'completed' | 'failed';

export type CompactionStatusPayload = {
  phase: CompactionStatusPhase;
  turn_id?: string | null;
  compaction_operation_id?: string | null;
  requested_turn_id?: string | null;
  execution_turn_id?: string | null;
  selected_block_count?: number | null;
  compacted_block_count?: number | null;
  raw_trace_count?: number | null;
  compaction_model_identifier?: string | null;
  summarizer_provider?: string | null;
  compaction_invocation_id?: string | null;
  completion_status?: 'complete' | 'incomplete' | 'unknown' | null;
  completion_reason?: string | null;
  summary_char_count?: number | null;
  summary_token_count?: number | null;
  error_message?: string | null;
};

export class CompactionRuntimeReporter {

  constructor(
    private readonly agentId: string,
    private readonly notifier: AgentExternalEventNotifier | null = null
  ) {}

  emitStatus(payload: CompactionStatusPayload): void {
    const enrichedPayload = payload;
    const logPayload = { agent_id: this.agentId, ...enrichedPayload };

    if (enrichedPayload.phase === 'failed') {
      console.error('compaction_failed', logPayload);
    } else {
      console.info(`compaction_${enrichedPayload.phase}`, logPayload);
    }

    this.notifier?.notifyAgentCompactionStatus?.(enrichedPayload);
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

  reportInadequateReduction(input: {
    turnId: string;
    completedOperationId: string | null;
    observedPromptTokens: number;
    triggerThresholdTokens: number;
    postCompactionTargetTokens: number;
    budgetKey: string;
  }): void {
    const message =
      'Memory compaction completed, but the first fresh provider usage was not below the trigger; '
      + 'further proactive compaction is suppressed until a below-trigger observation or budget change.';
    const details = {
      reason: 'post_success_usage_not_below_trigger',
      completed_operation_id: input.completedOperationId,
      observed_prompt_tokens: input.observedPromptTokens,
      trigger_threshold_tokens: input.triggerThresholdTokens,
      post_compaction_target_tokens: input.postCompactionTargetTokens,
      budget_key: input.budgetKey,
    };
    console.error('compaction_post_success_usage_not_below_trigger', {
      agent_id: this.agentId,
      turn_id: input.turnId,
      ...details,
    });
    this.notifier?.notifyAgentErrorOutputGeneration({
      code: 'CompactionThresholdGate',
      message,
      details: JSON.stringify(details),
      classification: { scope: 'turn', effect: 'diagnostic', turnId: input.turnId },
    });
  }

}
