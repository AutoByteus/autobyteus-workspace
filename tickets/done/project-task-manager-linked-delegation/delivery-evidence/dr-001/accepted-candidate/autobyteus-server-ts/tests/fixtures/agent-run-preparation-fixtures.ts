import { vi } from "vitest";
import { createBackendPreparation } from "../../src/agent-execution/backends/agent-run-backend-preparation.js";

/** Current opaque Manager fake. Construction callbacks are observations, not obsolete public APIs. */
export const testActivationManager = (definitions: Record<string, any>) => ({
  ...definitions,
  beginActivation: vi.fn((request: any) => {
    let started = false, settled = false, cancelled = false;
    let candidate: any = null;
    let attempt: Promise<any> | null = null;
    let releaseProof = false;
    let releasing: Promise<any> | null = null;
    const { kind, ...input } = request;
    const construct = () => kind === "new" ? definitions.newPreparation(input)
      : kind === "platform_restore" ? definitions.platformPreparation(input)
      : definitions.restorePreparation(request.context);
    return {
      inspect: () => releaseProof ? "released" : cancelled ? "closing" : settled ? "prepared" : started ? "preparing" : "reserved",
      cancel: () => { cancelled = true; },
      prepare: () => {
        if (attempt) return attempt;
        if (cancelled) return Promise.reject(new Error("Test activation cancelled."));
        started = true;
        attempt = Promise.resolve().then(construct).then(value => {
          candidate = value;
          if (cancelled) throw new Error("Test activation cancelled.");
          return value;
        }).finally(() => { settled = true; });
        return attempt;
      },
      releasePrivate: () => {
        cancelled = true;
        if (releaseProof) return Promise.resolve({ kind: "released" });
        if (releasing) return releasing;
        const release = (async () => {
          if (started && !settled) return { kind: "pending" };
          if (candidate) {
            const result = await candidate.abort();
            if (result?.kind !== "aborted") return { kind: "quarantined", error: result?.error ?? new Error("Test candidate has no abort proof.") };
          }
          releaseProof = true;
          return { kind: "released" };
        })();
        releasing = release;
        void release.finally(() => { releasing = null; }).catch(() => undefined);
        return release;
      },
    };
  }),
});

/** Test-owned backend constructor exposed through the actual synchronous factory contract. */
export const testBackendFactory = (definitions: Record<string, any>) => ({ beginPreparation: vi.fn((request: any) => {
  let backend: any = null;
  return createBackendPreparation({ prepare: async () => {
    backend = request.kind === "new" ? await definitions.createBackend(request.config, request.runId)
      : await definitions.restoreBackend(request.context);
    return backend;
  }, releaseResources: async () => {
    if (backend) {
      const result = await backend.terminate();
      if (!result.accepted || backend.isActive()) throw new Error("Test backend release unproven.");
    }
  } });
}) });

/** Exact test lease; the observation methods are deliberately not production APIs. */
export const testCodexLeaseManager = (definitions: Record<string, any>) => ({
  ...definitions,
  beginAcquire: vi.fn((cwd: string) => {
    let acquired: Promise<any> | null = null, released = false;
    return {
      acquire: () => {
        if (released) return Promise.reject(new Error('Test Codex lease closed.'));
        return acquired ??= definitions.acquireClient(cwd);
      },
      release: async () => {
        if (released) return;
        await definitions.releaseClient(cwd);
        released = true;
      },
    };
  }),
});
