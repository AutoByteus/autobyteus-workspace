import { describe, expect, it } from "vitest";
import { shouldDispatchToWorkerLocalMember } from "../../../src/distributed/routing/worker-member-locality-resolver.js";

describe("worker member locality resolver", () => {
  it("returns true when target member binding is owned by local node", () => {
    const local = shouldDispatchToWorkerLocalMember({
      selfNodeId: "node-worker-8001",
      teamRunId: "run-1",
      targetMemberName: "student",
      runScopedTeamBindingRegistry: {
        tryResolveRun: () => ({
          memberBindings: [
            { memberName: "student", memberRouteKey: "student", hostNodeId: "node-worker-8001" },
          ],
        }),
      } as any,
    });

    expect(local).toBe(true);
  });

  it("returns false when target member binding is owned by another node", () => {
    const local = shouldDispatchToWorkerLocalMember({
      selfNodeId: "node-worker-8001",
      teamRunId: "run-1",
      targetMemberName: "professor",
      runScopedTeamBindingRegistry: {
        tryResolveRun: () => ({
          memberBindings: [
            { memberName: "professor", memberRouteKey: "professor", hostNodeId: "node-host-8000" },
          ],
        }),
      } as any,
    });

    expect(local).toBe(false);
  });

  it("supports route-key matching for nested members", () => {
    const local = shouldDispatchToWorkerLocalMember({
      selfNodeId: "node-worker-8001",
      teamRunId: "run-1",
      targetMemberName: "lab/sub/student",
      runScopedTeamBindingRegistry: {
        tryResolveRun: () => ({
          memberBindings: [
            {
              memberName: "student",
              memberRouteKey: "lab/sub/student",
              hostNodeId: "node-worker-8001",
            },
          ],
        }),
      } as any,
    });

    expect(local).toBe(true);
  });
});
