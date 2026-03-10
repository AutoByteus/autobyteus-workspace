import { describe, expect, it, vi } from "vitest";
import { AgentRunTerminationService } from "../../../src/agent-execution/services/agent-run-termination-service.js";

describe("AgentRunTerminationService", () => {
  const createSubject = () => {
    const agentRunManager = {
      getAgentRun: vi.fn(),
      terminateAgentRun: vi.fn(),
    } as any;
    const runtimeCompositionService = {
      getRunSession: vi.fn(),
      removeRunSession: vi.fn(),
    } as any;
    const runtimeCommandIngressService = {
      terminateRun: vi.fn(),
    } as any;
    const runHistoryService = {
      onRunTerminated: vi.fn(),
    } as any;

    const service = new AgentRunTerminationService(
      agentRunManager,
      runtimeCompositionService,
      runtimeCommandIngressService,
      runHistoryService,
    );

    return {
      service,
      mocks: {
        agentRunManager,
        runtimeCompositionService,
        runtimeCommandIngressService,
        runHistoryService,
      },
    };
  };

  it("routes non-native runtime runs through runtime ingress and skips native termination", async () => {
    const { service, mocks } = createSubject();
    mocks.runtimeCompositionService.getRunSession.mockReturnValue({
      runId: "run-1",
      runtimeKind: "codex_app_server",
      mode: "agent",
      runtimeReference: null,
    });
    mocks.runtimeCommandIngressService.terminateRun.mockResolvedValue({
      accepted: true,
      runtimeKind: "codex_app_server",
    });

    const result = await service.terminateAgentRun("run-1");

    expect(result).toEqual({
      success: true,
      message: "Agent run terminated successfully.",
      route: "runtime",
      runtimeKind: "codex_app_server",
    });
    expect(mocks.runtimeCommandIngressService.terminateRun).toHaveBeenCalledWith({
      runId: "run-1",
      mode: "agent",
    });
    expect(mocks.agentRunManager.getAgentRun).not.toHaveBeenCalled();
    expect(mocks.agentRunManager.terminateAgentRun).not.toHaveBeenCalled();
    expect(mocks.runtimeCompositionService.removeRunSession).toHaveBeenCalledWith("run-1");
    expect(mocks.runHistoryService.onRunTerminated).toHaveBeenCalledWith("run-1");
  });

  it("routes autobyteus runtime runs through native termination and performs shared cleanup once", async () => {
    const { service, mocks } = createSubject();
    mocks.runtimeCompositionService.getRunSession.mockReturnValue({
      runId: "run-2",
      runtimeKind: "autobyteus",
      mode: "agent",
      runtimeReference: null,
    });
    mocks.agentRunManager.getAgentRun.mockReturnValue({ id: "run-2" });
    mocks.agentRunManager.terminateAgentRun.mockResolvedValue(true);

    const result = await service.terminateAgentRun("run-2");

    expect(result).toEqual({
      success: true,
      message: "Agent run terminated successfully.",
      route: "native",
      runtimeKind: "autobyteus",
    });
    expect(mocks.agentRunManager.getAgentRun).toHaveBeenCalledWith("run-2");
    expect(mocks.agentRunManager.terminateAgentRun).toHaveBeenCalledWith("run-2");
    expect(mocks.runtimeCommandIngressService.terminateRun).not.toHaveBeenCalled();
    expect(mocks.runtimeCompositionService.removeRunSession).toHaveBeenCalledTimes(1);
    expect(mocks.runHistoryService.onRunTerminated).toHaveBeenCalledTimes(1);
  });

  it("returns not found without attempting native termination when no runtime session or native agent exists", async () => {
    const { service, mocks } = createSubject();
    mocks.runtimeCompositionService.getRunSession.mockReturnValue(null);
    mocks.agentRunManager.getAgentRun.mockReturnValue(null);

    const result = await service.terminateAgentRun("missing-run");

    expect(result).toEqual({
      success: false,
      message: "Agent run not found.",
      route: "not_found",
      runtimeKind: null,
    });
    expect(mocks.agentRunManager.terminateAgentRun).not.toHaveBeenCalled();
    expect(mocks.runtimeCommandIngressService.terminateRun).not.toHaveBeenCalled();
    expect(mocks.runtimeCompositionService.removeRunSession).not.toHaveBeenCalled();
    expect(mocks.runHistoryService.onRunTerminated).not.toHaveBeenCalled();
  });

  it("skips shared cleanup when runtime termination is rejected", async () => {
    const { service, mocks } = createSubject();
    mocks.runtimeCompositionService.getRunSession.mockReturnValue({
      runId: "run-3",
      runtimeKind: "claude_agent_sdk",
      mode: "agent",
      runtimeReference: null,
    });
    mocks.runtimeCommandIngressService.terminateRun.mockResolvedValue({
      accepted: false,
      code: "RUN_SESSION_NOT_FOUND",
      runtimeKind: "claude_agent_sdk",
    });

    const result = await service.terminateAgentRun("run-3");

    expect(result).toEqual({
      success: false,
      message: "Agent run not found.",
      route: "not_found",
      runtimeKind: "claude_agent_sdk",
    });
    expect(mocks.agentRunManager.terminateAgentRun).not.toHaveBeenCalled();
    expect(mocks.runtimeCompositionService.removeRunSession).not.toHaveBeenCalled();
    expect(mocks.runHistoryService.onRunTerminated).not.toHaveBeenCalled();
  });

  it("uses native termination when a native agent is active even if no runtime session is present", async () => {
    const { service, mocks } = createSubject();
    mocks.runtimeCompositionService.getRunSession.mockReturnValue(null);
    mocks.agentRunManager.getAgentRun.mockReturnValue({ id: "run-4" });
    mocks.agentRunManager.terminateAgentRun.mockResolvedValue(true);

    const result = await service.terminateAgentRun("run-4");

    expect(result).toEqual({
      success: true,
      message: "Agent run terminated successfully.",
      route: "native",
      runtimeKind: "autobyteus",
    });
    expect(mocks.agentRunManager.terminateAgentRun).toHaveBeenCalledWith("run-4");
    expect(mocks.runtimeCommandIngressService.terminateRun).not.toHaveBeenCalled();
  });
});
