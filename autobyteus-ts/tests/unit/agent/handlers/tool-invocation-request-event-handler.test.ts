import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ToolInvocationRequestEventHandler } from '../../../../src/agent/handlers/tool-invocation-request-event-handler.js';
import {
  PendingToolInvocationEvent,
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
  const context = new AgentContext('agent-1', config, state);
  return { context, inputQueues };
};

describe('ToolInvocationRequestEventHandler', () => {
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

  it('handles approval-required flow', async () => {
    const handler = new ToolInvocationRequestEventHandler();
    const { context, inputQueues } = makeContext();
    context.config.autoExecuteTools = false;
    const invocation = new ToolInvocation('mock_tool', { arg1: 'value1' }, 'mock-id-1');
    const event = new PendingToolInvocationEvent(invocation);
    const notifier = {
      notifyAgentRequestToolInvocationApproval: vi.fn()
    };
    (context as any).state.statusManagerRef = { notifier };
    const storeSpy = vi.spyOn(context.state, 'storePendingToolInvocation');

    await handler.handle(event, context);

    expect(
      infoSpy.mock.calls.some(([msg]: [unknown]) =>
        String(msg).includes("Tool 'mock_tool' (ID: mock-id-1) requires approval.")
      )
    ).toBe(true);
    expect(storeSpy).toHaveBeenCalledWith(invocation);
    expect(notifier.notifyAgentRequestToolInvocationApproval).toHaveBeenCalledWith({
      invocation_id: 'mock-id-1',
      tool_name: 'mock_tool',
      arguments: { arg1: 'value1' }
    });
    expect(inputQueues.enqueueToolResult).not.toHaveBeenCalled();
  });

  it('logs critical when notifier missing for approval flow', async () => {
    const handler = new ToolInvocationRequestEventHandler();
    const { context } = makeContext();
    context.config.autoExecuteTools = false;
    const invocation = new ToolInvocation('mock_tool', { arg1: 'value1' }, 'mock-id-1');
    const event = new PendingToolInvocationEvent(invocation);

    await handler.handle(event, context);

    expect(
      errorSpy.mock.calls.some(([msg]: [unknown]) =>
        String(msg).includes(
          "Notifier is REQUIRED for manual tool approval flow but is unavailable. Tool 'mock_tool' cannot be processed for approval."
        )
      )
    ).toBe(true);
  });

  it('handles direct execution success', async () => {
    const handler = new ToolInvocationRequestEventHandler();
    const { context, inputQueues } = makeContext();
    context.config.autoExecuteTools = true;
    const invocation = new ToolInvocation('mock_tool', { arg1: 'value1' }, 'mock-id-2');
    const event = new PendingToolInvocationEvent(invocation);
    const toolInstance = { execute: vi.fn(async () => 'Direct execution successful!') };
    vi.spyOn(context, 'getTool').mockReturnValue(toolInstance as any);
    const notifier = {
      notifyAgentToolInvocationAutoExecuting: vi.fn(),
      notifyAgentDataToolLog: vi.fn()
    };
    (context as any).state.statusManagerRef = { notifier };

    await handler.handle(event, context);

    expect(
      infoSpy.mock.calls.some(([msg]: [unknown]) =>
        String(msg).includes("Tool 'mock_tool' (ID: mock-id-2) executing automatically")
      )
    ).toBe(true);
    expect(
      infoSpy.mock.calls.some(([msg]: [unknown]) =>
        String(msg).includes("Tool 'mock_tool' (ID: mock-id-2) executed by agent 'agent-1'.")
      )
    ).toBe(true);

    expect(toolInstance.execute).toHaveBeenCalledWith(context, { arg1: 'value1' });

    expect(inputQueues.enqueueToolResult).toHaveBeenCalledTimes(1);
    const enqueued = inputQueues.enqueueToolResult.mock.calls[0][0];
    expect(enqueued).toBeInstanceOf(ToolResultEvent);
    expect(enqueued.result).toBe('Direct execution successful!');
  });

  it('handles direct execution tool not found', async () => {
    const handler = new ToolInvocationRequestEventHandler();
    const { context, inputQueues } = makeContext();
    context.config.autoExecuteTools = true;
    const invocation = new ToolInvocation('missing_tool', { arg1: 'value1' }, 'mock-id-3');
    const event = new PendingToolInvocationEvent(invocation);
    vi.spyOn(context, 'getTool').mockReturnValue(undefined);
    const notifier = {
      notifyAgentDataToolLog: vi.fn(),
      notifyAgentErrorOutputGeneration: vi.fn()
    };
    (context as any).state.statusManagerRef = { notifier };

    await handler.handle(event, context);

    expect(
      errorSpy.mock.calls.some(([msg]: [unknown]) =>
        String(msg).includes("Tool 'missing_tool' not found or configured for agent 'agent-1'.")
      )
    ).toBe(true);
    expect(notifier.notifyAgentErrorOutputGeneration).toHaveBeenCalledWith(
      'ToolExecutionDirect.ToolNotFound.missing_tool',
      "Tool 'missing_tool' not found or configured for agent 'agent-1'."
    );
    const enqueued = inputQueues.enqueueToolResult.mock.calls[0][0];
    expect(enqueued.error).toBe("Tool 'missing_tool' not found or configured for agent 'agent-1'.");
  });

  it('handles direct execution tool exception', async () => {
    const handler = new ToolInvocationRequestEventHandler();
    const { context, inputQueues } = makeContext();
    context.config.autoExecuteTools = true;
    const invocation = new ToolInvocation('boom_tool', { arg1: 'value1' }, 'mock-id-4');
    const event = new PendingToolInvocationEvent(invocation);
    const toolInstance = { execute: vi.fn(async () => { throw new Error('Tool crashed unexpectedly!'); }) };
    vi.spyOn(context, 'getTool').mockReturnValue(toolInstance as any);
    const notifier = {
      notifyAgentDataToolLog: vi.fn(),
      notifyAgentErrorOutputGeneration: vi.fn()
    };
    (context as any).state.statusManagerRef = { notifier };

    await handler.handle(event, context);

    expect(
      errorSpy.mock.calls.some(([msg]: [unknown]) =>
        String(msg).includes("Error executing tool 'boom_tool' (ID: mock-id-4): Error: Tool crashed unexpectedly!")
      )
    ).toBe(true);
    expect(notifier.notifyAgentErrorOutputGeneration).toHaveBeenCalled();
    const callArgs = notifier.notifyAgentErrorOutputGeneration.mock.calls[0];
    expect(callArgs[0]).toBe('ToolExecutionDirect.Exception.boom_tool');
    expect(String(callArgs[1])).toContain("Error executing tool 'boom_tool' (ID: mock-id-4)");
    expect(typeof callArgs[2]).toBe('string');
    const enqueued = inputQueues.enqueueToolResult.mock.calls[0][0];
    expect(enqueued.error).toContain("Error executing tool 'boom_tool'");
  });

  it('handles direct execution args not JSON serializable for log', async () => {
    const handler = new ToolInvocationRequestEventHandler();
    const { context } = makeContext();
    context.config.autoExecuteTools = true;
    class Unserializable {
      toString(): string {
        return 'UnserializableObj';
      }
    }
    const invocation = new ToolInvocation(
      'test_tool',
      { data: new Unserializable() },
      'direct-json-err-args'
    );
    const event = new PendingToolInvocationEvent(invocation);
    const toolInstance = { execute: vi.fn(async () => 'result') };
    vi.spyOn(context, 'getTool').mockReturnValue(toolInstance as any);
    const notifier = {
      notifyAgentDataToolLog: vi.fn()
    };
    (context as any).state.statusManagerRef = { notifier };

    await handler.handle(event, context);

    expect(notifier.notifyAgentDataToolLog).toHaveBeenCalled();
  });

  it('handles direct execution result not JSON serializable for log', async () => {
    const handler = new ToolInvocationRequestEventHandler();
    const { context } = makeContext();
    context.config.autoExecuteTools = true;
    const invocation = new ToolInvocation('mock_tool', { arg1: 'value1' }, 'mock-id-5');
    const event = new PendingToolInvocationEvent(invocation);
    class Unserializable {
      toString(): string {
        return 'UnserializableObj';
      }
    }
    const toolInstance = { execute: vi.fn(async () => new Unserializable()) };
    vi.spyOn(context, 'getTool').mockReturnValue(toolInstance as any);
    const notifier = {
      notifyAgentDataToolLog: vi.fn()
    };
    (context as any).state.statusManagerRef = { notifier };

    await handler.handle(event, context);

    expect(notifier.notifyAgentDataToolLog).toHaveBeenCalled();
  });

  it('skips invalid event type', async () => {
    const handler = new ToolInvocationRequestEventHandler();
    const { context, inputQueues } = makeContext();
    const invalidEvent = new GenericEvent({}, 'other_event');
    const notifier = {
      notifyAgentRequestToolInvocationApproval: vi.fn()
    };
    (context as any).state.statusManagerRef = { notifier };

    await handler.handle(invalidEvent as any, context);

    expect(
      warnSpy.mock.calls.some(([msg]: [unknown]) =>
        String(msg).includes(
          'ToolInvocationRequestEventHandler received non-PendingToolInvocationEvent: GenericEvent. Skipping.'
        )
      )
    ).toBe(true);
    expect(notifier.notifyAgentRequestToolInvocationApproval).not.toHaveBeenCalled();
    expect(inputQueues.enqueueToolResult).not.toHaveBeenCalled();
  });

  it('logs initialization', () => {
    new ToolInvocationRequestEventHandler();
    expect(
      infoSpy.mock.calls.some(([msg]: [unknown]) =>
        String(msg).includes('ToolInvocationRequestEventHandler initialized.')
      )
    ).toBe(true);
  });
});
