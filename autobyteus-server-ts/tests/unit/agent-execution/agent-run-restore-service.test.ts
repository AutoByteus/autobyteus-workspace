import { describe, expect, it, vi } from "vitest";
import { RuntimeKind } from "../../../src/runtime-management/runtime-kind-enum.js";
import { AgentRunService } from "../../../src/agent-execution/services/agent-run-service.js";
import type { AgentRunMetadata } from "../../../src/run-history/store/agent-run-metadata-types.js";

const defaultMetadata = (): AgentRunMetadata => ({
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
  preparedAt: "2026-05-17T00:00:00.000Z",
  preparedExpiresAt: "2026-05-18T00:00:00.000Z",
  startedAt: "2026-05-17T00:05:00.000Z",
});

describe("AgentRunService restore", () => {
  const createSubject = (options: {
    activeRun?: unknown;
    metadata?: AgentRunMetadata | null;
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
      hasActiveRun: vi.fn().mockReturnValue(false),
    } as never;
    const metadataService = {
      readMetadata: vi.fn().mockResolvedValue(
        options.metadata === undefined ? defaultMetadata() : options.metadata,
      ),
      writeMetadata: vi.fn().mockResolvedValue(undefined),
    };
    const historyCatalogService = {
      recordPreparedRun: vi.fn(),
      recordRunStarted: vi.fn(async (input: {
        runId: string;
        platformAgentRunId?: string | null;
        runtimeKind?: RuntimeKind;
        startedAt?: string;
      }) => {
        const current = await metadataService.readMetadata(input.runId);
        if (!current) {
          return null;
        }
        return {
          ...current,
          runtimeKind: input.runtimeKind ?? current.runtimeKind,
          platformAgentRunId: input.platformAgentRunId ?? current.platformAgentRunId,
          startedAt: input.startedAt ?? current.startedAt,
        };
      }),
      recordRunTerminated: vi.fn(),
    };
    const workspaceManager = {
      ensureWorkspaceByRootPath: vi.fn().mockResolvedValue({
        workspaceId: "workspace-1",
      }),
      getWorkspaceById: vi.fn(),
    } as never;

    const service = new AgentRunService("/tmp/agent-run-service-test", {
      agentRunManager,
      metadataService: metadataService as never,
      historyCatalogService: historyCatalogService as never,
      workspaceManager,
    });

    return { service, mocks: { agentRunManager, metadataService, historyCatalogService, workspaceManager } };
  };

  it("restores an inactive run from metadata and records start facts", async () => {
    const { service, mocks } = createSubject();

    const result = await service.restoreAgentRun(" run-1 ");

    expect(mocks.workspaceManager.ensureWorkspaceByRootPath).toHaveBeenCalledWith("/tmp/workspace");
    expect(mocks.agentRunManager.restoreAgentRun).toHaveBeenCalledOnce();
    expect(mocks.metadataService.writeMetadata).not.toHaveBeenCalled();
    expect(mocks.historyCatalogService.recordRunStarted).toHaveBeenCalledWith(expect.objectContaining({
      runId: "run-1",
      platformAgentRunId: "thread-restored",
      runtimeKind: RuntimeKind.CODEX_APP_SERVER,
      startedAt: "2026-05-17T00:05:00.000Z",
    }));
    expect(result).toMatchObject({
      run: { runId: "run-1" },
      metadata: {
        runId: "run-1",
        platformAgentRunId: "thread-restored",
      },
    });
    expect(result.metadata).not.toHaveProperty("lastKnownStatus");
  });

  it("rejects restoring a run that is already active", async () => {
    const { service, mocks } = createSubject({ activeRun: { runId: "run-1" } });

    await expect(service.restoreAgentRun("run-1")).rejects.toThrow(
      "Run 'run-1' is already active and does not need restore.",
    );
    expect(mocks.metadataService.readMetadata).not.toHaveBeenCalled();
    expect(mocks.agentRunManager.restoreAgentRun).not.toHaveBeenCalled();
  });

  it("rejects restoring a run with missing metadata", async () => {
    const { service, mocks } = createSubject({ metadata: null });

    await expect(service.restoreAgentRun("run-missing")).rejects.toThrow(
      "Run 'run-missing' cannot be restored because metadata is missing.",
    );
    expect(mocks.agentRunManager.restoreAgentRun).not.toHaveBeenCalled();
  });

  it("rejects restoring a prepared run that has not started", async () => {
    const { service, mocks } = createSubject({
      metadata: { ...defaultMetadata(), startedAt: null },
    });

    await expect(service.restoreAgentRun("run-1")).rejects.toThrow(
      "Run 'run-1' cannot be restored because it has not been started.",
    );
    expect(mocks.agentRunManager.restoreAgentRun).not.toHaveBeenCalled();
  });
});
