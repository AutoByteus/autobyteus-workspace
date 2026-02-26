import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ApprovedToolInvocationEventHandler } from '../../../../src/agent/handlers/approved-tool-invocation-event-handler.js';
import {
  ApprovedToolInvocationEvent,
  ToolResultEvent,
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
  const inputQueues = { enqueueToolResult: vi.fn(async () => undefined) } as any;
  state.inputEventQueues = inputQueues;
  const notifier = {
    notifyAgentDataToolLog: vi.fn(),
    notifyAgentErrorOutputGeneration: vi.fn()
  };
  state.statusManagerRef = { notifier } as any;
  const context = new AgentContext('agent-1', config, state);
  return { context, inputQueues, notifier };
};

describe('ApprovedToolInvocationEventHandler', () => {
  let infoSpy: ReturnType<typeof vi.spyOn>;
  let warnSpy: ReturnType<typeof vi.spyOn>;
  let errorSpy: ReturnType<typeof vi.spyOn>;
  let debugSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    infoSpy = vi.spyOn(console, 'info').mockImplementation(() => undefined);
    warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    debugSpy = vi.spyOn(console, 'debug').mockImplementation(() => undefined);
  });

  afterEach(() => {
    infoSpy.mockRestore();
    warnSpy.mockRestore();
    errorSpy.mockRestore();
    debugSpy.mockRestore();
  });

  it('handles approved tool invocation successfully', async () => {
    const handler = new ApprovedToolInvocationEventHandler();
    const { context, inputQueues, notifier } = makeContext();
    const toolInvocation = new ToolInvocation('mock_tool', { param1: 'value1' }, 'approved-tool-id-123');
    const event = new ApprovedToolInvocationEvent(toolInvocation);
    const toolInstance = { execute: vi.fn(async () => 'Successful execution result') };
    vi.spyOn(context, 'getTool').mockReturnValue(toolInstance as any);

    await handler.handle(event, context);

    expect(
      infoSpy.mock.calls.some(([msg]: [unknown]) =>
        String(msg).includes(
          "Agent 'agent-1' handling ApprovedToolInvocationEvent for tool: 'mock_tool' (ID: approved-tool-id-123)"
        )
      )
    ).toBe(true);
    expect(
      infoSpy.mock.calls.some(([msg]: [unknown]) =>
        String(msg).includes(
          "Approved tool 'mock_tool' (ID: approved-tool-id-123) executed successfully by agent 'agent-1'."
        )
      )
    ).toBe(true);

    expect(notifier.notifyAgentDataToolLog).toHaveBeenCalled();

    expect(inputQueues.enqueueToolResult).toHaveBeenCalledTimes(1);
    const enqueued = inputQueues.enqueueToolResult.mock.calls[0][0];
    expect(enqueued).toBeInstanceOf(ToolResultEvent);
    expect(enqueued.toolName).toBe('mock_tool');
    expect(enqueued.result).toBe('Successful execution result');
    expect(enqueued.error).toBeUndefined();
    expect(enqueued.toolInvocationId).toBe('approved-tool-id-123');

    expect(toolInstance.execute).toHaveBeenCalledWith(context, { param1: 'value1' });
  });

  it('handles tool not found', async () => {
    const handler = new ApprovedToolInvocationEventHandler();
    const { context, inputQueues, notifier } = makeContext();
    const toolInvocation = new ToolInvocation('non_existent_tool', { param: 'val' }, 'notfound-tool-id-456');
    const event = new ApprovedToolInvocationEvent(toolInvocation);
    vi.spyOn(context, 'getTool').mockReturnValue(undefined);

    await handler.handle(event, context);

    expect(
      errorSpy.mock.calls.some(([msg]: [unknown]) =>
        String(msg).includes("Tool 'non_existent_tool' not found or configured for agent 'agent-1'.")
      )
    ).toBe(true);
    expect(notifier.notifyAgentDataToolLog).toHaveBeenCalled();
    expect(notifier.notifyAgentErrorOutputGeneration).toHaveBeenCalledWith(
      'ApprovedToolExecution.ToolNotFound.non_existent_tool',
      "Tool 'non_existent_tool' not found or configured for agent 'agent-1'."
    );

    expect(inputQueues.enqueueToolResult).toHaveBeenCalledTimes(1);
    const enqueued = inputQueues.enqueueToolResult.mock.calls[0][0];
    expect(enqueued.result).toBeNull();
    expect(enqueued.error).toBe("Tool 'non_existent_tool' not found or configured for agent 'agent-1'.");
  });

  it('handles tool execution exceptions', async () => {
    const handler = new ApprovedToolInvocationEventHandler();
    const { context, inputQueues, notifier } = makeContext();
    const toolInvocation = new ToolInvocation('failing_tool', {}, 'fail-tool-id-789');
    const event = new ApprovedToolInvocationEvent(toolInvocation);
    const toolInstance = { execute: vi.fn(async () => { throw new Error('Simulated tool execution failure!'); }) };
    vi.spyOn(context, 'getTool').mockReturnValue(toolInstance as any);

    await handler.handle(event, context);

    expect(
      errorSpy.mock.calls.some(([msg]: [unknown]) =>
        String(msg).includes(
          "Error executing approved tool 'failing_tool' (ID: fail-tool-id-789): Error: Simulated tool execution failure!"
        )
      )
    ).toBe(true);

    expect(notifier.notifyAgentDataToolLog).toHaveBeenCalled();
    expect(notifier.notifyAgentErrorOutputGeneration).toHaveBeenCalled();
    const callArgs = notifier.notifyAgentErrorOutputGeneration.mock.calls[0];
    expect(callArgs[0]).toBe('ApprovedToolExecution.Exception.failing_tool');
    expect(String(callArgs[1])).toContain(
      "Error executing approved tool 'failing_tool' (ID: fail-tool-id-789)"
    );
    expect(typeof callArgs[2]).toBe('string');

    expect(inputQueues.enqueueToolResult).toHaveBeenCalledTimes(1);
    const enqueued = inputQueues.enqueueToolResult.mock.calls[0][0];
    expect(enqueued.error).toContain("Error executing approved tool 'failing_tool'");
  });

  it('skips invalid event type', async () => {
    const handler = new ApprovedToolInvocationEventHandler();
    const { context, inputQueues, notifier } = makeContext();
    const invalidEvent = new GenericEvent({}, 'wrong_event');

    await handler.handle(invalidEvent as any, context);

    expect(
      warnSpy.mock.calls.some(([msg]: [unknown]) =>
        String(msg).includes(
          'ApprovedToolInvocationEventHandler received non-ApprovedToolInvocationEvent: GenericEvent. Skipping.'
        )
      )
    ).toBe(true);
    expect(notifier.notifyAgentDataToolLog).not.toHaveBeenCalled();
    expect(inputQueues.enqueueToolResult).not.toHaveBeenCalled();
  });

  it('logs initialization', () => {
    new ApprovedToolInvocationEventHandler();
    expect(
      infoSpy.mock.calls.some(([msg]: [unknown]) =>
        String(msg).includes('ApprovedToolInvocationEventHandler initialized.')
      )
    ).toBe(true);
  });
});
