import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { AgentTurn } from '../../../../src/agent/agent-turn.js';
import { AgentContext } from '../../../../src/agent/context/agent-context.js';
import { AgentConfig } from '../../../../src/agent/context/agent-config.js';
import { AgentRuntimeState } from '../../../../src/agent/context/agent-runtime-state.js';
import {
  GenericEvent,
  ToolResultEvent,
  UserMessageReceivedEvent
} from '../../../../src/agent/events/agent-events.js';
import { ToolResultEventHandler } from '../../../../src/agent/handlers/tool-result-event-handler.js';
import { ContextFile } from '../../../../src/agent/message/context-file.js';
import { SenderType } from '../../../../src/agent/sender-type.js';
import { ToolInvocation } from '../../../../src/agent/tool-invocation.js';
import { BaseLLM } from '../../../../src/llm/base.js';
import { LLMConfig } from '../../../../src/llm/utils/llm-config.js';
import { ChunkResponse, CompleteResponse } from '../../../../src/llm/utils/response-types.js';
import { LLMModel } from '../../../../src/llm/models.js';
import { LLMProvider } from '../../../../src/llm/providers.js';
import { LLMUserMessage } from '../../../../src/llm/user-message.js';
import { formatToCleanString } from '../../../../src/utils/llm-output-formatter.js';

class DummyLLM extends BaseLLM {
  protected async _sendMessagesToLLM(_messages: any[]): Promise<CompleteResponse> {
    return new CompleteResponse({ content: 'ok' });
  }

  protected async *_streamMessagesToLLM(
    _userMessage: LLMUserMessage
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
  const inputQueues = { enqueueUserMessage: vi.fn(async () => undefined) } as any;
  state.inputEventQueues = inputQueues;
  const notifier = {
    notifyAgentDataToolLog: vi.fn(),
    notifyAgentToolExecutionSucceeded: vi.fn(),
    notifyAgentToolExecutionFailed: vi.fn()
  };
  state.statusManagerRef = { notifier } as any;
  const context = new AgentContext('agent-1', config, state);
  return { context, inputQueues, notifier };
};

describe('ToolResultEventHandler', () => {
  let warnSpy: ReturnType<typeof vi.spyOn>;
  let errorSpy: ReturnType<typeof vi.spyOn>;
  let debugSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.spyOn(console, 'info').mockImplementation(() => undefined);
    warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    debugSpy = vi.spyOn(console, 'debug').mockImplementation(() => undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('handles a single tool result success without an active batch', async () => {
    const handler = new ToolResultEventHandler();
    const { context, inputQueues, notifier } = makeContext();
    const event = new ToolResultEvent('calculator', { sum: 15 }, 'calc-123');

    await handler.handle(event, context);

    const expectedLogMsg = `[TOOL_RESULT_SUCCESS_PROCESSED] Agent_ID: agent-1, Tool: calculator, Invocation_ID: calc-123, Result: ${formatToCleanString({ sum: 15 })}`;
    expect(notifier.notifyAgentDataToolLog).toHaveBeenCalledWith({
      log_entry: expectedLogMsg,
      tool_invocation_id: 'calc-123',
      tool_name: 'calculator',
      turn_id: null
    });
    expect(notifier.notifyAgentToolExecutionSucceeded).toHaveBeenCalledWith({
      agent_id: 'agent-1',
      tool_name: 'calculator',
      invocation_id: 'calc-123',
      turn_id: null,
      result: { sum: 15 }
    });

    expect(inputQueues.enqueueUserMessage).toHaveBeenCalledTimes(1);
    const enqueued = inputQueues.enqueueUserMessage.mock.calls[0][0];
    expect(enqueued).toBeInstanceOf(UserMessageReceivedEvent);
    const message = enqueued.agentInputUserMessage;
    expect(message.senderType).toBe(SenderType.TOOL);
    expect(message.content).toContain('Tool: calculator (ID: calc-123)');
    expect(message.contextFiles).toBeNull();
  });

  it('reorders multi-tool results correctly inside the active batch', async () => {
    const handler = new ToolResultEventHandler();
    const { context, inputQueues } = makeContext();
    const turn = new AgentTurn('turn_0001');
    const invA = new ToolInvocation('tool_A', { arg: 'A' }, 'call_A');
    const invB = new ToolInvocation('tool_B', { arg: 'B' }, 'call_B');
    turn.startToolInvocationBatch([invA, invB]);
    context.state.activeTurn = turn;

    await handler.handle(new ToolResultEvent('tool_B', 'Result B', 'call_B', undefined, undefined, 'turn_0001'), context);
    expect(inputQueues.enqueueUserMessage).not.toHaveBeenCalled();

    await handler.handle(new ToolResultEvent('tool_A', 'Result A', 'call_A', undefined, undefined, 'turn_0001'), context);

    expect(inputQueues.enqueueUserMessage).toHaveBeenCalledTimes(1);
    const content = inputQueues.enqueueUserMessage.mock.calls[0][0].agentInputUserMessage.content;
    const posA = content.indexOf('Tool: tool_A (ID: call_A)');
    const posB = content.indexOf('Tool: tool_B (ID: call_B)');
    expect(posA).toBeGreaterThanOrEqual(0);
    expect(posB).toBeGreaterThanOrEqual(0);
    expect(posA).toBeLessThan(posB);
    expect(context.state.activeTurn?.activeToolInvocationBatch).toBeNull();
  });

  it('ignores mismatched agent-turn results for the active batch', async () => {
    const handler = new ToolResultEventHandler();
    const { context, inputQueues } = makeContext();
    const turn = new AgentTurn('turn_0001');
    turn.startToolInvocationBatch([new ToolInvocation('tool_A', {}, 'call_A')]);
    context.state.activeTurn = turn;

    await handler.handle(new ToolResultEvent('tool_A', 'wrong', 'call_A', undefined, undefined, 'turn_other'), context);

    expect(inputQueues.enqueueUserMessage).not.toHaveBeenCalled();
    expect(warnSpy).toHaveBeenCalled();
    expect(context.state.activeTurn?.activeToolInvocationBatch).not.toBeNull();
  });

  it('handles context file results', async () => {
    const handler = new ToolResultEventHandler();
    const { context, inputQueues } = makeContext();
    const contextFile = new ContextFile('/path/to/image.png', undefined, 'image.png');

    await handler.handle(new ToolResultEvent('read_media_file', contextFile, 'media-1'), context);

    expect(inputQueues.enqueueUserMessage).toHaveBeenCalledTimes(1);
    const message = inputQueues.enqueueUserMessage.mock.calls[0][0].agentInputUserMessage;
    expect(message.senderType).toBe(SenderType.TOOL);
    expect(message.content).toContain("The file 'image.png' has been loaded into the context");
    expect(message.contextFiles).toEqual([contextFile]);
  });

  it('skips invalid event types', async () => {
    const handler = new ToolResultEventHandler();
    const { context, inputQueues, notifier } = makeContext();
    const invalidEvent = new GenericEvent({}, 'wrong_event');

    await handler.handle(invalidEvent as any, context);

    expect(
      warnSpy.mock.calls.some(([msg]: [unknown]) =>
        String(msg).includes('ToolResultEventHandler received non-ToolResultEvent: GenericEvent. Skipping.')
      )
    ).toBe(true);
    expect(notifier.notifyAgentDataToolLog).not.toHaveBeenCalled();
    expect(inputQueues.enqueueUserMessage).not.toHaveBeenCalled();
  });
});
