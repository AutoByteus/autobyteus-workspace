import { describe, it, expect, beforeEach, vi } from 'vitest';
import { EventEmitter } from '../../../src/events/event-emitter.js';
import { EventManager } from '../../../src/events/event-manager.js';
import { EventType } from '../../../src/events/event-types.js';

const resetManager = () => {
  const manager = EventManager.getInstance() as any;
  manager.topics = new Map();
};

describe('EventEmitter', () => {
  beforeEach(() => {
    resetManager();
  });

  it('subscribes and emits events', () => {
    const emitter = new EventEmitter();
    const listener = vi.fn();

    emitter.subscribe(EventType.TASK_PLAN_TASKS_CREATED, listener);
    emitter.emit(EventType.TASK_PLAN_TASKS_CREATED, { payload: 'data' });

    expect(listener).toHaveBeenCalledTimes(1);
    const [payload, meta] = listener.mock.calls[0];
    expect(payload).toBe('data');
    expect(meta.object_id).toBe(emitter.objectId);
  });

  it('subscribes to events from a specific sender', () => {
    const emitterA = new EventEmitter();
    const emitterB = new EventEmitter();
    const listener = vi.fn();

    emitterA.subscribeFrom(emitterB, EventType.TASK_PLAN_STATUS_UPDATED, listener);

    emitterA.emit(EventType.TASK_PLAN_STATUS_UPDATED, { payload: 'skip' });
    expect(listener).not.toHaveBeenCalled();

    emitterB.emit(EventType.TASK_PLAN_STATUS_UPDATED, { payload: 'hit' });
    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener.mock.calls[0][0]).toBe('hit');
  });

  it('unsubscribes from sender-specific events', () => {
    const emitterA = new EventEmitter();
    const emitterB = new EventEmitter();
    const listener = vi.fn();

    emitterA.subscribeFrom(emitterB, EventType.TASK_PLAN_STATUS_UPDATED, listener);
    emitterA.unsubscribeFrom(emitterB, EventType.TASK_PLAN_STATUS_UPDATED, listener);

    emitterB.emit(EventType.TASK_PLAN_STATUS_UPDATED, { payload: 'hit' });
    expect(listener).not.toHaveBeenCalled();
  });

  it('unsubscribes all listeners for this emitter', () => {
    const emitter = new EventEmitter();
    const listener = vi.fn();

    emitter.subscribe(EventType.TASK_PLAN_TASKS_CREATED, listener);
    emitter.unsubscribeAllListeners();
    emitter.emit(EventType.TASK_PLAN_TASKS_CREATED, { payload: 'data' });

    expect(listener).not.toHaveBeenCalled();
  });
});
