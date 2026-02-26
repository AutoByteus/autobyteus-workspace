import { describe, expect, it, vi } from "vitest";
import { reconcileWorkerBootstrapRuntime } from "../../../src/distributed/bootstrap/worker-bootstrap-runtime-reconciler.js";

describe("worker bootstrap runtime reconciler", () => {
  it("short-circuits when existing bound runtime is still running", async () => {
    const markWorkerManagedRun = vi.fn();
    const teardownRun = vi.fn(async () => undefined);
    const teamRunManager = {
      getTeamRun: vi.fn(() => ({ isRunning: true })),
      createWorkerProjectionTeamRunWithId: vi.fn(async () => "team-1"),
      terminateTeamRun: vi.fn(async () => undefined),
      getTeamMemberConfigs: vi.fn(() => []),
    };
    const runScopedTeamBindingRegistry = {
      tryResolveRun: vi.fn(() => ({ runtimeTeamId: "team-1" })),
      bindRun: vi.fn(),
      unbindRun: vi.fn(),
    };
    const teamEventAggregator = {
      finalizeRun: vi.fn(),
    };

    const result = await reconcileWorkerBootstrapRuntime({
      teamRunId: "run-1",
      teamId: "team-1",
      runVersion: "v1",
      hostTeamDefinitionId: "definition-host-1",
      workerTeamDefinitionId: "definition-worker-1",
      memberBindings: [],
      bootstrapHostNodeId: "host-1",
      teamRunManager: teamRunManager as any,
      runScopedTeamBindingRegistry: runScopedTeamBindingRegistry as any,
      teamEventAggregator,
      workerRunLifecycleCoordinator: {
        markWorkerManagedRun,
        teardownRun,
      } as any,
    });

    expect(result).toEqual({
      runtimeTeamId: "team-1",
      reusedBoundRuntime: true,
    });
    expect(markWorkerManagedRun).toHaveBeenCalledWith("run-1", "host-1");
    expect(runScopedTeamBindingRegistry.bindRun).not.toHaveBeenCalled();
    expect(teardownRun).not.toHaveBeenCalled();
  });

  it("tears down stale binding and recreates stopped runtime before binding run", async () => {
    const markWorkerManagedRun = vi.fn();
    const teardownRun = vi.fn(async () => undefined);
    const bindRun = vi.fn();
    const unbindRun = vi.fn();
    const finalizeRun = vi.fn();
    const terminateTeamRun = vi.fn(async () => undefined);
    const createWorkerProjectionTeamRunWithId = vi.fn(async () => "team-1");

    let getTeamRunCalls = 0;
    const getTeamRun = vi.fn(() => {
      getTeamRunCalls += 1;
      if (getTeamRunCalls === 1) {
        return { isRunning: false };
      }
      return null;
    });

    const result = await reconcileWorkerBootstrapRuntime({
      teamRunId: "run-1",
      teamId: "team-1",
      runVersion: "v1",
      hostTeamDefinitionId: "definition-host-1",
      workerTeamDefinitionId: "definition-worker-1",
      memberBindings: [],
      bootstrapHostNodeId: "host-1",
      teamRunManager: {
        getTeamRun,
        createWorkerProjectionTeamRunWithId,
        terminateTeamRun,
        getTeamMemberConfigs: vi.fn(() => []),
      } as any,
      runScopedTeamBindingRegistry: {
        tryResolveRun: vi.fn(() => ({ runtimeTeamId: "team-1" })),
        bindRun,
        unbindRun,
      } as any,
      teamEventAggregator: {
        finalizeRun,
      },
      workerRunLifecycleCoordinator: {
        markWorkerManagedRun,
        teardownRun,
      } as any,
    });

    expect(result).toEqual({
      runtimeTeamId: "team-1",
      reusedBoundRuntime: false,
    });
    expect(terminateTeamRun).toHaveBeenCalledWith("team-1");
    expect(teardownRun).toHaveBeenCalledWith("run-1");
    expect(unbindRun).toHaveBeenCalledWith("run-1");
    expect(finalizeRun).toHaveBeenCalledWith("run-1");
    expect(createWorkerProjectionTeamRunWithId).toHaveBeenCalledWith(
      "team-1",
      "definition-worker-1",
      [],
    );
    expect(bindRun).toHaveBeenCalledWith(
      expect.objectContaining({
        teamDefinitionId: "definition-host-1",
      }),
    );
    expect(bindRun).toHaveBeenCalledTimes(1);
    expect(markWorkerManagedRun).toHaveBeenCalledWith("run-1", "host-1");
  });
});
