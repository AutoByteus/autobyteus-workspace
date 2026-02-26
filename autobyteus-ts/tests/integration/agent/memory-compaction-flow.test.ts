import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { LLMRequestAssembler } from '../../../src/agent/llm-request-assembler.js';
import { OpenAIChatRenderer } from '../../../src/llm/prompt-renderers/openai-chat-renderer.js';
import { LLMUserMessage } from '../../../src/llm/user-message.js';
import { CompleteResponse } from '../../../src/llm/utils/response-types.js';
import { MemoryManager } from '../../../src/memory/memory-manager.js';
import { FileMemoryStore } from '../../../src/memory/store/file-store.js';
import { MemoryType } from '../../../src/memory/models/memory-types.js';
import { Compactor } from '../../../src/memory/compaction/compactor.js';
import { CompactionResult } from '../../../src/memory/compaction/compaction-result.js';
import { Summarizer } from '../../../src/memory/compaction/summarizer.js';
import { CompactionPolicy } from '../../../src/memory/policies/compaction-policy.js';
import { createLmstudioLLM, hasLmstudioConfig } from '../helpers/lmstudio-llm-helper.js';

class DummySummarizer extends Summarizer {
  summarize(traces: any[]): CompactionResult {
    const summary = traces.map((trace) => trace.content).filter(Boolean).join(' ');
    return new CompactionResult(summary || 'summary', [{ fact: 'user wants pong', confidence: 0.5 }]);
  }
}

const runIntegration = hasLmstudioConfig() ? describe : describe.skip;

runIntegration('Memory compaction flow (LM Studio)', () => {
  it('compacts and keeps raw tail', async () => {
    const llm = await createLmstudioLLM();
    if (!llm) {
      return;
    }

    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mem-compaction-flow-'));
    try {
      const store = new FileMemoryStore(tempDir, 'agent_mem_compact');
      const policy = new CompactionPolicy({ rawTailTurns: 1, triggerRatio: 0.1 });
      const compactor = new Compactor(store, policy, new DummySummarizer());
      const memoryManager = new MemoryManager({ store, compactionPolicy: policy, compactor });

      for (let idx = 0; idx < 2; idx += 1) {
        const turnId = memoryManager.startTurn();
        memoryManager.ingestUserMessage(
          new LLMUserMessage({ content: `turn ${idx} user` }),
          turnId,
          'LLMUserMessageReadyEvent'
        );
        memoryManager.ingestAssistantResponse(
          new CompleteResponse({ content: `turn ${idx} assistant` }),
          turnId,
          'LLMCompleteResponseReceivedEvent'
        );
      }

      const currentTurnId = memoryManager.startTurn();
      const userMessage = new LLMUserMessage({ content: "Please respond with the word 'pong'." });
      memoryManager.ingestUserMessage(userMessage, currentTurnId, 'LLMUserMessageReadyEvent');

      const assembler = new LLMRequestAssembler(memoryManager, new OpenAIChatRenderer());
      memoryManager.requestCompaction();

      const request = await assembler.prepareRequest(userMessage, currentTurnId, llm.config.systemMessage);

      expect(request.didCompact).toBe(true);
      expect(store.list(MemoryType.EPISODIC).length).toBeGreaterThan(0);
      expect(store.list(MemoryType.SEMANTIC).length).toBeGreaterThan(0);

      let response;
      try {
        response = await llm.sendMessages(request.messages, request.renderedPayload);
      } catch (error) {
        console.warn(`LM Studio request failed: ${String(error)}`);
        return;
      } finally {
        await llm.cleanup();
      }

      expect(response.content).toBeTruthy();
      expect(response.content?.toLowerCase()).toContain('pong');

      memoryManager.ingestAssistantResponse(response, currentTurnId, 'LLMCompleteResponseReceivedEvent');

      const rawItems = store.list(MemoryType.RAW_TRACE);
      expect(rawItems.length).toBeGreaterThan(0);
      expect(new Set(rawItems.map((item) => item.turnId))).toEqual(new Set([currentTurnId]));
    } finally {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });
});
