import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { SkillAccessMode } from "autobyteus-ts/agent/context/skill-access-mode.js";
import { RawTraceItem } from "autobyteus-ts/memory/models/raw-trace-item.js";
import { RunMemoryFileStore } from "autobyteus-ts/memory/store/run-memory-file-store.js";
import { AgentRunService } from "../../../src/agent-execution/services/agent-run-service.js";
import { AgentRunMetadataService } from "../../../src/run-history/services/agent-run-metadata-service.js";
import { AgentRunHistoryIndexService } from "../../../src/run-history/services/agent-run-history-index-service.js";
import { AgentRunViewProjectionService } from "../../../src/run-history/services/agent-run-view-projection-service.js";
import { LocalMemoryRunViewProjectionProvider } from "../../../src/run-history/projection/providers/local-memory-run-view-projection-provider.js";
import { RuntimeKind } from "../../../src/runtime-management/runtime-kind-enum.js";
import { TeamRunService } from "../../../src/agent-team-execution/services/team-run-service.js";
import { TeamRunMetadataService } from "../../../src/run-history/services/team-run-metadata-service.js";
import { TeamRunHistoryIndexService } from "../../../src/run-history/services/team-run-history-index-service.js";
import { TeamMemberRunViewProjectionService } from "../../../src/run-history/services/team-member-run-view-projection-service.js";
import { TeamRunHistoryService } from "../../../src/run-history/services/team-run-history-service.js";
import { TeamMemberLocalRunProjectionReader } from "../../../src/run-history/services/team-member-local-run-projection-reader.js";
import { TeamRun } from "../../../src/agent-team-execution/domain/team-run.js";
import { TeamRunContext } from "../../../src/agent-team-execution/domain/team-run-context.js";
import { TeamRunConfig } from "../../../src/agent-team-execution/domain/team-run-config.js";
import type { TeamRunBackend } from "../../../src/agent-team-execution/backends/team-run-backend.js";
import type { TeamRunMetadata } from "../../../src/run-history/store/team-run-metadata-types.js";
import { AgentRunConfig } from "../../../src/agent-execution/domain/agent-run-config.js";
import { buildTeamMemberRunId } from "../../../src/run-history/utils/team-member-run-id.js";

const tempDirs = new Set<string>();

const createTempMemoryDir = async (): Promise<string> => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "memory-layout-projection-"));
  tempDirs.add(dir);
  return dir;
};

const readJson = async (filePath: string): Promise<Record<string, unknown>> =>
  JSON.parse(await fs.readFile(filePath, "utf-8")) as Record<string, unknown>;

const createLocalProjectionRegistry = (memoryDir: string) => {
  const provider = new LocalMemoryRunViewProjectionProvider(memoryDir);
  return {
    resolveProvider: () => provider,
    resolveFallbackProvider: () => provider,
  };
};

const createNullProjectionRegistry = () => ({
  resolveProvider: () => ({
    runtimeKind: RuntimeKind.AUTOBYTEUS,
    buildProjection: async () => null,
  }),
  resolveFallbackProvider: () => ({
    runtimeKind: RuntimeKind.AUTOBYTEUS,
    buildProjection: async () => null,
  }),
});

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

