import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { TeamRunExecutionTreeSnapshot } from "../../../src/agent-team-execution/domain/team-run-execution-tree.js";
import { TeamMemoryExplorerService } from "../../../src/agent-memory/services/team-memory-explorer-service.js";
import { TeamRootMemorySource } from "../../../src/agent-memory/services/team-root-memory-source.js";
import { TeamRunExecutionTreeLocationService } from "../../../src/run-history/services/team-run-execution-tree-location-service.js";
import { AgentMemoryLayout } from "../../../src/agent-memory/store/agent-memory-layout.js";
import { resetTeamRunHistoryCatalogState } from "../../../src/run-history/services/team-run-history-catalog-service.js";
import { TeamRunExecutionTreeStore } from "../../../src/run-history/store/team-run-execution-tree-store.js";
import { TeamRunHistoryIndexStore } from "../../../src/run-history/store/team-run-history-index-store.js";
import { TaskDelegationRecordsV1Store } from "../../../src/agent-team-execution/task-delegation/records/task-delegation-records-v1-store.js";
import { TeamCommunicationV1Store } from "../../../src/services/team-communication/team-communication-v1-store.js";
import { RootRunPackageReadinessIndex, resetRootRunPackageReadinessIndex } from "../../../src/run-history/services/root-run-package-readiness-index.js";
import { address, testAgentNode, testExecutionTree } from "../../fixtures/current-team-run-fixtures.js";

const STORED_ONLY_MANAGER = { getManagedTeamRun: () => null, listManagedTeamRunIds: () => [] };

const withTaskInstance = (tree: TeamRunExecutionTreeSnapshot, agentRunId: string): TeamRunExecutionTreeSnapshot => ({
  ...tree,
  rootTeam: {
    ...tree.rootTeam,
    taskExecutions: [{
      address: address("/Teacher"),
      agentRunId,
      platformAgentRunId: null,
      startedAt: "2026-08-15T00:01:00.000Z",
      settledAt: null,
    }],
  },
});

const touch = async (filePath: string, mtime: number) => {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, "{}", "utf8");
  const at = new Date(mtime);
  await fs.utimes(filePath, at, at);
};

