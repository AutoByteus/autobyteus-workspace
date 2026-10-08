import "reflect-metadata";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { createRequire } from "node:module";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import type { graphql as graphqlFn, GraphQLSchema } from "graphql";
import { RuntimeKind } from "../../../src/runtime-management/runtime-kind-enum.js";
import { AgentRunHistoryCatalogService } from "../../../src/run-history/services/agent-run-history-catalog-service.js";
import { TeamRunHistoryCatalogService } from "../../../src/run-history/services/team-run-history-catalog-service.js";
import { AgentRunHistoryIndexStore } from "../../../src/run-history/store/agent-run-history-index-store.js";
import { TeamRunHistoryIndexStore } from "../../../src/run-history/store/team-run-history-index-store.js";
import { AgentRunMetadataStore } from "../../../src/run-history/store/agent-run-metadata-store.js";
import type { AgentRunMetadata } from "../../../src/run-history/store/agent-run-metadata-types.js";
import { TeamRunExecutionTreeStore } from "../../../src/run-history/store/team-run-execution-tree-store.js";
import { TeamCommunicationV1Store } from "../../../src/services/team-communication/team-communication-v1-store.js";
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
    withInactiveHistoryMutation: vi.fn(async (teamRunId: string, operation: () => Promise<unknown>) =>
      teamRunId === "team-active" || teamRunId === "team-archived-active"
        ? { kind: "managed" as const }
        : { kind: "completed" as const, value: await operation() }),
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

