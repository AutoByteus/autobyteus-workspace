import { applyCompactionPolicy, resolveTokenBudget } from '../token-budget.js';
import type { BaseLLM } from '../../llm/base.js';
import type { LlmTokenUsageObservation } from '../../llm/utils/llm-token-usage-observation.js';
import type { AgentContext } from '../context/agent-context.js';
import type { CompactionRuntimeReporter } from '../compaction/compaction-runtime-reporter.js';
import type { CompactionRuntimeSettingsResolver } from '../../memory/compaction/compaction-runtime-settings.js';
import { resolveCompactionPlanningBudget } from '../../memory/compaction/compaction-planning-budget.js';
import type { CompactionObservationDecision } from '../../memory/memory-manager.js';

export function evaluateLlmPhaseCompaction(input: {
  llmInstance: BaseLLM;
  memoryManager: NonNullable<AgentContext['state']['memoryManager']>;
  tokenUsage: LlmTokenUsageObservation | null;
  observedPromptTokens?: number | null;
  activeTurnId: string;
  compactionReporter: CompactionRuntimeReporter;
  runtimeSettingsResolver: CompactionRuntimeSettingsResolver;
}): CompactionObservationDecision | null {
  const {
    llmInstance,
    memoryManager,
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
  const budget = resolveTokenBudget(
    llmInstance.model,
    llmInstance.config,
    memoryManager.compactionPolicy,
    runtimeSettings,
  );
  if (!budget) return null;

  applyCompactionPolicy(memoryManager.compactionPolicy, budget);
  const planningBudget = resolveCompactionPlanningBudget(
    budget,
    promptTokens,
  );
  const decision = memoryManager.evaluateCompactionObservation({
    requestedTurnId: activeTurnId,
    planningBudget,
  });
  compactionReporter.logBudgetEvaluated({
    prompt_tokens: promptTokens,
    effective_total_context_tokens: budget.effectiveContextCapacity,
    context_derived_input_cap_tokens: budget.contextDerivedInputCapTokens,
    provider_input_cap_tokens: budget.providerInputCapTokens,
    effective_input_cap_tokens: budget.effectiveInputCapacity,
    reserved_output_tokens: budget.reservedOutputTokens,
    safety_margin_tokens: budget.safetyMarginTokens,
    input_budget_tokens: budget.inputBudget,
    compaction_ratio: budget.compactionRatio,
    trigger_threshold_tokens: budget.triggerThresholdTokens,
    trigger_headroom_tokens: planningBudget.triggerHeadroomTokens,
    quality_retention_cap_tokens: planningBudget.qualityRetentionCapTokens,
    post_compaction_target_tokens: planningBudget.postCompactionTargetTokens,
    budget_key: planningBudget.budgetKey,
    override_active: budget.overrideActive,
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
