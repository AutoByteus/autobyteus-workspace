import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import { AgentTurn } from '../../../../src/agent/agent-turn.js';
import { AgentConfig } from '../../../../src/agent/context/agent-config.js';
import { AgentContext } from '../../../../src/agent/context/agent-context.js';
import { AgentRuntimeState } from '../../../../src/agent/context/agent-runtime-state.js';
import { UserMessageReceivedEvent } from '../../../../src/agent/events/agent-events.js';
import { LlmPhase } from '../../../../src/agent/loop/llm-phase.js';
import { AgentInputUserMessage } from '../../../../src/agent/message/agent-input-user-message.js';
import {
  resolveCompactionTokenBudget,
  resolveLlmRequestCapacity,
} from '../../../../src/agent/token-budget.js';
import { BaseLLM } from '../../../../src/llm/base.js';
import { LLMModel } from '../../../../src/llm/models.js';
import { LLMProvider } from '../../../../src/llm/providers.js';
import { LLMUserMessage } from '../../../../src/llm/user-message.js';
import { LLMConfig } from '../../../../src/llm/utils/llm-config.js';
import { buildLlmTokenUsageObservation } from '../../../../src/llm/utils/llm-token-usage-observation.js';
import { ChunkResponse, CompleteResponse } from '../../../../src/llm/utils/response-types.js';
import { defaultWorkingContextCompactionStrategyRegistry } from '../../../../src/memory/compaction/default-working-context-compaction-strategy-registry.js';
import { MemoryManager } from '../../../../src/memory/memory-manager.js';
import { MemoryType } from '../../../../src/memory/models/memory-types.js';
import { CompactionPolicy } from '../../../../src/memory/policies/compaction-policy.js';
import { FileMemoryStore } from '../../../../src/memory/store/file-store.js';

class ObservedUsageLeafLLM extends BaseLLM {
  constructor(
    model: LLMModel,
    config: LLMConfig,
    private readonly observedPromptTokens: number,
  ) {
    super(model, config);
  }

  protected async _sendMessagesToLLM(): Promise<CompleteResponse> {
    return new CompleteResponse({ content: 'original leaf completion' });
  }

  protected async *_streamMessagesToLLM(): AsyncGenerator<ChunkResponse, void, unknown> {
    yield new ChunkResponse({
      content: 'original leaf completion',
      usage: buildLlmTokenUsageObservation({
        inputTokens: this.observedPromptTokens,
        outputTokens: 10,
        totalTokens: this.observedPromptTokens + 10,
        rawUsage: null,
      }),
      is_complete: true,
    });
  }
}

describe('LlmPhase disabled automatic compaction', () => {
  const runDisabledObservation = async (
    observedPromptTokens: number,
    expectedPressure: 'proactive' | 'hard-cap',
  ): Promise<void> => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'disabled-memory-compaction-phase-'));
    const classifyPressure = vi.spyOn(CompactionPolicy.prototype, 'classifyPressure');
    const resolveStrategy = vi.spyOn(defaultWorkingContextCompactionStrategyRegistry, 'get');
    try {
      const llm = new ObservedUsageLeafLLM(
        new LLMModel({
          name: 'disabled-leaf-model',
          value: 'disabled-leaf-model',
          canonicalName: 'disabled-leaf-model',
          provider: LLMProvider.OPENAI,
          activeContextTokens: 617_024,
          maxContextTokens: 617_024,
          maxOutputTokens: 1_024,
          defaultCompactionRatio: 0.2,
          defaultSafetyMarginTokens: 256,
        }),
        new LLMConfig({
          maxTokens: 1_024,
          compactionRatio: 0.2,
          safetyMarginTokens: 256,
        }),
        observedPromptTokens,
      );
      const memoryManager = new MemoryManager({
        store: new FileMemoryStore(tempDir, 'disabled-leaf'),
      });
      const evaluateObservation = vi.spyOn(memoryManager, 'evaluateCompactionObservation');
      const beginPendingAttempt = vi.spyOn(memoryManager, 'beginPendingCompactionAttempt');
      const captureCompactionBaseline = vi.spyOn(memoryManager, 'captureCompactionBaseline');
      const state = new AgentRuntimeState('disabled-leaf');
      state.llmInstance = llm;
      state.memoryManager = memoryManager;
      state.toolInstances = {};
      const notifyAgentCompactionStatus = vi.fn();
      state.statusManagerRef = {
        notifier: { notifyAgentCompactionStatus },
      } as any;
      const config = new AgentConfig('leaf', 'compactor', 'one-shot leaf', llm);
      const context = new AgentContext('disabled-leaf', config, state);
      const turn = new AgentTurn('turn-leaf');
      const notifyAgentTokenUsageUpdated = vi.fn();
      const notifier = {
        notifyAgentSegmentEvent: vi.fn(),
        notifyAgentTokenUsageUpdated,
        notifyAgentErrorOutputGeneration: vi.fn(),
      } as any;

      const content = 'compact this one-shot task';
      const requestCapacity = resolveLlmRequestCapacity(llm.model, llm.config);
      expect(requestCapacity?.inputBudget).toBe(615_744);
      const planningBudget = resolveCompactionTokenBudget(
        requestCapacity!,
        llm.model,
        llm.config,
        new CompactionPolicy(),
      );
      expect(planningBudget.triggerThresholdTokens).toBe(123_148);
      expect(observedPromptTokens).toBeGreaterThanOrEqual(
        expectedPressure === 'hard-cap'
          ? planningBudget.inputBudget
          : planningBudget.triggerThresholdTokens,
      );
      if (expectedPressure === 'proactive') {
        expect(observedPromptTokens).toBeLessThan(planningBudget.inputBudget);
      }
      const outcome = await new LlmPhase().run(
        {
          llmUserMessage: new LLMUserMessage({ content }),
          turnId: turn.turnId,
          sourceEvent: new UserMessageReceivedEvent(new AgentInputUserMessage(content)),
        },
        context,
        turn,
        notifier,
      );

      expect(outcome).toMatchObject({
        kind: 'final',
        response: { content: 'original leaf completion' },
      });
      expect(memoryManager.getAutomaticCompactionConfiguration()).toEqual({ kind: 'disabled' });
      expect(classifyPressure).not.toHaveBeenCalled();
      expect(evaluateObservation).not.toHaveBeenCalled();
      expect(resolveStrategy).not.toHaveBeenCalled();
      expect(beginPendingAttempt).not.toHaveBeenCalled();
      expect(captureCompactionBaseline).not.toHaveBeenCalled();
      expect(memoryManager.hasPendingCompaction()).toBe(false);
      expect(memoryManager.getPendingCompactionGate()).toEqual({ kind: 'none' });
      expect(memoryManager.store.list(MemoryType.EPISODIC)).toEqual([]);
      expect(memoryManager.store.list(MemoryType.SEMANTIC)).toEqual([]);
      expect(notifyAgentCompactionStatus).not.toHaveBeenCalled();
      expect(notifyAgentTokenUsageUpdated).toHaveBeenCalledWith(expect.objectContaining({
        latest_prompt_tokens: observedPromptTokens,
        effective_context_window_tokens: 617_024,
      }));
    } finally {
      classifyPressure.mockRestore();
      resolveStrategy.mockRestore();
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  };

  it('reports capacity but performs no automatic-compaction work at captured proactive pressure', async () => {
    await runDisabledObservation(176_655, 'proactive');
  });

  it('reports capacity but performs no automatic-compaction work at the policy hard cap', async () => {
    await runDisabledObservation(615_744, 'hard-cap');
  });
});
