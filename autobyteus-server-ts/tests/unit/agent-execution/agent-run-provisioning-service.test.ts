import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SkillAccessMode } from "autobyteus-ts/agent/context/skill-access-mode.js";
import { AgentRunProvisioningService } from "../../../src/agent-execution/services/agent-run-provisioning-service.js";
import { RuntimeKind } from "../../../src/runtime-management/runtime-kind-enum.js";
import type { AgentRunMetadata } from "../../../src/run-history/store/agent-run-metadata-types.js";

const buildMetadata = (
  memoryDir: string,
  runId: string,
  overrides: Partial<AgentRunMetadata> = {},
): AgentRunMetadata => ({
  runId,
  agentDefinitionId: "agent-def-1",
  workspaceRootPath: "/tmp/workspace-one",
  memoryDir: path.join(memoryDir, "agents", runId),
  llmModelIdentifier: "model-1",
  llmConfig: null,
  autoExecuteTools: false,
  skillAccessMode: SkillAccessMode.PRELOADED_ONLY,
  runtimeKind: RuntimeKind.CODEX_APP_SERVER,
  platformAgentRunId: null,
  preparedAt: "2026-05-17T00:00:00.000Z",
  preparedExpiresAt: "2026-05-18T00:00:00.000Z",
  startedAt: null,
  applicationExecutionContext: null,
  ...overrides,
});

