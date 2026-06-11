import { describe, expect, it, vi } from "vitest";
import { RuntimeKind } from "../../../src/runtime-management/runtime-kind-enum.js";
import { AgentRunService } from "../../../src/agent-execution/services/agent-run-service.js";
import type { AgentRunMetadata } from "../../../src/run-history/store/agent-run-metadata-types.js";

const createSubject = () => {
  const metadataByRunId = new Map<string, AgentRunMetadata>();
  const agentRunManager = {
    getActiveRun: vi.fn().mockReturnValue(null),
    hasActiveRun: vi.fn().mockReturnValue(false),
    createAgentRun: vi.fn(async (_config: unknown, runId: string) => ({
      runId,
      runtimeKind: RuntimeKind.CODEX_APP_SERVER,
      config: {
        memoryDir: `/tmp/agent-run-service-test/agents/${runId}`,
      },
      getPlatformAgentRunId: vi.fn().mockReturnValue("thread-created"),
    })),
  } as never;
  const metadataService = {
    readMetadata: vi.fn(async (runId: string) => metadataByRunId.get(runId) ?? null),
    writeMetadata: vi.fn(async (runId: string, metadata: AgentRunMetadata) => {
      metadataByRunId.set(runId, metadata);
    }),
  };
  const historyCatalogService = {
    recordPreparedRun: vi.fn(async (input: { runId: string; metadata: AgentRunMetadata }) => {
      metadataByRunId.set(input.runId, input.metadata);
    }),
    recordRunStarted: vi.fn(async (input: {
      runId: string;
      runtimeKind?: RuntimeKind;
      platformAgentRunId?: string | null;
      startedAt?: string;
    }) => {
      const current = metadataByRunId.get(input.runId);
      if (!current) {
        return null;
      }
      const next = {
        ...current,
        runtimeKind: input.runtimeKind ?? current.runtimeKind,
        platformAgentRunId: input.platformAgentRunId ?? current.platformAgentRunId,
        startedAt: input.startedAt ?? "2026-05-17T00:05:00.000Z",
      };
      metadataByRunId.set(input.runId, next);
      return next;
    }),
    recordRunSummary: vi.fn().mockResolvedValue(undefined),
    recordRunTerminated: vi.fn().mockResolvedValue(undefined),
  };
  const workspaceManager = {
    ensureWorkspaceByRootPath: vi.fn().mockResolvedValue({
      workspaceId: "workspace-1",
    }),
    getWorkspaceById: vi.fn(),
  } as never;

  const agentRunIdentityAllocator = {
    allocateForAgentDefinition: vi.fn(async () => "support_agent_00000000000000000000000000000001"),
  };
  const service = new AgentRunService("/tmp/agent-run-service-test", {
    agentRunManager,
    metadataService: metadataService as never,
    historyCatalogService: historyCatalogService as never,
    workspaceManager,
    agentRunIdentityAllocator,
  });

  return {
    service,
    metadataByRunId,
    mocks: {
      agentRunManager,
      metadataService,
      historyCatalogService,
      workspaceManager,
    },
  };
};

describe("AgentRunService create", () => {
  it("creates via prepared catalog row then start fact without persisted live status", async () => {
    const { service, mocks } = createSubject();

    const result = await service.createAgentRun({
      agentDefinitionId: "agent-def-1",
      workspaceRootPath: "/tmp/workspace",
      llmModelIdentifier: "gpt-test",
      autoExecuteTools: false,
      llmConfig: null,
      skillAccessMode: "PRELOADED_ONLY" as never,
      runtimeKind: RuntimeKind.CODEX_APP_SERVER,
    });

    expect(result.runId).toEqual(expect.any(String));
    expect(mocks.workspaceManager.ensureWorkspaceByRootPath).toHaveBeenCalledWith("/tmp/workspace");
    expect(mocks.historyCatalogService.recordPreparedRun).toHaveBeenCalledWith(expect.objectContaining({
      runId: result.runId,
      summary: "",
      metadata: expect.objectContaining({
        runId: result.runId,
        workspaceRootPath: "/tmp/workspace",
        platformAgentRunId: null,
        startedAt: null,
      }),
    }));
    const preparedMetadata = mocks.historyCatalogService.recordPreparedRun.mock.calls[0][0].metadata;
    expect(preparedMetadata).not.toHaveProperty("lastKnownStatus");
    expect(preparedMetadata).not.toHaveProperty("activationState");
    expect(mocks.historyCatalogService.recordRunStarted).toHaveBeenCalledWith(expect.objectContaining({
      runId: result.runId,
      platformAgentRunId: "thread-created",
      runtimeKind: RuntimeKind.CODEX_APP_SERVER,
    }));
  });

  it("records activity by updating resume metadata and catalog summary only", async () => {
    const { service, metadataByRunId, mocks } = createSubject();
    metadataByRunId.set("run-created", {
      runId: "run-created",
      agentDefinitionId: "agent-def-1",
      workspaceRootPath: "/tmp/workspace",
      memoryDir: "/tmp/agent-run-service-test/agents/run-created",
      llmModelIdentifier: "gpt-test",
      llmConfig: null,
      autoExecuteTools: false,
      skillAccessMode: "PRELOADED_ONLY" as never,
      runtimeKind: RuntimeKind.CODEX_APP_SERVER,
      platformAgentRunId: "thread-old",
      preparedAt: "2026-05-17T00:00:00.000Z",
      preparedExpiresAt: "2026-05-18T00:00:00.000Z",
      startedAt: "2026-05-17T00:05:00.000Z",
    });
    const activeRun = {
      runId: "run-created",
      getPlatformAgentRunId: vi.fn().mockReturnValue("thread-created"),
    } as never;

    await service.recordRunActivity(activeRun, { summary: "First external message" });

    expect(mocks.metadataService.writeMetadata).toHaveBeenCalledWith(
      "run-created",
      expect.objectContaining({
        runId: "run-created",
        platformAgentRunId: "thread-created",
      }),
    );
    const writtenMetadata = mocks.metadataService.writeMetadata.mock.calls[0][1];
    expect(writtenMetadata).not.toHaveProperty("lastKnownStatus");
    expect(mocks.historyCatalogService.recordRunSummary).toHaveBeenCalledWith({
      runId: "run-created",
      summary: "First external message",
    });
  });
});
