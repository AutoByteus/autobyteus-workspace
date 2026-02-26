import { AgentInputUserMessage } from "autobyteus-ts";
import { describe, expect, it, vi } from "vitest";
import { AutobyteusRuntimeAdapter } from "../../../../src/runtime-execution/adapters/autobyteus-runtime-adapter.js";

describe("AutobyteusRuntimeAdapter", () => {
  it("interrupts an active agent run via stop()", async () => {
    const stop = vi.fn().mockResolvedValue(undefined);
    const adapter = new AutobyteusRuntimeAdapter(
      {
        getAgentInstance: vi.fn().mockReturnValue({
          postUserMessage: vi.fn(),
          postToolExecutionApproval: vi.fn(),
          stop,
        }),
      } as any,
      { getTeamInstance: vi.fn().mockReturnValue(null) } as any,
    );

    const result = await adapter.interruptRun({ runId: "agent-1", mode: "agent" });
    expect(result).toEqual({ accepted: true });
    expect(stop).toHaveBeenCalledTimes(1);
  });

  it("interrupts an active team run via stop()", async () => {
    const stop = vi.fn().mockResolvedValue(undefined);
    const adapter = new AutobyteusRuntimeAdapter(
      { getAgentInstance: vi.fn().mockReturnValue(null) } as any,
      {
        getTeamInstance: vi.fn().mockReturnValue({
          postMessage: vi.fn(),
          postToolExecutionApproval: vi.fn(),
          stop,
        }),
      } as any,
    );

    const result = await adapter.interruptRun({ runId: "team-1", mode: "team" });
    expect(result).toEqual({ accepted: true });
    expect(stop).toHaveBeenCalledTimes(1);
  });

  it("returns interrupt unsupported when run exists without stop()", async () => {
    const adapter = new AutobyteusRuntimeAdapter(
      {
        getAgentInstance: vi.fn().mockReturnValue({
          postUserMessage: vi.fn(),
          postToolExecutionApproval: vi.fn(),
        }),
      } as any,
      { getTeamInstance: vi.fn().mockReturnValue(null) } as any,
    );

    const result = await adapter.interruptRun({ runId: "agent-1", mode: "agent" });
    expect(result.accepted).toBe(false);
    expect(result.code).toBe("INTERRUPT_UNSUPPORTED");
  });

  it("returns run-not-found when run is inactive", async () => {
    const adapter = new AutobyteusRuntimeAdapter(
      { getAgentInstance: vi.fn().mockReturnValue(null) } as any,
      { getTeamInstance: vi.fn().mockReturnValue(null) } as any,
    );

    const result = await adapter.sendTurn({
      runId: "missing-run",
      mode: "agent",
      message: AgentInputUserMessage.fromDict({ content: "hello" }),
    });
    expect(result.accepted).toBe(false);
    expect(result.code).toBe("RUN_NOT_FOUND");
  });
});