describe("AgentRunProvisioningService", () => {
  let memoryDir: string;
  let metadataByRunId: Map<string, AgentRunMetadata>;
  let metadataService: {
    writeMetadata: ReturnType<typeof vi.fn>;
    readMetadata: ReturnType<typeof vi.fn>;
  };
  let historyCatalogService: {
    recordPreparedRun: ReturnType<typeof vi.fn>;
    recordRunStarted: ReturnType<typeof vi.fn>;
    cancelPreparedRun: ReturnType<typeof vi.fn>;
  };
  let agentRunManager: {
    hasActiveRun: ReturnType<typeof vi.fn>;
    getActiveRun: ReturnType<typeof vi.fn>;
    createAgentRun: ReturnType<typeof vi.fn>;
  };
  let workspaceManager: {
    ensureWorkspaceByRootPath: ReturnType<typeof vi.fn>;
    getWorkspaceById: ReturnType<typeof vi.fn>;
  };

  beforeEach(async () => {
    allocatedRunCounter = 0;
    memoryDir = await fs.mkdtemp(path.join(os.tmpdir(), "agent-run-provisioning-"));
    metadataByRunId = new Map();
    metadataService = {
      writeMetadata: vi.fn(async (runId: string, metadata: AgentRunMetadata) => {
        metadataByRunId.set(runId, metadata);
      }),
      readMetadata: vi.fn(async (runId: string) => metadataByRunId.get(runId) ?? null),
    };
    historyCatalogService = {
      recordPreparedRun: vi.fn(async (input: { runId: string; metadata: AgentRunMetadata }) => {
        metadataByRunId.set(input.runId, input.metadata);
        await fs.mkdir(input.metadata.memoryDir, { recursive: true });
      }),
      recordRunStarted: vi.fn(async (input: {
        runId: string;
        platformAgentRunId?: string | null;
        runtimeKind?: RuntimeKind;
        startedAt?: string;
      }) => {
        const current = metadataByRunId.get(input.runId);
        if (!current) {
          return null;
        }
        const next: AgentRunMetadata = {
          ...current,
          platformAgentRunId: input.platformAgentRunId ?? current.platformAgentRunId,
          runtimeKind: input.runtimeKind ?? current.runtimeKind,
          startedAt: input.startedAt ?? current.startedAt ?? "2026-05-17T00:05:00.000Z",
        };
        metadataByRunId.set(input.runId, next);
        return next;
      }),
      cancelPreparedRun: vi.fn(async (runId: string) => {
        metadataByRunId.delete(runId);
        return { success: true, message: `Run '${runId}' cancelled.` };
      }),
    };
    agentRunManager = {
      hasActiveRun: vi.fn().mockReturnValue(false),
      getActiveRun: vi.fn().mockReturnValue(null),
      createAgentRun: vi.fn(),
    };
    workspaceManager = {
      ensureWorkspaceByRootPath: vi.fn().mockResolvedValue({ workspaceId: "workspace-1" }),
      getWorkspaceById: vi.fn().mockReturnValue({ getBasePath: () => "/tmp/workspace-one" }),
    };
  });

  afterEach(async () => {
    await fs.rm(memoryDir, { recursive: true, force: true });
  });

  let allocatedRunCounter = 0;
  const buildService = () => new AgentRunProvisioningService(memoryDir, {
    agentRunManager: agentRunManager as never,
    metadataService: metadataService as never,
    historyCatalogService: historyCatalogService as never,
    workspaceManager: workspaceManager as never,
    agentRunIdentityAllocator: {
      allocateForAgentDefinition: vi.fn(async () => {
        allocatedRunCounter += 1;
        return `support_agent_${String(allocatedRunCounter).padStart(32, "0")}`;
      }),
    },
  });

  it("prepares a standalone run identity through the catalog without persisted live status", async () => {
    const service = buildService();

    const result = await service.prepareAgentRun({
      agentDefinitionId: "agent-def-1",
      workspaceRootPath: "/tmp/workspace-one",
      llmModelIdentifier: "model-1",
      autoExecuteTools: false,
      llmConfig: null,
      skillAccessMode: SkillAccessMode.PRELOADED_ONLY,
      runtimeKind: RuntimeKind.CODEX_APP_SERVER,
      initialSummary: "first message",
    });

    expect(result).toMatchObject({
      activationState: "PREPARED",
      runId: expect.any(String),
      preparedExpiresAt: expect.any(String),
    });
    expect(agentRunManager.createAgentRun).not.toHaveBeenCalled();
    expect(historyCatalogService.recordPreparedRun).toHaveBeenCalledWith(expect.objectContaining({
      runId: result.runId,
      summary: "first message",
      metadata: expect.objectContaining({
        runId: result.runId,
        platformAgentRunId: null,
        runtimeKind: RuntimeKind.CODEX_APP_SERVER,
        startedAt: null,
      }),
    }));
    const recorded = historyCatalogService.recordPreparedRun.mock.calls[0][0].metadata;
    expect(recorded).not.toHaveProperty("lastKnownStatus");
    expect(recorded).not.toHaveProperty("activationState");
  });

  it("does not persist activation failure state and permits retry from prepared facts", async () => {
    const runId = "run-activation-retry";
    metadataByRunId.set(runId, buildMetadata(memoryDir, runId));
    const createdRun = {
      runtimeKind: RuntimeKind.CODEX_APP_SERVER,
      getPlatformAgentRunId: () => "platform-run-1",
    };
    agentRunManager.createAgentRun
      .mockRejectedValueOnce(new Error("runtime boot failed"))
      .mockResolvedValueOnce(createdRun);
    const service = buildService();

    await expect(service.activatePreparedRun(runId)).rejects.toThrow("runtime boot failed");
    expect(historyCatalogService.recordRunStarted).not.toHaveBeenCalled();
    expect(metadataByRunId.get(runId)).toMatchObject({
      startedAt: null,
      platformAgentRunId: null,
    });

    const retried = await service.activatePreparedRun(runId);

    expect(retried).toBe(createdRun);
    expect(agentRunManager.createAgentRun).toHaveBeenCalledTimes(2);
    expect(historyCatalogService.recordRunStarted).toHaveBeenCalledWith(expect.objectContaining({
      runId,
      platformAgentRunId: "platform-run-1",
      runtimeKind: RuntimeKind.CODEX_APP_SERVER,
    }));
    expect(metadataByRunId.get(runId)).toMatchObject({
      platformAgentRunId: "platform-run-1",
      startedAt: expect.any(String),
    });
  });

  it("delegates prepared cancellation to the catalog boundary", async () => {
    const runId = "run-cancel-prepared";
    metadataByRunId.set(runId, buildMetadata(memoryDir, runId));
    const service = buildService();

    const result = await service.cancelPreparedAgentRun(runId);

    expect(result).toEqual({ success: true, message: "Run 'run-cancel-prepared' cancelled." });
    expect(historyCatalogService.cancelPreparedRun).toHaveBeenCalledWith(runId);
  });

  it("cleans up only expired prepared identities", async () => {
    const now = new Date("2026-05-18T12:00:00.000Z");
    const stale = buildMetadata(memoryDir, "run-stale", {
      preparedExpiresAt: "2026-05-18T11:59:00.000Z",
    });
    const fresh = buildMetadata(memoryDir, "run-fresh", {
      preparedExpiresAt: "2026-05-18T12:01:00.000Z",
    });
    const started = buildMetadata(memoryDir, "run-started", {
      preparedExpiresAt: "2026-05-18T11:00:00.000Z",
      startedAt: "2026-05-17T00:05:00.000Z",
    });
    for (const metadata of [stale, fresh, started]) {
      metadataByRunId.set(metadata.runId, metadata);
      await fs.mkdir(metadata.memoryDir, { recursive: true });
    }
    const service = buildService();

    const removed = await service.cleanupStalePreparedRuns(now);

    expect(removed).toBe(1);
    expect(historyCatalogService.cancelPreparedRun).toHaveBeenCalledTimes(1);
    expect(historyCatalogService.cancelPreparedRun).toHaveBeenCalledWith("run-stale");
  });
});
