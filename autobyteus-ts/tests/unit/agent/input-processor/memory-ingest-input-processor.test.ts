import { describe, it, expect, vi } from 'vitest';
import { AgentConfig } from '../../../../src/agent/context/agent-config.js';
import { AgentRuntimeState } from '../../../../src/agent/context/agent-runtime-state.js';
import { AgentContext } from '../../../../src/agent/context/agent-context.js';
import { AgentInputUserMessage } from '../../../../src/agent/message/agent-input-user-message.js';
import { MemoryIngestInputProcessor } from '../../../../src/agent/input-processor/memory-ingest-input-processor.js';
import { SenderType } from '../../../../src/agent/sender-type.js';
import { BaseLLM } from '../../../../src/llm/base.js';
import { LLMModel } from '../../../../src/llm/models.js';
import { LLMProvider } from '../../../../src/llm/providers.js';
import { LLMConfig } from '../../../../src/llm/utils/llm-config.js';
import { CompleteResponse, ChunkResponse } from '../../../../src/llm/utils/response-types.js';
import type { Message } from '../../../../src/llm/utils/messages.js';

class DummyLLM extends BaseLLM {
  protected async _sendMessagesToLLM(_messages: Message[]): Promise<CompleteResponse> {
    return new CompleteResponse({ content: 'ok' });
  }

  protected async *_streamMessagesToLLM(
    _messages: Message[]
  ): AsyncGenerator<ChunkResponse, void, unknown> {
    yield new ChunkResponse({ content: 'ok', is_complete: true });
  }
}

const makeContext = () => {
  const model = new LLMModel({
    name: 'dummy',
    value: 'dummy',
    canonicalName: 'dummy',
    provider: LLMProvider.OPENAI
  });
  const llm = new DummyLLM(model, new LLMConfig());
  const config = new AgentConfig('name', 'role', 'desc', llm);
  const state = new AgentRuntimeState('agent-1');
  return new AgentContext('agent-1', config, state);
};

describe('MemoryIngestInputProcessor', () => {
  it('sets turn id and ingests user message', async () => {
    const context = makeContext();
    const processor = new MemoryIngestInputProcessor();
    const memoryManager = {
      startTurn: vi.fn().mockReturnValue('turn_0001'),
      ingestUserMessage: vi.fn()
    };
    context.state.memoryManager = memoryManager as any;

    const message = new AgentInputUserMessage('Hello');
    const result = await processor.process(message, context, {} as any);

    expect(result).toBe(message);
    expect(context.state.activeTurnId).toBe('turn_0001');
    expect(memoryManager.ingestUserMessage).toHaveBeenCalledWith(
      expect.objectContaining({ content: 'Hello' }),
      'turn_0001',
      'LLMUserMessageReadyEvent'
    );
  });

  it('no-ops when memory manager missing', async () => {
    const context = makeContext();
    context.state.memoryManager = null;

    const processor = new MemoryIngestInputProcessor();
    const message = new AgentInputUserMessage('Hello');
    const result = await processor.process(message, context, {} as any);

    expect(result).toBe(message);
    expect(context.state.activeTurnId).toBeNull();
  });

  it('skips TOOL-originated messages to avoid duplicate tool results', async () => {
    const context = makeContext();
    const processor = new MemoryIngestInputProcessor();
    const memoryManager = {
      startTurn: vi.fn().mockReturnValue('turn_0002'),
      ingestUserMessage: vi.fn()
    };
    context.state.memoryManager = memoryManager as any;
    context.state.activeTurnId = 'turn_existing';

    const message = new AgentInputUserMessage('Tool result', SenderType.TOOL);
    const result = await processor.process(message, context, {} as any);

    expect(result).toBe(message);
    expect(context.state.activeTurnId).toBe('turn_existing');
    expect(memoryManager.startTurn).not.toHaveBeenCalled();
    expect(memoryManager.ingestUserMessage).not.toHaveBeenCalled();
  });
});
