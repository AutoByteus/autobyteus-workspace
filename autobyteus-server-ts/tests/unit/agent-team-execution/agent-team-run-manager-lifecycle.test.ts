import { describe, expect, it, vi } from "vitest";
import type { TeamRun } from "../../../src/agent-team-execution/domain/team-run.js";
import { AgentTeamRunManager } from "../../../src/agent-team-execution/services/agent-team-run-manager.js";

const createManager = () => {
  const teamCommunicationService = {
    attachToTeamRun: vi.fn(() => vi.fn()),
  };
  const runFileChangeService = {
    attachToTeamRun: vi.fn(() => vi.fn()),
  };
  const manager = new AgentTeamRunManager({
    mixedTeamRunBackendFactory: {} as never,
    teamCommunicationService: teamCommunicationService as never,
    runFileChangeService: runFileChangeService as never,
  });
  return { manager, teamCommunicationService, runFileChangeService };
};

const createRun = (input: {
  runId?: string;
  active?: () => boolean;
  terminate?: () => Promise<{ accepted: boolean; code?: string; message?: string }>;
} = {}) => ({
  runId: input.runId ?? "team-run-1",
  isActive: input.active ?? (() => true),
  terminate: vi.fn(input.terminate ?? (async () => ({ accepted: true }))),
}) as unknown as TeamRun;

const register = (manager: AgentTeamRunManager, run: TeamRun): void => {
  (manager as any).registerActiveRun(run);
};

const unregister = (
  manager: AgentTeamRunManager,
  teamRunId: string,
  expectedRun: TeamRun,
): boolean => (manager as any).unregisterActiveRun(teamRunId, expectedRun);

describe("AgentTeamRunManager lifecycle", () => {
  it("publishes active after registration and inactive only after accepted termination", async () => {
    const { manager } = createManager();
    const lifecycle: Array<{ teamRunId: string; isActive: boolean }> = [];
    manager.subscribeToLifecycle("team-run-1", (snapshot) => lifecycle.push(snapshot));
    const run = createRun();

    register(manager, run);
    expect(manager.getLifecycleSnapshot("team-run-1")).toEqual({
      teamRunId: "team-run-1",
      isActive: true,
    });
    expect(lifecycle).toEqual([{ teamRunId: "team-run-1", isActive: true }]);

    await expect(manager.terminateTeamRun("team-run-1")).resolves.toBe(true);
    expect(run.terminate).toHaveBeenCalledTimes(1);
    expect(manager.getLifecycleSnapshot("team-run-1")).toEqual({
      teamRunId: "team-run-1",
      isActive: false,
    });
    expect(lifecycle).toEqual([
      { teamRunId: "team-run-1", isActive: true },
      { teamRunId: "team-run-1", isActive: false },
    ]);
  });

  it("keeps lifecycle active when backend termination is rejected", async () => {
    const { manager } = createManager();
    const lifecycle = vi.fn();
    manager.subscribeToLifecycle("team-run-1", lifecycle);
    const run = createRun({
      terminate: async () => ({
        accepted: false,
        code: "ACTIVE_TERMINATION_FAILED",
        message: "member refused termination",
      }),
    });
    register(manager, run);
    lifecycle.mockClear();

    await expect(manager.terminateTeamRun("team-run-1")).resolves.toBe(false);

    expect(manager.getLifecycleSnapshot("team-run-1").isActive).toBe(true);
    expect(lifecycle).not.toHaveBeenCalled();
  });

  it("replaces an active run without lifecycle flicker and rejects stale unregister", () => {
    const { manager } = createManager();
    const lifecycle = vi.fn();
    manager.subscribeToLifecycle("team-run-1", lifecycle);
    const staleRun = createRun();
    const replacementRun = createRun();

    register(manager, staleRun);
    lifecycle.mockClear();
    register(manager, replacementRun);

    expect(lifecycle).not.toHaveBeenCalled();
    expect(unregister(manager, "team-run-1", staleRun)).toBe(false);
    expect(manager.getActiveRun("team-run-1")).toBe(replacementRun);
    expect(manager.getLifecycleSnapshot("team-run-1").isActive).toBe(true);
  });

  it("routes stale-backend detection through the same idempotent inactive transition", () => {
    const { manager } = createManager();
    const lifecycle = vi.fn();
    let isBackendActive = true;
    const run = createRun({ active: () => isBackendActive });
    manager.subscribeToLifecycle("team-run-1", lifecycle);
    register(manager, run);
    lifecycle.mockClear();

    isBackendActive = false;

    expect(manager.getLifecycleSnapshot("team-run-1")).toEqual({
      teamRunId: "team-run-1",
      isActive: false,
    });
    expect(lifecycle).toHaveBeenCalledTimes(1);
    expect(lifecycle).toHaveBeenCalledWith({ teamRunId: "team-run-1", isActive: false });
    expect(manager.getLifecycleSnapshot("team-run-1").isActive).toBe(false);
    expect(lifecycle).toHaveBeenCalledTimes(1);
  });

  it("rejects inactive backends before registration", () => {
    const { manager } = createManager();
    const lifecycle = vi.fn();
    manager.subscribeToLifecycle("team-run-1", lifecycle);

    expect(() => register(manager, createRun({ active: () => false }))).toThrow(
      "Cannot register inactive team run 'team-run-1'.",
    );
    expect(manager.getLifecycleSnapshot("team-run-1").isActive).toBe(false);
    expect(lifecycle).not.toHaveBeenCalled();
  });

  it("makes unregister idempotent and isolates lifecycle listener failures", () => {
    const { manager } = createManager();
    const healthyListener = vi.fn();
    manager.subscribeToLifecycle("team-run-1", () => {
      throw new Error("listener failure");
    });
    manager.subscribeToLifecycle("team-run-1", healthyListener);
    const run = createRun();

    expect(() => register(manager, run)).not.toThrow();
    expect(healthyListener).toHaveBeenCalledWith({ teamRunId: "team-run-1", isActive: true });
    expect(unregister(manager, "team-run-1", run)).toBe(true);
    expect(unregister(manager, "team-run-1", run)).toBe(false);
    expect(manager.getLifecycleSnapshot("team-run-1").isActive).toBe(false);
  });
});
