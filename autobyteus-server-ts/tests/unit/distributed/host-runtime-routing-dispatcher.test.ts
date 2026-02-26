import { describe, expect, it, vi } from "vitest";
import { createHostRuntimeRoutingDispatchers } from "../../../src/distributed/bootstrap/host-runtime-routing-dispatcher.js";

const { dispatchWithTeamLocalRoutingPort } = vi.hoisted(() => ({
  dispatchWithTeamLocalRoutingPort: vi.fn(async () => undefined),
}));

vi.mock("../../../src/distributed/routing/worker-local-dispatch.js", () => ({
  dispatchWithTeamLocalRoutingPort,
}));

describe("createHostRuntimeRoutingDispatchers", () => {
  it("dispatches local user/inter-agent/tool events via local routing port adapter", async () => {
    const team = {
      runtime: {
        context: {
          teamManager: {
            ensureNodeIsReady: vi.fn(async () => undefined),
          },
        },
      },
    } as any;
    const resolveHostRuntimeTeam = vi.fn(() => team);

    const dispatchers = createHostRuntimeRoutingDispatchers({
      teamRunId: "team-run-1",
      resolveHostRuntimeTeam,
    });

    await dispatchers.dispatchLocalUserMessage({ targetAgentName: "student" } as any);
    await dispatchers.dispatchLocalInterAgentMessage({ recipientName: "student" } as any);
    await dispatchers.dispatchLocalToolApproval({ agentName: "student" } as any);

    expect(resolveHostRuntimeTeam).toHaveBeenCalledTimes(3);
    expect(dispatchWithTeamLocalRoutingPort).toHaveBeenCalledTimes(3);
    expect(dispatchWithTeamLocalRoutingPort).toHaveBeenCalledWith(
      expect.objectContaining({
        team,
        contextLabel: "Run 'team-run-1'",
        dispatch: expect.any(Function),
      }),
    );
  });

  it("stops local team runtime when stop function is available", async () => {
    const stop = vi.fn(async () => undefined);
    const dispatchers = createHostRuntimeRoutingDispatchers({
      teamRunId: "team-run-2",
      resolveHostRuntimeTeam: () =>
        ({
          stop,
        }) as any,
    });

    await dispatchers.dispatchLocalControlStop();
    expect(stop).toHaveBeenCalledTimes(1);
  });
});
