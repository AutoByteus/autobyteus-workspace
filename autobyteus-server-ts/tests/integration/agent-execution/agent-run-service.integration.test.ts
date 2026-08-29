import { afterEach, describe, expect, it, vi } from "vitest";
import { SkillAccessMode } from "autobyteus-ts/agent/context/skill-access-mode.js";
import { AgentRunService } from "../../../src/agent-execution/services/agent-run-service.js";
import { AgentRunProvisioningService } from "../../../src/agent-execution/services/agent-run-provisioning-service.js";
import { StandaloneAgentRunLifecycleService } from "../../../src/agent-execution/services/standalone-agent-run-lifecycle-service.js";
import { RuntimeKind } from "../../../src/runtime-management/runtime-kind-enum.js";
import type { AgentRunMetadata } from "../../../src/run-history/store/agent-run-metadata-types.js";

const createActiveRun = (input: {
  runId: string;
  runtimeKind: RuntimeKind;
  platformAgentRunId?: string | null;
}) => ({
  runId: input.runId,
  runtimeKind: input.runtimeKind,
  config: { memoryDir: `/tmp/memory/agents/${input.runId}` },
  getPlatformAgentRunId: vi.fn(() => input.platformAgentRunId ?? null),
  isActive: vi.fn(() => true),
});

const createCandidate = (input: {
  runId: string;
  runtimeKind: RuntimeKind;
  platformAgentRunId: string | null;
}) => {
  const run = createActiveRun(input);
  return {
    run,
    candidate: {
      runId: input.runId,
      runtimeKind: input.runtimeKind,
      platformAgentRunId: input.platformAgentRunId,
      commitPublication: vi.fn(() => run),
      abort: vi.fn(async () => ({ kind: "aborted" as const })),
    },
  };
};

const createMetadata = (input: {
  runId: string;
  runtimeKind: RuntimeKind;
  workspaceRootPath?: string;
  platformAgentRunId?: string | null;
  startedAt?: string | null;
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
  preparedAt: "2026-08-17T20:00:00.000Z",
  preparedExpiresAt: null,
  startedAt: input.startedAt ?? null,
  applicationExecutionContext: null,
});

const createRunHistoryHarness = (initialMetadata: AgentRunMetadata[] = []) => {
  const metadataByRunId = new Map<string, AgentRunMetadata>(
    initialMetadata.map((metadata) => [metadata.runId, { ...metadata }]),
  );
  const metadataService = {
    writeMetadata: vi.fn(async (runId: string, metadata: AgentRunMetadata) => {
      metadataByRunId.set(runId, { ...metadata, runId });
    }),
    readMetadata: vi.fn(async (runId: string) => {
      const metadata = metadataByRunId.get(runId);
      return metadata ? { ...metadata } : null;
    }),
    readMetadataState: vi.fn(async (runId: string) => {
      const metadata = metadataByRunId.get(runId);
      return metadata
        ? { kind: "present" as const, metadata: { ...metadata } }
        : { kind: "missing" as const };
    }),
  };
  const historyCatalogService = {
    recordPreparedRun: vi.fn(async (input: { runId: string; metadata: AgentRunMetadata }) => {
      metadataByRunId.set(input.runId, { ...input.metadata, runId: input.runId });
    }),
    recordRunStarted: vi.fn(async (input: AgentRunMetadata) => {
      const metadata = metadataByRunId.get(input.runId);
      if (!metadata) return null;
      const updated: AgentRunMetadata = {
        ...metadata,
        runtimeKind: input.runtimeKind ?? metadata.runtimeKind,
        platformAgentRunId: input.platformAgentRunId,
        startedAt: input.startedAt ?? metadata.startedAt ?? new Date(0).toISOString(),
      };
      metadataByRunId.set(input.runId, updated);
      return { ...updated };
    }),
    recordRunSummary: vi.fn(async () => undefined),
    recordRunTerminated: vi.fn(async () => undefined),
  };
  return { metadataByRunId, metadataService, historyCatalogService };
};

const workspaceManager = (rootPath = "/tmp/project") => ({
  ensureWorkspaceByRootPath: vi.fn(async () => ({
    workspaceId: "workspace-123",
    getBasePath: () => rootPath,
  })),
  getWorkspaceById: vi.fn(),
});

