import "reflect-metadata";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { createRequire } from "node:module";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import type { graphql as graphqlFn, GraphQLSchema } from "graphql";
import { SkillAccessMode } from "autobyteus-ts/agent/context/skill-access-mode.js";
import { RuntimeKind } from "../../../src/runtime-management/runtime-kind-enum.js";
import { AgentRunHistoryCatalogService } from "../../../src/run-history/services/agent-run-history-catalog-service.js";
import { TeamRunHistoryCatalogService } from "../../../src/run-history/services/team-run-history-catalog-service.js";
import { AgentRunHistoryIndexStore } from "../../../src/run-history/store/agent-run-history-index-store.js";
import { TeamRunHistoryIndexStore } from "../../../src/run-history/store/team-run-history-index-store.js";
import { AgentRunMetadataStore } from "../../../src/run-history/store/agent-run-metadata-store.js";
import type { AgentRunMetadata } from "../../../src/run-history/store/agent-run-metadata-types.js";
import { TeamRunExecutionTreeStore } from "../../../src/run-history/store/team-run-execution-tree-store.js";
import { AgentMemoryLayout } from "../../../src/agent-memory/store/agent-memory-layout.js";
import { testAgentNode, testExecutionTree } from "../../fixtures/current-team-run-fixtures.js";
import { buildGraphqlSchema } from "../../../src/api/graphql/schema.js";
import { configureE2eStudioApplicationApiServices } from "../helpers/studio-application-api-services.js";

const harness = vi.hoisted(() => ({
  agentRunManager: {
    getActiveRun: vi.fn<(runId: string) => unknown | null>(),
    hasActiveRun: vi.fn<(runId: string) => boolean>(),
    listActiveRuns: vi.fn<() => string[]>(),
  },
  teamRunManager: {
    getManagedTeamRun: vi.fn<(teamRunId: string) => unknown | null>(),
    hasManagedTeamRun: vi.fn<(teamRunId: string) => boolean>(),
    getLifecycleSnapshot: vi.fn<(teamRunId: string) => {
      teamRunId: string;
      isActive: boolean;
    }>(),
  },
  services: {
    agentRunHistoryService: null as unknown,
    teamRunHistoryService: null as unknown,
    workspaceRunHistoryService: null as unknown,
  },
}));

vi.mock("../../../src/agent-execution/services/agent-run-manager.js", () => ({
  AgentRunManager: {
    getInstance: () => harness.agentRunManager,
  },
}));

vi.mock("../../../src/agent-team-execution/services/agent-team-run-manager.js", () => ({
  AgentTeamRunManager: {
    getInstance: () => harness.teamRunManager,
  },
}));

vi.mock("../../../src/agent-definition/services/agent-definition-service.js", () => ({
  AgentDefinitionService: {
    getInstance: () => ({
      getAgentDefinitionById: vi.fn(async (agentDefinitionId: string) => ({
        id: agentDefinitionId,
        name: agentDefinitionId === "agent-def-e2e" ? "E2E Agent" : agentDefinitionId,
      })),
    }),
  },
}));

vi.mock("../../../src/run-history/services/agent-run-history-service.js", async () => {
  const actual = await vi.importActual<
    typeof import("../../../src/run-history/services/agent-run-history-service.js")
  >("../../../src/run-history/services/agent-run-history-service.js");

  return {
    ...actual,
    getAgentRunHistoryService: () => harness.services.agentRunHistoryService,
  };
});

vi.mock("../../../src/run-history/services/team-run-history-service.js", async () => {
  const actual = await vi.importActual<
    typeof import("../../../src/run-history/services/team-run-history-service.js")
  >("../../../src/run-history/services/team-run-history-service.js");

  return {
    ...actual,
    getTeamRunHistoryService: () => harness.services.teamRunHistoryService,
  };
});

vi.mock("../../../src/run-history/services/workspace-run-history-service.js", async () => {
  const actual = await vi.importActual<
    typeof import("../../../src/run-history/services/workspace-run-history-service.js")
  >("../../../src/run-history/services/workspace-run-history-service.js");

  return {
    ...actual,
    getWorkspaceRunHistoryService: () => harness.services.workspaceRunHistoryService,
  };
});

