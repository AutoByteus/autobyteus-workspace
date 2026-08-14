import { describe, expect, it, vi } from 'vitest';
import { evaluateLlmPhaseCompaction } from '../../../../src/agent/loop/llm-phase-compaction.js';
import type { CompactionRuntimeReporter } from '../../../../src/agent/compaction/compaction-runtime-reporter.js';
import type { BaseLLM } from '../../../../src/llm/base.js';
import { LLMModel } from '../../../../src/llm/models.js';
import { LLMProvider } from '../../../../src/llm/providers.js';
import { LLMConfig } from '../../../../src/llm/utils/llm-config.js';
import { buildLlmTokenUsageObservation } from '../../../../src/llm/utils/llm-token-usage-observation.js';
import { resolveCompactionPlanningBudget } from '../../../../src/memory/compaction/compaction-planning-budget.js';
import type { CompactionRuntimeSettingsResolver } from '../../../../src/memory/compaction/compaction-runtime-settings.js';
import { MemoryManagerCompactionCoordinator } from '../../../../src/memory/memory-manager-compaction-coordinator.js';
import type { MemoryManager } from '../../../../src/memory/memory-manager.js';
import { CompactionPolicy } from '../../../../src/memory/policies/compaction-policy.js';
import { WorkingContext } from '../../../../src/memory/working-context.js';

const acceptedPlanningBudget = () => resolveCompactionPlanningBudget(
  { inputBudget: 5_000, triggerThresholdTokens: 1_000 },
  1_200,
);

const buildHarness = (
  episodeKind: 'awaiting_below_observation' | 'inadequate_reduction_suppressed' =
    'awaiting_below_observation',
) => {
  const planningBudget = acceptedPlanningBudget();
  const coordinator = new MemoryManagerCompactionCoordinator({
    store: {} as any,
    lineageStore: null,
    lineageScope: null,
    snapshotStore: null,
    agentId: 'agent-1',
    getContext: () => new WorkingContext(),
    installContext: () => undefined,
  });
  coordinator.restoreState({
    pendingCompactionRequest: null,
    thresholdEpisode: episodeKind === 'awaiting_below_observation'
      ? {
          kind: 'awaiting_below_observation',
          budgetKey: planningBudget.budgetKey,
          completedOperationId: 'operation-1',
          postCompactionTargetTokens: planningBudget.postCompactionTargetTokens,
        }
      : {
          kind: 'inadequate_reduction_suppressed',
          budgetKey: planningBudget.budgetKey,
          completedOperationId: 'operation-1',
          postCompactionTargetTokens: planningBudget.postCompactionTargetTokens,
          firstObservedPromptTokens: 1_200,
          diagnosticEmitted: true,
        },
  });

  const compactionPolicy = new CompactionPolicy();
  const evaluateCompactionObservation = vi.fn(
    (input: Parameters<MemoryManager['evaluateCompactionObservation']>[0]) =>
      coordinator.evaluateObservation({
        ...input,
        pressure: compactionPolicy.classifyPressure(
          input.planningBudget.observedPromptTokens,
          input.planningBudget.inputBudgetTokens,
          input.planningBudget.triggerThresholdTokens,
        ),
      }),
  );
  const memoryManager = {
    compactionPolicy,
    evaluateCompactionObservation,
  } as unknown as MemoryManager;
  const llmInstance = {
    model: new LLMModel({
      name: 'compaction-observation-test',
      value: 'compaction-observation-test',
      canonicalName: 'compaction-observation-test',
      provider: LLMProvider.OPENAI,
      activeContextTokens: 6_000,
      maxOutputTokens: 1_000,
      defaultCompactionRatio: 0.2,
      defaultSafetyMarginTokens: 0,
    }),
    config: new LLMConfig({ maxTokens: 1_000 }),
  } as BaseLLM;
  const compactionReporter = {
    logBudgetSkippedNoUsage: vi.fn(),
    logBudgetEvaluated: vi.fn(),
    emitStatus: vi.fn(),
    reportInadequateReduction: vi.fn(),
  } as unknown as CompactionRuntimeReporter;
  const runtimeSettingsResolver = {
    resolve: () => ({
      strategyId: 'structured_json',
      triggerRatioOverride: null,
      activeContextTokensOverride: null,
      detailedLogsEnabled: true,
    }),
  } as CompactionRuntimeSettingsResolver;

  return {
    coordinator,
    memoryManager,
    evaluateCompactionObservation,
    llmInstance,
    compactionReporter,
    runtimeSettingsResolver,
  };
};

describe('evaluateLlmPhaseCompaction prompt-token observations', () => {
  it.each([
    'awaiting_below_observation',
    'inadequate_reduction_suppressed',
  ] as const)('leaves the %s episode unchanged when present usage lacks prompt tokens', (episodeKind) => {
    const harness = buildHarness(episodeKind);
    const tokenUsage = buildLlmTokenUsageObservation({
      inputTokens: null,
      outputTokens: 12,
      rawUsage: { completion_tokens: 12 },
    });
    const before = harness.coordinator.captureState();

    expect(evaluateLlmPhaseCompaction({
      ...harness,
      tokenUsage,
      observedPromptTokens: null,
      activeTurnId: 'turn-missing',
    })).toBeNull();

    expect(harness.coordinator.captureState()).toEqual(before);
    expect(harness.evaluateCompactionObservation).not.toHaveBeenCalled();
    expect(harness.compactionReporter.logBudgetSkippedNoUsage).toHaveBeenCalledWith({
      turn_id: 'turn-missing',
      reason: 'missing_prompt_tokens',
      quality_flags: expect.arrayContaining(['input_tokens_missing']),
    }, true);
    expect(harness.compactionReporter.logBudgetEvaluated).not.toHaveBeenCalled();
  });

  it('keeps a genuine numeric zero as a below-threshold observation', () => {
    const harness = buildHarness();
    const tokenUsage = buildLlmTokenUsageObservation({
      inputTokens: 0,
      outputTokens: 12,
      rawUsage: { prompt_tokens: 0, completion_tokens: 12 },
    });

    expect(evaluateLlmPhaseCompaction({
      ...harness,
      tokenUsage,
      observedPromptTokens: 0,
      activeTurnId: 'turn-zero',
    })).toMatchObject({ kind: 'reset' });

    expect(harness.coordinator.captureState().thresholdEpisode).toEqual({ kind: 'ready' });
    expect(harness.evaluateCompactionObservation).toHaveBeenCalledOnce();
    expect(harness.compactionReporter.logBudgetEvaluated).toHaveBeenCalledWith(
      expect.objectContaining({ prompt_tokens: 0, threshold_episode_decision: 'reset' }),
      true,
    );
    expect(harness.compactionReporter.logBudgetSkippedNoUsage).not.toHaveBeenCalled();
  });
});
