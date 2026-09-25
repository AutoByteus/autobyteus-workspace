import "reflect-metadata";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createRequire } from "node:module";
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import type { graphql as graphqlFn, GraphQLSchema } from "graphql";
import { buildGraphqlSchema } from "../../../src/api/graphql/schema.js";
import { appConfigProvider } from "../../../src/config/app-config-provider.js";
import { assertAgentTeamAddress } from "../../../src/agent-collaboration/domain/agent-team-address.js";
import type { TaskDelegationRecordV1, TaskExecutionReference } from "../../../src/agent-collaboration/execution/task/task-delegation-record-v1.js";
import { AgentMemoryLayout } from "../../../src/agent-memory/store/agent-memory-layout.js";
import { AgentOrgCommunicationMessagesV1Store } from "../../../src/agent-org-execution/persistence/agent-org-communication-messages-v1-store.js";
import { AgentOrgTaskDelegationRecordsV1Store } from "../../../src/agent-org-execution/persistence/agent-org-task-delegation-records-v1-store.js";
import type { AgentOrgRunExecutionTreeSnapshot } from "../../../src/agent-org-execution/domain/agent-org-run-execution-tree.js";
import type { TeamRunExecutionTreeSnapshot } from "../../../src/agent-team-execution/domain/team-run-execution-tree.js";
import { TaskDelegationRecordsV1Store } from "../../../src/agent-team-execution/task-delegation/records/task-delegation-records-v1-store.js";
import { resetRootRunPackageReadinessIndex } from "../../../src/run-history/services/root-run-package-readiness-index.js";
import { resetTeamRunHistoryCatalogState } from "../../../src/run-history/services/team-run-history-catalog-service.js";
import { validateAgentOrgRunExecutionTreePayload } from "../../../src/run-history/store/agent-org-run-execution-tree-schema.js";
import { AgentOrgRunExecutionTreeStore } from "../../../src/run-history/store/agent-org-run-execution-tree-store.js";
import { AgentOrgRunHistoryIndexStore } from "../../../src/run-history/store/agent-org-run-history-index-store.js";
import { TeamRunExecutionTreeStore } from "../../../src/run-history/store/team-run-execution-tree-store.js";
import { TeamRunHistoryIndexStore } from "../../../src/run-history/store/team-run-history-index-store.js";
import { TeamCommunicationV1Store } from "../../../src/services/team-communication/team-communication-v1-store.js";
import { testAgentOrgExecutionTree, testOrgAgentNode, testOrgTeamNode } from "../../fixtures/current-agent-org-run-fixtures.js";
import { address, testAgentNode, testExecutionTree } from "../../fixtures/current-team-run-fixtures.js";

/**
 * Team and AgentOrg memory explorer + member memory view through the built GraphQL schema
 * (REQ-004…REQ-010; AC-003, AC-005…AC-011). Roots are admitted by the real package readiness index.
 */

const writeJsonl = (filePath: string, records: unknown[], mtimeIso: string) => {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, records.map((record) => JSON.stringify(record)).join("\n"), "utf-8");
  const at = new Date(mtimeIso);
  fs.utimesSync(filePath, at, at);
};

const semantic = (runDir: string, fact: string, mtimeIso: string) =>
  writeJsonl(path.join(runDir, "semantic.jsonl"), [{ id: fact, fact }], mtimeIso);

const activeTask = (taskId: string, delegatorAgentRunId: string, recipientAddress: string, taskExecution: TaskExecutionReference, createdAt: string): TaskDelegationRecordV1 => ({
  taskId,
  delegatorAgentRunId,
  recipientAddress: assertAgentTeamAddress(recipientAddress),
  taskExecution,
  description: `task ${taskId}`,
  referenceFiles: [],
  status: "active",
  updates: [],
  createdAt,
});

