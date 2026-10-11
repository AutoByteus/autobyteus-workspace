import {
  applyCompactionPolicy,
  resolveCompactionTokenBudget,
  type CompactionTokenBudget,
  type LlmRequestCapacity,
} from '../token-budget.js';
import type { BaseLLM } from '../../llm/base.js';
import type { LlmTokenUsageObservation } from '../../llm/utils/llm-token-usage-observation.js';
import type { AgentContext } from '../context/agent-context.js';
import type { AgentExternalEventNotifier } from '../events/notifiers.js';
import type { TurnExecutionScope } from '../interruption/turn-execution-scope.js';
import type { LLMRequestAssembler } from '../llm-request-assembler.js';
import { CompactionRuntimeReporter } from '../compaction/compaction-runtime-reporter.js';
import type {
  CompactionRuntimeSettings,
  CompactionRuntimeSettingsResolver,
} from '../../memory/compaction/compaction-runtime-settings.js';
import { resolveCompactionPlanningBudget } from '../../memory/compaction/compaction-planning-budget.js';
import { PendingCompactionExecutor } from '../../memory/compaction/pending-compaction-executor.js';
import type { EnabledMemoryCompactionConfiguration } from '../../memory/compaction/memory-compaction-configuration.js';
import type { CompactionObservationDecision } from '../../memory/memory-manager.js';
import { LlmPhaseSummaryPort } from './llm-phase-summary-port.js';

type MemoryManagerLike = NonNullable<AgentContext['state']['memoryManager']>;

export function evaluateLlmPhaseCompaction(input: {
  memoryManager: MemoryManagerLike;
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

/**
 * Automatic compaction for one LLM call: the reporter, the compaction token budget (with the
 * policy applied) and the pending-compaction executor with the agent's summary port. It
 * evaluates the threshold after a response and runs after-final compaction. Created only when
 * automatic compaction is enabled; pre-request compaction stays inside the request assembler.
 */
export class LlmCallCompaction {
  private constructor(
    readonly executor: PendingCompactionExecutor,
    private readonly memoryManager: MemoryManagerLike,
    private readonly reporter: CompactionRuntimeReporter,
    private readonly tokenBudget: CompactionTokenBudget | null,
    private readonly runtimeSettingsResolver: CompactionRuntimeSettingsResolver,
  ) {}

  static create(input: {
    automaticCompaction: EnabledMemoryCompactionConfiguration;
    agentId: string;
    context: AgentContext;
    memoryManager: MemoryManagerLike;
    llm: BaseLLM;
    toolSchemas: ReadonlyArray<Record<string, unknown>>;
    requestCapacity: LlmRequestCapacity | null;
    runtimeSettingsResolver: CompactionRuntimeSettingsResolver;
    runtimeSettings: CompactionRuntimeSettings;
    notifier: AgentExternalEventNotifier | null;
  }): LlmCallCompaction {
    const { automaticCompaction, agentId, context, memoryManager, llm, toolSchemas, requestCapacity, notifier } = input;
    const tokenBudget = requestCapacity
      ? resolveCompactionTokenBudget(requestCapacity, llm.model, llm.config, automaticCompaction.policy, input.runtimeSettings)
      : null;
    if (tokenBudget) {
      applyCompactionPolicy(automaticCompaction.policy, tokenBudget);
    }
    const reporter = new CompactionRuntimeReporter(agentId, context.statusManager?.notifier ?? null);
    const executor = new PendingCompactionExecutor(memoryManager, {
      reporter,
      summaryPort: new LlmPhaseSummaryPort({ agentId, llm, tools: toolSchemas, requestCapacity, notifier }),
      maxItemChars: automaticCompaction.policy.maxItemChars,
      onRecoveryStateChanged: (previous) => context.state.compactionRecovery?.publish(previous),
    });
    return new LlmCallCompaction(executor, memoryManager, reporter, tokenBudget, input.runtimeSettingsResolver);
  }

  /** Evaluates the compaction threshold from the response's observed prompt tokens. */
  evaluateAfterResponse(input: {
    usage: LlmTokenUsageObservation | null;
    observedPromptTokens: number | null;
    turnId: string;
  }): CompactionObservationDecision | null {
    return evaluateLlmPhaseCompaction({
      memoryManager: this.memoryManager,
      tokenBudget: this.tokenBudget,
      tokenUsage: input.usage,
      observedPromptTokens: input.observedPromptTokens,
      activeTurnId: input.turnId,
      compactionReporter: this.reporter,
      runtimeSettingsResolver: this.runtimeSettingsResolver,
    });
  }

  /**
   * Runs authorized after-final compaction once the stream is fully consumed and no tool
   * call is pending. The request prefix is bound first, so the cached summary request replays
   * the settled history under the current prefix. A failure is reported; the answer stands.
   */
  async executeAfterFinalResponse(input: {
    assembler: LLMRequestAssembler;
    requestTools: ReadonlyArray<Record<string, unknown>>;
    turnId: string;
    scope: TurnExecutionScope;
    context: AgentContext;
    notifier: AgentExternalEventNotifier | null;
  }): Promise<void> {
    const { assembler, requestTools, turnId, scope, context, notifier } = input;
    try {
      assembler.bindRequestPrefix(requestTools);
      await this.executor.executeIfAuthorized({
        executionSite: 'after_final_response',
        turnId,
        signal: scope.signal,
      });
    } catch (error) {
      scope.throwIfAborted({ kind: 'llm_compaction' });
      context.state.compactionRecovery?.publish();
      const errorMessage = error instanceof Error ? error.message : String(error);
      notifier?.notifyAgentErrorOutputGeneration({
        code: 'LLM_IMMEDIATE_COMPACTION_FAILED',
        message: errorMessage,
        details: String(error),
        classification: { scope: 'turn', effect: 'diagnostic', turnId }
      });
      // The parent answer was already consumed. Preserve its response/hooks/completion once.
    }
  }
}
