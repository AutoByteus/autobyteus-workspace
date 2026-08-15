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
import { BaseLLM } from '../../../../src/llm/base.js';
import { LLMModel } from '../../../../src/llm/models.js';
import { LLMProvider } from '../../../../src/llm/providers.js';
import { LLMUserMessage } from '../../../../src/llm/user-message.js';
import { LLMConfig } from '../../../../src/llm/utils/llm-config.js';
import { buildLlmTokenUsageObservation } from '../../../../src/llm/utils/llm-token-usage-observation.js';
import { ChunkResponse, CompleteResponse } from '../../../../src/llm/utils/response-types.js';
import { MemoryManager } from '../../../../src/memory/memory-manager.js';
import { FileMemoryStore } from '../../../../src/memory/store/file-store.js';

class HighUsageLeafLLM extends BaseLLM {
  protected async _sendMessagesToLLM(): Promise<CompleteResponse> {
    return new CompleteResponse({ content: 'original leaf completion' });
  }

  protected async *_streamMessagesToLLM(): AsyncGenerator<ChunkResponse, void, unknown> {
    yield new ChunkResponse({
      content: 'original leaf completion',
      usage: buildLlmTokenUsageObservation({
        inputTokens: 1_000,
        outputTokens: 10,
        totalTokens: 1_010,
        rawUsage: null,
      }),
      is_complete: true,
    });
  }
}

describe('LlmPhase disabled automatic compaction', () => {
  it('resolves ordinary request capacity but performs no automatic-compaction work at hard-cap pressure', async () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'disabled-memory-compaction-phase-'));
    try {
      const llm = new HighUsageLeafLLM(
        new LLMModel({
          name: 'disabled-leaf-model',
          value: 'disabled-leaf-model',
          canonicalName: 'disabled-leaf-model',
          provider: LLMProvider.OPENAI,
          activeContextTokens: 1_200,
          maxContextTokens: 1_200,
          maxOutputTokens: 100,
          defaultCompactionRatio: 0.2,
          defaultSafetyMarginTokens: 256,
        }),
        new LLMConfig({ maxTokens: 100, compactionRatio: 0.01 }),
      );
      const memoryManager = new MemoryManager({
        store: new FileMemoryStore(tempDir, 'disabled-leaf'),
      });
      const evaluateObservation = vi.spyOn(memoryManager, 'evaluateCompactionObservation');
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
      expect(evaluateObservation).not.toHaveBeenCalled();
      expect(memoryManager.hasPendingCompaction()).toBe(false);
      expect(memoryManager.getPendingCompactionGate()).toEqual({ kind: 'none' });
      expect(notifyAgentCompactionStatus).not.toHaveBeenCalled();
      expect(notifyAgentTokenUsageUpdated).toHaveBeenCalledWith(expect.objectContaining({
        latest_prompt_tokens: 1_000,
        effective_context_window_tokens: 1_200,
      }));
    } finally {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });
});
