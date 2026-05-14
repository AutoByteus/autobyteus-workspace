import { describe, it, expect } from 'vitest';
import { InboxQueueStore } from '../../../../src/agent/event-inbox/inbox-queue-store.js';

const timeout = <T>(promise: Promise<T>, ms = 1000): Promise<T> =>
  Promise.race([
    promise,
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error('timed out')), ms))
  ]);

describe('InboxQueueStore', () => {
  it('stores generic queue items in FIFO order without domain event knowledge', () => {
    const store = new InboxQueueStore<{ entryId: string }>(['turn_start']);

    store.enqueue('turn_start', { entryId: 'first' });
    store.enqueue('turn_start', { entryId: 'second' });

    expect(store.claim('first')).toEqual({ entryId: 'first' });
    expect(store.claim('second')).toEqual({ entryId: 'second' });
  });

  it('uses caller-selected lanes instead of hard-coded domain priority', () => {
    const store = new InboxQueueStore<{ entryId: string }>(['turn_start', 'active_turn', 'runtime_lifecycle']);

    store.enqueue('turn_start', { entryId: 'later' });
    store.enqueue('active_turn', { entryId: 'now' });
    store.enqueue('runtime_lifecycle', { entryId: 'ready' });

    expect(store.peekFirst('active_turn')).toEqual({ entryId: 'now' });
    expect(store.peekFirst('runtime_lifecycle')).toEqual({ entryId: 'ready' });
    expect(store.drain(['runtime_lifecycle', 'active_turn', 'turn_start']).map((item) => item.entryId)).toEqual([
      'ready',
      'now',
      'later'
    ]);
  });

  it('wakes waiters only on new availability', async () => {
    const store = new InboxQueueStore<{ entryId: string }>(['turn_start']);
    const waitPromise = timeout(store.waitForAvailability(), 1000);

    store.enqueue('turn_start', { entryId: 'first' });

    await expect(waitPromise).resolves.toBeUndefined();
  });

  it('does not park availability waiters when messages are already queued', async () => {
    const store = new InboxQueueStore<{ entryId: string }>(['turn_start']);

    store.enqueue('turn_start', { entryId: 'first' });

    await expect(timeout(store.waitForAvailability(), 50)).resolves.toBeUndefined();
  });
});
