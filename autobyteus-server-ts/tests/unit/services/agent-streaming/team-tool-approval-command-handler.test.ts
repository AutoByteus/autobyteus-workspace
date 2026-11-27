import { afterEach, describe, expect, it, vi } from "vitest";
import { handleTeamToolApprovalCommand } from "../../../../src/services/agent-streaming/team-tool-approval-command-handler.js";
import { TEAM_COMMAND_INVALID_TARGET_CODE } from "../../../../src/services/agent-streaming/team-agent-run-command-parser.js";

// autobyteus-541 D-D2: the session always routes a decision through its member commands; no null-run branch remains.
describe("handleTeamToolApprovalCommand", () => {
  afterEach(() => vi.restoreAllMocks());

  const routed = (result: { accepted: boolean; code?: string; message?: string } = { accepted: true }) => ({
    executeAgentCommand: vi.fn().mockResolvedValue(result),
  });

  it("routes the decision to the exact agent run", async () => {
    const activeRun = routed();
    const sink = { send: vi.fn() };
    await handleTeamToolApprovalCommand({
      payload: { invocation_id: " call-1 ", agent_run_id: "agent-1", reason: "fine" } as never,
      approved: true,
      activeRun: activeRun as never,
      sink: sink as never,
    });
    expect(activeRun.executeAgentCommand).toHaveBeenCalledWith("agent-1", {
      kind: "approve_tool", invocationId: "call-1", approved: true, reason: "fine",
    });
    expect(sink.send).not.toHaveBeenCalled();
  });

  it("ignores a decision without an invocation", async () => {
    const activeRun = routed();
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    await handleTeamToolApprovalCommand({
      payload: { invocation_id: "  ", agent_run_id: "agent-1" } as never,
      approved: false, activeRun: activeRun as never, sink: null,
    });
    expect(activeRun.executeAgentCommand).not.toHaveBeenCalled();
    expect(warn).toHaveBeenCalledWith("Team tool approval missing invocation_id");
  });

  it("answers an inexact target with the invalid-target error and runs nothing", async () => {
    const activeRun = routed();
    const sink = { send: vi.fn() };
    vi.spyOn(console, "warn").mockImplementation(() => undefined);
    await handleTeamToolApprovalCommand({
      payload: { invocation_id: "call-1", agent_run_id: " agent-1" } as never,
      approved: true, activeRun: activeRun as never, sink: sink as never,
    });
    expect(activeRun.executeAgentCommand).not.toHaveBeenCalled();
    expect(sink.send).toHaveBeenCalledWith(expect.objectContaining({
      type: "ERROR", payload: expect.objectContaining({ code: TEAM_COMMAND_INVALID_TARGET_CODE }),
    }));
  });

  it("logs a refused decision with its agent run", async () => {
    const activeRun = routed({ accepted: false, code: "TEAM_RUN_STOPPED", message: "stopped" });
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    await handleTeamToolApprovalCommand({
      payload: { invocation_id: "call-1", agent_run_id: "agent-1" } as never,
      approved: false, activeRun: activeRun as never, sink: null,
    });
    expect(warn).toHaveBeenCalledWith("TOOL_APPROVAL rejected for agent run agent-1: [TEAM_RUN_STOPPED] stopped");
  });
});
