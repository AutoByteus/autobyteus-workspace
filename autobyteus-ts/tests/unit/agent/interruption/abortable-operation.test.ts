import { describe, it, expect, vi } from 'vitest';
import { iterateWithAbort, racePromiseWithAbort } from '../../../../src/agent/interruption/abortable-operation.js';
import { AgentInterruptionError } from '../../../../src/agent/interruption/agent-interruption.js';
import { TurnExecutionScope } from '../../../../src/agent/interruption/turn-execution-scope.js';

const makeState = () => {
  const controller = new AbortController();
  return {
    controller,
    state: { signal: controller.signal, getReason: () => 'user_interrupt' },
    meta: { kind: 'unit', turnId: 'turn-1' }
  };
};

describe('abortable operations', () => {
  it('races promises with turn-scope abort', async () => {
    const { controller, state, meta } = makeState();
    const pending = new Promise<string>((resolve) => setTimeout(() => resolve('late'), 1000));

    const raced = racePromiseWithAbort(pending, state, meta);
    controller.abort();

    await expect(raced).rejects.toBeInstanceOf(AgentInterruptionError);
  });

  it('abandons a blocked async iterator promptly on abort', async () => {
    const { controller, state, meta } = makeState();
    async function* blockedGenerator() {
      await new Promise<void>(() => undefined);
      yield 'never';
    }

    const start = Date.now();
    const consume = (async () => {
      for await (const _item of iterateWithAbort(blockedGenerator(), state, meta)) {
        // no-op
      }
    })();
    controller.abort();

    await expect(consume).rejects.toBeInstanceOf(AgentInterruptionError);
    expect(Date.now() - start).toBeLessThan(500);
  });

  it('does not invoke TurnExecutionScope run thunks when already aborted', async () => {
    const scope = new TurnExecutionScope('turn-1');
    const run = vi.fn(async () => 'should-not-start');
    scope.interrupt('user_interrupt');

    await expect(scope.runAbortable({ kind: 'pre_start' }, run)).rejects.toBeInstanceOf(AgentInterruptionError);
    expect(run).not.toHaveBeenCalled();
  });

  it('does not acquire async iterators when already aborted', async () => {
    const { controller, state, meta } = makeState();
    const iteratorFactory = vi.fn();
    const iterable = {
      [Symbol.asyncIterator]: iteratorFactory
    } as AsyncIterable<string>;
    controller.abort();

    const consume = (async () => {
      for await (const _item of iterateWithAbort(iterable, state, meta)) {
        // no-op
      }
    })();

    await expect(consume).rejects.toBeInstanceOf(AgentInterruptionError);
    expect(iteratorFactory).not.toHaveBeenCalled();
  });

  it('does not request another async iterator item after abort', async () => {
    const { controller, state, meta } = makeState();
    const iterator = {
      next: vi
        .fn()
        .mockResolvedValueOnce({ value: 'first', done: false })
        .mockResolvedValueOnce({ value: 'second', done: false }),
      return: vi.fn().mockResolvedValue({ done: true })
    };
    const iterable = {
      [Symbol.asyncIterator]: () => iterator
    } as AsyncIterable<string>;

    const observed: string[] = [];
    await expect((async () => {
      for await (const item of iterateWithAbort(iterable, state, meta)) {
        observed.push(item);
        controller.abort();
      }
    })()).rejects.toBeInstanceOf(AgentInterruptionError);

    expect(observed).toEqual(['first']);
    expect(iterator.next).toHaveBeenCalledTimes(1);
  });
});
