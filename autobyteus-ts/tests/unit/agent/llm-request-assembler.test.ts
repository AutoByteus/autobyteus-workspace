import { describe, expect, it } from 'vitest';
import { CompactionPreparationError } from '../../../src/agent/compaction/compaction-preparation-error.js';
import { LLMRequestAssembler } from '../../../src/agent/llm-request-assembler.js';
import { BasePromptRenderer } from '../../../src/llm/prompt-renderers/base-prompt-renderer.js';
import { Message, MessageRole } from '../../../src/llm/utils/messages.js';
import { WorkingContextSnapshot } from '../../../src/memory/working-context-snapshot.js';

class FakeRenderer extends BasePromptRenderer {
  async render(messages: Message[]) {
    return messages.map((message) => ({ role: message.role, content: message.content }));
  }
}

class FakeMemoryManager {
  workingContextSnapshot = new WorkingContextSnapshot();

  getWorkingContextMessages(): Message[] {
    return this.workingContextSnapshot.buildMessages();
  }
}

describe('LLMRequestAssembler', () => {
  it('appends the system prompt and user message without compaction', async () => {
    const memoryManager = new FakeMemoryManager();
    const assembler = new LLMRequestAssembler(memoryManager as any, new FakeRenderer());

    const request = await assembler.prepareRequest('hello', null, 'System prompt');

    expect(request.didCompact).toBe(false);
    expect(request.messages.map((message) => message.role)).toEqual([MessageRole.SYSTEM, MessageRole.USER]);
    expect(memoryManager.workingContextSnapshot.buildMessages()).toEqual(request.messages);
  });

  it('delegates pending compaction execution before appending the current user message', async () => {
    const memoryManager = new FakeMemoryManager();
    const executorCalls: Array<Record<string, unknown>> = [];
    const executor = {
      executeIfRequired: async (input: Record<string, unknown>) => {
        executorCalls.push(input);
        memoryManager.workingContextSnapshot.reset([
          new Message(MessageRole.SYSTEM, { content: 'System prompt' }),
          new Message(MessageRole.USER, { content: '[MEMORY:EPISODIC]\n1) Durable summary' }),
        ]);
        return true;
      }
    };

    const assembler = new LLMRequestAssembler(memoryManager as any, new FakeRenderer(), executor as any);
    const request = await assembler.prepareRequest('new input', 'turn_0002', 'System prompt', 'main-model');

    expect(request.didCompact).toBe(true);
    expect(executorCalls).toEqual([
      {
        turnId: 'turn_0002',
        systemPrompt: 'System prompt',
        activeModelIdentifier: 'main-model',
      }
    ]);
    expect(request.messages.map((message) => message.role)).toEqual([
      MessageRole.SYSTEM,
      MessageRole.USER,
      MessageRole.USER,
    ]);
    expect(request.messages[1]?.content).toContain('Durable summary');
    expect(request.messages[2]?.content).toBe('new input');
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
