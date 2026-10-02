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
  it('retains accepted keys from the original input, never rewritten metadata', async () => {
    const context = makeContext();
    context.state.memoryManager = { ingestUserMessage: vi.fn() } as any;
    context.state.activeTurn = { turnId: 'turn-1' } as any;
    const original = new AgentInputUserMessage('original', SenderType.USER, null, { message_id: 'A', dedupe_key: 'token' });
    const processed = new AgentInputUserMessage('processed', SenderType.USER, null, { message_id: 'wrong' });
    await new MemoryIngestInputProcessor().process(processed, context, { agentInputUserMessage: original } as any);
    expect(context.state.memoryManager!.ingestUserMessage).toHaveBeenCalledWith(
      expect.objectContaining({ content: 'processed' }), 'turn-1', 'LLMUserMessageReadyEvent', [], null,
      { messageId: 'A', dedupeKey: 'token' },
    );
  });

  it('ingests user message into the already-active turn', async () => {
    const context = makeContext();
    const processor = new MemoryIngestInputProcessor();
    const memoryManager = {
      ingestUserMessage: vi.fn(),
    };
    context.state.memoryManager = memoryManager as any;
    context.state.activeTurn = { turnId: 'turn_0001' } as any;

    const message = new AgentInputUserMessage('Hello');
    const result = await processor.process(message, context, { agentInputUserMessage: message } as any);

    expect(result).toBe(message);
    expect(memoryManager.ingestUserMessage).toHaveBeenCalledWith(
      expect.objectContaining({ content: 'Hello' }),
      'turn_0001',
      'LLMUserMessageReadyEvent',
      [],
      null,
      { messageId: undefined, dedupeKey: undefined }
    );
  });

  it('records the sender of an agent-to-agent delivery on the user trace (RD-004)', async () => {
    const context = makeContext();
    const processor = new MemoryIngestInputProcessor();
    const memoryManager = { ingestUserMessage: vi.fn() };
    context.state.memoryManager = memoryManager as any;
    context.state.activeTurn = { turnId: 'turn_0002' } as any;
    const delivery = new AgentInputUserMessage('You received a message', SenderType.AGENT, null, {
      input_origin: 'inter_agent_delivery', sender_agent_id: 'run-researcher',
    });
    await processor.process(delivery, context, { agentInputUserMessage: delivery } as any);
    // A user message that only carries a sender id is not an inter-agent delivery.
    const user = new AgentInputUserMessage('Hi', SenderType.USER, null, { input_origin: 'user_message', sender_agent_id: 'x' });
    await processor.process(user, context, { agentInputUserMessage: user } as any);
    expect(memoryManager.ingestUserMessage.mock.calls.map((call) => call[4])).toEqual(['run-researcher', null]);
  });

  it('keeps TOOL-originated input in the processor lifecycle without a memory write', async () => {
    const context = makeContext();
    const processor = new MemoryIngestInputProcessor();
    const memoryManager = {
      ingestUserMessage: vi.fn(),
    };
    context.state.memoryManager = memoryManager as any;
    context.state.activeTurn = { turnId: 'turn_existing' } as any;

    const message = new AgentInputUserMessage('Tool result', SenderType.TOOL);
    const result = await processor.process(message, context, { agentInputUserMessage: message } as any);

    expect(result).toBe(message);
    expect(memoryManager.ingestUserMessage).not.toHaveBeenCalled();
    expect(Object.keys(memoryManager)).toEqual(['ingestUserMessage']);
  });

  it('fails when TOOL continuation input reaches memory ingest without an active turn', async () => {
    const context = makeContext();
    const processor = new MemoryIngestInputProcessor();
    context.state.memoryManager = {
      ingestUserMessage: vi.fn(),
    } as any;

    await expect(
      processor.process(new AgentInputUserMessage('Tool result', SenderType.TOOL), context, {} as any)
    ).rejects.toThrow('cannot ingest TOOL continuation input without an active turn');
  });
});