// TypeGraphQL keeps one resolver instance per class, and resolvers capture their service in a field
// initializer. Hand them a stable delegate that reaches the current test's service.
const currentService = vi.hoisted(() => (key: "agentRunHistoryService" | "teamRunHistoryService" | "workspaceRunHistoryService") =>
  new Proxy({}, {
    get: (_target, property) => {
      const service = harness.services[key] as Record<PropertyKey, unknown> | null;
      if (!service) throw new Error(`${key} is not configured for this test.`);
      const value = service[property];
      return typeof value === "function" ? value.bind(service) : value;
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
    getAgentRunHistoryService: () => currentService("agentRunHistoryService"),
  };
});

vi.mock("../../../src/run-history/services/team-run-history-service.js", async () => {
  const actual = await vi.importActual<
    typeof import("../../../src/run-history/services/team-run-history-service.js")
  >("../../../src/run-history/services/team-run-history-service.js");

  return {
    ...actual,
    getTeamRunHistoryService: () => currentService("teamRunHistoryService"),
  };
});

vi.mock("../../../src/run-history/services/workspace-run-history-service.js", async () => {
  const actual = await vi.importActual<
    typeof import("../../../src/run-history/services/workspace-run-history-service.js")
  >("../../../src/run-history/services/workspace-run-history-service.js");

  return {
    ...actual,
    getWorkspaceRunHistoryService: () => currentService("workspaceRunHistoryService"),
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
    // Build once: TypeGraphQL appends argument metadata on every build, which shifts the
    // arguments of multi-argument resolvers from the second build in the same process on.
    schema = await buildGraphqlSchema();
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
      await new TeamCommunicationV1Store().write(teamDir, {
        schemaVersion: 1, rootTeamRunId: teamRun.teamRunId, messages: [],
      });
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

  describe("archiveStoredAgentRunGroup (group-header Archive all)", () => {
    const GROUP_AGENT = "agent-def-group";
    const OTHER_WORKSPACE_ROOT = "/tmp/autobyteus-archive-e2e-other-workspace";
    // Eight stored runs: the history listing (6 per agent) hides the two oldest.
    const GROUP_RUN_IDS = Array.from({ length: 8 }, (_, index) => `run-group-0${index + 1}`);
    const OTHER_WORKSPACE_RUN = "run-group-other-workspace";
    const PRE_ARCHIVED_GROUP_RUN = "run-group-pre-archived";
    const PRE_ARCHIVED_AT = "2026-05-02T09:00:00.000Z";

    const ARCHIVE_GROUP_MUTATION = `
      mutation ArchiveStoredAgentRunGroup($workspaceRootPath: String!, $agentDefinitionId: String!) {
        archiveStoredAgentRunGroup(workspaceRootPath: $workspaceRootPath, agentDefinitionId: $agentDefinitionId) {
          archivedRunIds
          activeRunIds
          failedRunIds
        }
      }
    `;

    type GroupResult = { archivedRunIds: string[]; activeRunIds: string[]; failedRunIds: string[] };

    const archiveGroup = async (workspaceRootPath: string, agentDefinitionId = GROUP_AGENT): Promise<GroupResult> =>
      (await execGraphql<{ archiveStoredAgentRunGroup: GroupResult }>(
        ARCHIVE_GROUP_MUTATION,
        { workspaceRootPath, agentDefinitionId },
      )).archiveStoredAgentRunGroup;

    const indexPath = () => path.join(memoryDir, "run_history_index.json");
    const readAgentIndex = async (): Promise<any[]> => JSON.parse(await fs.readFile(indexPath(), "utf-8"));
    const indexRow = (rows: any[], runId: string) => rows.find((row) => row.runId === runId);

    /** Listing exactly as the sidebar requests it (6 newest unarchived runs per agent per workspace). */
    const listAgentGroups = async (): Promise<Record<string, Record<string, string[]>>> => {
      const result = await execGraphql<{ listWorkspaceRunHistory: any[] }>(
        `
          query GroupArchiveListing {
            listWorkspaceRunHistory(limitPerAgent: 6) {
              workspaceRootPath
              agentDefinitions { agentDefinitionId runs { runId } }
            }
          }
        `,
      );
      return Object.fromEntries(result.listWorkspaceRunHistory.map((workspace: any) => [
        workspace.workspaceRootPath,
        Object.fromEntries(workspace.agentDefinitions.map((agent: any) => [
          agent.agentDefinitionId,
          agent.runs.map((run: any) => run.runId).sort(),
        ])),
      ]));
    };

    /** Runs a live runtime owns; `startedAfterCheck` runs become live only by the time the per-run guard looks. */
    const setLiveRuns = (live: string[], startedAfterCheck: string[] = []): void => {
      const active = new Set(["run-agent-active", ...live]);
      const guardActive = new Set([...active, ...startedAfterCheck]);
      harness.agentRunManager.hasActiveRun.mockImplementation((runId: string) => guardActive.has(runId));
      harness.agentRunManager.getActiveRun.mockImplementation((runId: string) => active.has(runId)
        ? { getStatusSnapshot: () => ({ status: "running", can_interrupt: false }) }
        : null);
      harness.agentRunManager.listActiveRuns.mockReturnValue([...active]);
    };

    /** Adds the group to the shared seed before any GraphQL call reads the catalog. */
    const seedAgentGroup = async (): Promise<void> => {
      const groupRows = [
        ...GROUP_RUN_IDS.map((runId, index) => ({
          runId,
          // One row stored with a trailing separator, as older rows may be; it is still part of the group.
          workspaceRootPath: index === 2 ? `${WORKSPACE_ROOT}/` : WORKSPACE_ROOT,
          createdAt: `2026-05-02T08:0${index}:00.000Z`,
          archivedAt: null as string | null,
        })),
        { runId: OTHER_WORKSPACE_RUN, workspaceRootPath: OTHER_WORKSPACE_ROOT, createdAt: "2026-05-02T08:30:00.000Z", archivedAt: null },
        { runId: PRE_ARCHIVED_GROUP_RUN, workspaceRootPath: WORKSPACE_ROOT, createdAt: "2026-05-01T07:00:00.000Z", archivedAt: PRE_ARCHIVED_AT },
      ];
      for (const row of groupRows) {
        await seedRunFile(path.join(memoryDir, "agents", row.runId), `group run ${row.runId}`);
        await agentMetadataStore.writeMetadata(row.runId, buildAgentMetadata(row.runId, memoryDir, {
          agentDefinitionId: GROUP_AGENT,
          workspaceRootPath: row.workspaceRootPath,
        }));
      }
      await new AgentRunHistoryIndexStore(memoryDir).writeIndex([
        ...await readAgentIndex(),
        ...groupRows.map((row) => ({
          runId: row.runId,
          agentDefinitionId: GROUP_AGENT,
          agentName: "Group Agent",
          workspaceRootPath: row.workspaceRootPath,
          summary: `group run ${row.runId}`,
          createdAt: row.createdAt,
          archivedAt: row.archivedAt,
          terminatedAt: null,
        })),
      ]);
    };

    beforeEach(async () => {
      await seedAgentGroup();
    });

    it("archives every stored run of the agent in that workspace, including runs hidden by the listing cap, and nothing else", async () => {
      const before = await listAgentGroups();
      expect(before[WORKSPACE_ROOT]?.[GROUP_AGENT]).toHaveLength(6);
      expect(before[WORKSPACE_ROOT]?.[GROUP_AGENT]).not.toContain("run-group-01");
      const otherAgentRows = (rows: any[]) => rows
        .filter((row) => row.agentDefinitionId !== GROUP_AGENT)
        .sort((a, b) => a.runId.localeCompare(b.runId));
      const otherAgentRowsBefore = otherAgentRows(await readAgentIndex());
      const otherAgentListedBefore = before[WORKSPACE_ROOT]?.["agent-def-e2e"];

      // The client may send the root with a trailing separator; it must still match canonically.
      const result = await archiveGroup(`${WORKSPACE_ROOT}/`);

      expect([...result.archivedRunIds].sort()).toEqual(GROUP_RUN_IDS);
      expect(result.activeRunIds).toEqual([]);
      expect(result.failedRunIds).toEqual([]);

      const index = await readAgentIndex();
      for (const runId of GROUP_RUN_IDS) {
        expect(indexRow(index, runId)?.archivedAt).toEqual(expect.any(String));
        await expect(fs.stat(path.join(memoryDir, "agents", runId, "raw_traces_active.jsonl"))).resolves.toBeTruthy();
        await expect(fs.stat(path.join(memoryDir, "agents", runId, "run_metadata.json"))).resolves.toBeTruthy();
      }
      expect(indexRow(index, OTHER_WORKSPACE_RUN)?.archivedAt).toBeNull();
      expect(indexRow(index, PRE_ARCHIVED_GROUP_RUN)?.archivedAt).toBe(PRE_ARCHIVED_AT);
      expect(otherAgentRows(index)).toEqual(otherAgentRowsBefore);

      const after = await listAgentGroups();
      expect(after[WORKSPACE_ROOT]?.[GROUP_AGENT]).toBeUndefined();
      expect(after[OTHER_WORKSPACE_ROOT]?.[GROUP_AGENT]).toEqual([OTHER_WORKSPACE_RUN]);
      expect(after[WORKSPACE_ROOT]?.["agent-def-e2e"]).toEqual(otherAgentListedBefore);
      expect(otherAgentListedBefore).toEqual(["run-agent-active", "run-agent-archive", "run-agent-visible"]);

      // A repeated request for a group that is already gone archives nothing and is not an error.
      expect(await archiveGroup(WORKSPACE_ROOT)).toEqual({ archivedRunIds: [], activeRunIds: [], failedRunIds: [] });
    });

    it("archives nothing while any run of the group is live, including one hidden by the cap, and archives all after they stop", async () => {
      setLiveRuns(["run-group-01", "run-group-08"]);
      const indexBefore = await fs.readFile(indexPath(), "utf-8");

      const blocked = await archiveGroup(WORKSPACE_ROOT);

      expect(blocked.archivedRunIds).toEqual([]);
      expect(blocked.failedRunIds).toEqual([]);
      expect([...blocked.activeRunIds].sort()).toEqual(["run-group-01", "run-group-08"]);
      expect(await fs.readFile(indexPath(), "utf-8")).toBe(indexBefore);
      expect((await listAgentGroups())[WORKSPACE_ROOT]?.[GROUP_AGENT]).toHaveLength(6);

      // Only the run hidden by the cap is still live: the server still refuses the whole group.
      setLiveRuns(["run-group-01"]);
      expect(await archiveGroup(WORKSPACE_ROOT)).toEqual({
        archivedRunIds: [], activeRunIds: ["run-group-01"], failedRunIds: [],
      });
      expect(await fs.readFile(indexPath(), "utf-8")).toBe(indexBefore);

      setLiveRuns([]);
      const archived = await archiveGroup(WORKSPACE_ROOT);
      expect([...archived.archivedRunIds].sort()).toEqual(GROUP_RUN_IDS);
      expect(archived.activeRunIds).toEqual([]);
      expect(archived.failedRunIds).toEqual([]);
      expect((await listAgentGroups())[WORKSPACE_ROOT]?.[GROUP_AGENT]).toBeUndefined();
    });

    it("reports a run that started after the running-run check as failed and archives the rest (AC-010)", async () => {
      setLiveRuns([], ["run-group-04"]);

      const result = await archiveGroup(WORKSPACE_ROOT);

      expect(result.activeRunIds).toEqual([]);
      expect(result.failedRunIds).toEqual(["run-group-04"]);
      expect([...result.archivedRunIds].sort()).toEqual(GROUP_RUN_IDS.filter((runId) => runId !== "run-group-04"));
      expect(indexRow(await readAgentIndex(), "run-group-04")?.archivedAt).toBeNull();
      expect((await listAgentGroups())[WORKSPACE_ROOT]?.[GROUP_AGENT]).toEqual(["run-group-04"]);
    });

    it("rejects an empty workspace root or agent definition id as a GraphQL error without writing anything", async () => {
      const treeBefore = await listRelativeFiles(memoryDir);
      const indexBefore = await fs.readFile(indexPath(), "utf-8");
      for (const variables of [
        { workspaceRootPath: "", agentDefinitionId: GROUP_AGENT },
        { workspaceRootPath: "   ", agentDefinitionId: GROUP_AGENT },
        { workspaceRootPath: WORKSPACE_ROOT, agentDefinitionId: "" },
        { workspaceRootPath: WORKSPACE_ROOT, agentDefinitionId: "  " },
      ]) {
        const result = await graphql({ schema, source: ARCHIVE_GROUP_MUTATION, variableValues: variables });
        expect(result.data).toBeNull();
        expect(result.errors?.[0]?.message).toBe("workspaceRootPath and agentDefinitionId are required.");
      }
      expect(await listRelativeFiles(memoryDir)).toEqual(treeBefore);
      expect(await fs.readFile(indexPath(), "utf-8")).toBe(indexBefore);
    });
  });
});
