import { describe, expect, it, vi } from "vitest";
import { RuntimeKind } from "../../../src/runtime-management/runtime-kind-enum.js";
import { AgentRunService } from "../../../src/agent-execution/services/agent-run-service.js";

describe("AgentRunService restore", () => {
  const createSubject = (options: {
    activeRun?: unknown;
    metadata?: Record<string, unknown> | null;
    restoredRun?: Record<string, unknown>;
  } = {}) => {
    const agentRunManager = {
      getActiveRun: vi.fn().mockReturnValue(options.activeRun ?? null),
      restoreAgentRun: vi.fn().mockResolvedValue(
        options.restoredRun ?? {
          runId: "run-1",
          runtimeKind: RuntimeKind.CODEX_APP_SERVER,
          getPlatformAgentRunId: vi.fn().mockReturnValue("thread-restored"),
        },
      ),
      createAgentRun: vi.fn(),
    } as any;
    const metadataService = {
      readMetadata: vi.fn().mockResolvedValue(
        options.metadata === undefined
          ? {
              runId: "run-1",
              agentDefinitionId: "agent-def-1",
              workspaceRootPath: "/tmp/workspace",
              memoryDir: "/tmp/agent-run-service-test/agents/run-1",
              llmModelIdentifier: "gpt-test",
              llmConfig: { reasoning_effort: "medium" },
              autoExecuteTools: false,
              skillAccessMode: null,
              runtimeKind: RuntimeKind.CODEX_APP_SERVER,
              platformAgentRunId: "thread-old",
              lastKnownStatus: "IDLE",
            }
          : options.metadata,
      ),
      writeMetadata: vi.fn().mockResolvedValue(undefined),
    };
    const historyIndexService = {
      recordRunCreated: vi.fn(),
      recordRunRestored: vi.fn().mockResolvedValue(undefined),
      recordRunTerminated: vi.fn(),
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

  it("restores an inactive run from metadata and persists ACTIVE state", async () => {
    const { service, mocks } = createSubject();

    const result = await service.restoreAgentRun(" run-1 ");

    expect(mocks.workspaceManager.ensureWorkspaceByRootPath).toHaveBeenCalledWith("/tmp/workspace");
    expect(mocks.agentRunManager.restoreAgentRun).toHaveBeenCalledOnce();
    expect(mocks.metadataService.writeMetadata).toHaveBeenCalledWith("run-1", {
      runId: "run-1",
      agentDefinitionId: "agent-def-1",
      workspaceRootPath: "/tmp/workspace",
      memoryDir: "/tmp/agent-run-service-test/agents/run-1",
      llmModelIdentifier: "gpt-test",
      llmConfig: { reasoning_effort: "medium" },
      autoExecuteTools: false,
      skillAccessMode: null,
      runtimeKind: RuntimeKind.CODEX_APP_SERVER,
      platformAgentRunId: "thread-restored",
      lastKnownStatus: "ACTIVE",
    });
    expect(mocks.historyIndexService.recordRunRestored).toHaveBeenCalledWith(
      expect.objectContaining({
        runId: "run-1",
        lastKnownStatus: "ACTIVE",
        metadata: expect.objectContaining({
          platformAgentRunId: "thread-restored",
          lastKnownStatus: "ACTIVE",
        }),
      }),
    );
    expect(result).toMatchObject({
      run: {
        runId: "run-1",
      },
      metadata: {
        runId: "run-1",
        lastKnownStatus: "ACTIVE",
      },
    });
  });

  it("rejects restoring a run that is already active", async () => {
    const { service, mocks } = createSubject({
      activeRun: {
        runId: "run-1",
      },
    });

    await expect(service.restoreAgentRun("run-1")).rejects.toThrow(
      "Run 'run-1' is already active and does not need restore.",
    );
    expect(mocks.metadataService.readMetadata).not.toHaveBeenCalled();
    expect(mocks.agentRunManager.restoreAgentRun).not.toHaveBeenCalled();
  });

  it("rejects restoring a run with missing metadata", async () => {
    const { service, mocks } = createSubject({
      metadata: null,
    });

    await expect(service.restoreAgentRun("run-missing")).rejects.toThrow(
      "Run 'run-missing' cannot be restored because metadata is missing.",
    );
    expect(mocks.agentRunManager.restoreAgentRun).not.toHaveBeenCalled();
  });
});
