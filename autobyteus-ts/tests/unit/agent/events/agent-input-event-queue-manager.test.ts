import { describe, it, expect } from 'vitest';
import { AgentInputEventQueueManager } from '../../../../src/agent/events/agent-input-event-queue-manager.js';
import {
  AgentReadyEvent,
  InterAgentMessageReceivedEvent,
  ToolExecutionApprovalEvent,
  UserMessageReceivedEvent
} from '../../../../src/agent/events/agent-events.js';
import { AgentInputUserMessage } from '../../../../src/agent/message/agent-input-user-message.js';

const timeout = <T>(promise: Promise<T>, ms = 1000): Promise<T> =>
  Promise.race([
    promise,
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error('timed out')), ms))
  ]);

describe('AgentInputEventQueueManager', () => {
  it('preserves external scheduler FIFO order for user messages', async () => {
    const mgr = new AgentInputEventQueueManager();

    await mgr.enqueueUserMessage(
      new UserMessageReceivedEvent(new AgentInputUserMessage('first'))
    );
    await mgr.enqueueUserMessage(
      new UserMessageReceivedEvent(new AgentInputUserMessage('second'))
    );

    const evt1 = await timeout(mgr.getNextSchedulerEvent());
    const evt2 = await timeout(mgr.getNextSchedulerEvent());

    expect(evt1?.[0]).toBe('userMessageInputQueue');
    expect((evt1?.[1] as UserMessageReceivedEvent).agentInputUserMessage.content).toBe('first');
    expect(evt2?.[0]).toBe('userMessageInputQueue');
    expect((evt2?.[1] as UserMessageReceivedEvent).agentInputUserMessage.content).toBe('second');
  });

  it('prioritizes external turn triggers before approval and internal lifecycle traffic', async () => {
    const mgr = new AgentInputEventQueueManager();

    await mgr.enqueueInternalSystemEvent(new AgentReadyEvent());
    await mgr.enqueueToolApprovalEvent(new ToolExecutionApprovalEvent('tool-1', true));
    await mgr.enqueueInterAgentMessage(new InterAgentMessageReceivedEvent({} as any));
    await mgr.enqueueUserMessage(new UserMessageReceivedEvent(new AgentInputUserMessage('external')));

    expect((await timeout(mgr.getNextSchedulerEvent()))?.[0]).toBe('userMessageInputQueue');
    expect((await timeout(mgr.getNextSchedulerEvent()))?.[0]).toBe('interAgentMessageInputQueue');
    expect((await timeout(mgr.getNextSchedulerEvent()))?.[0]).toBe('toolExecutionApprovalQueue');
    expect((await timeout(mgr.getNextSchedulerEvent()))?.[0]).toBe('internalSystemEventQueue');
  });

  it('can withhold external input while still allowing control or lifecycle queues', async () => {
    const mgr = new AgentInputEventQueueManager();

    await mgr.enqueueUserMessage(new UserMessageReceivedEvent(new AgentInputUserMessage('later')));
    await mgr.enqueueToolApprovalEvent(new ToolExecutionApprovalEvent('tool-1', false));

    const approval = await timeout(mgr.getNextInputEvent({ allowExternalInput: false }));
    expect(approval?.[0]).toBe('toolExecutionApprovalQueue');
    expect(approval?.[1]).toBeInstanceOf(ToolExecutionApprovalEvent);

    const external = await timeout(mgr.getNextInputEvent({ allowExternalInput: true }));
    expect(external?.[0]).toBe('userMessageInputQueue');
    expect(external?.[1]).toBeInstanceOf(UserMessageReceivedEvent);
  });
});