describe("TeamMemoryExplorerService current V1 tree", () => {
  let memoryDir: string;
  let layout: AgentMemoryLayout;

  beforeEach(async () => {
    memoryDir = await fs.mkdtemp(path.join(os.tmpdir(), "team-memory-explorer-current-"));
    layout = new AgentMemoryLayout(memoryDir);
    const store = new TeamRunExecutionTreeStore();
    for (const [runId, agentRunId, createdAt] of [
      ["classroom-run-1", "teacher-run-1", "2026-08-14T00:00:00.000Z"],
      ["classroom-run-2", "teacher-run-2", "2026-08-15T00:00:00.000Z"],
    ] as const) {
      const tree = testExecutionTree({
        rootTeamRunId: runId,
        rootTeamDefinitionId: "classroom-team",
        teamDefinitionName: "Classroom Team",
        coordinatorAddress: "/Teacher",
        createdAt,
        children: [testAgentNode("/Teacher", { agentRunId, workspaceRootPath: `/tmp/${runId}` })],
      });
      const packageDir = layout.getTeamDirPath({ rootTeamRunId: runId, ancestorTeamRunIds: [] });
      await store.write(packageDir, tree);
      await new TaskDelegationRecordsV1Store().write(packageDir, {
        schemaVersion: 1, rootTeamRunId: runId, records: [],
      });
      await new TeamCommunicationV1Store().write(packageDir, {
        schemaVersion: 1, rootTeamRunId: runId, messages: [],
      });
    }
    await new TeamRunHistoryIndexStore(memoryDir).writeIndex([
      { teamRunId: "classroom-run-1", teamDefinitionId: "classroom-team", teamDefinitionName: "Classroom Team", workspaceRootPath: "/tmp/classroom-run-1", summary: "first lesson", createdAt: "2026-08-14T00:00:00.000Z", archivedAt: null, terminatedAt: null },
      { teamRunId: "classroom-run-2", teamDefinitionId: "classroom-team", teamDefinitionName: "Classroom Team", workspaceRootPath: "/tmp/classroom-run-2", summary: "second lesson", createdAt: "2026-08-15T00:00:00.000Z", archivedAt: null, terminatedAt: null },
    ]);
    await touch(path.join(memoryDir, "agent_teams", "classroom-run-1", "teacher-run-1", "raw_traces_active.jsonl"), Date.parse("2026-08-14T01:00:00.000Z"));
    await touch(path.join(memoryDir, "agent_teams", "classroom-run-2", "teacher-run-2", "semantic.jsonl"), Date.parse("2026-08-15T01:00:00.000Z"));
    resetTeamRunHistoryCatalogState(memoryDir);
    const readiness = new RootRunPackageReadinessIndex(memoryDir);
    await readiness.rebuild();
    expect(readiness.listDiagnostics()).toEqual([]);
    expect(readiness.listAdmitted("agent_team")).toEqual(["classroom-run-1", "classroom-run-2"]);
  });

  afterEach(async () => {
    resetTeamRunHistoryCatalogState(memoryDir);
    resetRootRunPackageReadinessIndex(memoryDir);
    await fs.rm(memoryDir, { recursive: true, force: true });
  });

  it("groups stored V1 roots by Team definition and exact configured Agent address", async () => {
    const page = await new TeamMemoryExplorerService(memoryDir).listAgentTeamsWithMemory();
    expect(page.entries).toEqual([expect.objectContaining({
      teamDefinitionId: "classroom-team",
      teamDefinitionName: "Classroom Team",
      teamRunCount: 2,
      memberMemoryCount: 1,
      memory: expect.objectContaining({ hasRawTraces: true, hasSemantic: true }),
    })]);
  });

  it("lists and filters current run/member targets without route/path compatibility identity", async () => {
    const service = new TeamMemoryExplorerService(memoryDir);
    const page = await service.listAgentTeamRunsWithMemory("classroom-team", "second lesson");
    expect(page.entries).toEqual([expect.objectContaining({
      teamRunId: "classroom-run-2",
      summary: "second lesson",
      memberTargets: [expect.objectContaining({
        memberAddress: "/Teacher",
        displayName: "Teacher",
        agentRunId: "teacher-run-2",
      })],
    })]);
  });

  it("reads each root tree exactly once per request (AC-003)", async () => {
    const store = new TeamRunExecutionTreeStore();
    const read = vi.spyOn(store, "read");
    const locations = new TeamRunExecutionTreeLocationService({ memoryDir, manager: STORED_ONLY_MANAGER, store });
    const service = new TeamMemoryExplorerService(memoryDir, { source: new TeamRootMemorySource(memoryDir, { locations }) });

    await service.listAgentTeamsWithMemory();
    expect(read.mock.calls.map(([, rootTeamRunId]) => rootTeamRunId)).toEqual(["classroom-run-1", "classroom-run-2"]);

    read.mockClear();
    await service.listAgentTeamRunsWithMemory("classroom-team");
    expect(read.mock.calls.map(([, rootTeamRunId]) => rootTeamRunId)).toEqual(["classroom-run-1", "classroom-run-2"]);
  });

  it("orders runs newest first and pages them", async () => {
    const service = new TeamMemoryExplorerService(memoryDir);
    const all = await service.listAgentTeamRunsWithMemory("classroom-team");
    expect(all.entries.map((entry) => entry.teamRunId)).toEqual(["classroom-run-2", "classroom-run-1"]);
    expect(all.entries[1]).toMatchObject({
      teamDefinitionName: "Classroom Team",
      summary: "first lesson",
      workspaceRootPath: "/tmp/classroom-run-1",
      createdAt: "2026-08-14T00:00:00.000Z",
      lastUpdatedAt: "2026-08-14T01:00:00Z",
    });
    const second = await service.listAgentTeamRunsWithMemory("classroom-team", null, 2, 1);
    expect(second).toMatchObject({ total: 2, page: 2, pageSize: 1, totalPages: 2 });
    expect(second.entries.map((entry) => entry.teamRunId)).toEqual(["classroom-run-1"]);
    await expect(service.listAgentTeamRunsWithMemory(" ")).rejects.toThrow("teamDefinitionId is required.");
  });
});

