import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { EventEmitter } from '../../../src/events/event-emitter.js';
import { EventType } from '../../../src/events/event-types.js';

const eventType = EventType.TOOL_EXECUTION_COMPLETED;

describe('Event bus integration', () => {
  let emitterA: EventEmitter;
  let emitterB: EventEmitter;

  beforeEach(() => {
    emitterA = new EventEmitter();
    emitterB = new EventEmitter();
  });

  afterEach(() => {
    emitterA.unsubscribeAllListeners();
    emitterB.unsubscribeAllListeners();
  });

  it('delivers to global and sender-specific listeners', () => {
    let globalCount = 0;
    let senderCount = 0;

    const globalListener = () => {
      globalCount += 1;
    };

    const senderListener = (_payload?: any, metadata?: Record<string, any>) => {
      if (metadata?.object_id === emitterA.objectId) {
        senderCount += 1;
      }
    };

    emitterB.subscribe(eventType, globalListener);
    emitterB.subscribeFrom(emitterA, eventType, senderListener);

    emitterA.emit(eventType, { payload: { kind: 'from-a' } });
    emitterB.emit(eventType, { payload: { kind: 'from-b' } });

    expect(globalCount).toBe(2);
    expect(senderCount).toBe(1);
  });

  it('supports payload override and metadata propagation', () => {
    const received: { payload?: any; metadata?: Record<string, any> } = {};

    const listener = (payload?: any, metadata?: Record<string, any>) => {
      received.payload = payload;
      received.metadata = metadata;
    };

    emitterB.subscribeFrom(emitterA, eventType, listener);
    emitterA.emit(eventType, { payload: { message: 'hello' }, extra: 'meta' });

    expect(received.payload).toEqual({ message: 'hello' });
    expect(received.metadata?.event_type).toBe(eventType);
    expect(received.metadata?.object_id).toBe(emitterA.objectId);
    expect(received.metadata?.extra).toBe('meta');
  });

  it('unsubscribe_all_listeners stops delivery', () => {
    let count = 0;
    const listener = () => {
      count += 1;
    };

    emitterB.subscribe(eventType, listener);
    emitterB.subscribeFrom(emitterA, eventType, listener);
    emitterB.unsubscribeAllListeners();

    emitterA.emit(eventType, { payload: { ok: true } });
    emitterB.emit(eventType, { payload: { ok: true } });

    expect(count).toBe(0);
  });

  it('swallows listener errors and continues delivery', () => {
    let safeCount = 0;

    const failingListener = () => {
      throw new Error('boom');
    };

    const safeListener = () => {
      safeCount += 1;
    };

    emitterB.subscribe(eventType, failingListener);
    emitterB.subscribe(eventType, safeListener);

    emitterA.emit(eventType, { payload: { ok: true } });

    expect(safeCount).toBe(1);
  });

  it('supports async listeners without blocking the emitter', async () => {
    let asyncCount = 0;
    const asyncListener = async () => {
      await new Promise((resolve) => setTimeout(resolve, 5));
      asyncCount += 1;
    };

    emitterB.subscribeFrom(emitterA, eventType, asyncListener);
    emitterA.emit(eventType, { payload: { ok: true } });

    await new Promise((resolve) => setTimeout(resolve, 10));
    expect(asyncCount).toBe(1);
  });
});
