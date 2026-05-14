import { describe, it, expect } from 'vitest';
import { AgentEventInbox } from '../../../../src/agent/event-inbox/agent-event-inbox.js';
import {
  AgentReadyEvent,
  InterAgentMessageReceivedEvent,
  LLMCompleteResponseReceivedEvent,
  LLMUserMessageReadyEvent,
  PendingToolInvocationEvent,
  ToolExecutionApprovalEvent,
  ToolResultEvent,
  UserMessageReceivedEvent
} from '../../../../src/agent/events/agent-events.js';
import { AgentInputUserMessage } from '../../../../src/agent/message/agent-input-user-message.js';
import { SenderType } from '../../../../src/agent/sender-type.js';
import { ToolInvocation } from '../../../../src/agent/tool-invocation.js';
import { CompleteResponse } from '../../../../src/llm/utils/response-types.js';

const timeout = <T>(promise: Promise<T>, ms = 1000): Promise<T> =>
  Promise.race([
    promise,
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error('timed out')), ms))
  ]);

describe('AgentEventInbox', () => {
  it('stores typed runtime events in event lanes with metadata-only entries', async () => {
    const inbox = new AgentEventInbox();
    const userEvent = new UserMessageReceivedEvent(new AgentInputUserMessage('hello'));
    const interAgentEvent = new InterAgentMessageReceivedEvent({} as any);
    const lifecycleEvent = new AgentReadyEvent();

    await inbox.postUserEvent(userEvent);
    await inbox.postInterAgentEvent(interAgentEvent);
    await inbox.postLifecycleEvent(lifecycleEvent);

    const snapshot = inbox.peekCandidates();
    expect(snapshot.turn_start.map((entry) => entry.event)).toEqual([userEvent, interAgentEvent]);
    expect(snapshot.turn_start.every((entry) => !('kind' in entry) && !('input' in entry))).toBe(true);
    expect(snapshot.runtime_lifecycle.map((entry) => entry.event)).toEqual([lifecycleEvent]);
    expect(snapshot.active_turn).toEqual([]);
  });

  it('keeps lifecycle entries in the lifecycle lane so they are not turn triggers', async () => {
    const inbox = new AgentEventInbox();
    const lifecycleEvent = new AgentReadyEvent();

    await inbox.postLifecycleEvent(lifecycleEvent);
    const claimed = inbox.claimFirst('runtime_lifecycle');

    expect(claimed).toMatchObject({
      lane: 'runtime_lifecycle',
      event: lifecycleEvent
    });
    expect(claimed).not.toHaveProperty('kind');
    expect(claimed).not.toHaveProperty('input');
  });

  it('rejects TOOL continuations and non-lifecycle events through lifecycle helper', async () => {
    const inbox = new AgentEventInbox();

    await expect(
      inbox.postLifecycleEvent(new ToolExecutionApprovalEvent('invocation-1', true) as any)
    ).rejects.toThrow(/LifecycleEvent/);

    await expect(
      inbox.postLifecycleEvent(new ToolResultEvent('tool', { ok: true }, 'invocation-1') as any)
    ).rejects.toThrow(/LifecycleEvent/);

    await expect(
      inbox.postUserEvent(
        new UserMessageReceivedEvent(new AgentInputUserMessage('tool result', SenderType.TOOL))
      )
    ).rejects.toThrow(/TOOL continuations/);

    await expect(
      inbox.postLifecycleEvent(
        new PendingToolInvocationEvent(new ToolInvocation('tool', {}, 'invocation-1')) as any
      )
    ).rejects.toThrow(/LifecycleEvent/);

    await expect(
      inbox.postLifecycleEvent(new LLMUserMessageReadyEvent({} as any, 'turn-1') as any)
    ).rejects.toThrow(/LifecycleEvent/);

    await expect(
      inbox.postLifecycleEvent(
        new LLMCompleteResponseReceivedEvent(new CompleteResponse({ content: 'done' }), false, 'turn-1') as any
      )
    ).rejects.toThrow(/LifecycleEvent/);
  });

  it('resolves awaitable active-turn events only through handler completion', async () => {
    const inbox = new AgentEventInbox();
    const resultPromise = inbox.postToolApprovalEvent(new ToolExecutionApprovalEvent('inv-1', true));
    const entry = inbox.claimFirst('active_turn');

    expect(entry?.event).toBeInstanceOf(ToolExecutionApprovalEvent);
    inbox.resolveAwaitable(entry!, {
      accepted: false,
      code: 'no_active_turn',
      invocationId: 'inv-1',
      message: 'no active turn'
    });

    await expect(timeout(resultPromise)).resolves.toMatchObject({
      accepted: false,
      code: 'no_active_turn'
    });
  });

  it('settles queued awaitable active-turn events during shutdown drain', async () => {
    const inbox = new AgentEventInbox();
    const approvalPromise = inbox.postToolApprovalEvent(new ToolExecutionApprovalEvent('approval-1', true));
    const resultPromise = inbox.postToolResultEvent(new ToolResultEvent('tool', { ok: true }, 'result-1'));

    const drained = inbox.settleQueuedAwaitablesForShutdown('agent-1');

    expect(drained.map((entry) => entry.event.constructor.name)).toEqual([
      'ToolExecutionApprovalEvent',
      'ToolResultEvent'
    ]);
    await expect(timeout(approvalPromise)).resolves.toMatchObject({
      accepted: false,
      code: 'runtime_stopped',
      invocationId: 'approval-1'
    });
    await expect(timeout(resultPromise)).resolves.toMatchObject({
      accepted: false,
      code: 'runtime_stopped',
      invocationId: 'result-1'
    });
  });
});
