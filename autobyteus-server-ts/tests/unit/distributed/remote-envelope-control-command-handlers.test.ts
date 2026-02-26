import { describe, expect, it, vi } from "vitest";
import type { TeamEnvelope } from "../../../src/distributed/envelope/envelope-builder.js";
import { TeamCommandIngressError } from "../../../src/distributed/ingress/team-command-ingress-service.js";
import { createRemoteEnvelopeControlCommandHandlers } from "../../../src/distributed/bootstrap/remote-envelope-control-command-handlers.js";
import { WorkerRunLifecycleCoordinator } from "../../../src/distributed/bootstrap/worker-run-lifecycle-coordinator.js";

const createLifecycleCoordinator = (): WorkerRunLifecycleCoordinator =>
  new WorkerRunLifecycleCoordinator({
    sourceNodeId: "worker-1",
    projectRemoteExecutionEventsFromTeamEvent: () => [],
    publishRemoteExecutionEventToHost: async () => undefined,
  });

const createDependencies = () => {
  const workerRunLifecycleCoordinator = createLifecycleCoordinator();
  return {
    workerRunLifecycleCoordinator,
    deps: {
      selfNodeId: "node-worker-8001",
      teamRunManager: {
        getTeamRun: vi.fn(() => null),
      } as any,
      runScopedTeamBindingRegistry: {
        tryResolveRun: vi.fn(() => null),
        unbindRun: vi.fn(),
      } as any,
      teamEventAggregator: {
        finalizeRun: vi.fn(),
      } as any,
      workerRunLifecycleCoordinator,
      resolveBoundRuntimeTeam: vi.fn(),
      onTeamDispatchUnavailable: (code: string, message: string) =>
        new TeamCommandIngressError(code, message),
    },
  };
};

describe("remote envelope control command handlers", () => {
  it("falls back to team.postToolExecutionApproval when run is not worker-managed", async () => {
    const { deps } = createDependencies();
    const postToolExecutionApproval = vi.fn(async () => undefined);
    deps.resolveBoundRuntimeTeam = vi.fn(() => ({
      teamDefinitionId: "team-def-1",
      team: { postToolExecutionApproval },
    }));

    const handlers = createRemoteEnvelopeControlCommandHandlers(deps);
    const envelope: TeamEnvelope = {
      envelopeId: "env-tool",
      teamRunId: "run-1",
      runVersion: "v1",
      kind: "TOOL_APPROVAL",
      payload: {
        agentName: "student",
        toolInvocationId: "tool-1",
        isApproved: true,
        reason: "ok",
      },
    };

    await handlers.dispatchToolApproval?.(envelope);

    expect(postToolExecutionApproval).toHaveBeenCalledWith(
      "student",
      "tool-1",
      true,
      "ok",
    );
    expect(deps.resolveBoundRuntimeTeam).toHaveBeenCalledWith({ teamRunId: "run-1" });
  });

  it("stops runtime team and finalizes run when control stop has binding", async () => {
    const { deps, workerRunLifecycleCoordinator } = createDependencies();
    const stop = vi.fn(async () => undefined);
    deps.runScopedTeamBindingRegistry.tryResolveRun = vi.fn(() => ({
      teamRunId: "run-1",
      runtimeTeamId: "runtime-1",
    }));
    deps.teamRunManager.getTeamRun = vi.fn(() => ({ stop }));
    const teardownSpy = vi.spyOn(workerRunLifecycleCoordinator, "teardownRun");

    const handlers = createRemoteEnvelopeControlCommandHandlers(deps);
    const envelope: TeamEnvelope = {
      envelopeId: "env-stop-bound",
      teamRunId: "run-1",
      runVersion: "v1",
      kind: "CONTROL_STOP",
      payload: {},
    };

    await handlers.dispatchControlStop?.(envelope);

    expect(stop).toHaveBeenCalledTimes(1);
    expect(teardownSpy).toHaveBeenCalledWith("run-1");
    expect(deps.runScopedTeamBindingRegistry.unbindRun).toHaveBeenCalledWith("run-1");
    expect(deps.teamEventAggregator.finalizeRun).toHaveBeenCalledWith("run-1");
  });
});
