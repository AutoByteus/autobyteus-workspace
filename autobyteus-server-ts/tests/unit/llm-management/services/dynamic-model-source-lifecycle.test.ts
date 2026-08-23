import { describe, expect, it, vi } from 'vitest';
import {
  DynamicModelSourceLifecycle,
  type DynamicSourcePreparation,
} from '../../../../src/llm-management/services/dynamic-model-source-lifecycle.js';

const deferred = <T>() => {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((onResolve, onReject) => {
    resolve = onResolve;
    reject = onReject;
  });
  return { promise, resolve, reject };
};

const prepared = (models: readonly string[]): DynamicSourcePreparation<string> => ({
  models,
  successfulUnitCount: 1,
  failedUnitCount: 0,
});

describe('DynamicModelSourceLifecycle', () => {
  it('joins same-source cold demand and reuses a warm terminal snapshot', async () => {
    const lifecycle = new DynamicModelSourceLifecycle();
    const preparation = deferred<DynamicSourcePreparation<string>>();
    const prepare = vi.fn(() => preparation.promise);
    let rows: readonly string[] = [];
    const spec = {
      key: 'AUTOBYTEUS:LLM',
      modelKind: 'LLM' as const,
      fingerprint: 'llm|host-a|credential:0',
      currentModelCount: () => rows.length,
      prepare,
      commit: (models: readonly string[]) => { rows = models; },
    };

    const first = lifecycle.ensure(spec);
    const joined = lifecycle.ensure(spec);
    expect(joined).toBe(first);
    expect(prepare).toHaveBeenCalledTimes(1);

    preparation.resolve(prepared(['model-a']));
    await expect(first).resolves.toMatchObject({ state: 'READY', modelCount: 1 });
    await expect(lifecycle.ensure(spec)).resolves.toMatchObject({ state: 'READY', modelCount: 1 });
    expect(prepare).toHaveBeenCalledTimes(1);
  });

  it('publishes only the newest forced generation when completions arrive out of order', async () => {
    const lifecycle = new DynamicModelSourceLifecycle();
    const first = deferred<DynamicSourcePreparation<string>>();
    const second = deferred<DynamicSourcePreparation<string>>();
    const prepare = vi.fn()
      .mockReturnValueOnce(first.promise)
      .mockReturnValueOnce(second.promise);
    let rows: readonly string[] = [];
    const commit = vi.fn((models: readonly string[]) => { rows = models; });
    const spec = {
      key: 'AUTOBYTEUS:LLM',
      modelKind: 'LLM' as const,
      fingerprint: 'llm|host-a|credential:0',
      currentModelCount: () => rows.length,
      prepare,
      commit,
    };

    const oldGeneration = lifecycle.ensure(spec);
    const currentGeneration = lifecycle.ensure(spec, true);
    second.resolve(prepared(['current']));
    await expect(currentGeneration).resolves.toMatchObject({ state: 'READY', modelCount: 1 });
    first.resolve(prepared(['old']));
    await expect(oldGeneration).resolves.toMatchObject({ state: 'READY', modelCount: 1 });

    expect(rows).toEqual(['current']);
    expect(commit).toHaveBeenCalledTimes(1);
    expect(commit).toHaveBeenCalledWith(['current']);
  });

  it('caches a cold failure terminal and retains warm rows on a failed force reload', async () => {
    const lifecycle = new DynamicModelSourceLifecycle();
    let rows: readonly string[] = [];
    const prepare = vi.fn()
      .mockRejectedValueOnce(new Error('secret details must not escape'))
      .mockResolvedValueOnce(prepared(['known']))
      .mockRejectedValueOnce(new Error('MODEL_DISCOVERY_UNAVAILABLE'));
    const spec = {
      key: 'AUTOBYTEUS:LLM',
      modelKind: 'LLM' as const,
      fingerprint: 'llm|host-a|credential:0',
      currentModelCount: () => rows.length,
      prepare,
      commit: (models: readonly string[]) => { rows = models; },
    };

    await expect(lifecycle.ensure(spec)).resolves.toMatchObject({
      state: 'ERROR', safeMessage: 'MODEL_DISCOVERY_UNAVAILABLE', modelCount: 0,
    });
    await expect(lifecycle.ensure(spec)).resolves.toMatchObject({ state: 'ERROR' });
    expect(prepare).toHaveBeenCalledTimes(1);

    await expect(lifecycle.ensure(spec, true)).resolves.toMatchObject({
      state: 'READY', modelCount: 1,
    });
    await expect(lifecycle.ensure(spec, true)).resolves.toMatchObject({
      state: 'STALE_ERROR', safeMessage: 'MODEL_DISCOVERY_UNAVAILABLE', modelCount: 1,
    });
    expect(rows).toEqual(['known']);
  });
});
