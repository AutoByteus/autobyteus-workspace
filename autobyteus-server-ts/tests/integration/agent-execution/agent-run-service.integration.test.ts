import { afterEach, describe, expect, it, vi } from "vitest";
import { SkillAccessMode } from "autobyteus-ts/agent/context/skill-access-mode.js";
import { AgentRunService } from "../../../src/agent-execution/services/agent-run-service.js";
import { RuntimeKind } from "../../../src/runtime-management/runtime-kind-enum.js";
import type { AgentRunMetadata } from "../../../src/run-history/store/agent-run-metadata-types.js";

const createActiveRun = (input: {
  runId: string;
  runtimeKind: RuntimeKind;
  platformAgentRunId?: string | null;
  memoryDir?: string | null;
  terminateResult?: { accepted: boolean };
}) => ({
  runId: input.runId,
  runtimeKind: input.runtimeKind,
  config: {
    memoryDir: input.memoryDir ?? null,
  },
  getPlatformAgentRunId: vi.fn().mockReturnValue(input.platformAgentRunId ?? null),
  terminate: vi
    .fn()
    .mockResolvedValue(input.terminateResult ?? { accepted: true }),
});

const createMetadata = (input: {
  runId: string;
  runtimeKind: RuntimeKind;
  workspaceRootPath?: string;
  platformAgentRunId?: string | null;
}): AgentRunMetadata => ({
  runId: input.runId,
  agentDefinitionId: "agent-def-1",
  workspaceRootPath: input.workspaceRootPath ?? "/tmp/workspace",
  memoryDir: `/tmp/memory/agents/${input.runId}`,
  llmModelIdentifier: "model-1",
  llmConfig: { temperature: 0.2 },
  autoExecuteTools: true,
  skillAccessMode: SkillAccessMode.NONE,
  runtimeKind: input.runtimeKind,
  platformAgentRunId: input.platformAgentRunId ?? null,
  lastKnownStatus: "IDLE",
});

afterEach(() => {
  vi.clearAllMocks();
});

