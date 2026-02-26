import { describe, expect, it, vi } from "vitest";
import { dispatchToWorkerOwnedMemberIfEligible } from "../../../src/distributed/routing/worker-owned-member-dispatch-orchestrator.js";

describe("worker owned member dispatch orchestrator", () => {
  it("dispatches through local routing port when worker owns target member and run is worker-managed", async () => {
    const ensureNodeIsReady = vi.fn(async () => ({
      postUserMessage: vi.fn(async () => undefined),
    }));
    const dispatch = vi.fn(async (localRoutingPort: any) =>
      localRoutingPort.dispatchUserMessage({
        targetAgentName: "student",
        userMessage: { content: "hello" },
      }),
    );

    const outcome = await dispatchToWorkerOwnedMemberIfEligible({
      selfNodeId: "node-worker-1",
      teamRunId: "run-1",
      targetMemberName: "student",
      runScopedTeamBindingRegistry: {
        tryResolveRun: () => ({
          memberBindings: [
            {
              memberName: "student",
              memberRouteKey: "student",
              hostNodeId: "node-worker-1",
            },
          ],
        }),
      } as any,
      workerManagedRunIds: new Set(["run-1"]),
      team: {
        runtime: { context: { teamManager: { ensureNodeIsReady } } },
      } as any,
      dispatch,
    });

    expect(outcome).toEqual({
      handled: true,
      ownership: "WORKER_OWNS_TARGET_MEMBER",
    });
    expect(dispatch).toHaveBeenCalledTimes(1);
    expect(ensureNodeIsReady).toHaveBeenCalledWith("student");
  });

  it("returns not handled when target member is owned by another node", async () => {
    const dispatch = vi.fn();

    const outcome = await dispatchToWorkerOwnedMemberIfEligible({
      selfNodeId: "node-worker-1",
      teamRunId: "run-1",
      targetMemberName: "professor",
      runScopedTeamBindingRegistry: {
        tryResolveRun: () => ({
          memberBindings: [
            {
              memberName: "professor",
              memberRouteKey: "professor",
              hostNodeId: "node-host-1",
            },
          ],
        }),
      } as any,
      workerManagedRunIds: new Set(["run-1"]),
      team: {} as any,
      dispatch,
    });

    expect(outcome).toEqual({
      handled: false,
      ownership: "TARGET_MEMBER_OWNED_BY_OTHER_NODE",
    });
    expect(dispatch).not.toHaveBeenCalled();
  });

  it("returns not handled when run is not worker-managed even if ownership is local", async () => {
    const dispatch = vi.fn();

    const outcome = await dispatchToWorkerOwnedMemberIfEligible({
      selfNodeId: "node-worker-1",
      teamRunId: "run-1",
      targetMemberName: "student",
      runScopedTeamBindingRegistry: {
        tryResolveRun: () => ({
          memberBindings: [
            {
              memberName: "student",
              memberRouteKey: "student",
              hostNodeId: "node-worker-1",
            },
          ],
        }),
      } as any,
      workerManagedRunIds: new Set(),
      team: {} as any,
      dispatch,
    });

    expect(outcome).toEqual({
      handled: false,
      ownership: "WORKER_OWNS_TARGET_MEMBER",
    });
    expect(dispatch).not.toHaveBeenCalled();
  });
});
