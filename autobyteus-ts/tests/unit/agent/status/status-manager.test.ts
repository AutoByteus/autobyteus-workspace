import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AgentStatusManager } from '../../../../src/agent/status/manager.js';
import { AgentStatus } from '../../../../src/agent/status/status-enum.js';
import { LifecycleEvent } from '../../../../src/agent/lifecycle/events.js';
import { AgentContext } from '../../../../src/agent/context/agent-context.js';
import { AgentConfig } from '../../../../src/agent/context/agent-config.js';
import { AgentRuntimeState } from '../../../../src/agent/context/agent-runtime-state.js';
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

describe('AgentStatusManager', () => {
  let agentContext: AgentContext;

  beforeEach(() => {
    agentContext = makeContext();
  });

  it('does nothing when status does not change', async () => {
    const notifier = { notifyStatusUpdated: vi.fn() };
    const manager = new AgentStatusManager(agentContext, notifier as any);

    const processor = {
      event: LifecycleEvent.AGENT_READY,
      getOrder: () => 100,
      getName: () => 'Processor',
      process: vi.fn(async () => undefined)
    };
    agentContext.config.lifecycleProcessors = [processor as any];

    await manager.emit_status_update(AgentStatus.IDLE, AgentStatus.IDLE);

    expect((processor as any).process).not.toHaveBeenCalled();
    expect(notifier.notifyStatusUpdated).not.toHaveBeenCalled();
  });

  it('runs lifecycle processors in order', async () => {
    const notifierCalls: any[] = [];
    const notifier = { notifyStatusUpdated: (...args: any[]) => notifierCalls.push(args) };
    const manager = new AgentStatusManager(agentContext, notifier as any);

    const call_order: string[] = [];
    const processor_late = {
      event: LifecycleEvent.AGENT_READY,
      getOrder: () => 200,
      getName: () => 'Late',
      process: async () => call_order.push('late')
    };
    const processor_early = {
      event: LifecycleEvent.AGENT_READY,
      getOrder: () => 100,
      getName: () => 'Early',
      process: async () => call_order.push('early')
    };

    agentContext.config.lifecycleProcessors = [processor_late as any, processor_early as any];

    await manager.emit_status_update(AgentStatus.BOOTSTRAPPING, AgentStatus.IDLE, { foo: 'bar' });

    expect(call_order).toEqual(['early', 'late']);
    expect(notifierCalls).toEqual([[AgentStatus.IDLE, AgentStatus.BOOTSTRAPPING, { foo: 'bar' }]]);
  });

  it('handles lifecycle processor errors', async () => {
    const notifierCalls: any[] = [];
    const notifier = { notifyStatusUpdated: (...args: any[]) => notifierCalls.push(args) };
    const manager = new AgentStatusManager(agentContext, notifier as any);

    const processor = {
      event: LifecycleEvent.BEFORE_LLM_CALL,
      getOrder: () => 100,
      getName: () => 'Fails',
      process: async () => {
        throw new Error('boom');
      }
    };

    agentContext.config.lifecycleProcessors = [processor as any];

    await manager.emit_status_update(AgentStatus.PROCESSING_USER_INPUT, AgentStatus.AWAITING_LLM_RESPONSE);

    expect(notifierCalls).toEqual([[AgentStatus.AWAITING_LLM_RESPONSE, AgentStatus.PROCESSING_USER_INPUT, null]]);
  });
});