const createTeamRun = (input: {
  runId: string;
  runtimeKind: RuntimeKind;
  memberName: string;
  memberRouteKey: string;
  memberRunId: string;
  platformAgentRunId: string | null;
  workspaceId: string;
  workspaceRootPath: string;
}): TeamRun => {
  const config = new TeamRunConfig({
    teamDefinitionId: "team-def-1",
    runtimeKind: input.runtimeKind,
    memberConfigs: [
      {
        memberName: input.memberName,
        memberRouteKey: input.memberRouteKey,
        memberRunId: input.memberRunId,
        agentDefinitionId: "agent-def-1",
        llmModelIdentifier: "model-1",
        autoExecuteTools: true,
        skillAccessMode: SkillAccessMode.NONE,
        runtimeKind: input.runtimeKind,
        workspaceId: input.workspaceId,
        workspaceRootPath: input.workspaceRootPath,
        llmConfig: { temperature: 0.1 },
      },
    ],
  });

  const backend: TeamRunBackend = {
    runId: input.runId,
    runtimeKind: input.runtimeKind,
    getRuntimeContext: () => ({
      coordinatorMemberRouteKey: input.memberRouteKey,
      memberContexts: [
        {
          memberName: input.memberName,
          memberRouteKey: input.memberRouteKey,
          memberRunId: input.memberRunId,
          getPlatformAgentRunId: () => input.platformAgentRunId,
        },
      ],
    } as never),
    isActive: () => true,
    getStatus: () => "IDLE",
    subscribeToEvents: () => () => undefined,
    postMessage: vi.fn().mockResolvedValue({ accepted: true }),
    deliverInterAgentMessage: vi.fn().mockResolvedValue({ accepted: true }),
    approveToolInvocation: vi.fn().mockResolvedValue({ accepted: true }),
    interrupt: vi.fn().mockResolvedValue({ accepted: true }),
    terminate: vi.fn().mockResolvedValue({ accepted: true }),
  };

  return new TeamRun({
    context: new TeamRunContext({
      runId: input.runId,
      runtimeKind: input.runtimeKind,
      coordinatorMemberName: input.memberName,
      config,
      runtimeContext: backend.getRuntimeContext(),
    }),
    backend,
  });
};

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
      const runId = `run-${runtimeKind}-1`;

      const agentRunManager = {
        createAgentRun: vi.fn().mockResolvedValue(
          createActiveRun({
            runId,
            runtimeKind,
            platformAgentRunId,
            memoryDir: path.join(memoryDir, "agents", runId),
          }),
        ),
        getActiveRun: vi.fn().mockReturnValue(null),
        restoreAgentRun: vi.fn(),
        hasActiveRun: vi.fn().mockReturnValue(false),
      };
      const metadataService = new AgentRunMetadataService(memoryDir);
      const historyIndexService = new AgentRunHistoryIndexService(memoryDir, {
        agentDefinitionService: {
          getAgentDefinitionById: vi.fn().mockResolvedValue({ name: "Projection Agent" }),
        } as never,
        agentRunManager: {
          hasActiveRun: vi.fn().mockReturnValue(false),
          listActiveRuns: vi.fn().mockReturnValue([]),
        } as never,
      });
      const service = new AgentRunService(memoryDir, {
        agentRunManager: agentRunManager as never,
        metadataService,
        historyIndexService,
        workspaceManager: {
          ensureWorkspaceByRootPath: vi.fn().mockResolvedValue({
            workspaceId: "workspace-1",
            getBasePath: () => workspaceRootPath,
          }),
          getWorkspaceById: vi.fn().mockReturnValue({
            getBasePath: () => workspaceRootPath,
          }),
        } as never,
        agentDefinitionService: {
          getFreshAgentDefinitionById: vi.fn().mockResolvedValue({
            name: "Projection Agent",
            role: "Tester",
          }),
        } as never,
      });

      await service.createAgentRun({
        agentDefinitionId: "agent-def-1",
        workspaceRootPath,
        llmModelIdentifier: "model-1",
        autoExecuteTools: true,
        llmConfig: { temperature: 0.1 },
        skillAccessMode: SkillAccessMode.NONE,
        runtimeKind,
      });

      const metadataPath = path.join(memoryDir, "agents", runId, "run_metadata.json");
      const indexPath = path.join(memoryDir, "run_history_index.json");
      const metadata = await readJson(metadataPath);
      const index = await readJson(indexPath);
      const rows = Array.isArray(index.rows) ? index.rows : [];
      const row = rows.find(
        (candidate) => candidate && typeof candidate === "object" && (candidate as { runId?: string }).runId === runId,
      ) as Record<string, unknown> | undefined;

      expect(metadata.runtimeKind).toBe(runtimeKind);
      expect(metadata.memoryDir).toBe(path.join(memoryDir, "agents", runId));
      expect(metadata.platformAgentRunId).toBe(platformAgentRunId);
      expect(metadata.workspaceRootPath).toBe(workspaceRootPath);
      expect(row).toBeTruthy();
      expect(row?.lastKnownStatus).toBe("IDLE");
      expect(row?.workspaceRootPath).toBe(workspaceRootPath);
    },
  );

  it("builds a single-agent projection from the current on-disk memory layout", async () => {
    const memoryDir = await createTempMemoryDir();
    const runId = "agent-projection-run";
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
        runtimeKind: RuntimeKind.AUTOBYTEUS,
        platformAgentRunId: null,
        lastKnownStatus: "IDLE",
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
    const service = new AgentRunViewProjectionService(memoryDir, {
      providerRegistry: createLocalProjectionRegistry(memoryDir) as never,
    });
    const projection = await service.getProjection(runId);

    expect(projection.runId).toBe(runId);
    expect(runStore.readRawTraceArchiveManifest().segments).toHaveLength(1);
    expect(runStore.listRawTracesOrdered().map((trace) => trace.id)).toEqual([
      "rt-boundary",
      "rt-active-assistant",
    ]);
    expect(projection.summary).toBe("hello from archived user");
    expect(projection.conversation).toHaveLength(2);
    expect(projection.activities).toEqual([]);
    expect(projection.conversation[0]?.content).toBe("hello from archived user");
    expect(projection.conversation[1]?.content).toBe("hello from active assistant");
    expect(projection.lastActivityAt).toBe("1970-01-01T00:00:02.000Z");
  });

  it.each([
    [RuntimeKind.AUTOBYTEUS, "native-team-1"],
    [RuntimeKind.CODEX_APP_SERVER, "thread-team-1"],
    [RuntimeKind.CLAUDE_AGENT_SDK, "session-team-1"],
  ] as const)(
    "writes current team metadata and team history index files for %s",
    async (runtimeKind, platformAgentRunId) => {
      const memoryDir = await createTempMemoryDir();
      const workspaceRootPath = `/tmp/${runtimeKind}-team-workspace`;
      const teamRunId = `team-${runtimeKind}-1`;
      const memberRouteKey = "coordinator";
      const memberRunId = buildTeamMemberRunId(teamRunId, memberRouteKey);

      const run = createTeamRun({
        runId: teamRunId,
        runtimeKind,
        memberName: "Coordinator",
        memberRouteKey,
        memberRunId,
        platformAgentRunId,
        workspaceId: "workspace-1",
        workspaceRootPath,
      });

      const teamRunMetadataService = new TeamRunMetadataService(memoryDir);
      const teamRunHistoryIndexService = new TeamRunHistoryIndexService(memoryDir, {
        teamRunManager: {
          listActiveRuns: vi.fn().mockReturnValue([]),
          getActiveRun: vi.fn().mockReturnValue(null),
          getTeamRun: vi.fn().mockReturnValue(null),
        } as never,
      });

      const service = new TeamRunService({
        memoryDir,
        agentTeamRunManager: {
          createTeamRun: vi.fn().mockResolvedValue(run),
          restoreTeamRun: vi.fn(),
          getTeamRun: vi.fn().mockReturnValue(null),
          terminateTeamRun: vi.fn(),
        } as never,
        teamDefinitionService: {
          getDefinitionById: vi.fn().mockResolvedValue({
            coordinatorMemberName: "Coordinator",
            name: "Projection Team",
          }),
        } as never,
        teamRunMetadataService,
        teamRunHistoryIndexService,
        workspaceManager: {
          ensureWorkspaceByRootPath: vi.fn().mockResolvedValue({
            workspaceId: "workspace-1",
            getBasePath: () => workspaceRootPath,
          }),
          getWorkspaceById: vi.fn().mockReturnValue({
            getBasePath: () => workspaceRootPath,
          }),
        } as never,
      });

      await service.createTeamRun({
        teamDefinitionId: "team-def-1",
        memberConfigs: [
          {
            memberName: "Coordinator",
            memberRouteKey,
            agentDefinitionId: "agent-def-1",
            llmModelIdentifier: "model-1",
            autoExecuteTools: true,
            skillAccessMode: SkillAccessMode.NONE,
            runtimeKind,
            workspaceId: "workspace-1",
            workspaceRootPath,
            llmConfig: { temperature: 0.1 },
          },
        ],
      });

      const metadataPath = path.join(
        memoryDir,
        "agent_teams",
        teamRunId,
        "team_run_metadata.json",
      );
      const indexPath = path.join(memoryDir, "team_run_history_index.json");
      const metadata = (await readJson(metadataPath)) as unknown as TeamRunMetadata;
      const index = await readJson(indexPath);
      const rows = Array.isArray(index.rows) ? index.rows : [];
      const row = rows.find(
        (candidate) =>
          candidate &&
          typeof candidate === "object" &&
          (candidate as { teamRunId?: string }).teamRunId === teamRunId,
      ) as Record<string, unknown> | undefined;

      expect(metadata.teamRunId).toBe(teamRunId);
      expect(metadata.memberMetadata).toHaveLength(1);
      expect(metadata.memberMetadata[0]?.memberRunId).toBe(memberRunId);
      expect(metadata.memberMetadata[0]?.platformAgentRunId).toBe(platformAgentRunId);
      expect(metadata.memberMetadata[0]?.workspaceRootPath).toBe(workspaceRootPath);
      expect(row).toBeTruthy();
      expect(row?.lastKnownStatus).toBe("IDLE");
      expect(row?.workspaceRootPath).toBe(workspaceRootPath);
    },
  );

  it("builds a team member projection from the current team member memory layout", async () => {
    const memoryDir = await createTempMemoryDir();
    const teamRunId = "team-projection-run";
    const memberRouteKey = "coordinator";
    const memberRunId = buildTeamMemberRunId(teamRunId, memberRouteKey);
    const teamDir = path.join(memoryDir, "agent_teams", teamRunId);
    const memberDir = path.join(teamDir, memberRunId);
    await fs.mkdir(memberDir, { recursive: true });
    await fs.writeFile(
      path.join(teamDir, "team_run_metadata.json"),
      JSON.stringify({
        teamRunId,
        teamDefinitionId: "team-def-1",
        teamDefinitionName: "Projection Team",
        coordinatorMemberRouteKey: memberRouteKey,
        runVersion: 1,
        createdAt: "2026-03-29T00:00:00.000Z",
        updatedAt: "2026-03-29T00:00:00.000Z",
        memberMetadata: [
          {
            memberRouteKey,
            memberName: "Coordinator",
            memberRunId,
            runtimeKind: RuntimeKind.AUTOBYTEUS,
            platformAgentRunId: null,
            agentDefinitionId: "agent-def-1",
            llmModelIdentifier: "model-1",
            autoExecuteTools: true,
            skillAccessMode: SkillAccessMode.NONE,
            llmConfig: null,
            workspaceRootPath: "/tmp/team-projection-workspace",
          },
        ],
      }),
      "utf-8",
    );
    await fs.writeFile(
      path.join(memberDir, "raw_traces.jsonl"),
      [
        JSON.stringify({ trace_type: "user", content: "team hello", ts: 10 }),
        JSON.stringify({ trace_type: "assistant", content: "team reply", ts: 11 }),
      ].join("\n"),
      "utf-8",
    );

    const teamRunHistoryService = new TeamRunHistoryService(memoryDir, {
      teamRunManager: {
        getActiveRun: vi.fn().mockReturnValue(null),
      } as never,
    });
    const service = new TeamMemberRunViewProjectionService({
      teamRunHistoryService,
      projectionReader: new TeamMemberLocalRunProjectionReader(memoryDir),
      agentRunViewProjectionService: new AgentRunViewProjectionService(memoryDir, {
        providerRegistry: createNullProjectionRegistry() as never,
      }),
    });

    const projection = await service.getProjection(teamRunId, memberRouteKey);

    expect(projection.agentRunId).toBe(memberRunId);
    expect(projection.summary).toBe("team hello");
    expect(projection.conversation).toHaveLength(2);
    expect(projection.activities).toEqual([]);
    expect(projection.conversation[0]?.content).toBe("team hello");
    expect(projection.conversation[1]?.content).toBe("team reply");
    expect(projection.lastActivityAt).toBe("1970-01-01T00:00:11.000Z");
  });
});
