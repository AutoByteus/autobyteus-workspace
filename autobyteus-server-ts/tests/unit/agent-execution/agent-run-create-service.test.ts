import { describe, expect, it, vi } from "vitest";
import { RuntimeKind } from "../../../src/runtime-management/runtime-kind-enum.js";
import { AgentRunService } from "../../../src/agent-execution/services/agent-run-service.js";

describe("AgentRunService create", () => {
  const createSubject = () => {
    const activeRun = {
      runId: "run-created",
      runtimeKind: RuntimeKind.CODEX_APP_SERVER,
      config: {
        memoryDir: "/tmp/agent-run-service-test/agents/run-created",
      },
      getPlatformAgentRunId: vi.fn().mockReturnValue("thread-created"),
    };
    const agentRunManager = {
      getActiveRun: vi.fn(),
      hasActiveRun: vi.fn().mockReturnValue(false),
      createAgentRun: vi.fn().mockResolvedValue(activeRun),
    } as any;
    const metadataService = {
      readMetadata: vi.fn().mockResolvedValue(null),
      writeMetadata: vi.fn().mockResolvedValue(undefined),
    };
    const historyIndexService = {
      recordRunCreated: vi.fn().mockResolvedValue(undefined),
      recordRunActivity: vi.fn().mockResolvedValue(undefined),
    } as any;
    const workspaceManager = {
      ensureWorkspaceByRootPath: vi.fn().mockResolvedValue({
        workspaceId: "workspace-1",
      }),
      getWorkspaceById: vi.fn(),
    } as any;

    const service = new AgentRunService("/tmp/agent-run-service-test", {
      agentRunManager,
      metadataService,
      historyIndexService,
      workspaceManager,
    });

    return {
      service,
      mocks: {
        agentRunManager,
        metadataService,
        historyIndexService,
        workspaceManager,
      },
    };
  };

  it("preserves the existing default IDLE/empty history semantics", async () => {
    const { service, mocks } = createSubject();

    const result = await service.createAgentRun({
      agentDefinitionId: "agent-def-1",
      workspaceRootPath: "/tmp/workspace",
      llmModelIdentifier: "gpt-test",
      autoExecuteTools: false,
      llmConfig: null,
      skillAccessMode: "PRELOADED_ONLY" as any,
      runtimeKind: RuntimeKind.CODEX_APP_SERVER,
    });

    expect(result).toEqual({
      runId: "run-created",
    });
    expect(mocks.workspaceManager.ensureWorkspaceByRootPath).toHaveBeenCalledWith("/tmp/workspace");
    expect(mocks.metadataService.writeMetadata).toHaveBeenCalledWith(
      "run-created",
      expect.objectContaining({
        runId: "run-created",
        lastKnownStatus: "IDLE",
        workspaceRootPath: "/tmp/workspace",
      }),
    );
    expect(mocks.historyIndexService.recordRunCreated).toHaveBeenCalledWith(
      expect.objectContaining({
        runId: "run-created",
        summary: "",
        lastKnownStatus: "IDLE",
      }),
    );
  });

  it("records run activity after the run already exists", async () => {
    const { service, mocks } = createSubject();
    mocks.metadataService.readMetadata.mockResolvedValue({
      runId: "run-created",
      agentDefinitionId: "agent-def-1",
      workspaceRootPath: "/tmp/workspace",
      memoryDir: "/tmp/agent-run-service-test/agents/run-created",
      llmModelIdentifier: "gpt-test",
      llmConfig: null,
      autoExecuteTools: false,
      skillAccessMode: "PRELOADED_ONLY",
      runtimeKind: RuntimeKind.CODEX_APP_SERVER,
      platformAgentRunId: "thread-old",
      lastKnownStatus: "IDLE",
    });
    const activeRun = {
      runId: "run-created",
      getPlatformAgentRunId: vi.fn().mockReturnValue("thread-created"),
    } as any;

    await service.recordRunActivity(activeRun, {
      summary: "First external message",
      lastKnownStatus: "ACTIVE",
    });

    expect(mocks.metadataService.writeMetadata).toHaveBeenCalledWith(
      "run-created",
      expect.objectContaining({
        runId: "run-created",
        lastKnownStatus: "ACTIVE",
      }),
    );
    expect(mocks.historyIndexService.recordRunActivity).toHaveBeenCalledWith(
      expect.objectContaining({
        runId: "run-created",
        summary: "First external message",
        lastKnownStatus: "ACTIVE",
      }),
    );
  });
});
