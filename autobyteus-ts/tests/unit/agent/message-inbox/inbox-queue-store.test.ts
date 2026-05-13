import { describe, it, expect } from 'vitest';
import { InboxQueueStore } from '../../../../src/agent/message-inbox/inbox-queue-store.js';

const timeout = <T>(promise: Promise<T>, ms = 1000): Promise<T> =>
  Promise.race([
    promise,
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error('timed out')), ms))
  ]);

describe('InboxQueueStore', () => {
  it('stores generic queue items in FIFO order without domain event knowledge', () => {
    const store = new InboxQueueStore<{ messageId: string }>(['turn_start']);

    store.enqueue('turn_start', { messageId: 'first' });
    store.enqueue('turn_start', { messageId: 'second' });

    expect(store.claim('first')).toEqual({ messageId: 'first' });
    expect(store.claim('second')).toEqual({ messageId: 'second' });
  });

  it('uses caller-selected lanes instead of hard-coded domain priority', () => {
    const store = new InboxQueueStore<{ messageId: string }>(['turn_start', 'active_turn', 'runtime_lifecycle']);

    store.enqueue('turn_start', { messageId: 'later' });
    store.enqueue('active_turn', { messageId: 'now' });
    store.enqueue('runtime_lifecycle', { messageId: 'ready' });

    expect(store.peekFirst('active_turn')).toEqual({ messageId: 'now' });
    expect(store.peekFirst('runtime_lifecycle')).toEqual({ messageId: 'ready' });
    expect(store.drain(['runtime_lifecycle', 'active_turn', 'turn_start']).map((item) => item.messageId)).toEqual([
      'ready',
      'now',
      'later'
    ]);
  });

  it('wakes waiters only on new availability', async () => {
    const store = new InboxQueueStore<{ messageId: string }>(['turn_start']);
    const waitPromise = timeout(store.waitForAvailability(), 1000);

    store.enqueue('turn_start', { messageId: 'first' });

    await expect(waitPromise).resolves.toBeUndefined();
  });
});
