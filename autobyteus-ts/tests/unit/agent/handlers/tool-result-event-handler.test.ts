import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ToolResultEventHandler } from '../../../../src/agent/handlers/tool-result-event-handler.js';
import {
  ToolResultEvent,
  UserMessageReceivedEvent,
  GenericEvent
} from '../../../../src/agent/events/agent-events.js';
import { ToolInvocation, ToolInvocationBatch } from '../../../../src/agent/tool-invocation.js';
import { SenderType } from '../../../../src/agent/sender-type.js';
import { ContextFile } from '../../../../src/agent/message/context-file.js';
import { AgentContext } from '../../../../src/agent/context/agent-context.js';
import { AgentConfig } from '../../../../src/agent/context/agent-config.js';
import { AgentRuntimeState } from '../../../../src/agent/context/agent-runtime-state.js';
import { BaseLLM } from '../../../../src/llm/base.js';
import { LLMModel } from '../../../../src/llm/models.js';
import { LLMProvider } from '../../../../src/llm/providers.js';
import { LLMConfig } from '../../../../src/llm/utils/llm-config.js';
import { CompleteResponse, ChunkResponse } from '../../../../src/llm/utils/response-types.js';
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
  const notifier = { notifyAgentDataToolLog: vi.fn() };
  state.statusManagerRef = { notifier } as any;
  const context = new AgentContext('agent-1', config, state);
  return { context, inputQueues, notifier };
};

