import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { SkillAccessMode } from "autobyteus-ts/agent/context/skill-access-mode.js";
import { RawTraceItem } from "autobyteus-ts/memory/models/raw-trace-item.js";
import { RunMemoryFileStore } from "autobyteus-ts/memory/store/run-memory-file-store.js";
import { AgentRunService } from "../../../src/agent-execution/services/agent-run-service.js";
import { StandaloneAgentRunLifecycleService } from "../../../src/agent-execution/services/standalone-agent-run-lifecycle-service.js";
import { AgentRunMetadataService } from "../../../src/run-history/services/agent-run-metadata-service.js";
import { AgentRunHistoryCatalogService } from "../../../src/run-history/services/agent-run-history-catalog-service.js";
import { AgentRunViewProjectionService } from "../../../src/run-history/services/agent-run-view-projection-service.js";
import { RuntimeKind } from "../../../src/runtime-management/runtime-kind-enum.js";
import { AgentRunConfig } from "../../../src/agent-execution/domain/agent-run-config.js";
import { AgentRunActivationCandidate } from "../../../src/agent-execution/services/agent-run-activation-candidate.js";

const tempDirs = new Set<string>();

const createTempMemoryDir = async (): Promise<string> => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "memory-layout-projection-"));
  tempDirs.add(dir);
  return dir;
};

const readJson = async (filePath: string): Promise<Record<string, unknown>> =>
  JSON.parse(await fs.readFile(filePath, "utf-8")) as Record<string, unknown>;

const createActiveRun = (input: {
  runId: string;
  runtimeKind: RuntimeKind;
  platformAgentRunId: string | null;
  memoryDir?: string | null;
}) => ({
  runId: input.runId,
  runtimeKind: input.runtimeKind,
  config: {
    memoryDir: input.memoryDir ?? null,
  },
  getPlatformAgentRunId: vi.fn().mockReturnValue(input.platformAgentRunId),
  terminate: vi.fn().mockResolvedValue({ accepted: true }),
});

afterEach(async () => {
  vi.clearAllMocks();
  await Promise.all(
    Array.from(tempDirs).map((dir) => fs.rm(dir, { recursive: true, force: true })),
  );
  tempDirs.clear();
});

