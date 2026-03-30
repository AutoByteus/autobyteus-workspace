import { describe, expect, it, vi } from "vitest";
import { AgentRunService } from "../../../src/agent-execution/services/agent-run-service.js";

describe("AgentRunService termination", () => {
  const createSubject = (options: {
    metadata?: Record<string, unknown> | null;
  } = {}) => {
    const agentRunManager = {
      getActiveRun: vi.fn(),
    } as any;
    const metadataService = {
      readMetadata: vi.fn().mockResolvedValue(options.metadata ?? null),
      writeMetadata: vi.fn().mockResolvedValue(undefined),
    };
    const historyIndexService = {
      recordRunTerminated: vi.fn().mockResolvedValue(undefined),
    } as any;

    const service = new AgentRunService("/tmp/agent-run-service-test", {
      agentRunManager,
      metadataService,
      historyIndexService,
    });

    return {
      service,
      mocks: {
        agentRunManager,
        metadataService,
        historyIndexService,
      },
    };
  };

  it("routes non-native runtime runs through the live AgentRun subject", async () => {
    const { service, mocks } = createSubject();
    mocks.agentRunManager.getActiveRun.mockReturnValue({
      runtimeKind: "codex_app_server",
      getPlatformAgentRunId: vi.fn().mockReturnValue(null),
      terminate: vi.fn().mockResolvedValue({ accepted: true }),
    });

    const result = await service.terminateAgentRun("run-1");

    expect(result).toEqual({
      success: true,
      message: "Agent run terminated successfully.",
      route: "runtime",
      runtimeKind: "codex_app_server",
    });
    expect(mocks.agentRunManager.getActiveRun).toHaveBeenCalledWith("run-1");
    expect(mocks.historyIndexService.recordRunTerminated).toHaveBeenCalledWith("run-1");
  });

  it("routes autobyteus runtime runs through the live AgentRun subject and performs shared cleanup once", async () => {
    const { service, mocks } = createSubject();
    mocks.agentRunManager.getActiveRun.mockReturnValue({
      runtimeKind: "autobyteus",
      getPlatformAgentRunId: vi.fn().mockReturnValue(null),
      terminate: vi.fn().mockResolvedValue({ accepted: true }),
    });

    const result = await service.terminateAgentRun("run-2");

    expect(result).toEqual({
      success: true,
      message: "Agent run terminated successfully.",
      route: "native",
      runtimeKind: "autobyteus",
    });
    expect(mocks.agentRunManager.getActiveRun).toHaveBeenCalledWith("run-2");
    expect(mocks.historyIndexService.recordRunTerminated).toHaveBeenCalledTimes(1);
  });

  it("returns not found when no active AgentRun exists", async () => {
    const { service, mocks } = createSubject();
    mocks.agentRunManager.getActiveRun.mockReturnValue(null);

    const result = await service.terminateAgentRun("missing-run");

    expect(result).toEqual({
      success: false,
      message: "Agent run not found.",
      route: "not_found",
      runtimeKind: null,
    });
    expect(mocks.historyIndexService.recordRunTerminated).not.toHaveBeenCalled();
  });

  it("skips shared cleanup when AgentRun termination is rejected", async () => {
    const { service, mocks } = createSubject();
    mocks.agentRunManager.getActiveRun.mockReturnValue({
      runtimeKind: "claude_agent_sdk",
      getPlatformAgentRunId: vi.fn().mockReturnValue(null),
      terminate: vi.fn().mockResolvedValue({
        accepted: false,
        code: "RUN_SESSION_NOT_FOUND",
      }),
    });

    const result = await service.terminateAgentRun("run-3");

    expect(result).toEqual({
      success: false,
      message: "Agent run not found.",
      route: "not_found",
      runtimeKind: "claude_agent_sdk",
    });
    expect(mocks.historyIndexService.recordRunTerminated).not.toHaveBeenCalled();
  });

  it("persists TERMINATED status when metadata exists", async () => {
    const { service, mocks } = createSubject({
      metadata: {
        runId: "run-4",
        agentDefinitionId: "agent-1",
        workspaceRootPath: "/tmp/workspace",
        llmModelIdentifier: "gpt-test",
        llmConfig: null,
        autoExecuteTools: false,
        skillAccessMode: null,
        runtimeKind: "codex_app_server",
        platformAgentRunId: "thread-old",
        lastKnownStatus: "ACTIVE",
      },
    });
    mocks.agentRunManager.getActiveRun.mockReturnValue({
      runtimeKind: "codex_app_server",
      getPlatformAgentRunId: vi.fn().mockReturnValue("thread-new"),
      terminate: vi.fn().mockResolvedValue({ accepted: true }),
    });

    await service.terminateAgentRun("run-4");

    expect(mocks.metadataService.writeMetadata).toHaveBeenCalledWith("run-4", {
      runId: "run-4",
      agentDefinitionId: "agent-1",
      workspaceRootPath: "/tmp/workspace",
      llmModelIdentifier: "gpt-test",
      llmConfig: null,
      autoExecuteTools: false,
      skillAccessMode: null,
      runtimeKind: "codex_app_server",
      platformAgentRunId: "thread-new",
      lastKnownStatus: "TERMINATED",
    });
    expect(mocks.historyIndexService.recordRunTerminated).toHaveBeenCalledWith("run-4");
  });
});
