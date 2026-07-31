import { describe, expect, it, vi } from 'vitest';
import { CompactionPreparationError } from '../../../src/agent/compaction/compaction-preparation-error.js';
import { LLMRequestAssembler } from '../../../src/agent/llm-request-assembler.js';
import { BasePromptRenderer } from '../../../src/llm/prompt-renderers/base-prompt-renderer.js';
import { Message, MessageRole, ToolCallPayload, ToolResultPayload } from '../../../src/llm/utils/messages.js';
import { WorkingContext } from '../../../src/memory/working-context.js';
import { MemoryManager } from '../../../src/memory/memory-manager.js';
import { FileMemoryStore } from '../../../src/memory/store/file-store.js';
import { OpenAIChatRenderer } from '../../../src/llm/prompt-renderers/openai-chat-renderer.js';
import { RawTraceItem } from '../../../src/memory/models/raw-trace-item.js';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

class FakeRenderer extends BasePromptRenderer {
  async render(messages: Message[]) {
    return messages.map((message) => ({ role: message.role, content: message.content }));
  }
}

class FakeMemoryManager {
  workingContext = new WorkingContext();
  ensureWorkingContextToolProtocolSafeForNextLlm = vi.fn(() => ({
    messages: this.workingContext.buildMessages(),
    didRepair: false,
    repairs: [],
  }));

  getWorkingContextMessages(): Message[] {
    return this.workingContext.buildMessages();
  }

  ensureWorkingContextSystemMessage(content: string): boolean {
    if (this.getWorkingContextMessages().length) return false;
    this.workingContext.appendMessage(new Message(MessageRole.SYSTEM, { content }));
    return true;
  }

  appendWorkingContextUserMessage(message: Message): void {
    this.workingContext.appendMessage(message);
  }

  replaceWorkingContext(context: WorkingContext): void {
    this.workingContext = context.copy();
  }
}

describe('LLMRequestAssembler', () => {
  it('appends the system prompt and user message without compaction', async () => {
    const memoryManager = new FakeMemoryManager();
    const assembler = new LLMRequestAssembler(memoryManager as any, new FakeRenderer());

    const request = await assembler.prepareRequest('hello', null, 'System prompt');

    expect(request.didCompact).toBe(false);
    expect(request.canonicalMessages.map((message) => message.role)).toEqual([MessageRole.SYSTEM, MessageRole.USER]);
    expect(request.outboundMessages).toEqual(request.canonicalMessages);
    expect(memoryManager.workingContext.buildMessages()).toEqual(request.canonicalMessages);
    expect(memoryManager.ensureWorkingContextToolProtocolSafeForNextLlm).toHaveBeenCalledTimes(2);
  });

  it('delegates pending compaction execution before appending the current user message', async () => {
    const memoryManager = new FakeMemoryManager();
    const executorCalls: Array<Record<string, unknown>> = [];
    const executor = {
      executeIfRequired: vi.fn(async (input: Record<string, unknown>) => {
        executorCalls.push(input);
        memoryManager.replaceWorkingContext(new WorkingContext([
          new Message(MessageRole.SYSTEM, { content: 'System prompt' }),
          new Message(MessageRole.USER, { content: 'Earlier progress:\n1. Durable summary' }),
        ]));
        return true;
      })
    };

    const assembler = new LLMRequestAssembler(memoryManager as any, new FakeRenderer(), executor as any);
    const request = await assembler.prepareRequest('new input', 'turn_0002', 'System prompt');

    expect(request.didCompact).toBe(true);
    expect(memoryManager.ensureWorkingContextToolProtocolSafeForNextLlm.mock.invocationCallOrder[0]).toBeLessThan(
      executor.executeIfRequired.mock.invocationCallOrder[0]
    );
    expect(executorCalls).toEqual([
      {
        turnId: 'turn_0002',
      }
    ]);
    expect(request.canonicalMessages.map((message) => message.role)).toEqual([
      MessageRole.SYSTEM,
      MessageRole.USER,
      MessageRole.USER,
    ]);
    expect(request.canonicalMessages[1]?.content).toContain('Durable summary');
    expect(request.canonicalMessages[2]?.content).toBe('new input');
    expect(memoryManager.ensureWorkingContextToolProtocolSafeForNextLlm).toHaveBeenCalledTimes(2);
  });

  it('repairs already-poisoned native tool-call history before OpenAI-compatible render', async () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'llm-request-assembler-repair-'));
    try {
      const store = new FileMemoryStore(tempDir, 'agent_request_repair');
      store.add([
        new RawTraceItem({
          id: 'rt_call_missing',
          ts: 1,
          turnId: 'turn_old',
          seq: 1,
          traceType: 'tool_call',
          content: '',
          sourceEvent: 'PendingToolInvocationEvent',
          toolName: 'generate_image',
          toolCallId: 'call_missing',
          toolArgs: { prompt: 'draw a sheep' },
        }),
      ]);
      const memoryManager = new MemoryManager({ store });
      memoryManager.replaceWorkingContext(new WorkingContext([
        new Message(MessageRole.SYSTEM, { content: 'System prompt' }),
        new Message(MessageRole.ASSISTANT, {
          content: 'I will draw page two.',
          tool_payload: new ToolCallPayload([
            { id: 'call_missing', name: 'generate_image', arguments: { prompt: 'draw a sheep' } },
          ]),
        }),
        new Message(MessageRole.USER, { content: 'already failed continue attempt' }),
      ]));

      const request = await new LLMRequestAssembler(
        memoryManager,
        new OpenAIChatRenderer(),
      ).prepareRequest('please continue there was a shutdown', 'turn_new', 'System prompt');

      const rendered = request.renderedPayload as any[];
      const assistantIndex = rendered.findIndex((message) => Array.isArray(message.tool_calls));
      expect(assistantIndex).toBeGreaterThanOrEqual(0);
      expect(rendered[assistantIndex + 1]).toMatchObject({
        role: 'tool',
        tool_call_id: 'call_missing',
      });
      expect(rendered[assistantIndex + 1].content).toContain(
        'Tool execution was interrupted by runtime shutdown before a result was recorded.'
      );
      expect(rendered[assistantIndex + 2]).toMatchObject({
        role: 'user',
        content: 'already failed continue attempt',
      });
      expect(rendered.at(-1)).toMatchObject({
        role: 'user',
        content: 'please continue there was a shutdown',
      });
      expect(request.canonicalMessages[assistantIndex + 1]?.tool_payload).toBeInstanceOf(ToolResultPayload);
    } finally {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it('propagates compaction preparation errors', async () => {
    const memoryManager = new FakeMemoryManager();
    const executor = {
      executeIfRequired: async () => {
        throw new CompactionPreparationError('compaction blocked');
      }
    };

    const assembler = new LLMRequestAssembler(memoryManager as any, new FakeRenderer(), executor as any);

    await expect(assembler.prepareRequest('hello', 'turn_0002', 'System prompt')).rejects.toBeInstanceOf(
      CompactionPreparationError
    );
  });
});
