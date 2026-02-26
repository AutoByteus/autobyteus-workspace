import { describe, it, expect, vi } from 'vitest';
import { Agent } from '../../../src/agent/agent.js';
import { AgentStatus } from '../../../src/agent/status/status-enum.js';
import { AgentInputUserMessage } from '../../../src/agent/message/agent-input-user-message.js';
import { InterAgentMessage } from '../../../src/agent/message/inter-agent-message.js';
import { InterAgentMessageType } from '../../../src/agent/message/inter-agent-message-type.js';
import { UserMessageReceivedEvent, InterAgentMessageReceivedEvent, ToolExecutionApprovalEvent } from '../../../src/agent/events/agent-events.js';
import { AgentRuntime } from '../../../src/agent/runtime/agent-runtime.js';
import { AgentRuntimeState } from '../../../src/agent/context/agent-runtime-state.js';
import { AgentConfig } from '../../../src/agent/context/agent-config.js';
import { AgentContext } from '../../../src/agent/context/agent-context.js';
import { BaseLLM } from '../../../src/llm/base.js';
import { LLMModel } from '../../../src/llm/models.js';
import { LLMProvider } from '../../../src/llm/providers.js';
import { LLMConfig } from '../../../src/llm/utils/llm-config.js';
import { CompleteResponse } from '../../../src/llm/utils/response-types.js';
import type { LLMUserMessage } from '../../../src/llm/user-message.js';
import type { CompleteResponse as CompleteResponseType, ChunkResponse } from '../../../src/llm/utils/response-types.js';

class DummyLLM extends BaseLLM {
  protected async _sendMessagesToLLM(_messages: any[]): Promise<CompleteResponseType> {
    return new CompleteResponse({ content: 'ok' });
  }

  protected async *_streamMessagesToLLM(
    _userMessage: LLMUserMessage
  ): AsyncGenerator<ChunkResponse, void, unknown> {
    yield { content: 'ok', is_complete: true } as ChunkResponse;
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

const makeRuntimeStub = (context: AgentContext, isRunning: boolean) => {
  const runtime = Object.create(AgentRuntime.prototype) as AgentRuntime;
  runtime.context = context;
  runtime.start = vi.fn();
  runtime.stop = vi.fn(async () => undefined);
  runtime.submitEvent = vi.fn(async () => undefined);
  Object.defineProperty(runtime, 'isRunning', { get: () => isRunning });
  Object.defineProperty(runtime, 'currentStatus', { get: () => AgentStatus.IDLE, configurable: true });
  return runtime as AgentRuntime & { start: any; stop: any; submitEvent: any };
};

describe('Agent', () => {
  it('delegates runtime start/stop', async () => {
    const context = makeContext();
    const runtime = makeRuntimeStub(context, false);
    const agent = new Agent(runtime as any);
    agent.start();
    expect(runtime.start).toHaveBeenCalledOnce();

    await agent.stop(0.5);
    expect(runtime.stop).toHaveBeenCalledWith(0.5);
  });

  it('submits user messages and starts runtime if needed', async () => {
    const context = makeContext();
    const runtime = makeRuntimeStub(context, false);
    const agent = new Agent(runtime as any);
    const message = new AgentInputUserMessage('hi');
    await agent.postUserMessage(message);

    expect(runtime.start).toHaveBeenCalledOnce();
    expect(runtime.submitEvent).toHaveBeenCalledOnce();
    const event = runtime.submitEvent.mock.calls[0][0];
    expect(event).toBeInstanceOf(UserMessageReceivedEvent);
  });

  it('submits inter-agent messages', async () => {
    const context = makeContext();
    const runtime = makeRuntimeStub(context, true);
    const agent = new Agent(runtime as any);
    const message = new InterAgentMessage(
      'role',
      'to',
      'hello',
      InterAgentMessageType.CLARIFICATION,
      'from'
    );
    await agent.postInterAgentMessage(message);

    const event = runtime.submitEvent.mock.calls[0][0];
    expect(event).toBeInstanceOf(InterAgentMessageReceivedEvent);
  });

  it('submits tool execution approvals', async () => {
    const context = makeContext();
    const runtime = makeRuntimeStub(context, true);
    const agent = new Agent(runtime as any);
    await agent.postToolExecutionApproval('tid-1', true, 'ok');

    const event = runtime.submitEvent.mock.calls[0][0];
    expect(event).toBeInstanceOf(ToolExecutionApprovalEvent);
  });

  it('exposes status and running state', () => {
    const context = makeContext();
    const runtime = makeRuntimeStub(context, true);
    Object.defineProperty(runtime, 'currentStatus', { get: () => AgentStatus.ANALYZING_LLM_RESPONSE });
    const agent = new Agent(runtime as any);
    expect(agent.currentStatus).toBe(AgentStatus.ANALYZING_LLM_RESPONSE);
    expect(agent.isRunning).toBe(true);
  });
});
