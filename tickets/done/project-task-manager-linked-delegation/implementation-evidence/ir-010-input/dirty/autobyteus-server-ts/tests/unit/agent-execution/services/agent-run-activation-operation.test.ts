import { describe, expect, it, vi } from 'vitest';
import { beginAgentRunActivation } from '../../../../src/agent-execution/services/agent-run-activation-operation.js';
import { createBackendPreparation } from '../../../../src/agent-execution/backends/agent-run-backend-preparation.js';
import { AgentRunActivationRegistry } from '../../../../src/agent-execution/runtime/agent-run-activation-registry.js';

const deferred = <T>() => { let resolve!: (value: T) => void; const promise = new Promise<T>(r => { resolve = r; }); return { promise, resolve }; };
function harness(prepare: () => Promise<never | object>, release: () => Promise<void>, validateRun?: (run: object) => void) {
  const resources = { attach: vi.fn(), release: vi.fn(() => ({ state: 'released', errors: [] })) };
  const registry = new AgentRunActivationRegistry(resources as never);
  const claim = registry.claim('owned-A');
  const constructRun = vi.fn(() => ({ runId: 'owned-A', runtimeKind: 'autobyteus', getPlatformAgentRunId: () => null, isActive: () => true }));
  const operation = beginAgentRunActivation({ claim, registry, constructRun: constructRun as never,
    preparation: createBackendPreparation({ prepare: prepare as never, releaseResources: release }), deactivateMcp: vi.fn(), validateRun: validateRun as never });
  return { registry, operation, resources, constructRun };
}
describe('retained private Agent activation authority', () => {
  it('retries the same rejected pre-candidate resource without preparation or publication', async () => {
    let failing = true;
    const prepare = vi.fn(async () => { throw new Error('provider initialization failed after acquisition'); });
    const release = vi.fn(async () => { if (failing) throw new Error('concrete close failed'); });
    const h = harness(prepare, release);
    await expect(h.operation.prepare()).rejects.toThrow('preparation and cleanup failed');
    expect(h.registry.getActiveRun('owned-A')).toBeNull();
    expect(() => h.registry.claim('owned-A')).toThrow(/quarantined|constructing/);
    expect((await h.operation.releasePrivate()).kind).toBe('quarantined');
    failing = false;
    expect(await h.operation.releasePrivate()).toEqual({ kind: 'released' });
    const calls = release.mock.calls.length;
    expect(await h.operation.releasePrivate()).toEqual({ kind: 'released' });
    expect(release).toHaveBeenCalledTimes(calls);
    expect(prepare).toHaveBeenCalledOnce();
    expect(h.constructRun).not.toHaveBeenCalled();
    expect(h.registry.claim('owned-A')).toBeDefined();
  });
  it('cancels before drain and retains a late resource; no candidate is published', async () => {
    const acquisition = deferred<object>();
    let acquired = false;
    const close = vi.fn(async () => { if (acquired) acquired = false; });
    const h = harness(async () => { const value = await acquisition.promise; acquired = true; return value; }, close);
    const preparation = h.operation.prepare();
    const rejected = expect(preparation).rejects.toThrow(/cancelled/);
    h.operation.cancel();
    expect(await h.operation.releasePrivate()).toEqual({ kind: 'pending' });
    acquisition.resolve({}); await rejected;
    for (let n = 0; n < 12; n++) await Promise.resolve();
    expect(await h.operation.releasePrivate()).toEqual({ kind: 'released' });
    expect(acquired).toBe(false);
    expect(h.constructRun).not.toHaveBeenCalled();
    expect(h.registry.getActiveRun('owned-A')).toBeNull();
  });
  it('retains a constructed run before fallible validation without publication or reprepare', async () => {
    let closeFails = true;
    const release = vi.fn(async () => { if (closeFails) throw new Error('same backend failed close'); });
    const validation = vi.fn(() => { throw new Error('post-construction validation failed'); });
    const prepare = vi.fn(async () => ({}));
    const h = harness(prepare, release, validation);
    await expect(h.operation.prepare()).rejects.toThrow('preparation and cleanup failed');
    expect(validation).toHaveBeenCalledExactlyOnceWith(h.constructRun.mock.results[0].value);
    expect(h.registry.getActiveRun('owned-A')).toBeNull();
    expect(() => h.registry.claim('owned-A')).toThrow(/quarantined/);
    expect((await h.operation.releasePrivate()).kind).toBe('quarantined');
    closeFails = false;
    expect(await h.operation.releasePrivate()).toEqual({ kind: 'released' });
    const calls = release.mock.calls.length;
    expect(await h.operation.releasePrivate()).toEqual({ kind: 'released' });
    expect(release).toHaveBeenCalledTimes(calls);
    expect(prepare).toHaveBeenCalledOnce();
    expect(h.constructRun).toHaveBeenCalledOnce();
    expect(h.resources.attach).not.toHaveBeenCalled();
    expect(h.registry.claim('owned-A')).toBeDefined();
  });
  it('retains exact run attachment failure, and retries each remaining detach', async () => {
    const h = harness(async () => ({}), async () => undefined);
    h.resources.attach.mockImplementationOnce(() => { throw new Error('partial attachment'); });
    h.resources.release.mockReturnValue({ state: 'failed', errors: [new Error('detach failed')] } as never);
    await expect(h.operation.prepare()).rejects.toThrow('preparation and cleanup failed');
    h.resources.release.mockReturnValue({ state: 'released', errors: [] } as never);
    expect(await h.operation.releasePrivate()).toEqual({ kind: 'released' });
    expect(h.resources.release).toHaveBeenLastCalledWith('owned-A', h.constructRun.mock.results[0].value);
  });
});
