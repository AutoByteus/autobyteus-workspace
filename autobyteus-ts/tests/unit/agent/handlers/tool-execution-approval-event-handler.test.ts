import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ToolExecutionApprovalEventHandler } from '../../../../src/agent/handlers/tool-execution-approval-event-handler.js';
import {
  ToolExecutionApprovalEvent,
  ApprovedToolInvocationEvent,
  LLMUserMessageReadyEvent,
  GenericEvent
} from '../../../../src/agent/events/agent-events.js';
import { ToolInvocation } from '../../../../src/agent/tool-invocation.js';
import { AgentContext } from '../../../../src/agent/context/agent-context.js';
import { AgentConfig } from '../../../../src/agent/context/agent-config.js';
import { AgentRuntimeState } from '../../../../src/agent/context/agent-runtime-state.js';
import { BaseLLM } from '../../../../src/llm/base.js';
import { LLMModel } from '../../../../src/llm/models.js';
import { LLMProvider } from '../../../../src/llm/providers.js';
import { LLMConfig } from '../../../../src/llm/utils/llm-config.js';
import { CompleteResponse, ChunkResponse } from '../../../../src/llm/utils/response-types.js';
import { Message } from '../../../../src/llm/utils/messages.js';

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
  const inputQueues = { enqueueInternalSystemEvent: vi.fn(async () => undefined) } as any;
  state.inputEventQueues = inputQueues;
  const context = new AgentContext('agent-1', config, state);
  return { context, inputQueues };
};

describe('ToolExecutionApprovalEventHandler', () => {
  let infoSpy: ReturnType<typeof vi.spyOn>;
  let warnSpy: ReturnType<typeof vi.spyOn>;
  let debugSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    infoSpy = vi.spyOn(console, 'info').mockImplementation(() => undefined);
    warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    debugSpy = vi.spyOn(console, 'debug').mockImplementation(() => undefined);
  });

  afterEach(() => {
    infoSpy.mockRestore();
    warnSpy.mockRestore();
    debugSpy.mockRestore();
  });

  it('handles tool approval', async () => {
    const handler = new ToolExecutionApprovalEventHandler();
    const { context, inputQueues } = makeContext();
    const invocation = new ToolInvocation('mock_tool', { arg1: 'value1' }, 'test_tool_invocation_id');
    vi.spyOn(context.state, 'retrievePendingToolInvocation').mockReturnValue(invocation);

    const event = new ToolExecutionApprovalEvent('test_tool_invocation_id', true, 'User approved');
    await handler.handle(event, context);

    expect(
      infoSpy.mock.calls.some(([msg]: [unknown]) =>
        String(msg).includes(
          "handling ToolExecutionApprovalEvent for tool_invocation_id 'test_tool_invocation_id': Approved=true"
        )
      )
    ).toBe(true);
    expect(
      infoSpy.mock.calls.some(([msg]: [unknown]) =>
        String(msg).includes(
          "Tool invocation 'mock_tool' (ID: test_tool_invocation_id) was APPROVED. Reason: 'User approved'."
        )
      )
    ).toBe(true);

    expect(context.state.retrievePendingToolInvocation).toHaveBeenCalledWith('test_tool_invocation_id');
    expect(inputQueues.enqueueInternalSystemEvent).toHaveBeenCalledTimes(1);
    const enqueued = inputQueues.enqueueInternalSystemEvent.mock.calls[0][0];
    expect(enqueued).toBeInstanceOf(ApprovedToolInvocationEvent);
    expect(enqueued.toolInvocation).toBe(invocation);
  });

  it('handles tool denial with reason', async () => {
    const handler = new ToolExecutionApprovalEventHandler();
    const { context, inputQueues } = makeContext();
    const invocation = new ToolInvocation('mock_tool', { arg1: 'value1' }, 'test_tool_invocation_id');
    vi.spyOn(context.state, 'retrievePendingToolInvocation').mockReturnValue(invocation);

    const denialReason = 'User denied due to cost.';
    const event = new ToolExecutionApprovalEvent('test_tool_invocation_id', false, denialReason);
    await handler.handle(event, context);

    expect(
      warnSpy.mock.calls.some(([msg]: [unknown]) =>
        String(msg).includes("Tool invocation 'mock_tool' (ID: test_tool_invocation_id) was DENIED. Reason: 'User denied due to cost.'.")
      )
    ).toBe(true);

    expect(context.state.retrievePendingToolInvocation).toHaveBeenCalledWith('test_tool_invocation_id');
    expect(inputQueues.enqueueInternalSystemEvent).toHaveBeenCalledTimes(1);
    const enqueued = inputQueues.enqueueInternalSystemEvent.mock.calls[0][0];
    expect(enqueued).toBeInstanceOf(LLMUserMessageReadyEvent);
    expect(enqueued.llmUserMessage).toBeInstanceOf(LLMUserMessage);
    expect(enqueued.llmUserMessage.content).toContain(
      "The request to use the tool 'mock_tool' (with arguments: {\"arg1\":\"value1\"}) was denied."
    );
    expect(enqueued.llmUserMessage.content).toContain(`Denial reason: '${denialReason}'.`);
  });

  it('handles tool denial with no reason', async () => {
    const handler = new ToolExecutionApprovalEventHandler();
    const { context, inputQueues } = makeContext();
    const invocation = new ToolInvocation('mock_tool', { arg1: 'value1' }, 'test_tool_invocation_id');
    vi.spyOn(context.state, 'retrievePendingToolInvocation').mockReturnValue(invocation);

    const event = new ToolExecutionApprovalEvent('test_tool_invocation_id', false);
    await handler.handle(event, context);

    const enqueued = inputQueues.enqueueInternalSystemEvent.mock.calls[0][0];
    expect(enqueued.llmUserMessage.content).toContain("Denial reason: 'No specific reason provided.'.");
  });

  it('handles missing pending invocation', async () => {
    const handler = new ToolExecutionApprovalEventHandler();
    const { context, inputQueues } = makeContext();
    vi.spyOn(context.state, 'retrievePendingToolInvocation').mockReturnValue(undefined);

    const event = new ToolExecutionApprovalEvent('unknown-id-000', true);
    await handler.handle(event, context);

    expect(
      warnSpy.mock.calls.some(([msg]: [unknown]) =>
        String(msg).includes("No pending tool invocation found for ID 'unknown-id-000'")
      )
    ).toBe(true);
    expect(inputQueues.enqueueInternalSystemEvent).not.toHaveBeenCalled();
  });

  it('skips invalid event type', async () => {
    const handler = new ToolExecutionApprovalEventHandler();
    const { context, inputQueues } = makeContext();
    const invalidEvent = new GenericEvent({}, 'some_other_event');

    await handler.handle(invalidEvent as any, context);

    expect(
      warnSpy.mock.calls.some(([msg]: [unknown]) =>
        String(msg).includes(
          'ToolExecutionApprovalEventHandler received non-ToolExecutionApprovalEvent: GenericEvent. Skipping.'
        )
      )
    ).toBe(true);
    expect(inputQueues.enqueueInternalSystemEvent).not.toHaveBeenCalled();
  });

  it('logs initialization', () => {
    new ToolExecutionApprovalEventHandler();
    expect(
      infoSpy.mock.calls.some(([msg]: [unknown]) =>
        String(msg).includes('ToolExecutionApprovalEventHandler initialized.')
      )
    ).toBe(true);
  });
});
