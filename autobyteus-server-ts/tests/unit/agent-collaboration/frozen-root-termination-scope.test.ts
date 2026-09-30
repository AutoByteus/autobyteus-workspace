import { describe, expect, it, vi } from "vitest";
import { createFrozenRootTerminationScope } from "../../../src/agent-collaboration/execution/backends/frozen-root-termination-scope.js";

type Result = { accepted: boolean; code?: string };

describe("frozen AgentOrg termination scope retry", () => {
  it("re-runs a fence that was not accepted and caches an accepted one", async () => {
    const handle = {
      fenceForRootShutdown: vi.fn<() => Promise<Result>>()
        .mockResolvedValueOnce({ accepted: false, code: "NOT_FENCED" })
        .mockResolvedValue({ accepted: true }),
      terminate: vi.fn(async () => ({ accepted: true })),
    };
    const scope = createFrozenRootTerminationScope({ agentHandles: [handle as never], teamScopes: [] });

    await expect(scope.fenceAgentRunsForRootShutdown()).resolves.toMatchObject({ accepted: false });
    await expect(scope.fenceAgentRunsForRootShutdown()).resolves.toEqual({ accepted: true });
    await expect(scope.fenceAgentRunsForRootShutdown()).resolves.toEqual({ accepted: true });
    expect(handle.fenceForRootShutdown).toHaveBeenCalledTimes(2);
  });

  it("re-runs a finish that rejected or was not accepted, and caches the accepted finish", async () => {
    const handle = {
      fenceForRootShutdown: vi.fn(async () => ({ accepted: true })),
      terminate: vi.fn<() => Promise<Result>>()
        .mockRejectedValueOnce(new Error("not the current published run"))
        .mockResolvedValueOnce({ accepted: false, code: "BUSY" })
        .mockResolvedValue({ accepted: true }),
    };
    const teamScope = {
      fenceAgentRunsForRootShutdown: vi.fn(async () => ({ accepted: true })),
      finish: vi.fn(async () => ({ accepted: true })),
    };
    const scope = createFrozenRootTerminationScope({ agentHandles: [handle as never], teamScopes: [teamScope as never] });

    await expect(scope.finish()).rejects.toThrow("not the current published run");
    await expect(scope.finish()).resolves.toMatchObject({ accepted: false, code: "BUSY" });
    await expect(scope.finish()).resolves.toEqual({ accepted: true });
    await expect(scope.finish()).resolves.toEqual({ accepted: true });
    expect(handle.terminate).toHaveBeenCalledTimes(3);
  });
});
