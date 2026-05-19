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
  lastKnownStatus: "IDLE",
  activationState: "PREPARED",
  preparedAt: "2026-05-17T00:00:00.000Z",
  preparedExpiresAt: "2026-05-18T00:00:00.000Z",
  applicationExecutionContext: null,
  archivedAt: null,
  ...overrides,
});

describe("AgentRunProvisioningService", () => {
  let memoryDir: string;
  let metadataByRunId: Map<string, AgentRunMetadata>;
  let metadataService: {
    writeMetadata: ReturnType<typeof vi.fn>;
    readMetadata: ReturnType<typeof vi.fn>;
  };
  let historyIndexService: {
    recordRunCreated: ReturnType<typeof vi.fn>;
    recordRunRestored: ReturnType<typeof vi.fn>;
    recordRunActivity: ReturnType<typeof vi.fn>;
    removeRow: ReturnType<typeof vi.fn>;
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
    memoryDir = await fs.mkdtemp(path.join(os.tmpdir(), "agent-run-provisioning-"));
    metadataByRunId = new Map();
    metadataService = {
      writeMetadata: vi.fn(async (runId: string, metadata: AgentRunMetadata) => {
        metadataByRunId.set(runId, metadata);
        await fs.mkdir(metadata.memoryDir, { recursive: true });
      }),
      readMetadata: vi.fn(async (runId: string) => metadataByRunId.get(runId) ?? null),
    };
    historyIndexService = {
      recordRunCreated: vi.fn().mockResolvedValue(undefined),
      recordRunRestored: vi.fn().mockResolvedValue(undefined),
      recordRunActivity: vi.fn().mockResolvedValue(undefined),
      removeRow: vi.fn().mockResolvedValue(undefined),
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

  const buildService = () => new AgentRunProvisioningService(memoryDir, {
    agentRunManager: agentRunManager as any,
    metadataService: metadataService as any,
    historyIndexService: historyIndexService as any,
    workspaceManager: workspaceManager as any,
    agentDefinitionService: { getFreshAgentDefinitionById: vi.fn() } as any,
  });

  it("prepares a standalone run identity without creating an active runtime", async () => {
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
    expect(metadataByRunId.get(result.runId)).toMatchObject({
      runId: result.runId,
      activationState: "PREPARED",
      platformAgentRunId: null,
      lastKnownStatus: "IDLE",
      runtimeKind: RuntimeKind.CODEX_APP_SERVER,
    });
    expect(historyIndexService.recordRunCreated).toHaveBeenCalledWith(expect.objectContaining({
      runId: result.runId,
      summary: "first message",
      lastKnownStatus: "IDLE",
    }));
  });

  it("marks prepared activation failures and permits retry from ACTIVATION_FAILED", async () => {
    const runId = "run-activation-retry";
    const prepared = buildMetadata(memoryDir, runId);
    metadataByRunId.set(runId, prepared);
    const createdRun = {
      runtimeKind: RuntimeKind.CODEX_APP_SERVER,
      getPlatformAgentRunId: () => "platform-run-1",
    };
    agentRunManager.createAgentRun
      .mockRejectedValueOnce(new Error("runtime boot failed"))
      .mockResolvedValueOnce(createdRun);
    const service = buildService();

    await expect(service.activatePreparedRun(runId)).rejects.toThrow("runtime boot failed");
    expect(metadataByRunId.get(runId)).toMatchObject({
      activationState: "ACTIVATION_FAILED",
      lastKnownStatus: "ERROR",
      platformAgentRunId: null,
    });
    expect(historyIndexService.recordRunActivity).toHaveBeenCalledWith(expect.objectContaining({
      runId,
      lastKnownStatus: "ERROR",
    }));

    const retried = await service.activatePreparedRun(runId);

    expect(retried).toBe(createdRun);
    expect(agentRunManager.createAgentRun).toHaveBeenCalledTimes(2);
    expect(metadataByRunId.get(runId)).toMatchObject({
      activationState: "ACTIVATED",
      lastKnownStatus: "ACTIVE",
      platformAgentRunId: "platform-run-1",
    });
    expect(historyIndexService.recordRunRestored).toHaveBeenCalledWith(expect.objectContaining({
      runId,
      lastKnownStatus: "ACTIVE",
    }));
  });

  it("cancels an unactivated prepared run by removing history and memory", async () => {
    const runId = "run-cancel-prepared";
    const metadata = buildMetadata(memoryDir, runId);
    metadataByRunId.set(runId, metadata);
    await fs.mkdir(metadata.memoryDir, { recursive: true });
    await fs.writeFile(path.join(metadata.memoryDir, "run_metadata.json"), "{}", "utf8");
    const service = buildService();

    const result = await service.cancelPreparedAgentRun(runId);

    expect(result).toEqual({ success: true, message: "Prepared run cancelled." });
    expect(historyIndexService.removeRow).toHaveBeenCalledWith(runId);
    await expect(fs.stat(metadata.memoryDir)).rejects.toThrow();
  });

  it("cleans up only expired prepared identities", async () => {
    const now = new Date("2026-05-18T12:00:00.000Z");
    const stale = buildMetadata(memoryDir, "run-stale", {
      preparedExpiresAt: "2026-05-18T11:59:00.000Z",
    });
    const fresh = buildMetadata(memoryDir, "run-fresh", {
      preparedExpiresAt: "2026-05-18T12:01:00.000Z",
    });
    const failed = buildMetadata(memoryDir, "run-failed", {
      activationState: "ACTIVATION_FAILED",
      preparedExpiresAt: "2026-05-18T11:00:00.000Z",
    });
    for (const metadata of [stale, fresh, failed]) {
      metadataByRunId.set(metadata.runId, metadata);
      await fs.mkdir(metadata.memoryDir, { recursive: true });
    }
    const service = buildService();

    const removed = await service.cleanupStalePreparedRuns(now);

    expect(removed).toBe(1);
    expect(historyIndexService.removeRow).toHaveBeenCalledTimes(1);
    expect(historyIndexService.removeRow).toHaveBeenCalledWith("run-stale");
    await expect(fs.stat(stale.memoryDir)).rejects.toThrow();
    await expect(fs.stat(fresh.memoryDir)).resolves.toBeTruthy();
    await expect(fs.stat(failed.memoryDir)).resolves.toBeTruthy();
  });
});
