import { describe, it, expect } from 'vitest';
import { AgentInputEventQueueManager } from '../../../../src/agent/events/agent-input-event-queue-manager.js';

const timeout = <T>(promise: Promise<T>, ms = 1000): Promise<T> =>
  Promise.race([
    promise,
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error('timed out')), ms))
  ]);

describe('AgentInputEventQueueManager', () => {
  it('stores generic queue items in FIFO order without domain event knowledge', async () => {
    const mgr = new AgentInputEventQueueManager<{ id: string }>(['external']);

    await mgr.enqueue('external', { id: 'first' });
    await mgr.enqueue('external', { id: 'second' });

    const evt1 = await timeout(mgr.getNext(['external']));
    const evt2 = await timeout(mgr.getNext(['external']));

    expect(evt1).toEqual(['external', { id: 'first' }]);
    expect(evt2).toEqual(['external', { id: 'second' }]);
  });

  it('uses caller-provided priority instead of hard-coded domain queues', async () => {
    const mgr = new AgentInputEventQueueManager<string>(['low', 'high', 'lifecycle']);

    await mgr.enqueue('lifecycle', 'ready');
    await mgr.enqueue('low', 'later');
    await mgr.enqueue('high', 'now');

    expect(await timeout(mgr.getNext(['high', 'low', 'lifecycle']))).toEqual(['high', 'now']);
    expect(await timeout(mgr.getNext(['high', 'low', 'lifecycle']))).toEqual(['low', 'later']);
    expect(await timeout(mgr.getNext(['high', 'low', 'lifecycle']))).toEqual(['lifecycle', 'ready']);
  });

  it('drains queued items using explicit caller priority', async () => {
    const mgr = new AgentInputEventQueueManager<string>(['a', 'b']);

    await mgr.enqueue('a', 'a1');
    await mgr.enqueue('b', 'b1');
    await mgr.enqueue('a', 'a2');

    expect(mgr.qsize()).toBe(3);
    expect(mgr.drain(['b', 'a'])).toEqual(['b1', 'a1', 'a2']);
    expect(mgr.empty()).toBe(true);
  });
});
