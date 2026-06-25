import { applyCompactionPolicy, resolveTokenBudget } from '../token-budget.js';
import type { BaseLLM } from '../../llm/base.js';
import type { LlmTokenUsageObservation } from '../../llm/utils/llm-token-usage-observation.js';
import type { AgentContext } from '../context/agent-context.js';
import type { CompactionRuntimeReporter } from '../compaction/compaction-runtime-reporter.js';
import type { CompactionRuntimeSettingsResolver } from '../../memory/compaction/compaction-runtime-settings.js';

export function evaluateLlmPhaseCompaction(input: {
  llmInstance: BaseLLM;
  memoryManager: NonNullable<AgentContext['state']['memoryManager']>;
  tokenUsage: LlmTokenUsageObservation | null;
  activeTurnId: string;
  compactionReporter: CompactionRuntimeReporter;
  runtimeSettingsResolver: CompactionRuntimeSettingsResolver;
}): void {
  const {
    llmInstance,
    memoryManager,
    tokenUsage,
    activeTurnId,
    compactionReporter,
    runtimeSettingsResolver
  } = input;
  const runtimeSettings = runtimeSettingsResolver.resolve();
  if (!tokenUsage) {
    compactionReporter.logBudgetSkippedNoUsage(
      { turn_id: activeTurnId, reason: 'missing_usage' },
      runtimeSettings.detailedLogsEnabled
    );
    return;
  }
  const budget = resolveTokenBudget(
    llmInstance.model,
    llmInstance.config,
    memoryManager.compactionPolicy,
    runtimeSettings
  );
  if (!budget) return;

  applyCompactionPolicy(memoryManager.compactionPolicy, budget);
  const compactionRequired = Boolean(
    memoryManager.compactionPolicy.shouldCompact(tokenUsage.input_tokens ?? 0, budget.inputBudget)
  );
  compactionReporter.logBudgetEvaluated({
    prompt_tokens: tokenUsage.input_tokens ?? 0,
    effective_total_context_tokens: budget.effectiveContextCapacity,
    context_derived_input_cap_tokens: budget.contextDerivedInputCapTokens,
    provider_input_cap_tokens: budget.providerInputCapTokens,
    effective_input_cap_tokens: budget.effectiveInputCapacity,
    reserved_output_tokens: budget.reservedOutputTokens,
    safety_margin_tokens: budget.safetyMarginTokens,
    input_budget_tokens: budget.inputBudget,
    compaction_ratio: budget.compactionRatio,
    trigger_threshold_tokens: budget.triggerThresholdTokens,
    override_active: budget.overrideActive,
    compaction_required: compactionRequired
  }, runtimeSettings.detailedLogsEnabled);

  if (compactionRequired) {
    const compactionOperationId = memoryManager.requestCompaction(activeTurnId);
    compactionReporter.emitStatus({
      phase: 'requested',
      turn_id: activeTurnId,
      compaction_operation_id: compactionOperationId,
      requested_turn_id: activeTurnId,
      execution_turn_id: null,
      selected_block_count: null,
      compacted_block_count: null,
      raw_trace_count: null,
      semantic_fact_count: null
    });
  }
}
