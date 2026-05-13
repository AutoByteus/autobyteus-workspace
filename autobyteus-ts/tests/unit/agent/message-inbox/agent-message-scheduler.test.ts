import { describe, it, expect, vi } from 'vitest';
import { AgentMessageInbox } from '../../../../src/agent/message-inbox/agent-message-inbox.js';
import { AgentMessageScheduler } from '../../../../src/agent/message-inbox/agent-message-scheduler.js';
import { AgentRuntimeState } from '../../../../src/agent/context/agent-runtime-state.js';
import { UserMessageReceivedEvent } from '../../../../src/agent/events/agent-events.js';
import { AgentInputUserMessage } from '../../../../src/agent/message/agent-input-user-message.js';
import type { AgentMessageSchedulerHandlers } from '../../../../src/agent/message-inbox/agent-message-scheduler.js';

const timeout = <T>(promise: Promise<T>, ms = 1000): Promise<T> =>
  Promise.race([
    promise,
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error('timed out')), ms))
  ]);

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const waitForCondition = async (predicate: () => boolean, timeoutMs = 1000): Promise<boolean> => {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    if (predicate()) return true;
    await delay(5);
  }
  return false;
};

const makeHandlers = (): AgentMessageSchedulerHandlers => ({
  userMessageHandler: { kind: 'user_message', handle: vi.fn(async () => ({ accepted: true, code: 'turn_started', turnId: 'turn-1' })) } as any,
  lifecycleHandler: { kind: 'runtime_lifecycle', handle: vi.fn(async () => ({ accepted: true, code: 'lifecycle_applied' })) } as any,
  toolApprovalHandler: { kind: 'tool_approval', handle: vi.fn(async () => ({ accepted: false, code: 'no_active_turn', invocationId: 'inv-1', message: 'no active turn' })) } as any,
  toolResultHandler: { kind: 'tool_result', handle: vi.fn(async () => ({ accepted: false, code: 'no_active_turn', invocationId: 'inv-1', message: 'no active turn' })) } as any
});

const storeWaiterCount = (inbox: AgentMessageInbox): number =>
  ((inbox as any).store as { availabilityWaiters: unknown[] }).availabilityWaiters.length;

const schedulerWaiterCount = (scheduler: AgentMessageScheduler): number =>
  ((scheduler as any).dispatchabilityWaiters as unknown[]).length;

describe('AgentMessageScheduler', () => {
  it('does not strand a parked turn-start message when active-turn settlement wakes before wait registration', async () => {
    const inbox = new AgentMessageInbox();
    const state = new AgentRuntimeState('agent-lost-wake');
    state.activeTurnTaskTurnId = 'turn-active';
    state.activeTurnTask = new Promise<any>(() => undefined);
    const scheduler = new AgentMessageScheduler({ state } as any, makeHandlers());
    await inbox.postUserMessage(new UserMessageReceivedEvent(new AgentInputUserMessage('queued')));

    const originalClaim = (scheduler as any).claimNextDispatchable.bind(scheduler);
    let firstClaim = true;
    vi.spyOn(scheduler as any, 'claimNextDispatchable').mockImplementation((candidateInbox, candidateState) => {
      const result = originalClaim(candidateInbox, candidateState);
      if (firstClaim) {
        firstClaim = false;
        state.clearActiveTurnTask('turn-active');
        scheduler.wakeDispatchabilityChanged();
      }
      return result;
    });

    const message = await timeout(scheduler.nextDispatchable({ inbox, runtimeState: state }), 200);

    expect(message.kind).toBe('user_message');
    expect((message as any).event.agentInputUserMessage.content).toBe('queued');
    expect(schedulerWaiterCount(scheduler)).toBe(0);
    expect(storeWaiterCount(inbox)).toBe(0);
  });

  it('cleans up the losing availability waiter when dispatchability wins', async () => {
    const inbox = new AgentMessageInbox();
    const state = new AgentRuntimeState('agent-dispatchability-cleanup');
    state.activeTurnTaskTurnId = 'turn-active';
    state.activeTurnTask = new Promise<any>(() => undefined);
    const scheduler = new AgentMessageScheduler({ state } as any, makeHandlers());
    await inbox.postUserMessage(new UserMessageReceivedEvent(new AgentInputUserMessage('parked')));

    const nextPromise = scheduler.nextDispatchable({ inbox, runtimeState: state });
    expect(await waitForCondition(() => schedulerWaiterCount(scheduler) === 1 && storeWaiterCount(inbox) === 1)).toBe(true);

    state.clearActiveTurnTask('turn-active');
    scheduler.wakeDispatchabilityChanged();
    const message = await timeout(nextPromise, 200);

    expect(message.kind).toBe('user_message');
    expect(schedulerWaiterCount(scheduler)).toBe(0);
    expect(storeWaiterCount(inbox)).toBe(0);
  });

  it('cleans up the losing dispatchability waiter when inbox availability wins', async () => {
    const inbox = new AgentMessageInbox();
    const state = new AgentRuntimeState('agent-availability-cleanup');
    state.activeTurnTaskTurnId = 'turn-active';
    state.activeTurnTask = new Promise<any>(() => undefined);
    const scheduler = new AgentMessageScheduler({ state } as any, makeHandlers());

    const nextPromise = scheduler.nextDispatchable({ inbox, runtimeState: state });
    expect(await waitForCondition(() => schedulerWaiterCount(scheduler) === 1 && storeWaiterCount(inbox) === 1)).toBe(true);

    await inbox.post({
      messageId: 'approval-1',
      lane: 'active_turn',
      kind: 'tool_approval',
      input: { kind: 'tool_approval', invocationId: 'inv-1', approved: true }
    } as any);
    const message = await timeout(nextPromise, 200);

    expect(message.kind).toBe('tool_approval');
    expect(schedulerWaiterCount(scheduler)).toBe(0);
    expect(storeWaiterCount(inbox)).toBe(0);
  });
});