describe("TeamMemoryExplorerService member identity and invalid roots", () => {
  let memoryDir: string;
  let layout: AgentMemoryLayout;

  const serviceWithoutHistory = () => new TeamMemoryExplorerService(memoryDir, {
    source: new TeamRootMemorySource(memoryDir, { catalogRows: { listCatalogRows: async () => [] } }),
  });

  beforeEach(async () => {
    memoryDir = await fs.mkdtemp(path.join(os.tmpdir(), "team-memory-explorer-identity-"));
    layout = new AgentMemoryLayout(memoryDir);
    const tree = withTaskInstance(testExecutionTree({
      rootTeamRunId: "writer-root",
      rootTeamDefinitionId: "writing-team",
      teamDefinitionName: "Writing Team",
      coordinatorAddress: "/Teacher",
      createdAt: "2026-08-15T00:00:00.000Z",
      children: [testAgentNode("/Teacher", { agentRunId: "teacher-run" })],
    }), "task-writer-run");
    await new TeamRunExecutionTreeStore().write(layout.getTeamDirPath({ rootTeamRunId: "writer-root", ancestorTeamRunIds: [] }), tree);
  });

  afterEach(async () => {
    vi.restoreAllMocks();
    await fs.rm(memoryDir, { recursive: true, force: true });
  });

  it("reports a delegated task instance with its own run ID (AC-011)", async () => {
    await touch(path.join(memoryDir, "agent_teams", "writer-root", "task-writer-run", "episodic.jsonl"), Date.parse("2026-08-15T02:00:00.000Z"));
    const page = await serviceWithoutHistory().listAgentTeamRunsWithMemory("writing-team");
    expect(page.entries[0]?.memberTargets).toEqual([expect.objectContaining({
      memberAddress: "/Teacher",
      displayName: "Teacher",
      agentRunId: "task-writer-run",
      agentDefinitionId: "agent-Teacher",
      lastUpdatedAt: "2026-08-15T02:00:00Z",
      memory: expect.objectContaining({ hasEpisodic: true, hasSemantic: false }),
    })]);
    expect((await serviceWithoutHistory().listAgentTeamRunsWithMemory("writing-team", "task-writer-run")).total).toBe(1);
  });

  it("lists the configured member and its task instance as separate runs", async () => {
    await touch(path.join(memoryDir, "agent_teams", "writer-root", "teacher-run", "semantic.jsonl"), Date.parse("2026-08-15T01:00:00.000Z"));
    await touch(path.join(memoryDir, "agent_teams", "writer-root", "task-writer-run", "episodic.jsonl"), Date.parse("2026-08-15T02:00:00.000Z"));
    const teams = await serviceWithoutHistory().listAgentTeamsWithMemory();
    expect(teams.entries).toEqual([expect.objectContaining({ teamDefinitionId: "writing-team", teamRunCount: 1, memberMemoryCount: 1 })]);
    const page = await serviceWithoutHistory().listAgentTeamRunsWithMemory("writing-team");
    expect(page.entries[0]?.memberTargets.map((member) => member.agentRunId)).toEqual(["teacher-run", "task-writer-run"]);
  });

  it("skips a corrupt root tree with a warning while other roots still list (AC-003)", async () => {
    await touch(path.join(memoryDir, "agent_teams", "writer-root", "teacher-run", "semantic.jsonl"), Date.parse("2026-08-15T01:00:00.000Z"));
    await fs.mkdir(path.join(memoryDir, "agent_teams", "broken-root"), { recursive: true });
    await fs.writeFile(path.join(memoryDir, "agent_teams", "broken-root", "team_run_execution_tree.json"), "{ not json", "utf8");
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);

    const page = await serviceWithoutHistory().listAgentTeamsWithMemory();

    expect(page.entries.map((entry) => entry.teamDefinitionId)).toEqual(["writing-team"]);
    expect(warn).toHaveBeenCalledWith(expect.stringContaining("Skipping team run 'broken-root' in memory explorer"));
  });
});
