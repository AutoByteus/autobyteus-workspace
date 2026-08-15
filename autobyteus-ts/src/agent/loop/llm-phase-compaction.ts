import type { CompactionTokenBudget } from '../token-budget.js';
import type { LlmTokenUsageObservation } from '../../llm/utils/llm-token-usage-observation.js';
import type { AgentContext } from '../context/agent-context.js';
import type { CompactionRuntimeReporter } from '../compaction/compaction-runtime-reporter.js';
import type { CompactionRuntimeSettingsResolver } from '../../memory/compaction/compaction-runtime-settings.js';
import { resolveCompactionPlanningBudget } from '../../memory/compaction/compaction-planning-budget.js';
import type { CompactionObservationDecision } from '../../memory/memory-manager.js';

export function evaluateLlmPhaseCompaction(input: {
  memoryManager: NonNullable<AgentContext['state']['memoryManager']>;
  tokenBudget: CompactionTokenBudget | null;
  tokenUsage: LlmTokenUsageObservation | null;
  observedPromptTokens?: number | null;
  activeTurnId: string;
  compactionReporter: CompactionRuntimeReporter;
  runtimeSettingsResolver: CompactionRuntimeSettingsResolver;
}): CompactionObservationDecision | null {
  const {
    memoryManager,
    tokenBudget,
    tokenUsage,
    observedPromptTokens,
    activeTurnId,
    compactionReporter,
    runtimeSettingsResolver,
  } = input;
  const runtimeSettings = runtimeSettingsResolver.resolve();
  if (!tokenUsage) {
    compactionReporter.logBudgetSkippedNoUsage(
      { turn_id: activeTurnId, reason: 'missing_usage' },
      runtimeSettings.detailedLogsEnabled,
    );
    return null;
  }
  const promptTokens = observedPromptTokens === undefined
    ? tokenUsage.input_tokens
    : observedPromptTokens;
  if (promptTokens === null) {
    compactionReporter.logBudgetSkippedNoUsage(
      {
        turn_id: activeTurnId,
        reason: 'missing_prompt_tokens',
        quality_flags: tokenUsage.quality_flags,
      },
      runtimeSettings.detailedLogsEnabled,
    );
    return null;
  }
  if (!tokenBudget) return null;

  const planningBudget = resolveCompactionPlanningBudget(
    tokenBudget,
    promptTokens,
  );
  const decision = memoryManager.evaluateCompactionObservation({
    requestedTurnId: activeTurnId,
    planningBudget,
  });
  compactionReporter.logBudgetEvaluated({
    prompt_tokens: promptTokens,
    effective_total_context_tokens: tokenBudget.effectiveContextCapacity,
    context_derived_input_cap_tokens: tokenBudget.contextDerivedInputCapTokens,
    provider_input_cap_tokens: tokenBudget.providerInputCapTokens,
    effective_input_cap_tokens: tokenBudget.effectiveInputCapacity,
    reserved_output_tokens: tokenBudget.reservedOutputTokens,
    safety_margin_tokens: tokenBudget.safetyMarginTokens,
    input_budget_tokens: tokenBudget.inputBudget,
    compaction_ratio: tokenBudget.compactionRatio,
    trigger_threshold_tokens: tokenBudget.triggerThresholdTokens,
    trigger_headroom_tokens: planningBudget.triggerHeadroomTokens,
    quality_retention_cap_tokens: planningBudget.qualityRetentionCapTokens,
    post_compaction_target_tokens: planningBudget.postCompactionTargetTokens,
    budget_key: planningBudget.budgetKey,
    override_active: tokenBudget.overrideActive,
    compaction_required: decision.kind === 'requested',
    threshold_episode_decision: decision.kind,
  }, runtimeSettings.detailedLogsEnabled);

  if (decision.kind === 'requested') {
    compactionReporter.emitStatus({
      phase: 'requested',
      turn_id: activeTurnId,
      compaction_operation_id: decision.operationId,
      requested_turn_id: activeTurnId,
      execution_turn_id: null,
      selected_block_count: null,
      compacted_block_count: null,
      raw_trace_count: null,
      semantic_fact_count: null,
    });
  } else if (decision.kind === 'suppressed' && decision.diagnosticRequired) {
    compactionReporter.reportInadequateReduction({
      turnId: activeTurnId,
      completedOperationId: decision.completedOperationId ?? null,
      observedPromptTokens: planningBudget.observedPromptTokens,
      triggerThresholdTokens: planningBudget.triggerThresholdTokens,
      postCompactionTargetTokens: planningBudget.postCompactionTargetTokens,
      budgetKey: planningBudget.budgetKey,
    });
  }
  return decision;
}