const createLifecycleService = (
  memoryDir: string,
  agentRunManager: object,
  history: ReturnType<typeof createRunHistoryHarness>,
  workspaces: ReturnType<typeof workspaceManager>,
) => new StandaloneAgentRunLifecycleService(memoryDir, {
  agentRunManager: agentRunManager as never,
  metadataService: history.metadataService as never,
  historyCatalogService: history.historyCatalogService as never,
  workspaceManager: workspaces as never,
  tokenUsageReadiness: {
    assertCurrentSchemaReady: vi.fn(),
    assertExistingRunRestoreReady: vi.fn(),
  },
  modelConfigValidator: { validate: vi.fn() },
});

const unusedProvisioningService = (): AgentRunProvisioningService =>
  Object.create(AgentRunProvisioningService.prototype) as AgentRunProvisioningService;

afterEach(() => vi.clearAllMocks());

describe("AgentRunService integration", () => {
  it.each([
    [RuntimeKind.AUTOBYTEUS, "autobyteus", null],
    [RuntimeKind.CODEX_APP_SERVER, "codex_app_server", "thread-123"],
    [RuntimeKind.CLAUDE_AGENT_SDK, "claude_agent_sdk", "11111111-1111-4111-8111-111111111111"],
  ] as const)(
    "prepares, durably starts, and only then publishes a %s run",
    async (runtimeKind, runtimeKindInput, platformAgentRunId) => {
      const runId = `run-create-${runtimeKind}`;
      const { run, candidate } = createCandidate({ runId, runtimeKind, platformAgentRunId });
      const agentRunManager = {
        getActiveRun: vi.fn(() => null),
        hasActiveRun: vi.fn(() => false),
        prepareNewAgentRun: vi.fn(async () => candidate),
        prepareRestoreAgentRun: vi.fn(),
        prepareRestoreAgentRunFromPlatformState: vi.fn(),
      };
      const history = createRunHistoryHarness();
      const workspaces = workspaceManager();
      const service = new AgentRunService("/tmp/memory", {
        agentRunManager: agentRunManager as never,
        metadataService: history.metadataService as never,
        historyCatalogService: history.historyCatalogService as never,
        workspaceManager: workspaces as never,
        agentRunIdentityAllocator: {
          allocateForAgentDefinition: vi.fn(async () => runId),
        },
        lifecycleService: createLifecycleService(
          "/tmp/memory", agentRunManager, history, workspaces,
        ),
      });

      history.historyCatalogService.recordRunStarted.mockImplementationOnce(async (input: AgentRunMetadata) => {
        expect(candidate.commitPublication).not.toHaveBeenCalled();
        const current = history.metadataByRunId.get(input.runId)!;
        const updated = { ...current, ...input };
        history.metadataByRunId.set(input.runId, updated);
        return updated;
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

      expect(result).toEqual({ runId });
      expect(run.runId).toBe(runId);
      expect(workspaces.ensureWorkspaceByRootPath).toHaveBeenCalledWith("/tmp/project");
      expect(agentRunManager.prepareNewAgentRun).toHaveBeenCalledWith({
        runId,
        config: expect.objectContaining({
          runtimeKind,
          workspaceId: "workspace-123",
          memoryDir: `/tmp/memory/agents/${runId}`,
        }),
      });
      expect(history.metadataByRunId.get(runId)).toEqual(expect.objectContaining({
        runId,
        runtimeKind,
        platformAgentRunId,
        preparedAt: expect.any(String),
        startedAt: expect.any(String),
      }));
      expect(history.historyCatalogService.recordPreparedRun).toHaveBeenCalledWith(
        expect.objectContaining({
          runId,
          metadata: expect.objectContaining({ platformAgentRunId: null, startedAt: null }),
        }),
      );
      expect(candidate.commitPublication).toHaveBeenCalledOnce();
    },
  );

  it.each([
    [RuntimeKind.AUTOBYTEUS, "native-restore-1"],
    [RuntimeKind.CODEX_APP_SERVER, "thread-restore-1"],
    [RuntimeKind.CLAUDE_AGENT_SDK, "22222222-2222-4222-8222-222222222222"],
  ] as const)(
    "restores a started %s run through the correct exact continuation path",
    async (runtimeKind, persistedPlatformAgentRunId) => {
      const runId = `run-restore-${runtimeKind}`;
      const expectedPlatformAgentRunId = runtimeKind === RuntimeKind.AUTOBYTEUS
        ? null
        : persistedPlatformAgentRunId;
      const persisted = createMetadata({
        runId,
        runtimeKind,
        workspaceRootPath: `/tmp/${runtimeKind}`,
        platformAgentRunId: persistedPlatformAgentRunId,
        startedAt: "2026-08-17T20:05:00.000Z",
      });
      const { run, candidate } = createCandidate({
        runId,
        runtimeKind,
        platformAgentRunId: expectedPlatformAgentRunId,
      });
      const agentRunManager = {
        getActiveRun: vi.fn(() => null),
        hasActiveRun: vi.fn(() => false),
        prepareNewAgentRun: vi.fn(),
        prepareRestoreAgentRun: vi.fn(async () => candidate),
        prepareRestoreAgentRunFromPlatformState: vi.fn(async () => candidate),
      };
      const history = createRunHistoryHarness([persisted]);
      const workspaces = workspaceManager(persisted.workspaceRootPath);
      const service = new AgentRunService("/tmp/memory", {
        agentRunManager: agentRunManager as never,
        metadataService: history.metadataService as never,
        historyCatalogService: history.historyCatalogService as never,
        workspaceManager: workspaces as never,
        provisioningService: unusedProvisioningService(),
        lifecycleService: createLifecycleService(
          "/tmp/memory", agentRunManager, history, workspaces,
        ),
      });

      await expect(service.restoreAgentRun(runId)).resolves.toMatchObject({
        run,
        metadata: { platformAgentRunId: expectedPlatformAgentRunId },
      });
      if (runtimeKind === RuntimeKind.AUTOBYTEUS) {
        const restoredContext = agentRunManager.prepareRestoreAgentRun.mock.calls[0]?.[0];
        expect(restoredContext).toMatchObject({
          runId,
          config: expect.objectContaining({ workspaceId: "workspace-123", memoryDir: persisted.memoryDir }),
          runtimeContext: null,
        });
        expect(agentRunManager.prepareRestoreAgentRunFromPlatformState).not.toHaveBeenCalled();
      } else {
        expect(agentRunManager.prepareRestoreAgentRunFromPlatformState).toHaveBeenCalledWith({
          runId,
          config: expect.objectContaining({ workspaceId: "workspace-123", memoryDir: persisted.memoryDir }),
          platformAgentRunId: persistedPlatformAgentRunId,
        });
        expect(agentRunManager.prepareRestoreAgentRun).not.toHaveBeenCalled();
      }
      expect(agentRunManager.prepareNewAgentRun).not.toHaveBeenCalled();
      expect(candidate.commitPublication).toHaveBeenCalledOnce();
    },
  );

  it("returns an already-active run only when its durable metadata is present", async () => {
    const persisted = createMetadata({
      runId: "run-active",
      runtimeKind: RuntimeKind.AUTOBYTEUS,
      startedAt: "2026-08-17T20:05:00.000Z",
    });
    const activeRun = createActiveRun({ runId: persisted.runId, runtimeKind: persisted.runtimeKind });
    const history = createRunHistoryHarness([persisted]);
    const agentRunManager = { getActiveRun: vi.fn(() => activeRun) };
    const workspaces = workspaceManager();
    const service = new AgentRunService("/tmp/memory", {
      agentRunManager: agentRunManager as never,
      metadataService: history.metadataService as never,
      historyCatalogService: history.historyCatalogService as never,
      workspaceManager: workspaces as never,
      provisioningService: unusedProvisioningService(),
      lifecycleService: createLifecycleService(
        "/tmp/memory", agentRunManager, history, workspaces,
      ),
    });

    await expect(service.restoreAgentRun(persisted.runId)).resolves.toEqual({
      run: activeRun,
      metadata: persisted,
    });
  });

  it("terminates native and external active runs through the manager and records termination", async () => {
    const nativeRun = createActiveRun({ runId: "run-term-native", runtimeKind: RuntimeKind.AUTOBYTEUS });
    const externalRun = createActiveRun({ runId: "run-term-external", runtimeKind: RuntimeKind.CLAUDE_AGENT_SDK });
    const agentRunManager = {
      getActiveRun: vi.fn((runId: string) => runId === nativeRun.runId
        ? nativeRun
        : runId === externalRun.runId ? externalRun : null),
      terminateAgentRun: vi.fn(async () => true),
      hasActiveRun: vi.fn(() => false),
    };
    const history = createRunHistoryHarness();
    const workspaces = workspaceManager();
    const service = new AgentRunService("/tmp/memory", {
      agentRunManager: agentRunManager as never,
      metadataService: history.metadataService as never,
      historyCatalogService: history.historyCatalogService as never,
      workspaceManager: workspaces as never,
      provisioningService: unusedProvisioningService(),
      lifecycleService: createLifecycleService(
        "/tmp/memory", agentRunManager, history, workspaces,
      ),
    });

    await expect(service.terminateAgentRun(nativeRun.runId)).resolves.toMatchObject({
      success: true,
      route: "native",
      runtimeKind: RuntimeKind.AUTOBYTEUS,
    });
    await expect(service.terminateAgentRun(externalRun.runId)).resolves.toMatchObject({
      success: true,
      route: "runtime",
      runtimeKind: RuntimeKind.CLAUDE_AGENT_SDK,
    });
    expect(agentRunManager.terminateAgentRun).toHaveBeenCalledTimes(2);
    expect(history.historyCatalogService.recordRunTerminated).toHaveBeenCalledTimes(2);
  });

  it("returns not_found for a missing run or a manager-rejected termination", async () => {
    const deniedRun = createActiveRun({ runId: "run-denied", runtimeKind: RuntimeKind.CODEX_APP_SERVER });
    const history = createRunHistoryHarness();
    const agentRunManager = {
      getActiveRun: vi.fn((runId: string) => runId === deniedRun.runId ? deniedRun : null),
      terminateAgentRun: vi.fn(async () => false),
      hasActiveRun: vi.fn(() => false),
    };
    const workspaces = workspaceManager();
    const service = new AgentRunService("/tmp/memory", {
      agentRunManager: agentRunManager as never,
      metadataService: history.metadataService as never,
      historyCatalogService: history.historyCatalogService as never,
      workspaceManager: workspaces as never,
      provisioningService: unusedProvisioningService(),
      lifecycleService: createLifecycleService(
        "/tmp/memory", agentRunManager, history, workspaces,
      ),
    });

    await expect(service.terminateAgentRun("missing-run")).resolves.toMatchObject({
      success: false,
      route: "not_found",
      runtimeKind: null,
    });
    await expect(service.terminateAgentRun(deniedRun.runId)).resolves.toMatchObject({
      success: false,
      route: "not_found",
      runtimeKind: RuntimeKind.CODEX_APP_SERVER,
    });
    expect(history.historyCatalogService.recordRunTerminated).not.toHaveBeenCalled();
  });

  it("rejects unsupported runtime kinds before allocating or constructing a candidate", async () => {
    const history = createRunHistoryHarness();
    const allocateForAgentDefinition = vi.fn(async () => "unused");
    const agentRunManager = {
      getActiveRun: vi.fn(),
      hasActiveRun: vi.fn(() => false),
      prepareNewAgentRun: vi.fn(),
    };
    const workspaces = workspaceManager();
    const service = new AgentRunService("/tmp/memory", {
      agentRunManager: agentRunManager as never,
      metadataService: history.metadataService as never,
      historyCatalogService: history.historyCatalogService as never,
      workspaceManager: workspaces as never,
      agentRunIdentityAllocator: { allocateForAgentDefinition },
      lifecycleService: createLifecycleService(
        "/tmp/memory", agentRunManager, history, workspaces,
      ),
    });

    await expect(service.createAgentRun({
      agentDefinitionId: "agent-def-1",
      workspaceRootPath: "/tmp/project",
      llmModelIdentifier: "model-1",
      autoExecuteTools: true,
      skillAccessMode: SkillAccessMode.NONE,
      runtimeKind: "unsupported_runtime",
    })).rejects.toThrow("not supported");
    expect(allocateForAgentDefinition).not.toHaveBeenCalled();
    expect(agentRunManager.prepareNewAgentRun).not.toHaveBeenCalled();
  });
});
