import { describe, expect, it, vi } from "vitest";
import type { TeamEnvelope } from "../../../src/distributed/envelope/envelope-builder.js";
import { TeamEventAggregator } from "../../../src/distributed/event-aggregation/team-event-aggregator.js";
import { RunScopedTeamBindingRegistry } from "../../../src/distributed/runtime-binding/run-scoped-team-binding-registry.js";
import { RemoteMemberExecutionGateway } from "../../../src/distributed/worker-execution/remote-member-execution-gateway.js";
import { createRemoteEnvelopeCommandHandlers } from "../../../src/distributed/bootstrap/remote-envelope-command-handlers.js";
import { WorkerRunLifecycleCoordinator } from "../../../src/distributed/bootstrap/worker-run-lifecycle-coordinator.js";

const createDeferred = <T>() => {
  let resolve!: (value: T | PromiseLike<T>) => void;
  const promise = new Promise<T>((res) => {
    resolve = res;
  });
  return { promise, resolve };
};

describe("Distributed bootstrap rebind cleanup ordering integration", () => {
  it("tears down forwarder before unbind/finalize when stale binding is re-bootstrapped", async () => {
    const cleanupOrder: string[] = [];
    const runScopedTeamBindingRegistry = new RunScopedTeamBindingRegistry();
    const teamEventAggregator = new TeamEventAggregator();

    runScopedTeamBindingRegistry.bindRun({
      teamRunId: "run-1",
      teamId: "team-rebind",
      runVersion: "v0",
      teamDefinitionId: "team-def-host",
      runtimeTeamId: "runtime-stale",
      memberBindings: [],
    });

    const closeSignal = createDeferred<void>();
    const staleEventStream = {
      allEvents: async function* () {
        await closeSignal.promise;
      },
      close: async () => {
        cleanupOrder.push("forwarder.close");
        closeSignal.resolve();
      },
    };

    const workerRunLifecycleCoordinator = new WorkerRunLifecycleCoordinator({
      sourceNodeId: "worker-1",
      projectRemoteExecutionEventsFromTeamEvent: () => [],
      publishRemoteExecutionEventToHost: async () => undefined,
    });
    workerRunLifecycleCoordinator.markWorkerManagedRun("run-1", "host-old");
    await workerRunLifecycleCoordinator.replaceEventForwarder({
      teamRunId: "run-1",
      runVersion: "v0",
      runtimeTeamId: "runtime-stale",
      eventStream: staleEventStream as any,
    });

    const originalUnbindRun = runScopedTeamBindingRegistry.unbindRun.bind(runScopedTeamBindingRegistry);
    vi.spyOn(runScopedTeamBindingRegistry, "unbindRun").mockImplementation((teamRunId) => {
      cleanupOrder.push("registry.unbind");
      originalUnbindRun(teamRunId);
    });

    const originalBindRun = runScopedTeamBindingRegistry.bindRun.bind(runScopedTeamBindingRegistry);
    vi.spyOn(runScopedTeamBindingRegistry, "bindRun").mockImplementation((record) => {
      cleanupOrder.push("registry.bind");
      originalBindRun(record);
    });

    const originalFinalizeRun = teamEventAggregator.finalizeRun.bind(teamEventAggregator);
    vi.spyOn(teamEventAggregator, "finalizeRun").mockImplementation((teamRunId) => {
      cleanupOrder.push("aggregator.finalize");
      originalFinalizeRun(teamRunId);
    });

    const handlers = createRemoteEnvelopeCommandHandlers({
      hostNodeId: "worker-1",
      selfNodeId: "worker-1",
      teamRunManager: {
        getTeamRun: vi.fn(() => null),
        getTeamIdByDefinitionId: vi.fn(() => null),
        createWorkerProjectionTeamRunWithId: vi.fn(async () => "runtime-new"),
        terminateTeamRun: vi.fn(async () => undefined),
        getTeamMemberConfigs: vi.fn(() => []),
        getTeamMemberConfigsByDefinitionId: vi.fn(() => []),
        getTeamEventStream: vi.fn(() => null),
      } as any,
      runScopedTeamBindingRegistry,
      teamEventAggregator,
      hostNodeBridgeClient: {
        sendCommand: vi.fn(async () => undefined),
      } as any,
      workerRunLifecycleCoordinator,
      resolveWorkerTeamDefinitionId: vi.fn(async () => "team-def-worker"),
      resolveBoundRuntimeTeam: vi.fn(() => {
        throw new Error("resolveBoundRuntimeTeam should not be used in RUN_BOOTSTRAP");
      }),
      ensureHostNodeDirectoryEntryForWorkerRun: vi.fn(),
      onTeamDispatchUnavailable: (code: string, message: string) => {
        throw new Error(`${code}:${message}`);
      },
    });

    const gateway = new RemoteMemberExecutionGateway(handlers);
    const envelope: TeamEnvelope = {
      envelopeId: "env-bootstrap",
      teamRunId: "run-1",
      runVersion: "v1",
      kind: "RUN_BOOTSTRAP",
      payload: {
        teamId: "team-rebind",
        teamDefinitionId: "team-def-host",
        hostNodeId: "host-1",
        memberBindings: [
          {
            memberName: "worker",
            agentDefinitionId: "agent-worker",
            llmModelIdentifier: "model-1",
            autoExecuteTools: true,
          },
        ],
      },
    };

    await gateway.dispatchEnvelope(envelope);

    expect(cleanupOrder).toEqual([
      "forwarder.close",
      "registry.unbind",
      "aggregator.finalize",
      "registry.bind",
    ]);

    const rebound = runScopedTeamBindingRegistry.resolveRun("run-1");
    expect(rebound.runtimeTeamId).toBe("team-rebind");
    expect(rebound.runVersion).toBe("v1");
  });
});
