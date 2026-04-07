import { describe, it, expect } from 'vitest';
import { AgentInputEventQueueManager } from '../../../../src/agent/events/agent-input-event-queue-manager.js';
import {
  LLMUserMessageReadyEvent,
  PendingToolInvocationEvent,
  ToolResultEvent,
  UserMessageReceivedEvent
} from '../../../../src/agent/events/agent-events.js';
import { AgentInputUserMessage } from '../../../../src/agent/message/agent-input-user-message.js';
import { LLMUserMessage } from '../../../../src/llm/user-message.js';
import { ToolInvocation } from '../../../../src/agent/tool-invocation.js';

describe('AgentInputEventQueueManager', () => {
  it('preserves FIFO order when only tool queue has items', async () => {
    const mgr = new AgentInputEventQueueManager();

    await mgr.toolInvocationRequestQueue.put(
      new PendingToolInvocationEvent(new ToolInvocation('tool_1', {}, 't1'))
    );
    await mgr.toolInvocationRequestQueue.put(
      new PendingToolInvocationEvent(new ToolInvocation('tool_2', {}, 't2'))
    );

    const evt1 = await mgr.getNextInputEvent();
    const evt2 = await mgr.getNextInputEvent();

    expect(evt1).not.toBeNull();
    expect(evt2).not.toBeNull();

    const [, e1] = evt1!;
    const [, e2] = evt2!;

    expect((e1 as PendingToolInvocationEvent).toolInvocation.id).toBe('t1');
    expect((e2 as PendingToolInvocationEvent).toolInvocation.id).toBe('t2');
  });

  it('buffers multiple ready queues according to queue priority without reordering tool invocations', async () => {
    const mgr = new AgentInputEventQueueManager();

    await mgr.toolInvocationRequestQueue.put(
      new PendingToolInvocationEvent(new ToolInvocation('tool_1', {}, 't1'))
    );
    await mgr.toolInvocationRequestQueue.put(
      new PendingToolInvocationEvent(new ToolInvocation('tool_2', {}, 't2'))
    );

    await mgr.toolResultInputQueue.put(new ToolResultEvent('other_tool', 'ok'));

    const evt1 = await mgr.getNextInputEvent();
    const evt2 = await mgr.getNextInputEvent();
    const evt3 = await mgr.getNextInputEvent();

    expect(evt1).not.toBeNull();
    expect(evt2).not.toBeNull();
    expect(evt3).not.toBeNull();

    const [, e1] = evt1!;
    const [, e2] = evt2!;
    const [, e3] = evt3!;

    expect(e1).toBeInstanceOf(ToolResultEvent);
    expect(e2).toBeInstanceOf(PendingToolInvocationEvent);
    expect((e2 as PendingToolInvocationEvent).toolInvocation.id).toBe('t1');
    expect(e3).toBeInstanceOf(PendingToolInvocationEvent);
    expect((e3 as PendingToolInvocationEvent).toolInvocation.id).toBe('t2');
  });

  it('keeps later external input queued behind an active turn continuation', async () => {
    const mgr = new AgentInputEventQueueManager();

    await mgr.enqueueUserMessage(
      new UserMessageReceivedEvent(new AgentInputUserMessage('second external input'))
    );
    await mgr.enqueueInternalSystemEvent(
      new LLMUserMessageReadyEvent(new LLMUserMessage({ content: 'first prompt' }), 'turn-1')
    );

    const evt1 = await mgr.getNextInputEvent({ allowExternalInput: false });
    expect(evt1).not.toBeNull();
    expect(evt1?.[0]).toBe('internalSystemEventQueue');
    expect(evt1?.[1]).toBeInstanceOf(LLMUserMessageReadyEvent);

    const evt2 = await mgr.getNextInputEvent({ allowExternalInput: true });
    expect(evt2).not.toBeNull();
    expect(evt2?.[0]).toBe('userMessageInputQueue');
    expect(evt2?.[1]).toBeInstanceOf(UserMessageReceivedEvent);
  });
});
