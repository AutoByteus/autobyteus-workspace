import { describe, expect, it, vi } from "vitest";
import {
  ActiveAgentRunRegistry,
  AgentRunRemovalCleanupError,
} from "../../../../src/agent-execution/runtime/active-agent-run-registry.js";

const releaseResult = (runId: string) => ({
  state: "released" as const,
  runId,
  revokedSessionCount: 1,
  detached: { fileChanges: true, artifactRelay: true, memoryRecorder: true },
  errors: [],
});

const createRun = (runId: string, active = true) => ({
  runId,
  isActive: vi.fn(() => active),
});

describe("ActiveAgentRunRegistry", () => {
  it("cleans inactive discovery and replacement before attaching the replacement", () => {
    const order: string[] = [];
    const resourceManager = {
      attach: vi.fn((run: { runId: string }) => order.push(`attach:${run.runId}`)),
      release: vi.fn((runId: string) => {
        order.push(`release:${runId}`);
        return releaseResult(runId);
      }),
    };
    const registry = new ActiveAgentRunRegistry(resourceManager as never);
    const first = createRun("run-1", false);
    const replacement = createRun("run-1", true);

    registry.register(first as never);
    expect(registry.getActiveRun("run-1")).toBeNull();
    registry.register(replacement as never);

    expect(order).toEqual([
      "attach:run-1",
      "release:run-1",
      "attach:run-1",
    ]);
    expect(registry.getActiveRun("run-1")).toBe(replacement);
  });

  it("keeps a replacement when a stale exact-identity removal arrives", () => {
    const resourceManager = {
      attach: vi.fn(),
      release: vi.fn((runId: string) => releaseResult(runId)),
    };
    const registry = new ActiveAgentRunRegistry(resourceManager as never);
    const current = createRun("run-1");
    const stale = createRun("run-1");
    registry.register(current as never);

    const result = registry.removeIfCurrent({
      runId: "run-1",
      expectedRun: stale as never,
      reason: "explicit_termination",
    });

    expect(result.kind).toBe("identity_mismatch");
    expect(registry.getActiveRun("run-1")).toBe(current);
    expect(resourceManager.release).not.toHaveBeenCalled();
  });

  it("removes the run identity when resource attachment rolls back", () => {
    const run = createRun("run-registration");
    const resourceManager = {
      attach: vi.fn(() => { throw new Error("attach failed"); }),
      release: vi.fn((runId: string) => releaseResult(runId)),
    };
    const registry = new ActiveAgentRunRegistry(resourceManager as never);

    expect(() => registry.register(run as never)).toThrow("attach failed");
    expect(registry.getActiveRun(run.runId)).toBeNull();
    expect(resourceManager.release).toHaveBeenCalledWith(run.runId, run);
  });

  it("surfaces cleanup failures only after deleting the exact run identity", () => {
    const run = createRun("run-cleanup");
    const resourceManager = {
      attach: vi.fn(),
      release: vi.fn((runId: string) => ({
        ...releaseResult(runId),
        errors: [new Error("session revoke failed"), new Error("observer detach failed")],
      })),
    };
    const registry = new ActiveAgentRunRegistry(resourceManager as never);
    registry.register(run as never);

    const result = registry.removeIfCurrent({
      runId: run.runId,
      expectedRun: run as never,
      reason: "explicit_termination",
    });
    expect(() => registry.assertCleanupSucceeded(result))
      .toThrow(AgentRunRemovalCleanupError);
    expect(registry.getActiveRun(run.runId)).toBeNull();
  });
});
