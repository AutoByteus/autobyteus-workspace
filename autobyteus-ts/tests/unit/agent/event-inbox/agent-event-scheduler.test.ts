import { describe, it, expect, vi } from 'vitest';
import { AgentEventInbox } from '../../../../src/agent/event-inbox/agent-event-inbox.js';
import { AgentEventScheduler } from '../../../../src/agent/event-inbox/agent-event-scheduler.js';
import { AgentRuntimeState } from '../../../../src/agent/context/agent-runtime-state.js';
import { ToolExecutionApprovalEvent, UserMessageReceivedEvent } from '../../../../src/agent/events/agent-events.js';
import { AgentInputUserMessage } from '../../../../src/agent/message/agent-input-user-message.js';
import type { AgentEventSchedulerProcessors } from '../../../../src/agent/event-inbox/agent-event-scheduler.js';

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

const makeProcessors = (): AgentEventSchedulerProcessors => ({
  turnStartProcessor: { process: vi.fn(async () => ({ accepted: true, code: 'turn_started', turnId: 'turn-1' })) } as any,
  lifecycleProcessor: { process: vi.fn(async () => ({ accepted: true, code: 'lifecycle_applied' })) } as any,
  toolApprovalProcessor: { process: vi.fn(async () => ({ accepted: false, code: 'no_active_turn', invocationId: 'inv-1', message: 'no active turn' })) } as any,
  toolResultProcessor: { process: vi.fn(async () => ({ accepted: false, code: 'no_active_turn', invocationId: 'inv-1', message: 'no active turn' })) } as any
});

const storeWaiterCount = (inbox: AgentEventInbox): number =>
  ((inbox as any).store as { availabilityWaiters: unknown[] }).availabilityWaiters.length;

const schedulerWaiterCount = (scheduler: AgentEventScheduler): number =>
  ((scheduler as any).dispatchabilityWaiters as unknown[]).length;

describe('AgentEventScheduler', () => {
  it('does not strand a parked turn-start event when active-turn settlement wakes before wait registration', async () => {
    const inbox = new AgentEventInbox();
    const state = new AgentRuntimeState('agent-lost-wake');
    state.activeTurnTaskTurnId = 'turn-active';
    state.activeTurnTask = new Promise<any>(() => undefined);
    const scheduler = new AgentEventScheduler({ state } as any, makeProcessors());
    await inbox.postUserEvent(new UserMessageReceivedEvent(new AgentInputUserMessage('queued')));

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

    const entry = await timeout(scheduler.nextDispatchable({ inbox, runtimeState: state }), 200);

    expect(entry.event).toBeInstanceOf(UserMessageReceivedEvent);
    expect((entry.event as UserMessageReceivedEvent).agentInputUserMessage.content).toBe('queued');
    expect(schedulerWaiterCount(scheduler)).toBe(0);
    expect(storeWaiterCount(inbox)).toBe(0);
  });

  it('cleans up the losing availability waiter when dispatchability wins', async () => {
    const inbox = new AgentEventInbox();
    const state = new AgentRuntimeState('agent-dispatchability-cleanup');
    state.activeTurnTaskTurnId = 'turn-active';
    state.activeTurnTask = new Promise<any>(() => undefined);
    const scheduler = new AgentEventScheduler({ state } as any, makeProcessors());
    await inbox.postUserEvent(new UserMessageReceivedEvent(new AgentInputUserMessage('parked')));

    const nextPromise = scheduler.nextDispatchable({ inbox, runtimeState: state });
    expect(await waitForCondition(() => schedulerWaiterCount(scheduler) === 1 && storeWaiterCount(inbox) === 1)).toBe(true);

    state.clearActiveTurnTask('turn-active');
    scheduler.wakeDispatchabilityChanged();
    const entry = await timeout(nextPromise, 200);

    expect(entry.event).toBeInstanceOf(UserMessageReceivedEvent);
    expect(schedulerWaiterCount(scheduler)).toBe(0);
    expect(storeWaiterCount(inbox)).toBe(0);
  });

  it('cleans up the losing dispatchability waiter when inbox availability wins', async () => {
    const inbox = new AgentEventInbox();
    const state = new AgentRuntimeState('agent-availability-cleanup');
    state.activeTurnTaskTurnId = 'turn-active';
    state.activeTurnTask = new Promise<any>(() => undefined);
    const scheduler = new AgentEventScheduler({ state } as any, makeProcessors());

    const nextPromise = scheduler.nextDispatchable({ inbox, runtimeState: state });
    expect(await waitForCondition(() => schedulerWaiterCount(scheduler) === 1 && storeWaiterCount(inbox) === 1)).toBe(true);

    await inbox.postEvent(new ToolExecutionApprovalEvent('inv-1', true));
    const entry = await timeout(nextPromise, 200);

    expect(entry.event).toBeInstanceOf(ToolExecutionApprovalEvent);
    expect(schedulerWaiterCount(scheduler)).toBe(0);
    expect(storeWaiterCount(inbox)).toBe(0);
  });
});