const writeTeamRoot = async (memoryRoot: string, tree: TeamRunExecutionTreeSnapshot, options: { sidecars?: boolean } = {}) => {
  const rootTeamRunId = tree.rootTeam.teamRunId;
  const packageDir = new AgentMemoryLayout(memoryRoot).getTeamDirPath({ rootTeamRunId, ancestorTeamRunIds: [] });
  await new TeamRunExecutionTreeStore().write(packageDir, tree);
  if (options.sidecars === false) return packageDir;
  const records = tree.rootTeam.taskExecutions.map((execution, index) =>
    activeTask(`${rootTeamRunId}-task-${index}`, `${rootTeamRunId}-writer`, execution.address, { agentRunId: (execution as { agentRunId: string }).agentRunId }, execution.startedAt));
  await new TaskDelegationRecordsV1Store().write(packageDir, { schemaVersion: 1, rootTeamRunId, records });
  await new TeamCommunicationV1Store().write(packageDir, { schemaVersion: 1, rootTeamRunId, messages: [] });
  return packageDir;
};

const writeOrgRoot = async (memoryRoot: string, tree: AgentOrgRunExecutionTreeSnapshot) => {
  const orgRunId = tree.rootOrg.orgRunId;
  const packageDir = new AgentMemoryLayout(memoryRoot).getOrgDirPath(orgRunId);
  await new AgentOrgRunExecutionTreeStore().write(packageDir, tree);
  const records = tree.rootOrg.taskExecutions.map((execution, index) =>
    activeTask(`${orgRunId}-task-${index}`, `${orgRunId}-ceo`, execution.address,
      "teamRunId" in execution ? { teamRunId: execution.teamRunId } : { agentRunId: execution.agentRunId }, execution.startedAt));
  await new AgentOrgTaskDelegationRecordsV1Store().write(packageDir, { schemaVersion: 1, subjectKind: "agent_org", orgRunId, records });
  await new AgentOrgCommunicationMessagesV1Store().write(packageDir, { schemaVersion: 1, subjectKind: "agent_org", orgRunId, messages: [] });
  return packageDir;
};

/** Writing team root: configured coordinator `/writer` plus its delegated task instance (flat Team V2 has no nested teams). */
const writingTeamTree = (rootTeamRunId: string, createdAt: string): TeamRunExecutionTreeSnapshot => {
  const base = testExecutionTree({
    rootTeamRunId,
    rootTeamDefinitionId: "gql-writing-team",
    teamDefinitionName: "Tree Writing Team",
    coordinatorAddress: "/writer",
    createdAt,
    children: [testAgentNode("/writer", { agentRunId: `${rootTeamRunId}-writer` })],
  });
  return {
    ...base,
    rootTeam: {
      ...base.rootTeam,
      taskExecutions: [{
        address: address("/writer"),
        agentRunId: `${rootTeamRunId}-task-writer`,
        platformAgentRunId: null,
        startedAt: createdAt,
        settledAt: null,
      }],
    },
  };
};

/**
 * Org root: `/ceo`, `/engineering/solution_designer` inside the configured team `/engineering`,
 * a delegated `/ceo` task instance, and a task execution of the configured team (its member is a task-team member).
 */
const orgTree = (orgRunId: string, orgDefinitionId: string): AgentOrgRunExecutionTreeSnapshot => {
  const designer = testOrgAgentNode("/engineering/solution_designer", `${orgRunId}-designer`);
  const base = testAgentOrgExecutionTree({
    orgRunId,
    orgDefinitionId,
    orgDefinitionName: "Tree Org Name",
    members: [
      testOrgAgentNode("/ceo", `${orgRunId}-ceo`),
      testOrgTeamNode({ address: "/engineering", teamRunId: `${orgRunId}-engineering`, coordinatorAddress: designer.address, members: [designer] }),
    ],
  });
  return validateAgentOrgRunExecutionTreePayload({
    ...base,
    rootOrg: {
      ...base.rootOrg,
      taskExecutions: [
        { address: assertAgentTeamAddress("/ceo"), agentRunId: `${orgRunId}-task-ceo`, platformAgentRunId: null, startedAt: "2026-09-01T00:01:00.000Z", settledAt: null },
        {
          address: assertAgentTeamAddress("/engineering"),
          teamRunId: `${orgRunId}-engineering-task`,
          members: [{ address: assertAgentTeamAddress("/engineering/solution_designer"), agentRunId: `${orgRunId}-task-team-designer`, platformAgentRunId: null }],
          taskExecutions: [],
          startedAt: "2026-09-01T00:02:00.000Z",
          settledAt: null,
        },
      ],
    },
  }, orgRunId);
};