describe("AgentRunService integration", () => {
  it.each([
    [RuntimeKind.AUTOBYTEUS, "autobyteus", "native-123"],
    [RuntimeKind.CODEX_APP_SERVER, "codex_app_server", "thread-123"],
    [RuntimeKind.CLAUDE_AGENT_SDK, "claude_agent_sdk", "session-123"],
  ] as const)(
    "creates a %s run, ensures the workspace, and persists metadata/history",
    async (runtimeKind, runtimeKindInput, platformAgentRunId) => {
      const agentRunManager = {
        createAgentRun: vi.fn().mockImplementation(
          async (config: { memoryDir?: string | null }, preferredRunId?: string | null) =>
            createActiveRun({
              runId: preferredRunId ?? `run-create-${runtimeKind}`,
              runtimeKind,
              platformAgentRunId,
              memoryDir:
                config.memoryDir ??
                `/tmp/memory/agents/${preferredRunId ?? `run-create-${runtimeKind}`}`,
            }),
        ),
        getActiveRun: vi.fn().mockReturnValue(null),
        restoreAgentRun: vi.fn(),
        hasActiveRun: vi.fn().mockReturnValue(false),
      };
      const metadataService = {
        writeMetadata: vi.fn().mockResolvedValue(undefined),
        readMetadata: vi.fn(),
      };
      const historyIndexService = {
        recordRunCreated: vi.fn().mockResolvedValue(undefined),
        recordRunRestored: vi.fn(),
        recordRunTerminated: vi.fn(),
      };
      const workspaceManager = {
        ensureWorkspaceByRootPath: vi.fn().mockResolvedValue({
          workspaceId: "workspace-123",
          getBasePath: () => "/tmp/project",
        }),
        getWorkspaceById: vi.fn(),
      };
      const service = new AgentRunService("/tmp/memory", {
        agentRunManager: agentRunManager as never,
        metadataService: metadataService as never,
        historyIndexService: historyIndexService as never,
        workspaceManager: workspaceManager as never,
        agentDefinitionService: {
          getFreshAgentDefinitionById: vi.fn().mockResolvedValue({
            name: "Create Agent",
            role: "Tester",
          }),
        } as never,
      });

      const result = await service.createAgentRun({
        agentDefinitionId: "agent-def-1",
        workspaceRootPath: "/tmp/project",
        llmModelIdentifier: "model-1",
        autoExecuteTools: true,
        llmConfig: { temperature: 0.2 },
        skillAccessMode: SkillAccessMode.NONE,
        runtimeKind: runtimeKindInput,
      });

      const expectedPreparedRunId = agentRunManager.createAgentRun.mock.calls[0]?.[1];
      expect(result.runId).toBe(expectedPreparedRunId);
      expect(workspaceManager.ensureWorkspaceByRootPath).toHaveBeenCalledWith("/tmp/project");
      expect(agentRunManager.createAgentRun).toHaveBeenCalledWith(
        expect.objectContaining({
          runtimeKind,
          workspaceId: "workspace-123",
          memoryDir: `/tmp/memory/agents/${expectedPreparedRunId}`,
        }),
        expectedPreparedRunId,
      );
      expect(metadataService.writeMetadata).toHaveBeenCalledWith(
        expectedPreparedRunId,
        expect.objectContaining({
          runId: expectedPreparedRunId,
          runtimeKind,
          workspaceRootPath: "/tmp/project",
          memoryDir: `/tmp/memory/agents/${expectedPreparedRunId}`,
          platformAgentRunId,
        }),
      );
      expect(historyIndexService.recordRunCreated).toHaveBeenCalledTimes(1);
    },
  );

  it.each([
    [RuntimeKind.AUTOBYTEUS, "native-restore-1", null],
    [RuntimeKind.CODEX_APP_SERVER, "thread-restore-1", "threadId"],
    [RuntimeKind.CLAUDE_AGENT_SDK, "session-restore-1", "sessionId"],
  ] as const)(
    "restores a %s run with the correct runtime context shape and persists refreshed metadata",
    async (runtimeKind, platformAgentRunId, expectedContextKey) => {
      const metadata = createMetadata({
        runId: `run-restore-${runtimeKind}`,
        runtimeKind,
        workspaceRootPath: `/tmp/${runtimeKind}`,
        platformAgentRunId,
      });
      const restoredRun = createActiveRun({
        runId: metadata.runId,
        runtimeKind,
        platformAgentRunId: `${platformAgentRunId}-new`,
        memoryDir: metadata.memoryDir,
      });
      const agentRunManager = {
        createAgentRun: vi.fn(),
        getActiveRun: vi.fn().mockReturnValue(null),
        restoreAgentRun: vi.fn().mockResolvedValue(restoredRun),
        hasActiveRun: vi.fn().mockReturnValue(false),
      };
      const metadataService = {
        writeMetadata: vi.fn().mockResolvedValue(undefined),
        readMetadata: vi.fn().mockResolvedValue(metadata),
      };
      const historyIndexService = {
        recordRunCreated: vi.fn(),
        recordRunRestored: vi.fn().mockResolvedValue(undefined),
        recordRunTerminated: vi.fn(),
      };
      const workspaceManager = {
        ensureWorkspaceByRootPath: vi.fn().mockResolvedValue({
          workspaceId: `ws-${runtimeKind}`,
          getBasePath: () => metadata.workspaceRootPath,
        }),
        getWorkspaceById: vi.fn(),
      };
      const service = new AgentRunService("/tmp/memory", {
        agentRunManager: agentRunManager as never,
        metadataService: metadataService as never,
        historyIndexService: historyIndexService as never,
        workspaceManager: workspaceManager as never,
      });

      const result = await service.restoreAgentRun(metadata.runId);

      expect(result.run).toBe(restoredRun);
      const restoredContext = agentRunManager.restoreAgentRun.mock.calls[0]?.[0];
      expect(restoredContext.runId).toBe(metadata.runId);
      expect(restoredContext.config.workspaceId).toBe(`ws-${runtimeKind}`);
      expect(restoredContext.config.memoryDir).toBe(metadata.memoryDir);
      if (expectedContextKey) {
        expect(restoredContext.runtimeContext[expectedContextKey]).toBe(platformAgentRunId);
      } else {
        expect(restoredContext.runtimeContext).toBeNull();
      }
      expect(metadataService.writeMetadata).toHaveBeenCalledWith(
        metadata.runId,
        expect.objectContaining({
          lastKnownStatus: "ACTIVE",
          memoryDir: metadata.memoryDir,
          platformAgentRunId: `${platformAgentRunId}-new`,
        }),
      );
      expect(historyIndexService.recordRunRestored).toHaveBeenCalledTimes(1);
    },
  );

  it("rejects restore when the run is already active", async () => {
    const activeRun = createActiveRun({
      runId: "run-active",
      runtimeKind: RuntimeKind.AUTOBYTEUS,
    });
    const service = new AgentRunService("/tmp/memory", {
      agentRunManager: {
        createAgentRun: vi.fn(),
        getActiveRun: vi.fn().mockReturnValue(activeRun),
        restoreAgentRun: vi.fn(),
        hasActiveRun: vi.fn().mockReturnValue(false),
      } as never,
      metadataService: {
        writeMetadata: vi.fn(),
        readMetadata: vi.fn(),
      } as never,
      historyIndexService: {
        recordRunCreated: vi.fn(),
        recordRunRestored: vi.fn(),
        recordRunTerminated: vi.fn(),
      } as never,
      workspaceManager: {
        ensureWorkspaceByRootPath: vi.fn(),
        getWorkspaceById: vi.fn(),
      } as never,
    });

    await expect(service.restoreAgentRun("run-active")).rejects.toThrow("already active");
  });

  it("terminates native and runtime runs with the correct route and updates history/metadata", async () => {
    const metadataService = {
      writeMetadata: vi.fn().mockResolvedValue(undefined),
      readMetadata: vi.fn().mockResolvedValue(createMetadata({
        runId: "run-term-1",
        runtimeKind: RuntimeKind.AUTOBYTEUS,
        platformAgentRunId: "native-1",
      })),
    };
    const historyIndexService = {
      recordRunCreated: vi.fn(),
      recordRunRestored: vi.fn(),
      recordRunTerminated: vi.fn().mockResolvedValue(undefined),
    };
    const nativeRun = createActiveRun({
      runId: "run-term-1",
      runtimeKind: RuntimeKind.AUTOBYTEUS,
      platformAgentRunId: "native-1-updated",
    });
    const runtimeRun = createActiveRun({
      runId: "run-term-2",
      runtimeKind: RuntimeKind.CLAUDE_AGENT_SDK,
      platformAgentRunId: "session-2-updated",
    });
    const agentRunManager = {
      createAgentRun: vi.fn(),
      getActiveRun: vi
        .fn()
        .mockImplementation((runId: string) => {
          if (runId === "run-term-1") return nativeRun;
          if (runId === "run-term-2") return runtimeRun;
          return null;
        }),
      restoreAgentRun: vi.fn(),
      hasActiveRun: vi.fn().mockReturnValue(false),
    };
    const service = new AgentRunService("/tmp/memory", {
      agentRunManager: agentRunManager as never,
      metadataService: metadataService as never,
      historyIndexService: historyIndexService as never,
      workspaceManager: {
        ensureWorkspaceByRootPath: vi.fn(),
        getWorkspaceById: vi.fn(),
      } as never,
    });

    const nativeResult = await service.terminateAgentRun("run-term-1");
    metadataService.readMetadata.mockResolvedValueOnce(createMetadata({
      runId: "run-term-2",
      runtimeKind: RuntimeKind.CLAUDE_AGENT_SDK,
      platformAgentRunId: "session-2",
    }));
    const runtimeResult = await service.terminateAgentRun("run-term-2");

    expect(nativeResult).toMatchObject({
      success: true,
      route: "native",
      runtimeKind: RuntimeKind.AUTOBYTEUS,
    });
    expect(runtimeResult).toMatchObject({
      success: true,
      route: "runtime",
      runtimeKind: RuntimeKind.CLAUDE_AGENT_SDK,
    });
    expect(metadataService.writeMetadata).toHaveBeenCalledWith(
      "run-term-1",
      expect.objectContaining({
        lastKnownStatus: "TERMINATED",
        platformAgentRunId: "native-1-updated",
      }),
    );
    expect(historyIndexService.recordRunTerminated).toHaveBeenCalledTimes(2);
  });

  it("returns not_found when termination target is missing or unaccepted", async () => {
    const deniedRun = createActiveRun({
      runId: "run-denied",
      runtimeKind: RuntimeKind.CODEX_APP_SERVER,
      terminateResult: { accepted: false },
    });
    const service = new AgentRunService("/tmp/memory", {
      agentRunManager: {
        createAgentRun: vi.fn(),
        getActiveRun: vi
          .fn()
          .mockImplementation((runId: string) => (runId === "run-denied" ? deniedRun : null)),
        restoreAgentRun: vi.fn(),
      } as never,
      metadataService: {
        writeMetadata: vi.fn(),
        readMetadata: vi.fn(),
      } as never,
      historyIndexService: {
        recordRunCreated: vi.fn(),
        recordRunRestored: vi.fn(),
        recordRunTerminated: vi.fn(),
      } as never,
      workspaceManager: {
        ensureWorkspaceByRootPath: vi.fn(),
        getWorkspaceById: vi.fn(),
      } as never,
    });

    await expect(service.terminateAgentRun("missing-run")).resolves.toMatchObject({
      success: false,
      route: "not_found",
      runtimeKind: null,
    });
    await expect(service.terminateAgentRun("run-denied")).resolves.toMatchObject({
      success: false,
      route: "not_found",
      runtimeKind: RuntimeKind.CODEX_APP_SERVER,
    });
  });

  it("rejects unsupported runtime kinds during create", async () => {
    const service = new AgentRunService("/tmp/memory", {
      agentRunManager: {
        createAgentRun: vi.fn(),
        getActiveRun: vi.fn(),
        restoreAgentRun: vi.fn(),
      } as never,
      metadataService: {
        writeMetadata: vi.fn(),
        readMetadata: vi.fn(),
      } as never,
      historyIndexService: {
        recordRunCreated: vi.fn(),
        recordRunRestored: vi.fn(),
        recordRunTerminated: vi.fn(),
      } as never,
      workspaceManager: {
        ensureWorkspaceByRootPath: vi.fn().mockResolvedValue({
          workspaceId: "workspace-123",
          getBasePath: () => "/tmp/project",
        }),
        getWorkspaceById: vi.fn(),
      } as never,
    });

    await expect(
      service.createAgentRun({
        agentDefinitionId: "agent-def-1",
        workspaceRootPath: "/tmp/project",
        llmModelIdentifier: "model-1",
        autoExecuteTools: true,
        skillAccessMode: SkillAccessMode.NONE,
        runtimeKind: "unsupported_runtime",
      }),
    ).rejects.toThrow("not supported");
  });
});
