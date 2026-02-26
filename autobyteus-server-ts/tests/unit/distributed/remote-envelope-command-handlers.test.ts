import { describe, expect, it, vi } from "vitest";
import type { TeamEnvelope } from "../../../src/distributed/envelope/envelope-builder.js";
import { TeamCommandIngressError } from "../../../src/distributed/ingress/team-command-ingress-service.js";
import { createRemoteEnvelopeCommandHandlers } from "../../../src/distributed/bootstrap/remote-envelope-command-handlers.js";
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
      hostNodeId: "worker-1",
      selfNodeId: "worker-1",
      teamRunManager: {
        getTeamRun: vi.fn(() => null),
        getTeamIdByDefinitionId: vi.fn(() => null),
        createTeamRun: vi.fn(async () => "runtime-1"),
        terminateTeamRun: vi.fn(async () => undefined),
        getTeamMemberConfigsByDefinitionId: vi.fn(() => []),
        getTeamEventStream: vi.fn(() => null),
      } as any,
      runScopedTeamBindingRegistry: {
        tryResolveRun: vi.fn(() => null),
        bindRun: vi.fn(),
        unbindRun: vi.fn(),
      } as any,
      teamEventAggregator: {
        finalizeRun: vi.fn(),
      } as any,
      hostNodeBridgeClient: {
        sendCommand: vi.fn(async () => undefined),
      } as any,
      workerRunLifecycleCoordinator,
      resolveWorkerTeamDefinitionId: vi.fn(async () => "team-def-worker"),
      resolveBoundRuntimeTeam: vi.fn(),
      ensureHostNodeDirectoryEntryForWorkerRun: vi.fn(),
      onTeamDispatchUnavailable: (code: string, message: string) =>
        new TeamCommandIngressError(code, message),
    },
  };
};

describe("remote envelope command handlers", () => {
  it("falls back to team.postMessage for user messages when run is not worker-managed", async () => {
    const { deps } = createDependencies();
    const postMessage = vi.fn(async () => undefined);
    deps.resolveBoundRuntimeTeam = vi.fn(() => ({
      teamDefinitionId: "team-def-1",
      team: { postMessage },
    }));

    const handlers = createRemoteEnvelopeCommandHandlers(deps);
    const envelope: TeamEnvelope = {
      envelopeId: "env-user",
      teamRunId: "run-1",
      runVersion: "v1",
      kind: "USER_MESSAGE",
      payload: {
        targetAgentName: "student",
        userMessage: { content: "hello" },
      },
    };

    await handlers.dispatchUserMessage?.(envelope);

    expect(postMessage).toHaveBeenCalledTimes(1);
    expect(postMessage.mock.calls[0]?.[1]).toBe("student");
  });

  it("dispatches inter-agent messages via team manager when available", async () => {
    const { deps } = createDependencies();
    const dispatchInterAgentMessage = vi.fn(async () => undefined);
    deps.resolveBoundRuntimeTeam = vi.fn(() => ({
      teamDefinitionId: "team-def-1",
      team: {
        runtime: { context: { teamManager: { dispatchInterAgentMessage } } },
      },
    }));

    const handlers = createRemoteEnvelopeCommandHandlers(deps);
    const envelope: TeamEnvelope = {
      envelopeId: "env-iam",
      teamRunId: "run-1",
      runVersion: "v1",
      kind: "INTER_AGENT_MESSAGE_REQUEST",
      payload: {
        senderAgentId: "agent-1",
        recipientName: "coordinator",
        content: "ping",
        messageType: "direct_message",
      },
    };

    await handlers.dispatchInterAgentMessage?.(envelope);

    expect(dispatchInterAgentMessage).toHaveBeenCalledTimes(1);
  });

  it("falls back to team.postToolExecutionApproval when run is not worker-managed", async () => {
    const { deps } = createDependencies();
    const postToolExecutionApproval = vi.fn(async () => undefined);
    deps.resolveBoundRuntimeTeam = vi.fn(() => ({
      teamDefinitionId: "team-def-1",
      team: { postToolExecutionApproval },
    }));

    const handlers = createRemoteEnvelopeCommandHandlers(deps);
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
  });

  it("tears down run state without unbind/finalize when control stop has no binding", async () => {
    const { deps, workerRunLifecycleCoordinator } = createDependencies();
    const teardownSpy = vi.spyOn(workerRunLifecycleCoordinator, "teardownRun");

    const handlers = createRemoteEnvelopeCommandHandlers(deps);
    const envelope: TeamEnvelope = {
      envelopeId: "env-stop-none",
      teamRunId: "run-1",
      runVersion: "v1",
      kind: "CONTROL_STOP",
      payload: {},
    };

    await handlers.dispatchControlStop?.(envelope);

    expect(teardownSpy).toHaveBeenCalledWith("run-1");
    expect(deps.runScopedTeamBindingRegistry.unbindRun).not.toHaveBeenCalled();
    expect(deps.teamEventAggregator.finalizeRun).not.toHaveBeenCalled();
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

    const handlers = createRemoteEnvelopeCommandHandlers(deps);
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
