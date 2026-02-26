import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { AgentContext } from '../../../../src/agent/context/agent-context.js';
import { AgentConfig } from '../../../../src/agent/context/agent-config.js';
import { AgentRuntimeState } from '../../../../src/agent/context/agent-runtime-state.js';
import { AgentStatus } from '../../../../src/agent/status/status-enum.js';
import { AgentInputEventQueueManager } from '../../../../src/agent/events/agent-input-event-queue-manager.js';
import { ToolInvocation } from '../../../../src/agent/tool-invocation.js';
import { BaseLLM } from '../../../../src/llm/base.js';
import { LLMModel } from '../../../../src/llm/models.js';
import { LLMProvider } from '../../../../src/llm/providers.js';
import { LLMConfig } from '../../../../src/llm/utils/llm-config.js';
import { CompleteResponse, ChunkResponse } from '../../../../src/llm/utils/response-types.js';
import { LLMUserMessage } from '../../../../src/llm/user-message.js';

class DummyLLM extends BaseLLM {
  protected async _sendMessagesToLLM(_messages: any[]): Promise<CompleteResponse> {
    return new CompleteResponse({ content: 'ok' });
  }

  protected async *_streamMessagesToLLM(_messages: any[]): AsyncGenerator<ChunkResponse, void, unknown> {
    yield new ChunkResponse({ content: 'ok', is_complete: true });
  }
}

const makeLLM = () => {
  const model = new LLMModel({
    name: 'dummy',
    value: 'dummy',
    canonicalName: 'dummy',
    provider: LLMProvider.OPENAI
  });
  return new DummyLLM(model, new LLMConfig());
};

describe('AgentContext', () => {
  beforeEach(() => {
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    vi.spyOn(console, 'info').mockImplementation(() => undefined);
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('requires valid agentId, config, and state', () => {
    const llm = makeLLM();
    const config = new AgentConfig('name', 'role', 'desc', llm);
    const state = new AgentRuntimeState('agent-1');

    expect(() => new AgentContext('', config, state)).toThrow(/agentId/);
    expect(() => new AgentContext('agent-1', {} as AgentConfig, state)).toThrow(/AgentConfig/);
    expect(() => new AgentContext('agent-1', config, {} as AgentRuntimeState)).toThrow(/AgentRuntimeState/);
  });

  it('exposes state-backed properties', () => {
    const llm = makeLLM();
    const config = new AgentConfig('name', 'role', 'desc', llm, null, null, false);
    const state = new AgentRuntimeState('agent-2');

    const context = new AgentContext('agent-2', config, state);

    expect(context.toolInstances).toEqual({});
    expect(context.autoExecuteTools).toBe(false);
    expect(context.llmInstance).toBeNull();

    context.llmInstance = llm;
    expect(context.llmInstance).toBe(llm);

    context.currentStatus = AgentStatus.IDLE;
    expect(context.currentStatus).toBe(AgentStatus.IDLE);
    expect(context.customData).toEqual({});
  });

  it('throws when input queues are not initialized', () => {
    const llm = makeLLM();
    const config = new AgentConfig('name', 'role', 'desc', llm);
    const state = new AgentRuntimeState('agent-3');

    const context = new AgentContext('agent-3', config, state);

    expect(() => context.inputEventQueues).toThrow(/Input event queues/);

    state.inputEventQueues = new AgentInputEventQueueManager();
    expect(context.inputEventQueues).toBe(state.inputEventQueues);
  });

  it('gets tools and warns when missing', () => {
    const llm = makeLLM();
    const config = new AgentConfig('name', 'role', 'desc', llm);
    const state = new AgentRuntimeState('agent-4');
    state.toolInstances = { TestTool: { name: 'TestTool' } as any };

    const context = new AgentContext('agent-4', config, state);

    expect(context.getTool('TestTool')).toBe(state.toolInstances.TestTool);
    expect(context.getTool('MissingTool')).toBeUndefined();
    expect(console.warn).toHaveBeenCalledWith(expect.stringContaining('MissingTool'));
  });

  it('stores and retrieves pending tool invocations', () => {
    const llm = makeLLM();
    const config = new AgentConfig('name', 'role', 'desc', llm);
    const state = new AgentRuntimeState('agent-5');
    const context = new AgentContext('agent-5', config, state);

    const invocation = new ToolInvocation('tool', { a: 1 }, 'inv-1');

    context.storePendingToolInvocation(invocation);
    expect(context.pendingToolApprovals['inv-1']).toBe(invocation);

    const retrieved = context.retrievePendingToolInvocation('inv-1');
    expect(retrieved).toBe(invocation);
    expect(context.pendingToolApprovals['inv-1']).toBeUndefined();
  });

  it('sets processed system prompt', () => {
    const llm = makeLLM();
    const config = new AgentConfig('name', 'role', 'desc', llm);
    const state = new AgentRuntimeState('agent-6');
    const context = new AgentContext('agent-6', config, state);

    context.processedSystemPrompt = 'processed';
    expect(context.processedSystemPrompt).toBe('processed');
  });
});
