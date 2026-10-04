import { describe, expect, it, vi } from "vitest";
import { StandaloneHostAgentHandle } from "../../../src/standalone-agent-run-root/domain/standalone-host-agent-handle.js";

const HOST = "host-run";

const subject = () => {
  let live: { runId: string; isActive(): boolean } | null = null;
  let release!: () => void;
  let fail: Error | null = null;
  const gate = () => new Promise<void>((resolve) => { release = resolve; });
  let pending = gate();
  const context = { identity: { agentRunId: HOST } } as never;
  const backend = {
    getActiveRun: vi.fn(() => live as never),
    activateHost: vi.fn(async (_id: string, _input: unknown) => {
      await pending;
      if (fail) throw fail;
      live = { runId: HOST, isActive: () => true };
      return { run: live as never, metadata: {} as never };
    }),
    terminateHost: vi.fn(async () => {
      const was = live;
      live = null;
      return { outcome: was ? "terminated" as const : "not_active" as const, runtimeKind: null };
    }),
  };
  const buildMemberExecutionContext = vi.fn(async () => context);
  const handle = new StandaloneHostAgentHandle({ hostRunId: HOST, backend, buildMemberExecutionContext });
  return {
    handle, backend, buildMemberExecutionContext, context,
    release: () => release(),
    failNext: (error: Error) => { fail = error; },
    rearm: () => { fail = null; pending = gate(); },
    crash: () => { live = null; },
  };
};

describe("StandaloneHostAgentHandle", () => {
  it("joins concurrent callers into one activation with the root-built member context", async () => {
    const f = subject();
    expect(f.handle.readiness).toBe("offline");
    const first = f.handle.ensureReady();
    const second = f.handle.ensureReady();
    await vi.waitFor(() => expect(f.backend.activateHost).toHaveBeenCalledOnce());
    expect(f.handle.readiness).toBe("activating");
    f.release();
    const [a, b] = await Promise.all([first, second]);
    expect(a).toBe(b);
    expect(f.backend.activateHost).toHaveBeenCalledExactlyOnceWith(HOST, { memberExecutionContext: f.context });
    expect(f.handle.readiness).toBe("live");
    // A live host is returned as is: no second activation.
    await expect(f.handle.ensureReady()).resolves.toBe(a);
    expect(f.backend.activateHost).toHaveBeenCalledOnce();
  });

  it("re-activates after a crash and lets a failed attempt be retried", async () => {
    const f = subject();
    f.release();
    await f.handle.ensureReady();
    f.crash();
    expect(f.handle.readiness).toBe("offline");
    f.rearm();
    f.failNext(new Error("provider unavailable"));
    const failed = f.handle.ensureReady();
    f.release();
    await expect(failed).rejects.toThrow("provider unavailable");
    expect(f.handle.readiness).toBe("offline");
    f.rearm();
    const retried = f.handle.ensureReady();
    f.release();
    await expect(retried).resolves.toMatchObject({ runId: HOST });
    expect(f.backend.activateHost).toHaveBeenCalledTimes(3);
    expect(f.buildMemberExecutionContext).toHaveBeenCalledTimes(3);
  });

  it("terminates after an in-flight activation settles", async () => {
    const f = subject();
    const starting = f.handle.ensureReady();
    await vi.waitFor(() => expect(f.backend.activateHost).toHaveBeenCalledOnce());
    const stopping = f.handle.terminate();
    expect(f.backend.terminateHost).not.toHaveBeenCalled();
    f.release();
    await starting;
    await expect(stopping).resolves.toEqual({ outcome: "terminated", runtimeKind: null });
    await expect(f.handle.terminate()).resolves.toEqual({ outcome: "not_active", runtimeKind: null });
  });
});