describe('ToolResultEventHandler', () => {
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

  it('handles a single tool result success', async () => {
    const handler = new ToolResultEventHandler();
    const { context, inputQueues, notifier } = makeContext();
    const event = new ToolResultEvent('calculator', { sum: 15 }, 'calc-123');
    context.state.activeToolInvocationBatch = null;

    await handler.handle(event, context);

    expect(
      infoSpy.mock.calls.some(([msg]: [unknown]) =>
        String(msg).includes("Agent 'agent-1' handling single ToolResultEvent from tool: 'calculator'.")
      )
    ).toBe(true);

    const expectedLogMsg = `[TOOL_RESULT_SUCCESS_PROCESSED] Agent_ID: agent-1, Tool: calculator, Invocation_ID: calc-123, Result: ${formatToCleanString({ sum: 15 })}`;
    expect(notifier.notifyAgentDataToolLog).toHaveBeenCalledWith({
      log_entry: expectedLogMsg,
      tool_invocation_id: 'calc-123',
      tool_name: 'calculator'
    });

    expect(inputQueues.enqueueUserMessage).toHaveBeenCalledTimes(1);
    const enqueued = inputQueues.enqueueUserMessage.mock.calls[0][0];
    expect(enqueued).toBeInstanceOf(UserMessageReceivedEvent);
    const message = enqueued.agentInputUserMessage;
    expect(message.senderType).toBe(SenderType.TOOL);
    expect(message.content).toContain('Tool: calculator (ID: calc-123)');
    expect(message.content).toContain('Status: Success');
    expect(message.content).toContain(`Result:\n${formatToCleanString({ sum: 15 })}`);
    expect(message.contextFiles).toBeNull();
  });

  it('handles a single tool result with error', async () => {
    const handler = new ToolResultEventHandler();
    const { context, inputQueues, notifier } = makeContext();
    const event = new ToolResultEvent('write_file', null, 'fw-456', 'Permission denied');
    context.state.activeToolInvocationBatch = null;

    await handler.handle(event, context);

    const expectedLogMsg =
      '[TOOL_RESULT_ERROR_PROCESSED] Agent_ID: agent-1, Tool: write_file, Invocation_ID: fw-456, Error: Permission denied';
    expect(notifier.notifyAgentDataToolLog).toHaveBeenCalledWith({
      log_entry: expectedLogMsg,
      tool_invocation_id: 'fw-456',
      tool_name: 'write_file'
    });

    expect(inputQueues.enqueueUserMessage).toHaveBeenCalledTimes(1);
    const enqueued = inputQueues.enqueueUserMessage.mock.calls[0][0];
    const message = enqueued.agentInputUserMessage;
    expect(message.senderType).toBe(SenderType.TOOL);
    expect(message.content).toContain('Tool: write_file (ID: fw-456)');
    expect(message.content).toContain('Status: Error');
    expect(message.content).toContain('Details: Permission denied');
  });

  it('reorders multi-tool results correctly', async () => {
    const handler = new ToolResultEventHandler();
    const { context, inputQueues, notifier } = makeContext();
    const invA = new ToolInvocation('tool_A', { arg: 'A' }, 'call_A');
    const invB = new ToolInvocation('tool_B', { arg: 'B' }, 'call_B');
    context.state.activeToolInvocationBatch = new ToolInvocationBatch([invA, invB]);

    const resB = new ToolResultEvent('tool_B', 'Result B', 'call_B');
    const resA = new ToolResultEvent('tool_A', 'Result A', 'call_A');

    await handler.handle(resB, context);

    expect(notifier.notifyAgentDataToolLog).toHaveBeenCalledTimes(1);
    expect(inputQueues.enqueueUserMessage).not.toHaveBeenCalled();

    await handler.handle(resA, context);

    expect(inputQueues.enqueueUserMessage).toHaveBeenCalledTimes(1);
    const enqueued = inputQueues.enqueueUserMessage.mock.calls[0][0];
    const content = enqueued.agentInputUserMessage.content;
    const posA = content.indexOf('Tool: tool_A (ID: call_A)');
    const posB = content.indexOf('Tool: tool_B (ID: call_B)');
    expect(posA).toBeGreaterThanOrEqual(0);
    expect(posB).toBeGreaterThanOrEqual(0);
    expect(posA).toBeLessThan(posB);

    expect(context.state.activeToolInvocationBatch).toBeNull();
  });

  it('handles multi-tool with error in sequence', async () => {
    const handler = new ToolResultEventHandler();
    const { context, inputQueues } = makeContext();
    const invA = new ToolInvocation('tool_A', { arg: 'A' }, 'call_A');
    const invB = new ToolInvocation('tool_B', { arg: 'B' }, 'call_B');
    context.state.activeToolInvocationBatch = new ToolInvocationBatch([invA, invB]);

    const resBError = new ToolResultEvent('tool_B', null, 'call_B', 'Failed B');
    const resASuccess = new ToolResultEvent('tool_A', 'Success A', 'call_A');

    await handler.handle(resBError, context);
    await handler.handle(resASuccess, context);

    expect(inputQueues.enqueueUserMessage).toHaveBeenCalledTimes(1);
    const enqueued = inputQueues.enqueueUserMessage.mock.calls[0][0];
    const content = enqueued.agentInputUserMessage.content;
    const posA = content.indexOf('Tool: tool_A (ID: call_A)');
    const posB = content.indexOf('Tool: tool_B (ID: call_B)');
    expect(posA).toBeLessThan(posB);
    expect(content.slice(posA, posB)).toContain('Status: Success');
    expect(content.slice(posB)).toContain('Status: Error');
    expect(content.slice(posB)).toContain('Details: Failed B');
  });

  it('handles context file result', async () => {
    const handler = new ToolResultEventHandler();
    const { context, inputQueues } = makeContext();
    const contextFile = new ContextFile('/path/to/image.png', undefined, 'image.png');
    const event = new ToolResultEvent('read_media_file', contextFile, 'media-1');

    await handler.handle(event, context);

    expect(inputQueues.enqueueUserMessage).toHaveBeenCalledTimes(1);
    const enqueued = inputQueues.enqueueUserMessage.mock.calls[0][0];
    const message = enqueued.agentInputUserMessage;
    expect(message.senderType).toBe(SenderType.TOOL);
    expect(message.content).toContain("The file 'image.png' has been loaded into the context");
    expect(message.contextFiles).toEqual([contextFile]);
  });

  it('handles list of context files', async () => {
    const handler = new ToolResultEventHandler();
    const { context, inputQueues } = makeContext();
    const contextFile1 = new ContextFile('/path/to/file1.txt', undefined, 'file1.txt');
    const contextFile2 = new ContextFile('/path/to/file2.log', undefined, 'file2.log');
    const event = new ToolResultEvent('ListFiles', [contextFile1, contextFile2], 'list-1');

    await handler.handle(event, context);

    expect(inputQueues.enqueueUserMessage).toHaveBeenCalledTimes(1);
    const enqueued = inputQueues.enqueueUserMessage.mock.calls[0][0];
    const message = enqueued.agentInputUserMessage;
    expect(message.senderType).toBe(SenderType.TOOL);
    expect(message.content).toContain('The following files have been loaded into the context');
    expect(message.content).toContain("['file1.txt', 'file2.log']");
    expect(message.contextFiles).toEqual([contextFile1, contextFile2]);
  });

  it('handles multi-tool with mixed media and text', async () => {
    const handler = new ToolResultEventHandler();
    const { context, inputQueues } = makeContext();
    const contextFile = new ContextFile('/path/to/image.png', undefined, 'image.png');
    const invA = new ToolInvocation('read_media_file', { path: '/path/to/image.png' }, 'media-1');
    const invB = new ToolInvocation('calculator', { op: 'add' }, 'calc-1');
    context.state.activeToolInvocationBatch = new ToolInvocationBatch([invA, invB]);

    const resA = new ToolResultEvent('read_media_file', contextFile, 'media-1');
    const resB = new ToolResultEvent('calculator', { sum: 5 }, 'calc-1');

    await handler.handle(resA, context);
    await handler.handle(resB, context);

    expect(inputQueues.enqueueUserMessage).toHaveBeenCalledTimes(1);
    const enqueued = inputQueues.enqueueUserMessage.mock.calls[0][0];
    const message = enqueued.agentInputUserMessage;
    expect(message.senderType).toBe(SenderType.TOOL);
    expect(message.contextFiles).toEqual([contextFile]);
    const content = message.content;
    const posA = content.indexOf('Tool: read_media_file');
    const posB = content.indexOf('Tool: calculator');
    expect(posA).toBeLessThan(posB);
    expect(content).toContain("The file 'image.png' has been loaded");
    expect(content).toContain('sum: 5');
  });

  it('handles non-serializable objects', async () => {
    const handler = new ToolResultEventHandler();
    const { context, inputQueues } = makeContext();

    class MyObject {
      constructor(private val: string) {}
      toString(): string {
        return `MyObject(val=${this.val})`;
      }
    }

    const objResult = new MyObject('test_data');
    const event = new ToolResultEvent('object_tool', objResult, 'obj-002');

    await handler.handle(event, context);

    const enqueued = inputQueues.enqueueUserMessage.mock.calls[0][0];
    const content = enqueued.agentInputUserMessage.content;
    expect(content).toContain(`Result:\n${String(objResult)}`);
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

  it('logs initialization', () => {
    new ToolResultEventHandler();
    expect(
      infoSpy.mock.calls.some(([msg]: [unknown]) => String(msg).includes('ToolResultEventHandler initialized.'))
    ).toBe(true);
  });
});
