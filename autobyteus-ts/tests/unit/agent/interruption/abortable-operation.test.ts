import { describe, it, expect } from 'vitest';
import { iterateWithAbort, racePromiseWithAbort } from '../../../../src/agent/interruption/abortable-operation.js';
import { AgentInterruptionError } from '../../../../src/agent/interruption/agent-interruption.js';

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
});