describe("memory layout and projection integration", () => {
  it.each([
    [RuntimeKind.AUTOBYTEUS, "native-agent-1"],
    [RuntimeKind.CODEX_APP_SERVER, "thread-agent-1"],
    [RuntimeKind.CLAUDE_AGENT_SDK, "session-agent-1"],
  ] as const)(
    "writes current single-agent metadata and history index files for %s",
    async (runtimeKind, platformAgentRunId) => {
      const memoryDir = await createTempMemoryDir();
      const workspaceRootPath = `/tmp/${runtimeKind}-workspace`;
      const allocatedRunId = `projection_agent_${runtimeKind}_${"1".repeat(32)}`;
      const agentRunManager = {
        prepareNewAgentRun: vi.fn().mockImplementation(({ config, runId }: {
          config: AgentRunConfig;
          runId: string;
        }) => Promise.resolve(new AgentRunActivationCandidate({
          runId,
          runtimeKind,
          platformAgentRunId,
          publish: () => createActiveRun({
            runId,
            runtimeKind,
            platformAgentRunId,
            memoryDir: config.memoryDir,
          }) as never,
          abort: async () => ({ kind: "aborted" }),
        }))),
        getActiveRun: vi.fn().mockReturnValue(null),
        restoreAgentRun: vi.fn(),
        hasActiveRun: vi.fn().mockReturnValue(false),
      };
      const metadataService = new AgentRunMetadataService(memoryDir);
      const historyCatalogService = new AgentRunHistoryCatalogService(memoryDir, {
        agentDefinitionService: {
          getAgentDefinitionById: vi.fn().mockResolvedValue({ name: "Projection Agent" }),
        } as never,
        agentRunManager: {
          getActiveRun: vi.fn().mockReturnValue(null),
          hasActiveRun: vi.fn().mockReturnValue(false),
          listActiveRuns: vi.fn().mockReturnValue([]),
        } as never,
      });
      const workspaceManager = {
        ensureWorkspaceByRootPath: vi.fn().mockResolvedValue({
          workspaceId: "workspace-1",
          getBasePath: () => workspaceRootPath,
        }),
        getWorkspaceById: vi.fn().mockReturnValue({
          getBasePath: () => workspaceRootPath,
        }),
      } as never;
      const lifecycleService = new StandaloneAgentRunLifecycleService(memoryDir, {
        agentRunManager: agentRunManager as never,
        metadataService,
        historyCatalogService,
        workspaceManager,
        tokenUsageReadiness: {
          assertCurrentSchemaReady: vi.fn(),
          assertExistingRunRestoreReady: vi.fn(),
        },
        modelConfigValidator: {
          validate: async ({ llmConfig }) => ({ kind: "valid", config: llmConfig as Readonly<Record<string, unknown>> | null }),
        },
      });
      const service = new AgentRunService(memoryDir, {
        agentRunManager: agentRunManager as never,
        metadataService,
        historyCatalogService,
        workspaceManager,
        lifecycleService,
        agentDefinitionService: {
          getFreshAgentDefinitionById: vi.fn().mockResolvedValue({
            name: "Projection Agent",
            role: "Tester",
          }),
        } as never,
        agentRunIdentityAllocator: {
          allocateForAgentDefinition: vi.fn().mockResolvedValue(allocatedRunId),
        },
      });

      const created = await service.createAgentRun({
        agentDefinitionId: "agent-def-1",
        workspaceRootPath,
        llmModelIdentifier: "model-1",
        autoExecuteTools: true,
        llmConfig: { temperature: 0.1 },
        skillAccessMode: SkillAccessMode.NONE,
        runtimeKind,
      });

      const runId = created.runId;
      const metadataPath = path.join(memoryDir, "agents", runId, "run_metadata.json");
      const indexPath = path.join(memoryDir, "run_history_index.json");
      const metadata = await readJson(metadataPath);
      const index = await readJson(indexPath);
      const rows = Array.isArray(index) ? index : [];
      const row = rows.find(
        (candidate) => candidate && typeof candidate === "object" && (candidate as { runId?: string }).runId === runId,
      ) as Record<string, unknown> | undefined;

      expect(metadata.runtimeKind).toBe(runtimeKind);
      expect(metadata.memoryDir).toBe(path.join(memoryDir, "agents", runId));
      expect(metadata.platformAgentRunId).toBe(platformAgentRunId);
      expect(metadata.workspaceRootPath).toBe(workspaceRootPath);
      expect(row).toBeTruthy();
      expect(row).not.toHaveProperty("lastKnownStatus");
      expect(row).not.toHaveProperty("lastActivityAt");
      expect(row?.createdAt).toEqual(expect.any(String));
      expect(row?.workspaceRootPath).toBe(workspaceRootPath);
    },
  );

  it.each([
    [RuntimeKind.AUTOBYTEUS, null],
    [RuntimeKind.CODEX_APP_SERVER, "thread-agent-projection"],
    [RuntimeKind.CLAUDE_AGENT_SDK, "session-agent-projection"],
  ] as const)(
    "builds a single-agent %s projection from the local replay memory layout",
    async (runtimeKind, platformAgentRunId) => {
    const memoryDir = await createTempMemoryDir();
    const runId = `agent-projection-run-${runtimeKind}`;
    const runDir = path.join(memoryDir, "agents", runId);
    await fs.mkdir(runDir, { recursive: true });
    await fs.writeFile(
      path.join(runDir, "run_metadata.json"),
      JSON.stringify({
        runId,
        agentDefinitionId: "agent-def-1",
        workspaceRootPath: "/tmp/agent-projection-workspace",
        memoryDir: runDir,
        llmModelIdentifier: "model-1",
        llmConfig: null,
        autoExecuteTools: true,
        skillAccessMode: SkillAccessMode.NONE,
        runtimeKind,
        platformAgentRunId,
      }),
      "utf-8",
    );
    const runStore = new RunMemoryFileStore(runDir);
    runStore.appendRawTrace(new RawTraceItem({
      id: "rt-archived-user",
      traceType: "user",
      sourceEvent: "AgentRun.postUserMessage",
      content: "hello from archived user",
      ts: 1,
      turnId: "turn-1",
      seq: 1,
    }));
    runStore.appendRawTrace(new RawTraceItem({
      id: "rt-boundary",
      traceType: "provider_compaction_boundary",
      sourceEvent: "COMPACTION_BOUNDARY",
      content: "",
      ts: 1.5,
      turnId: "turn-1",
      seq: 2,
      toolResult: { provider: "codex", rotation_eligible: true },
    }));
    runStore.rotateActiveRawTracesBeforeBoundary({
      boundaryType: "provider_compaction_boundary",
      boundaryKey: "codex:thread-1:projection-boundary",
      boundaryTraceId: "rt-boundary",
      runtimeKind: RuntimeKind.CODEX_APP_SERVER,
      sourceEvent: "COMPACTION_BOUNDARY",
    });
    runStore.appendRawTrace(new RawTraceItem({
      id: "rt-active-assistant",
      traceType: "assistant",
      sourceEvent: "SEGMENT_END",
      content: "hello from active assistant",
      ts: 2,
      turnId: "turn-1",
      seq: 3,
    }));
    const service = new AgentRunViewProjectionService(memoryDir);
    const projection = await service.getProjection(runId);

    expect(projection.runId).toBe(runId);
    expect(runStore.readRawTraceArchiveManifest().segments).toHaveLength(1);
    expect(runStore.listTurnRawTracesOrdered().map((trace) => trace.id)).toEqual([
      "rt-boundary",
      "rt-active-assistant",
    ]);
    expect(projection.summary).toBeNull();
    expect(projection.conversation).toHaveLength(1);
    expect(projection.activities).toEqual([
      expect.objectContaining({
        kind: "compaction",
        activityId: "compaction:boundary:rt-boundary",
        phase: "completed",
        provider: "codex",
      }),
    ]);
    expect(projection.conversation[0]?.content).toBe("hello from active assistant");
    expect(projection.lastActivityAt).toBe("1970-01-01T00:00:02.000Z");
    },
  );

});
