import { describe, expect, it, vi } from "vitest";
import {
  AgentRunActivationRegistry,
  AgentRunRemovalCleanupError,
} from "../../../../src/agent-execution/runtime/agent-run-activation-registry.js";

const releaseResult = (runId: string, errors: Error[] = []) => ({
  state: "released" as const,
  runId,
  revokedSessionCount: 1,
  detached: { fileChanges: true, artifactRelay: true, memoryRecorder: true },
  errors,
});

const createRun = (runId: string, isActive = true) => ({
  runId,
  active: isActive,
  isActive: vi.fn(function (this: { active: boolean }) {
    return this.active;
  }),
});

const createRegistry = (errorsByRunId: Record<string, Error[]> = {}) => {
  const resourceManager = {
    attach: vi.fn(),
    release: vi.fn((runId: string) => releaseResult(runId, errorsByRunId[runId] ?? [])),
  };
  return {
    registry: new AgentRunActivationRegistry(resourceManager as never),
    resourceManager,
  };
};

describe("AgentRunActivationRegistry", () => {
  it("keeps a prepared run private until the exact claim publishes it", () => {
    const { registry, resourceManager } = createRegistry();
    const run = createRun("run-1");
    const claim = registry.claim(run.runId);

    registry.markPrepared(claim, run as never);
    expect(resourceManager.attach).toHaveBeenCalledWith(run);
    expect(registry.getActiveRun(run.runId)).toBeNull();
    expect(registry.publish(claim, run as never)).toBe(run);
    expect(registry.getActiveRun(run.runId)).toBe(run);
    expect(() => registry.claim(run.runId)).toThrow(
      "Agent run 'run-1' is already active.",
    );
  });

  it("releases an exact prepared run and retains a quarantined claim after uncertain abort", () => {
    const { registry, resourceManager } = createRegistry();
    const run = createRun("run-quarantine");
    const claim = registry.claim(run.runId);
    registry.markPrepared(claim, run as never);

    expect(registry.releasePrepared(claim, run as never)).toEqual(releaseResult(run.runId));
    const quarantineError = new Error("provider termination remained active");
    registry.completeAbort(claim, run as never, { kind: "quarantined", error: quarantineError });

    expect(resourceManager.release).toHaveBeenCalledOnce();
    expect(() => registry.claim(run.runId)).toThrow(
      "Agent run 'run-quarantine' is quarantined after uncertain cleanup.",
    );
  });

  it("never lets stale exact-identity removal delete a replacement", () => {
    const { registry, resourceManager } = createRegistry();
    const current = createRun("run-1");
    const stale = createRun("run-1");
    const claim = registry.claim(current.runId);
    registry.markPrepared(claim, current as never);
    registry.publish(claim, current as never);

    const result = registry.removeIfCurrent({
      runId: current.runId,
      expectedRun: stale as never,
      reason: "explicit_termination",
    });

    expect(result.kind).toBe("identity_mismatch");
    expect(registry.getActiveRun(current.runId)).toBe(current);
    expect(resourceManager.release).not.toHaveBeenCalled();
  });

  it("prunes every inactive run, retains later active runs, and returns all cleanup errors", () => {
    const firstError = new Error("session revoke failed");
    const secondError = new Error("observer detach failed");
    const { registry, resourceManager } = createRegistry({
      "inactive-1": [firstError, secondError],
      "inactive-2": [new Error("file detach failed")],
    });
    for (const run of [
      createRun("inactive-1"),
      createRun("active-2", true),
      createRun("inactive-2"),
    ]) {
      const claim = registry.claim(run.runId);
      registry.markPrepared(claim, run as never);
      registry.publish(claim, run as never);
      if (run.runId.startsWith("inactive")) run.active = false;
    }

    const snapshot = registry.snapshotForStop();

    expect(snapshot.activeRuns.map((run) => run.runId)).toEqual(["active-2"]);
    expect(snapshot.pruningErrors).toHaveLength(2);
    expect(snapshot.pruningErrors[0]).toBeInstanceOf(AgentRunRemovalCleanupError);
    expect(snapshot.pruningErrors.flatMap((error) => error.errors)).toEqual([
      firstError,
      secondError,
      expect.objectContaining({ message: "file detach failed" }),
    ]);
    expect(resourceManager.release).toHaveBeenCalledTimes(2);
  });

  it("blocks new claims without discarding already prepared private ownership", () => {
    const { registry } = createRegistry();
    const run = createRun("prepared-1");
    const claim = registry.claim(run.runId);
    registry.markPrepared(claim, run as never);

    registry.blockNewClaims();
    expect(() => registry.claim("later")).toThrow(
      "Agent run activation is stopping and cannot accept a new claim.",
    );
    expect(registry.snapshotForStop().preparedRuns).toEqual([
      expect.objectContaining({ claim, run, quarantined: false }),
    ]);
  });
});