const WORKSPACE_ROOT = "/tmp/autobyteus-archive-e2e-workspace";

const buildAgentMetadata = (
  runId: string,
  memoryDir: string,
  overrides: Partial<AgentRunMetadata> = {},
): AgentRunMetadata => ({
  runId,
  agentDefinitionId: "agent-def-e2e",
  workspaceRootPath: WORKSPACE_ROOT,
  memoryDir: path.join(memoryDir, "agents", runId),
  llmModelIdentifier: "model-e2e",
  llmConfig: null,
  autoExecuteTools: false,
  skillAccessMode: SkillAccessMode.PRELOADED_ONLY,
  runtimeKind: RuntimeKind.CODEX_APP_SERVER,
  platformAgentRunId: null,
  applicationExecutionContext: null,
  ...overrides,
});

const buildTeamExecutionTree = (
  teamRunId: string,
  archivedAt: string | null = null,
) => ({
  ...testExecutionTree({
    rootTeamRunId: teamRunId,
    rootTeamDefinitionId: "team-def-e2e",
    teamDefinitionName: "E2E Team",
    coordinatorAddress: "/coordinator",
    createdAt: "2026-05-01T08:00:00.000Z",
    children: [testAgentNode("/coordinator", {
      agentRunId: `${teamRunId}-member`,
      runtimeKind: RuntimeKind.AUTOBYTEUS,
      platformAgentRunId: null,
      agentDefinitionId: "agent-def-e2e",
      llmModelIdentifier: "model-e2e",
      autoExecuteTools: false,
      skillAccessMode: SkillAccessMode.NONE,
      llmConfig: null,
      workspaceRootPath: WORKSPACE_ROOT,
      applicationExecutionContext: null,
    })],
  }),
  archivedAt,
});

const seedRunFile = async (runDir: string, summary: string): Promise<void> => {
  await fs.mkdir(runDir, { recursive: true });
  await fs.writeFile(
    path.join(runDir, "raw_traces_active.jsonl"),
    `${JSON.stringify({ trace_type: "user", content: summary, ts: Date.now() })}\n`,
    "utf-8",
  );
  await fs.writeFile(
    path.join(runDir, "working_context_snapshot.json"),
    JSON.stringify({ summary }),
    "utf-8",
  );
};

const listRelativeFiles = async (root: string): Promise<string[]> => {
  const output: string[] = [];
  const visit = async (directory: string): Promise<void> => {
    let entries: Array<import("node:fs").Dirent>;
    try {
      entries = await fs.readdir(directory, { withFileTypes: true });
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") {
        return;
      }
      throw error;
    }
    for (const entry of entries) {
      const absolutePath = path.join(directory, entry.name);
      const relativePath = path.relative(root, absolutePath);
      if (entry.isDirectory()) {
        output.push(`${relativePath}/`);
        await visit(absolutePath);
      } else {
        output.push(relativePath);
      }
    }
  };
  await visit(root);
  return output.sort();
};

const flattenAgentRunIds = (history: any[]): string[] =>
  history.flatMap((workspace) =>
    workspace.agentDefinitions.flatMap((agent: any) =>
      agent.runs.map((run: any) => run.runId),
    ),
  );

const flattenTeamRunIds = (history: any[]): string[] =>
  history.flatMap((workspace) =>
    workspace.teamDefinitions.flatMap((team: any) =>
      team.runs.map((run: any) => run.teamRunId),
    ),
  );

