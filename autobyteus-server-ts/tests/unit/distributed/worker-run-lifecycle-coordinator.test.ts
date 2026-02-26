import { describe, expect, it, vi } from "vitest";
import { WorkerRunLifecycleCoordinator } from "../../../src/distributed/bootstrap/worker-run-lifecycle-coordinator.js";

describe("worker run lifecycle coordinator", () => {
  it("tracks worker-managed run host mapping and clears it on teardown", async () => {
    const publishRemoteExecutionEventToHost = vi.fn(async () => undefined);
    const coordinator = new WorkerRunLifecycleCoordinator({
      sourceNodeId: "node-worker-1",
      projectRemoteExecutionEventsFromTeamEvent: () => [],
      publishRemoteExecutionEventToHost,
    });

    coordinator.markWorkerManagedRun("run-1", "node-host-1");
    expect(coordinator.isWorkerManagedRun("run-1")).toBe(true);
    expect(coordinator.resolveHostNodeId("run-1", "node-default")).toBe("node-host-1");

    await coordinator.teardownRun("run-1");
    expect(coordinator.isWorkerManagedRun("run-1")).toBe(false);
    expect(coordinator.resolveHostNodeId("run-1", "node-default")).toBe("node-default");
    expect(publishRemoteExecutionEventToHost).not.toHaveBeenCalled();
  });

  it("forwards projected member events and replaces existing forwarder", async () => {
    const publishRemoteExecutionEventToHost = vi.fn(async () => undefined);
    const coordinator = new WorkerRunLifecycleCoordinator({
      sourceNodeId: "node-worker-1",
      projectRemoteExecutionEventsFromTeamEvent: () => [
        {
          sourceEventId: "evt-1",
          memberName: "student",
          agentId: "agent-1",
          eventType: "segment_event",
          payload: { id: "seg-1" },
        },
      ],
      publishRemoteExecutionEventToHost,
    });

    let closedCount = 0;
    const firstEventStream = {
      allEvents: async function* () {
        yield {} as any;
      },
      close: vi.fn(async () => {
        closedCount += 1;
      }),
    } as any;
    const secondEventStream = {
      allEvents: async function* () {
        yield {} as any;
      },
      close: vi.fn(async () => {
        closedCount += 1;
      }),
    } as any;

    await coordinator.replaceEventForwarder({
      teamRunId: "run-1",
      runVersion: "v1",
      runtimeTeamId: "runtime-1",
      eventStream: firstEventStream,
    });
    await coordinator.replaceEventForwarder({
      teamRunId: "run-1",
      runVersion: "v2",
      runtimeTeamId: "runtime-1",
      eventStream: secondEventStream,
    });

    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(closedCount).toBeGreaterThanOrEqual(1);
    expect(publishRemoteExecutionEventToHost).toHaveBeenCalled();
    expect(publishRemoteExecutionEventToHost).toHaveBeenCalledWith(
      expect.objectContaining({
        teamRunId: "run-1",
        sourceNodeId: "node-worker-1",
        eventType: "segment_event",
      }),
    );
  });
});
