import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { LLMRequestAssembler } from '../../../src/agent/llm-request-assembler.js';
import { OpenAIChatRenderer } from '../../../src/llm/prompt-renderers/openai-chat-renderer.js';
import { LLMUserMessage } from '../../../src/llm/user-message.js';
import { MemoryManager } from '../../../src/memory/memory-manager.js';
import { FileMemoryStore } from '../../../src/memory/store/file-store.js';
import { MemoryType } from '../../../src/memory/models/memory-types.js';
import { createLmstudioLLM, hasLmstudioConfig } from '../helpers/lmstudio-llm-helper.js';

const runIntegration = hasLmstudioConfig() ? describe : describe.skip;

runIntegration('Memory assembler with LM Studio', () => {
  it('ingests memory around LLM responses', async () => {
    const llm = await createLmstudioLLM();
    if (!llm) {
      return;
    }

    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mem-llm-flow-'));
    try {
      const store = new FileMemoryStore(tempDir, 'agent_mem_1');
      const memoryManager = new MemoryManager({ store });

      const turnId = memoryManager.startTurn();
      const userMessage = new LLMUserMessage({ content: "Please respond with the word 'pong'." });
      memoryManager.ingestUserMessage(userMessage, turnId, 'LLMUserMessageReadyEvent');

      const assembler = new LLMRequestAssembler(memoryManager, new OpenAIChatRenderer());
      const request = await assembler.prepareRequest(userMessage, turnId, llm.config.systemMessage);

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

      memoryManager.ingestAssistantResponse(response, turnId, 'LLMCompleteResponseReceivedEvent');

      const rawItems = store.list(MemoryType.RAW_TRACE);
      expect(rawItems).toHaveLength(2);
    } finally {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });
});