describe("Archive run history GraphQL e2e", () => {
  let graphql: typeof graphqlFn;
  let memoryDir: string;
  let schema: GraphQLSchema;
  let agentMetadataStore: AgentRunMetadataStore;
  let teamExecutionTreeStore: TeamRunExecutionTreeStore;
  let memoryLayout: AgentMemoryLayout;
  let closeStudioServices: (() => void) | null = null;

  beforeAll(async () => {
    closeStudioServices = configureE2eStudioApplicationApiServices().close;
    const require = createRequire(import.meta.url);
    const typeGraphqlRoot = path.dirname(require.resolve("type-graphql"));
    const graphqlPath = require.resolve("graphql", { paths: [typeGraphqlRoot] });
    const graphqlModule = await import(graphqlPath);
    graphql = graphqlModule.graphql as typeof graphqlFn;
  });

  afterAll(() => closeStudioServices?.());

  beforeEach(async () => {
    vi.clearAllMocks();
    memoryDir = await fs.mkdtemp(path.join(os.tmpdir(), "archive-history-graphql-e2e-"));
    agentMetadataStore = new AgentRunMetadataStore(memoryDir);
    teamExecutionTreeStore = new TeamRunExecutionTreeStore();
    memoryLayout = new AgentMemoryLayout(memoryDir);

    harness.agentRunManager.hasActiveRun.mockImplementation(
      (runId: string) => runId === "run-agent-active",
    );
    harness.agentRunManager.getActiveRun.mockImplementation((runId: string) =>
      runId === "run-agent-active"
        ? {
            getStatusSnapshot: () => ({
              status: "running",
              can_interrupt: false,
            }),
          }
        : null,
    );
    harness.agentRunManager.listActiveRuns.mockReturnValue(["run-agent-active"]);
    harness.teamRunManager.getLifecycleSnapshot.mockImplementation((teamRunId: string) => ({
      teamRunId,
      isActive: teamRunId === "team-active" || teamRunId === "team-archived-active",
    }));
    harness.teamRunManager.getManagedTeamRun.mockImplementation((teamRunId: string) =>
      teamRunId === "team-active" || teamRunId === "team-archived-active"
        ? {
            teamRunId,
            getLeafAgentStatusSnapshots: () => [],
        }
        : null,
    );
    harness.teamRunManager.hasManagedTeamRun.mockImplementation(
      (teamRunId: string) =>
        teamRunId === "team-active" || teamRunId === "team-archived-active",
    );

    const { AgentRunHistoryService } = await import(
      "../../../src/run-history/services/agent-run-history-service.js"
    );
    const { TeamRunHistoryService } = await import(
      "../../../src/run-history/services/team-run-history-service.js"
    );
    const { WorkspaceRunHistoryService } = await import(
      "../../../src/run-history/services/workspace-run-history-service.js"
    );

    const teamIndexStore = new TeamRunHistoryIndexStore(memoryDir);
    const teamCatalogService = new TeamRunHistoryCatalogService(memoryDir, {
      indexStore: teamIndexStore,
      executionTreeStore: teamExecutionTreeStore,
      teamRunManager: harness.teamRunManager as any,
    });
    const agentCatalogService = new AgentRunHistoryCatalogService(memoryDir, {
      metadataStore: agentMetadataStore,
      agentRunManager: harness.agentRunManager as any,
      agentDefinitionService: {
        getAgentDefinitionById: async (agentDefinitionId: string) => ({
          name: agentDefinitionId === "agent-def-e2e" ? "E2E Agent" : agentDefinitionId,
        }),
      },
    });
    harness.services.agentRunHistoryService = new AgentRunHistoryService(memoryDir, {
      catalogService: agentCatalogService,
      metadataStore: agentMetadataStore,
    });
    harness.services.teamRunHistoryService = new TeamRunHistoryService(memoryDir, {
      executionTreeStore: teamExecutionTreeStore,
      catalogService: teamCatalogService,
      teamRunManager: harness.teamRunManager as any,
    });
    harness.services.workspaceRunHistoryService = new WorkspaceRunHistoryService({
      agentRunHistoryService: harness.services.agentRunHistoryService as any,
      teamRunHistoryService: harness.services.teamRunHistoryService as any,
    });

    await seedHistoryFiles();
    schema = await buildGraphqlSchema();
  });

  afterEach(async () => {
    await fs.rm(memoryDir, { recursive: true, force: true });
    harness.services.agentRunHistoryService = null;
    harness.services.teamRunHistoryService = null;
    harness.services.workspaceRunHistoryService = null;
  });

  const execGraphql = async <T>(
    source: string,
    variables?: Record<string, unknown>,
  ): Promise<T> => {
    const result = await graphql({
      schema,
      source,
      variableValues: variables,
    });
    if (result.errors?.length) {
      throw result.errors[0];
    }
    return result.data as T;
  };

  const queryHistory = async (): Promise<any[]> => {
    const result = await execGraphql<{
      listWorkspaceRunHistory: any[];
    }>(
      `
        query ArchiveHistoryList($limitPerAgent: Int!) {
          listWorkspaceRunHistory(limitPerAgent: $limitPerAgent) {
            workspaceRootPath
            agentDefinitions {
              agentDefinitionId
              runs {
                runId
                createdAt
                archivedAt
                terminatedAt
                status
                isActive
                shouldConnectStream
                statusSource
              }
            }
            teamDefinitions {
              teamDefinitionId
              runs {
                teamRunId
                createdAt
                archivedAt
                terminatedAt
                isActive
                members {
                  agentRunId
                }
              }
            }
          }
        }
      `,
      { limitPerAgent: 10 },
    );
    return result.listWorkspaceRunHistory;
  };

  const seedHistoryFiles = async (): Promise<void> => {
    const agentRuns = [
      { runId: "run-agent-archive", summary: "archive this agent" },
      { runId: "run-agent-visible", summary: "visible agent" },
      { runId: "run-agent-active", summary: "active agent" },
      {
        runId: "run-agent-pre-archived",
        summary: "pre-archived agent",
        archivedAt: "2026-05-01T09:00:00.000Z",
      },
    ];
    for (const run of agentRuns) {
      await seedRunFile(path.join(memoryDir, "agents", run.runId), run.summary);
      await agentMetadataStore.writeMetadata(
        run.runId,
        buildAgentMetadata(run.runId, memoryDir),
      );
    }

    await new AgentRunHistoryIndexStore(memoryDir).writeIndex(
      agentRuns.map((run, index) => ({
        runId: run.runId,
        agentDefinitionId: "agent-def-e2e",
        agentName: "E2E Agent",
        workspaceRootPath: WORKSPACE_ROOT,
        summary: run.summary,
        createdAt: `2026-05-01T08:0${index}:00.000Z`,
        archivedAt: run.archivedAt ?? null,
        terminatedAt: null,
      })),
    );

    const teamRuns = [
      { teamRunId: "team-archive", summary: "archive this team" },
      { teamRunId: "team-visible", summary: "visible team" },
      { teamRunId: "team-active", summary: "active team" },
      {
        teamRunId: "team-archived-active",
        summary: "archived active team",
        archivedAt: "2026-05-01T09:05:00.000Z",
      },
    ];
    for (const teamRun of teamRuns) {
      const tree = buildTeamExecutionTree(teamRun.teamRunId, teamRun.archivedAt ?? null);
      const teamDir = memoryLayout.getTeamDirPath({
        rootTeamRunId: teamRun.teamRunId,
        ancestorTeamRunIds: [],
      });
      await seedRunFile(
        memoryLayout.getTeamAgentRunDirPath(
          { rootTeamRunId: teamRun.teamRunId, ancestorTeamRunIds: [] },
          `${teamRun.teamRunId}-member`,
        ),
        teamRun.summary,
      );
      expect((await teamExecutionTreeStore.write(teamDir, tree)).outcome).toBe("committed");
    }

    await new TeamRunHistoryIndexStore(memoryDir).writeIndex(
      teamRuns.map((teamRun, index) => ({
        teamRunId: teamRun.teamRunId,
        teamDefinitionId: "team-def-e2e",
        teamDefinitionName: "E2E Team",
        workspaceRootPath: WORKSPACE_ROOT,
        summary: teamRun.summary,
        createdAt: `2026-05-01T08:1${index}:00.000Z`,
        archivedAt: teamRun.archivedAt ?? null,
        terminatedAt: null,
      })),
    );
  };

  it("archives inactive agent and team runs and hides them from default history without deleting disk or index data", async () => {
    const beforeArchive = await queryHistory();
    expect(flattenAgentRunIds(beforeArchive)).toEqual(
      expect.arrayContaining([
        "run-agent-archive",
        "run-agent-visible",
        "run-agent-active",
      ]),
    );
    expect(flattenAgentRunIds(beforeArchive)).not.toContain("run-agent-pre-archived");
    expect(flattenTeamRunIds(beforeArchive)).toEqual(
      expect.arrayContaining([
        "team-archive",
        "team-visible",
        "team-active",
        "team-archived-active",
      ]),
    );
    expect(flattenTeamRunIds(beforeArchive)).toHaveLength(4);

    const agentArchiveResult = await execGraphql<{
      archiveStoredRun: { success: boolean; message: string };
    }>(
      `
        mutation ArchiveStoredRun($runId: String!) {
          archiveStoredRun(runId: $runId) {
            success
            message
          }
        }
      `,
      { runId: "run-agent-archive" },
    );
    const teamArchiveResult = await execGraphql<{
      archiveStoredTeamRun: { success: boolean; message: string };
    }>(
      `
        mutation ArchiveStoredTeamRun($teamRunId: String!) {
          archiveStoredTeamRun(teamRunId: $teamRunId) {
            success
            message
          }
        }
      `,
      { teamRunId: "team-archive" },
    );

    expect(agentArchiveResult.archiveStoredRun).toEqual({
      success: true,
      message: "Run 'run-agent-archive' archived.",
    });
    expect(teamArchiveResult.archiveStoredTeamRun).toEqual({
      success: true,
      message: "Team run 'team-archive' archived.",
    });

    const archivedAgentMetadata = await agentMetadataStore.readMetadata("run-agent-archive");
    const archivedTeamTree = await teamExecutionTreeStore.read(
      memoryLayout.getTeamDirPath({ rootTeamRunId: "team-archive", ancestorTeamRunIds: [] }),
      "team-archive",
    );
    expect(archivedAgentMetadata).not.toHaveProperty("archivedAt");
    expect(archivedTeamTree?.archivedAt).toEqual(expect.any(String));

    await expect(
      fs.stat(path.join(memoryDir, "agents", "run-agent-archive", "run_metadata.json")),
    ).resolves.toBeTruthy();
    await expect(
      fs.stat(path.join(memoryDir, "agents", "run-agent-archive", "raw_traces_active.jsonl")),
    ).resolves.toBeTruthy();
    await expect(
      fs.stat(path.join(memoryDir, "agent_teams", "team-archive", "team_run_execution_tree.json")),
    ).resolves.toBeTruthy();
    await expect(
      fs.stat(
        path.join(
          memoryDir,
          "agent_teams",
          "team-archive",
          "team-archive-member",
          "raw_traces_active.jsonl",
        ),
      ),
    ).resolves.toBeTruthy();

    const agentIndex = JSON.parse(
      await fs.readFile(path.join(memoryDir, "run_history_index.json"), "utf-8"),
    );
    const teamIndex = JSON.parse(
      await fs.readFile(path.join(memoryDir, "team_run_history_index.json"), "utf-8"),
    );
    const archivedAgentRow = agentIndex.find((row: any) => row.runId === "run-agent-archive");
    expect(archivedAgentRow).toEqual(expect.objectContaining({
      archivedAt: expect.any(String),
      createdAt: "2026-05-01T08:00:00.000Z",
      terminatedAt: null,
    }));
    expect(archivedAgentRow).not.toHaveProperty("lastKnownStatus");
    expect(archivedAgentRow).not.toHaveProperty("lastActivityAt");
    expect(Array.isArray(teamIndex)).toBe(true);
    expect(teamIndex.map((row: any) => row.teamRunId)).toContain("team-archive");
    const archivedTeamRow = teamIndex.find((row: any) => row.teamRunId === "team-archive");
    expect(archivedTeamRow).toEqual(expect.objectContaining({
      archivedAt: expect.any(String),
      createdAt: "2026-05-01T08:00:00.000Z",
      terminatedAt: null,
    }));
    expect(archivedTeamRow).not.toHaveProperty("lastKnownStatus");
    expect(archivedTeamRow).not.toHaveProperty("lastActivityAt");
    expect(archivedTeamRow).not.toHaveProperty("deleteLifecycle");

    const afterArchive = await queryHistory();
    expect(flattenAgentRunIds(afterArchive)).not.toContain("run-agent-archive");
    expect(flattenTeamRunIds(afterArchive)).not.toContain("team-archive");
    expect(flattenAgentRunIds(afterArchive)).toEqual(
      expect.arrayContaining([
        "run-agent-visible",
        "run-agent-active",
      ]),
    );
    expect(flattenAgentRunIds(afterArchive)).not.toContain("run-agent-pre-archived");
    expect(flattenTeamRunIds(afterArchive)).toEqual(
      expect.arrayContaining([
        "team-visible",
        "team-active",
        "team-archived-active",
      ]),
    );
    const activeArchivedTeamRun = afterArchive
      .flatMap((workspace) => workspace.teamDefinitions)
      .flatMap((team) => team.runs)
      .find((run) => run.teamRunId === "team-archived-active");
    expect(activeArchivedTeamRun).toEqual(expect.objectContaining({
      isActive: true,
    }));
  });

  it("rejects active and unsafe archive IDs without writing archive state or creating files", async () => {
    const activeAgentBefore = await agentMetadataStore.readMetadata("run-agent-active");
    const activeTeamBefore = await teamExecutionTreeStore.read(
      memoryLayout.getTeamDirPath({ rootTeamRunId: "team-active", ancestorTeamRunIds: [] }),
      "team-active",
    );
    const treeBefore = await listRelativeFiles(memoryDir);

    const activeAgentResult = await execGraphql<{
      archiveStoredRun: { success: boolean; message: string };
    }>(
      `
        mutation ArchiveActiveRun($runId: String!) {
          archiveStoredRun(runId: $runId) {
            success
            message
          }
        }
      `,
      { runId: "run-agent-active" },
    );
    const activeTeamResult = await execGraphql<{
      archiveStoredTeamRun: { success: boolean; message: string };
    }>(
      `
        mutation ArchiveActiveTeamRun($teamRunId: String!) {
          archiveStoredTeamRun(teamRunId: $teamRunId) {
            success
            message
          }
        }
      `,
      { teamRunId: "team-active" },
    );

    expect(activeAgentResult.archiveStoredRun.success).toBe(false);
    expect(activeAgentResult.archiveStoredRun.message).toContain("Run is active");
    expect(activeTeamResult.archiveStoredTeamRun.success).toBe(false);
    expect(activeTeamResult.archiveStoredTeamRun.message).toContain("Team run is active");
    expect(await agentMetadataStore.readMetadata("run-agent-active")).toEqual(activeAgentBefore);
    expect(await teamExecutionTreeStore.read(
      memoryLayout.getTeamDirPath({ rootTeamRunId: "team-active", ancestorTeamRunIds: [] }),
      "team-active",
    )).toEqual(activeTeamBefore);

    for (const unsafeId of [
      "",
      "   ",
      "temp-run",
      "../outside",
      "/tmp/outside",
      "foo/bar",
      "foo\\bar",
      ".",
      "..",
    ]) {
      const agentResult = await execGraphql<{
        archiveStoredRun: { success: boolean; message: string };
      }>(
        `
          mutation ArchiveUnsafeRun($runId: String!) {
            archiveStoredRun(runId: $runId) {
              success
              message
            }
          }
        `,
        { runId: unsafeId },
      );
      const teamResult = await execGraphql<{
        archiveStoredTeamRun: { success: boolean; message: string };
      }>(
        `
          mutation ArchiveUnsafeTeamRun($teamRunId: String!) {
            archiveStoredTeamRun(teamRunId: $teamRunId) {
              success
              message
            }
          }
        `,
        { teamRunId: unsafeId },
      );

      expect(agentResult.archiveStoredRun.success).toBe(false);
      expect(teamResult.archiveStoredTeamRun.success).toBe(false);
      expect(await listRelativeFiles(memoryDir)).toEqual(treeBefore);
    }
  });
});
