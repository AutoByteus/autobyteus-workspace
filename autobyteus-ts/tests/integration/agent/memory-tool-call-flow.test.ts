import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { LLMRequestAssembler } from '../../../src/agent/llm-request-assembler.js';
import { ApiToolCallStreamingResponseHandler } from '../../../src/agent/streaming/handlers/api-tool-call-streaming-response-handler.js';
import { ToolResultEvent } from '../../../src/agent/events/agent-events.js';
import { OpenAIChatRenderer } from '../../../src/llm/prompt-renderers/openai-chat-renderer.js';
import { LLMUserMessage } from '../../../src/llm/user-message.js';
import { CompleteResponse } from '../../../src/llm/utils/response-types.js';
import { MemoryManager } from '../../../src/memory/memory-manager.js';
import { FileMemoryStore } from '../../../src/memory/store/file-store.js';
import { MemoryType } from '../../../src/memory/models/memory-types.js';
import { defaultToolRegistry } from '../../../src/tools/registry/tool-registry.js';
import { registerWriteFileTool } from '../../../src/tools/file/write-file.js';
import { OpenAiJsonSchemaFormatter } from '../../../src/tools/usage/formatters/openai-json-schema-formatter.js';
import { createLmstudioLLM, hasLmstudioConfig } from '../helpers/lmstudio-llm-helper.js';

const runIntegration = hasLmstudioConfig() ? describe : describe.skip;

runIntegration('Memory tool call flow (LM Studio)', () => {
  it('ingests tool calls/results and follow-up responses', async () => {
    const llm = await createLmstudioLLM();
    if (!llm) {
      return;
    }

    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mem-tool-call-'));
    try {
      registerWriteFileTool();
      const toolDef = defaultToolRegistry.getToolDefinition('write_file');
      expect(toolDef).toBeTruthy();

      const toolSchema = new OpenAiJsonSchemaFormatter().provide(toolDef!);

      const store = new FileMemoryStore(tempDir, 'agent_tool_flow');
      const memoryManager = new MemoryManager({ store });

      const turnId = memoryManager.startTurn();
      const userMessage = new LLMUserMessage({
        content: "Please write a python script named 'hello_world.py' that prints 'Hello World'."
      });
      memoryManager.ingestUserMessage(userMessage, turnId, 'LLMUserMessageReadyEvent');

      const assembler = new LLMRequestAssembler(memoryManager, new OpenAIChatRenderer());
      const request = await assembler.prepareRequest(userMessage, turnId, llm.config.systemMessage);

      const handler = new ApiToolCallStreamingResponseHandler();
      try {
        for await (const chunk of llm.streamMessages(request.messages, request.renderedPayload, {
          tools: [toolSchema],
          tool_choice: 'required'
        })) {
          handler.feed(chunk);
        }
        handler.finalize();
      } catch (error) {
        console.warn(`LM Studio streaming failed: ${String(error)}`);
        return;
      }

      const invocations = handler.getAllInvocations();
      if (!invocations.length) {
        console.warn('Model did not emit tool calls.');
        return;
      }

      for (const invocation of invocations) {
        invocation.turnId = turnId;
        memoryManager.ingestToolIntent(invocation, turnId);
        const resultEvent = new ToolResultEvent(
          invocation.name,
          'OK',
          invocation.id,
          undefined,
          invocation.arguments,
          turnId
        );
        memoryManager.ingestToolResult(resultEvent, turnId);
      }

      const followup = new LLMUserMessage({ content: "All tools finished. Please respond with 'done'." });
      const followRequest = await assembler.prepareRequest(followup, turnId, llm.config.systemMessage);

      let followResponse;
      try {
        followResponse = await llm.sendMessages(followRequest.messages, followRequest.renderedPayload);
      } catch (error) {
        console.warn(`LM Studio follow-up failed: ${String(error)}`);
        return;
      } finally {
        await llm.cleanup();
      }

      expect(followResponse.content).toBeTruthy();
      expect(followResponse.content?.toLowerCase()).toContain('done');

      memoryManager.ingestAssistantResponse(
        new CompleteResponse({ content: followResponse.content ?? '' }),
        turnId,
        'LLMCompleteResponseReceivedEvent'
      );

      const rawItems = store.list(MemoryType.RAW_TRACE);
      const traceTypes = new Set(rawItems.map((item) => item.traceType));
      expect(traceTypes.has('tool_call')).toBe(true);
      expect(traceTypes.has('tool_result')).toBe(true);
      expect(traceTypes.has('assistant')).toBe(true);
    } finally {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });
});
