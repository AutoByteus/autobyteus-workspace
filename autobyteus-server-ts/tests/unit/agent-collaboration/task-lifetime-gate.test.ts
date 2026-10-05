import { describe, expect, it, vi } from 'vitest';
import { TaskLifetimeGate } from '../../../src/agent-collaboration/execution/task/task-lifetime-gate.js';
import type { TaskLifetimeClosure } from '../../../src/agent-collaboration/execution/task/task-execution-lifetime.js';

const deferred = <T>() => { let resolve!: (value: T) => void; const promise = new Promise<T>(done => { resolve = done; }); return { promise, resolve }; };
const source = (closure: TaskLifetimeClosure) => ({ readLifetimeClosure: vi.fn(async () => closure) });

describe('TaskLifetimeGate (SR-021 single runtime closure owner)', () => {
  it('rejects synchronous input for a lifetime never confirmed open in this process', () => {
    const gate = new TaskLifetimeGate(source('open'));
    expect(() => gate.assertOpen('L1')).toThrow(expect.objectContaining({ code: 'TASK_LIFETIME_UNAVAILABLE' }));
  });

  it('confirms open through a durable read on every admit, then answers synchronous checks', async () => {
    const durable = source('open');
    const gate = new TaskLifetimeGate(durable);
    const admission = await gate.admit('L1');
    expect(admission.lifetimeId).toBe('L1');
    expect(() => admission.assertOpen()).not.toThrow();
    expect(() => gate.assertOpen('L1')).not.toThrow();
    await gate.admit('L1');
    expect(durable.readLifetimeClosure).toHaveBeenCalledTimes(2);
  });

  it('latches irreversibly on the commit listener; later admits never reach the durable reader', async () => {
    const durable = source('open');
    const gate = new TaskLifetimeGate(durable);
    const admission = await gate.admit('L1');
    gate.onLifetimesClosed(['L1']);
    expect(() => admission.assertOpen()).toThrow(expect.objectContaining({ code: 'TASK_LIFETIME_CLOSED' }));
    expect(() => gate.assertOpen('L1')).toThrow(expect.objectContaining({ code: 'TASK_LIFETIME_CLOSED' }));
    await expect(gate.admit('L1')).rejects.toMatchObject({ code: 'TASK_LIFETIME_CLOSED' });
    expect(durable.readLifetimeClosure).toHaveBeenCalledOnce();
    expect(() => gate.onLifetimesClosed(['L1', 'unknown'])).not.toThrow();
  });

  it('a DONE commit landing during the admit read still wins', async () => {
    const read = deferred<TaskLifetimeClosure>();
    const gate = new TaskLifetimeGate({ readLifetimeClosure: () => read.promise });
    const admit = gate.admit('L1');
    gate.onLifetimesClosed(['L1']);
    read.resolve('open');
    await expect(admit).rejects.toMatchObject({ code: 'TASK_LIFETIME_CLOSED' });
    expect(() => gate.assertOpen('L1')).toThrow(expect.objectContaining({ code: 'TASK_LIFETIME_CLOSED' }));
  });

  it('after restart, admit reads durable closure, latches and rejects', async () => {
    const gate = new TaskLifetimeGate(source('closed'));
    await expect(gate.admit('L1')).rejects.toMatchObject({ code: 'TASK_LIFETIME_CLOSED' });
    expect(() => gate.assertOpen('L1')).toThrow(expect.objectContaining({ code: 'TASK_LIFETIME_CLOSED' }));
  });

  it('confirmClosed requires durable closure and then latches', async () => {
    const open = new TaskLifetimeGate(source('open'));
    await open.admit('L1');
    await expect(open.confirmClosed('L1')).rejects.toMatchObject({ code: 'TASK_LIFETIME_INVALID' });
    expect(() => open.assertOpen('L1')).not.toThrow();
    const closed = new TaskLifetimeGate(source('closed'));
    await closed.confirmClosed('L1');
    expect(() => closed.assertOpen('L1')).toThrow(expect.objectContaining({ code: 'TASK_LIFETIME_CLOSED' }));
  });

  it('propagates the durable unknown-lifetime error unchanged', async () => {
    const error = Object.assign(new Error('Unknown Task lifetime'), { code: 'TASK_LIFETIME_INVALID' });
    const gate = new TaskLifetimeGate({ readLifetimeClosure: async () => { throw error; } });
    await expect(gate.admit('missing')).rejects.toBe(error);
  });
});