const MEMBER_FIELDS = "memberAddress displayName agentRunId agentDefinitionId executionKind startedAt groupPath { teamRunId address displayName kind startedAt } lastUpdatedAt memory { hasSemantic }";

type Group = { teamRunId: string; address: string; displayName: string; kind: string; startedAt: string | null };
type Member = { memberAddress: string; displayName: string; agentRunId: string; agentDefinitionId: string | null; executionKind: string; startedAt: string | null; groupPath: Group[]; lastUpdatedAt: string | null };

describe("Memory collaboration (team + org) GraphQL e2e", () => {
  let schema: GraphQLSchema;
  let graphql: typeof graphqlFn;
  let tempRoot: string;
  let usingTemp = false;
  let memoryDir: string;
  const createdPaths: string[] = [];
  const config = appConfigProvider.config;

  const execGraphql = async <T>(query: string, variables?: Record<string, unknown>): Promise<T> => {
    const result = await graphql({ schema, source: query, variableValues: variables });
    if (result.errors?.length) throw result.errors[0];
    return result.data as T;
  };

  const teamDir = (...parts: string[]) => path.join(memoryDir, "agent_teams", ...parts);
  const orgDir = (...parts: string[]) => path.join(memoryDir, "agent_orgs", ...parts);

  beforeAll(async () => {
    tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "autobyteus-memory-collaboration-"));
    if (!config.isInitialized()) {
      config.setCustomAppDataDir(tempRoot);
      usingTemp = true;
    }
    memoryDir = config.getMemoryDir();

    // Team roots (admitted): two writing-team runs; the second has a task instance with memory.
    await writeTeamRoot(memoryDir, writingTeamTree("gql-team-run-1", "2026-08-14T00:00:00.000Z"));
    await writeTeamRoot(memoryDir, writingTeamTree("gql-team-run-2", "2026-08-15T00:00:00.000Z"));
    semantic(teamDir("gql-team-run-1", "gql-team-run-1-writer"), "team one", "2026-08-14T01:00:00.000Z");
    semantic(teamDir("gql-team-run-2", "gql-team-run-2-writer"), "team two", "2026-08-15T01:00:00.000Z");
    semantic(teamDir("gql-team-run-2", "gql-team-run-2-task-writer"), "team two task", "2026-08-15T02:00:00.000Z");
    // Team root with memory but without the strict sidecars: not admitted by the readiness index.
    await writeTeamRoot(memoryDir, writingTeamTree("gql-team-unadmitted", "2026-08-16T00:00:00.000Z"), { sidecars: false });
    semantic(teamDir("gql-team-unadmitted", "gql-team-unadmitted-writer"), "hidden", "2026-08-16T01:00:00.000Z");
    // Team root whose tree file is never valid.
    fs.mkdirSync(teamDir("gql-team-invalid"), { recursive: true });
    fs.writeFileSync(teamDir("gql-team-invalid", "team_run_execution_tree.json"), "{ not json", "utf-8");
    await new TeamRunHistoryIndexStore(memoryDir).writeIndex([
      { teamRunId: "gql-team-run-1", teamDefinitionId: "gql-writing-team", teamDefinitionName: "Writing Team", workspaceRootPath: "/tmp/gql-one", summary: "first draft", createdAt: "2026-08-14T00:00:00.000Z", archivedAt: null, terminatedAt: null },
      { teamRunId: "gql-team-run-2", teamDefinitionId: "gql-writing-team", teamDefinitionName: "Writing Team", workspaceRootPath: "/tmp/gql-two", summary: "second draft", createdAt: "2026-08-15T00:00:00.000Z", archivedAt: null, terminatedAt: null },
    ]);

    // Org roots (admitted): org-a has two runs with member memory; org-b has none.
    await writeOrgRoot(memoryDir, orgTree("gql-org-a-1", "gql-org-a"));
    await writeOrgRoot(memoryDir, orgTree("gql-org-a-2", "gql-org-a"));
    await writeOrgRoot(memoryDir, orgTree("gql-org-b-1", "gql-org-b"));
    semantic(orgDir("gql-org-a-1", "gql-org-a-1-ceo"), "org ceo", "2026-09-01T01:00:00.000Z");
    semantic(orgDir("gql-org-a-1", "gql-org-a-1-engineering", "gql-org-a-1-designer"), "org designer", "2026-09-01T02:00:00.000Z");
    semantic(orgDir("gql-org-a-1", "gql-org-a-1-task-ceo"), "org task ceo", "2026-09-01T03:00:00.000Z");
    semantic(orgDir("gql-org-a-1", "gql-org-a-1-engineering-task", "gql-org-a-1-task-team-designer"), "org task team member", "2026-09-01T04:00:00.000Z");
    semantic(orgDir("gql-org-a-2", "gql-org-a-2-ceo"), "org second run", "2026-09-02T01:00:00.000Z");
    await new AgentOrgRunHistoryIndexStore(memoryDir).writeIndex([
      { orgRunId: "gql-org-a-1", orgDefinitionId: "gql-org-a", orgDefinitionName: "Alpha Org", workspaceRootPath: "/tmp/alpha", summary: "first alpha run", createdAt: "2026-09-01T00:00:00.000Z", archivedAt: null, terminatedAt: null },
      { orgRunId: "gql-org-a-2", orgDefinitionId: "gql-org-a", orgDefinitionName: "Alpha Org", workspaceRootPath: null, summary: "", createdAt: "2026-09-02T00:00:00.000Z", archivedAt: null, terminatedAt: null },
    ]);
    createdPaths.push(
      ...["gql-team-run-1", "gql-team-run-2", "gql-team-unadmitted", "gql-team-invalid", "gql-team-corrupt-later"].map((id) => teamDir(id)),
      ...["gql-org-a-1", "gql-org-a-2", "gql-org-b-1"].map((id) => orgDir(id)),
      path.join(memoryDir, "imports", "gql-collab-import"),
    );
    resetRootRunPackageReadinessIndex(memoryDir);
    resetTeamRunHistoryCatalogState(memoryDir);

    schema = await buildGraphqlSchema();
    const require = createRequire(import.meta.url);
    const typeGraphqlRoot = path.dirname(require.resolve("type-graphql"));
    const graphqlPath = require.resolve("graphql", { paths: [typeGraphqlRoot] });
    graphql = (await import(graphqlPath)).graphql as typeof graphqlFn;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  afterAll(() => {
    resetRootRunPackageReadinessIndex(memoryDir);
    resetTeamRunHistoryCatalogState(memoryDir);
    for (const createdPath of createdPaths) fs.rmSync(createdPath, { recursive: true, force: true });
    if (usingTemp) fs.rmSync(tempRoot, { recursive: true, force: true });
  });

  const teamsQuery = `
    query Teams($search: String, $source: MemoryExplorerSourceInput) {
      listAgentTeamsWithMemory(search: $search, source: $source, page: 1, pageSize: 10) {
        total
        entries { teamDefinitionId teamDefinitionName teamRunCount memberMemoryCount latestMemoryAt memory { hasSemantic } }
      }
    }
  `;
  const teamRunsQuery = `
    query TeamRuns($id: String!, $search: String, $page: Int!, $pageSize: Int!) {
      listAgentTeamRunsWithMemory(teamDefinitionId: $id, search: $search, page: $page, pageSize: $pageSize) {
        total page totalPages
        entries { teamRunId teamDefinitionName summary workspaceRootPath createdAt lastUpdatedAt memberTargets { ${MEMBER_FIELDS} } }
      }
    }
  `;
  const orgsQuery = `
    query Orgs($search: String, $source: MemoryExplorerSourceInput) {
      listAgentOrgsWithMemory(search: $search, source: $source, page: 1, pageSize: 10) {
        total totalPages
        entries { orgDefinitionId orgDefinitionName orgRunCount memberMemoryCount latestMemoryAt memory { hasSemantic hasRawTraces } }
      }
    }
  `;
  const orgRunsQuery = `
    query OrgRuns($id: String!, $search: String, $page: Int!, $pageSize: Int!) {
      listAgentOrgRunsWithMemory(orgDefinitionId: $id, search: $search, page: $page, pageSize: $pageSize) {
        total page totalPages
        entries { orgRunId orgDefinitionId orgDefinitionName summary workspaceRootPath createdAt lastUpdatedAt memberTargets { ${MEMBER_FIELDS} } }
      }
    }
  `;
  const teamMemberViewQuery = `
    query TeamMemberView($teamRunId: String!, $agentRunId: String!) {
      getTeamMemberRunMemoryView(teamRunId: $teamRunId, agentRunId: $agentRunId, includeWorkingContext: false, includeEpisodic: false) {
        runId semantic
      }
    }
  `;
  const orgMemberViewQuery = `
    query OrgMemberView($orgRunId: String!, $agentRunId: String!) {
      getAgentOrgMemberRunMemoryView(orgRunId: $orgRunId, agentRunId: $agentRunId, includeWorkingContext: false, includeEpisodic: false) {
        runId semantic
      }
    }
  `;

  type TeamRunsData = { listAgentTeamRunsWithMemory: { total: number; page: number; totalPages: number; entries: Array<{ teamRunId: string; memberTargets: Member[] } & Record<string, unknown>> } };
  type OrgRunsData = { listAgentOrgRunsWithMemory: { total: number; page: number; totalPages: number; entries: Array<{ orgRunId: string; memberTargets: Member[] } & Record<string, unknown>> } };
  type ViewData<K extends string> = Record<K, { runId: string; semantic: Array<{ fact: string }> | null }>;

  it("lists admitted team roots only, grouped by definition, with the catalog name (AC-005, AC-003)", async () => {
    const data = await execGraphql<{ listAgentTeamsWithMemory: { total: number; entries: unknown[] } }>(teamsQuery);
    expect(data.listAgentTeamsWithMemory).toEqual({
      total: 1,
      entries: [{
        teamDefinitionId: "gql-writing-team",
        teamDefinitionName: "Writing Team",
        teamRunCount: 2,
        memberMemoryCount: 1,
        latestMemoryAt: "2026-08-15T02:00:00Z",
        memory: { hasSemantic: true },
      }],
    });
  });

  it("lists team runs newest first with display names and each member's own run ID; searches and pages (AC-005, AC-010, AC-011)", async () => {
    const all = await execGraphql<TeamRunsData>(teamRunsQuery, { id: "gql-writing-team", page: 1, pageSize: 10 });
    const page = all.listAgentTeamRunsWithMemory;
    expect(page.entries.map((entry) => entry.teamRunId)).toEqual(["gql-team-run-2", "gql-team-run-1"]);
    expect(page.entries[0]).toMatchObject({
      teamDefinitionName: "Writing Team",
      summary: "second draft",
      workspaceRootPath: "/tmp/gql-two",
      createdAt: "2026-08-15T00:00:00.000Z",
      lastUpdatedAt: "2026-08-15T02:00:00Z",
    });
    expect(page.entries[0]?.memberTargets).toEqual([
      { memberAddress: "/writer", displayName: "writer", agentRunId: "gql-team-run-2-writer", agentDefinitionId: "agent-writer", executionKind: "CONFIGURED", startedAt: null, groupPath: [], lastUpdatedAt: "2026-08-15T01:00:00Z", memory: { hasSemantic: true } },
      { memberAddress: "/writer", displayName: "writer", agentRunId: "gql-team-run-2-task-writer", agentDefinitionId: "agent-writer", executionKind: "TASK_AGENT", startedAt: "2026-08-15T00:00:00.000Z", groupPath: [], lastUpdatedAt: "2026-08-15T02:00:00Z", memory: { hasSemantic: true } },
    ]);
    const runIds = async (search: string) =>
      (await execGraphql<TeamRunsData>(teamRunsQuery, { id: "gql-writing-team", search, page: 1, pageSize: 10 }))
        .listAgentTeamRunsWithMemory.entries.map((entry) => entry.teamRunId);
    expect(await runIds("gql-team-run-2-task-writer")).toEqual(["gql-team-run-2"]);
    expect(await runIds("first draft")).toEqual(["gql-team-run-1"]);
    expect(await runIds("zzz-no-match")).toEqual([]);

    const second = await execGraphql<TeamRunsData>(teamRunsQuery, { id: "gql-writing-team", page: 2, pageSize: 1 });
    expect(second.listAgentTeamRunsWithMemory).toMatchObject({ total: 2, page: 2, totalPages: 2 });
    expect(second.listAgentTeamRunsWithMemory.entries.map((entry) => entry.teamRunId)).toEqual(["gql-team-run-1"]);
  });

  it("opens team member memory for a configured member and its task instance; unknown and non-admitted roots return empty views (AC-006, AC-011)", async () => {
    const view = (teamRunId: string, agentRunId: string) =>
      execGraphql<ViewData<"getTeamMemberRunMemoryView">>(teamMemberViewQuery, { teamRunId, agentRunId })
        .then((data) => data.getTeamMemberRunMemoryView);
    await expect(view("gql-team-run-2", "gql-team-run-2-writer")).resolves.toMatchObject({ runId: "gql-team-run-2-writer", semantic: [expect.objectContaining({ fact: "team two" })] });
    await expect(view("gql-team-run-2", "gql-team-run-2-task-writer")).resolves.toMatchObject({ semantic: [expect.objectContaining({ fact: "team two task" })] });
    for (const [teamRunId, agentRunId] of [["gql-team-unadmitted", "gql-team-unadmitted-writer"], ["gql-team-missing", "gql-team-run-2-writer"], ["gql-team-run-1", "gql-team-run-2-writer"]]) {
      const empty = await view(teamRunId!, agentRunId!);
      expect(empty.runId).toBe(agentRunId);
      expect(empty.semantic ?? null).toBeNull();
    }
  });

  it("skips a team tree corrupted after admission with a warning while other roots still list (AC-003)", async () => {
    await writeTeamRoot(memoryDir, writingTeamTree("gql-team-corrupt-later", "2026-08-17T00:00:00.000Z"));
    semantic(teamDir("gql-team-corrupt-later", "gql-team-corrupt-later-writer"), "corrupt later", "2026-08-17T01:00:00.000Z");
    resetRootRunPackageReadinessIndex(memoryDir);
    resetTeamRunHistoryCatalogState(memoryDir);
    const before = await execGraphql<TeamRunsData>(teamRunsQuery, { id: "gql-writing-team", page: 1, pageSize: 10 });
    expect(before.listAgentTeamRunsWithMemory.total).toBe(3);

    fs.writeFileSync(teamDir("gql-team-corrupt-later", "team_run_execution_tree.json"), "{ corrupted", "utf-8");
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const after = await execGraphql<TeamRunsData>(teamRunsQuery, { id: "gql-writing-team", page: 1, pageSize: 10 });
    expect(after.listAgentTeamRunsWithMemory.entries.map((entry) => entry.teamRunId)).toEqual(["gql-team-run-2", "gql-team-run-1"]);
    expect(warn).toHaveBeenCalledWith(expect.stringContaining("Skipping team run 'gql-team-corrupt-later' in memory explorer"));

    fs.rmSync(teamDir("gql-team-corrupt-later"), { recursive: true, force: true });
    resetRootRunPackageReadinessIndex(memoryDir);
    resetTeamRunHistoryCatalogState(memoryDir);
  });

  it("lists org definitions with member memory, using the history index name (AC-007)", async () => {
    const data = await execGraphql<{ listAgentOrgsWithMemory: unknown }>(orgsQuery);
    expect(data.listAgentOrgsWithMemory).toEqual({
      total: 1,
      totalPages: 1,
      entries: [{
        orgDefinitionId: "gql-org-a",
        orgDefinitionName: "Alpha Org",
        orgRunCount: 2,
        memberMemoryCount: 2,
        latestMemoryAt: "2026-09-02T01:00:00Z",
        memory: { hasSemantic: true, hasRawTraces: false },
      }],
    });
    const search = await execGraphql<{ listAgentOrgsWithMemory: { entries: Array<{ orgDefinitionId: string }> } }>(orgsQuery, { search: "solution_designer" });
    expect(search.listAgentOrgsWithMemory.entries.map((entry) => entry.orgDefinitionId)).toEqual(["gql-org-a"]);
  });

  it("lists org runs with address-path labels and own run IDs, includes task-team members under their task group, searches and pages (AC-008, AC-010, AC-011, AC-014)", async () => {
    const all = await execGraphql<OrgRunsData>(orgRunsQuery, { id: "gql-org-a", page: 1, pageSize: 10 });
    const page = all.listAgentOrgRunsWithMemory;
    expect(page.entries.map((entry) => entry.orgRunId)).toEqual(["gql-org-a-2", "gql-org-a-1"]);
    expect(page.entries[0]).toMatchObject({ orgDefinitionName: "Alpha Org", summary: null, workspaceRootPath: null, createdAt: "2026-09-02T00:00:00.000Z" });
    expect(page.entries[1]).toMatchObject({ summary: "first alpha run", workspaceRootPath: "/tmp/alpha", lastUpdatedAt: "2026-09-01T04:00:00Z" });
    expect(page.entries[1]?.memberTargets.map((member) => [member.memberAddress, member.displayName, member.agentRunId, member.executionKind, member.groupPath.map((group) => `${group.kind}:${group.teamRunId}`)])).toEqual([
      ["/ceo", "ceo", "gql-org-a-1-ceo", "CONFIGURED", []],
      ["/ceo", "ceo", "gql-org-a-1-task-ceo", "TASK_AGENT", []],
      ["/engineering/solution_designer", "engineering/solution_designer", "gql-org-a-1-designer", "CONFIGURED", ["CONFIGURED_TEAM:gql-org-a-1-engineering"]],
      ["/engineering/solution_designer", "engineering/solution_designer", "gql-org-a-1-task-team-designer", "TASK_TEAM_MEMBER", ["TASK_TEAM:gql-org-a-1-engineering-task"]],
    ]);
    expect(page.entries[1]?.memberTargets[3]?.groupPath[0]).toMatchObject({ address: "/engineering", displayName: "engineering", startedAt: "2026-09-01T00:02:00.000Z" });
    expect(page.entries[1]?.memberTargets[1]?.startedAt).toBe("2026-09-01T00:01:00.000Z");
    const runIds = async (search: string) =>
      (await execGraphql<OrgRunsData>(orgRunsQuery, { id: "gql-org-a", search, page: 1, pageSize: 10 }))
        .listAgentOrgRunsWithMemory.entries.map((entry) => entry.orgRunId);
    expect(await runIds("engineering/solution")).toEqual(["gql-org-a-1"]);
    expect(await runIds("gql-org-a-1-task-ceo")).toEqual(["gql-org-a-1"]);
    expect(await runIds("/tmp/alpha")).toEqual(["gql-org-a-1"]);
    expect(await runIds("gql-org-a-1-task-team-designer")).toEqual(["gql-org-a-1"]);

    const second = await execGraphql<OrgRunsData>(orgRunsQuery, { id: "gql-org-a", page: 2, pageSize: 1 });
    expect(second.listAgentOrgRunsWithMemory).toMatchObject({ total: 2, page: 2, totalPages: 2 });
    expect(second.listAgentOrgRunsWithMemory.entries.map((entry) => entry.orgRunId)).toEqual(["gql-org-a-1"]);
    const unknown = await execGraphql<OrgRunsData>(orgRunsQuery, { id: "gql-org-missing", page: 1, pageSize: 10 });
    expect(unknown.listAgentOrgRunsWithMemory).toMatchObject({ total: 0, entries: [] });
  });

  it("opens org member memory for a team-hosted member and a task instance; unknown members get an empty view (AC-009, AC-011)", async () => {
    const view = (orgRunId: string, agentRunId: string) =>
      execGraphql<ViewData<"getAgentOrgMemberRunMemoryView">>(orgMemberViewQuery, { orgRunId, agentRunId })
        .then((data) => data.getAgentOrgMemberRunMemoryView);
    await expect(view("gql-org-a-1", "gql-org-a-1-designer")).resolves.toMatchObject({ runId: "gql-org-a-1-designer", semantic: [expect.objectContaining({ fact: "org designer" })] });
    await expect(view("gql-org-a-1", "gql-org-a-1-task-ceo")).resolves.toMatchObject({ semantic: [expect.objectContaining({ fact: "org task ceo" })] });
    for (const [orgRunId, agentRunId] of [["gql-org-a-1", "missing-run"], ["gql-org-missing", "gql-org-a-1-ceo"]]) {
      const empty = await view(orgRunId!, agentRunId!);
      expect(empty.runId).toBe(agentRunId);
      expect(empty.semantic ?? null).toBeNull();
    }
  });

  it("serves an imported source: teams list from the import, while the org list is empty (AC-007 alternate)", async () => {
    const importRoot = path.join(memoryDir, "imports", "gql-collab-import");
    fs.mkdirSync(importRoot, { recursive: true });
    fs.writeFileSync(path.join(importRoot, "source-node.json"), JSON.stringify({
      schemaVersion: 1,
      sourceNodeId: "gql-collab-import",
      displayName: "Imported Collaboration Source",
      firstImportedAt: "2026-09-01T00:00:00.000Z",
      lastImportedAt: "2026-09-01T00:00:00.000Z",
      lastKnownEndpoint: null,
      lastSyncStatus: null,
      lastError: null,
    }), "utf-8");
    await writeTeamRoot(importRoot, writingTeamTree("gql-imported-team-run", "2026-08-20T00:00:00.000Z"));
    semantic(path.join(importRoot, "agent_teams", "gql-imported-team-run", "gql-imported-team-run-writer"), "imported", "2026-08-20T01:00:00.000Z");
    const source = { type: "IMPORTED", sourceNodeId: "gql-collab-import" };

    const teams = await execGraphql<{ listAgentTeamsWithMemory: { total: number; entries: Array<{ teamDefinitionId: string; teamRunCount: number }> } }>(teamsQuery, { source });
    expect(teams.listAgentTeamsWithMemory.entries.map((entry) => [entry.teamDefinitionId, entry.teamRunCount])).toEqual([["gql-writing-team", 1]]);
    const orgs = await execGraphql<{ listAgentOrgsWithMemory: { total: number; entries: unknown[] } }>(orgsQuery, { source });
    expect(orgs.listAgentOrgsWithMemory).toMatchObject({ total: 0, entries: [] });
  });
});
