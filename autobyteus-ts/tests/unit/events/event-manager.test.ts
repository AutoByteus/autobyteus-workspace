import { describe, it, expect, beforeEach, vi } from 'vitest';
import { EventManager, Subscription, Topic } from '../../../src/events/event-manager.js';
import { EventType } from '../../../src/events/event-types.js';

const resetManager = () => {
  const manager = EventManager.getInstance() as any;
  manager.topics = new Map();
  return manager as EventManager;
};

describe('EventManager', () => {
  beforeEach(() => {
    resetManager();
  });

  it('notifies global subscribers on emit', () => {
    const manager = resetManager();
    const listener = vi.fn();

    manager.subscribe(new Subscription('sub-1', listener), new Topic(EventType.AGENT_TURN_STARTED, null));
    manager.emit(EventType.AGENT_TURN_STARTED, 'origin-1', { payload: 'data', extra: 'value' });

    expect(listener).toHaveBeenCalledTimes(1);
    const [payload, meta] = listener.mock.calls[0];
    expect(payload).toBe('data');
    expect(meta.object_id).toBe('origin-1');
    expect(meta.event_type).toBe(EventType.AGENT_TURN_STARTED);
    expect(meta.extra).toBe('value');
  });

  it('notifies sender-specific subscribers only for matching origin', () => {
    const manager = resetManager();
    const listener = vi.fn();

    manager.subscribe(new Subscription('sub-1', listener), new Topic(EventType.AGENT_STATUS, 'sender-1'));

    manager.emit(EventType.AGENT_STATUS, 'sender-2', { payload: 'skip' });
    expect(listener).not.toHaveBeenCalled();

    manager.emit(EventType.AGENT_STATUS, 'sender-1', { payload: 'hit' });
    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener.mock.calls[0][0]).toBe('hit');
  });

  it('unsubscribes a specific listener', () => {
    const manager = resetManager();
    const listener = vi.fn();
    const subscription = new Subscription('sub-1', listener);
    const topic = new Topic(EventType.AGENT_STATUS, null);

    manager.subscribe(subscription, topic);
    manager.unsubscribe(subscription, topic);

    manager.emit(EventType.AGENT_STATUS, 'origin', { payload: 'value' });
    expect(listener).not.toHaveBeenCalled();
  });

  it('removes all subscriptions for a subscriber', () => {
    const manager = resetManager();
    const listenerA = vi.fn();
    const listenerB = vi.fn();

    manager.subscribe(new Subscription('sub-1', listenerA), new Topic(EventType.AGENT_TURN_STARTED, null));
    manager.subscribe(new Subscription('sub-1', listenerB), new Topic(EventType.AGENT_STATUS, null));

    manager.unsubscribeAllForSubscriber('sub-1');

    manager.emit(EventType.AGENT_TURN_STARTED, 'origin', { payload: 'a' });
    manager.emit(EventType.AGENT_STATUS, 'origin', { payload: 'b' });

    expect(listenerA).not.toHaveBeenCalled();
    expect(listenerB).not.toHaveBeenCalled();
  });

  it('does not duplicate the same listener for a subscriber', () => {
    const manager = resetManager();
    const listener = vi.fn();
    const subscription = new Subscription('sub-1', listener);
    const topic = new Topic(EventType.AGENT_TURN_STARTED, null);

    manager.subscribe(subscription, topic);
    manager.subscribe(subscription, topic);

    manager.emit(EventType.AGENT_TURN_STARTED, 'origin', { payload: 'data' });
    expect(listener).toHaveBeenCalledTimes(1);
  });
});
