import { describe, it, expect, vi } from 'vitest';
import { AgentConfig } from '../../../../src/agent/context/agent-config.js';
import { AgentRuntimeState } from '../../../../src/agent/context/agent-runtime-state.js';
import { AgentContext } from '../../../../src/agent/context/agent-context.js';
import { MemoryIngestToolResultProcessor } from '../../../../src/agent/tool-execution-result-processor/memory-ingest-tool-result-processor.js';
import { ToolResultEvent } from '../../../../src/agent/events/agent-events.js';
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

describe('MemoryIngestToolResultProcessor', () => {
  it('ingests tool result when turn id is available', async () => {
    const context = makeContext();
    const processor = new MemoryIngestToolResultProcessor();
    const memoryManager = {
      ingestToolResult: vi.fn()
    };
    context.state.memoryManager = memoryManager as any;

    const event = new ToolResultEvent('tool', 'ok', 'call_1', undefined, undefined, 'turn_0001');
    const result = await processor.process(event, context);

    expect(result).toBe(event);
    expect(memoryManager.ingestToolResult).toHaveBeenCalledWith(event, 'turn_0001');
  });

  it('no-ops when memory manager missing', async () => {
    const context = makeContext();
    const processor = new MemoryIngestToolResultProcessor();
    context.state.memoryManager = null;

    const event = new ToolResultEvent('tool', 'ok', 'call_1', undefined, undefined, 'turn_0001');
    const result = await processor.process(event, context);

    expect(result).toBe(event);
  });

  it('skips ingestion when turn id is missing', async () => {
    const context = makeContext();
    const processor = new MemoryIngestToolResultProcessor();
    const memoryManager = {
      ingestToolResult: vi.fn()
    };
    context.state.memoryManager = memoryManager as any;
    context.state.activeTurnId = null;

    const event = new ToolResultEvent('tool', 'ok', 'call_1');
    const result = await processor.process(event, context);

    expect(result).toBe(event);
    expect(memoryManager.ingestToolResult).not.toHaveBeenCalled();
  });

  it('falls back to active turn id when event turn id missing', async () => {
    const context = makeContext();
    const processor = new MemoryIngestToolResultProcessor();
    const memoryManager = {
      ingestToolResult: vi.fn()
    };
    context.state.memoryManager = memoryManager as any;
    context.state.activeTurnId = 'turn_active';

    const event = new ToolResultEvent('tool', 'ok', 'call_1');
    const result = await processor.process(event, context);

    expect(result).toBe(event);
    expect(memoryManager.ingestToolResult).toHaveBeenCalledWith(event, 'turn_active');
  });
});
