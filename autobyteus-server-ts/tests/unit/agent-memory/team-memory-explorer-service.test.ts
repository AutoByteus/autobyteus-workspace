import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { createHash } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { TeamMemoryExplorerService } from "../../../src/agent-memory/services/team-memory-explorer-service.js";
import { TeamRootMemorySource } from "../../../src/agent-memory/services/team-root-memory-source.js";
import { TeamRunExecutionTreeLocationService } from "../../../src/run-history/services/team-run-execution-tree-location-service.js";
import { AgentMemoryLayout } from "../../../src/agent-memory/store/agent-memory-layout.js";
import { resetTeamRunHistoryCatalogState } from "../../../src/run-history/services/team-run-history-catalog-service.js";
import { TeamRunExecutionTreeStore } from "../../../src/run-history/store/team-run-execution-tree-store.js";
import { TeamRunHistoryIndexStore } from "../../../src/run-history/store/team-run-history-index-store.js";
import { TeamCommunicationStore } from "../../../src/services/team-communication/team-communication-store.js";
import { RootRunPackageReadinessIndex, resetRootRunPackageReadinessIndex } from "../../../src/run-history/services/root-run-package-readiness-index.js";
import { address, testAgentNode, testExecutionTree, writeCurrentTeamRunPackage } from "../../fixtures/current-team-run-fixtures.js";

/** No definitions on this node: cards and members come from the stored runs alone (autobyteus-554). */
const noDefinitions = {
  teamById: async () => null, orgById: async () => null, allTeams: async () => [], allOrgs: async () => [], agentNames: async () => new Map<string, string>(),
};

const STORED_ONLY_MANAGER = { getManagedTeamRun: () => null, listManagedTeamRunIds: () => [] };


const fileHashes = async (root: string): Promise<Map<string, string>> => {
  const hashes = new Map<string, string>();
  const visit = async (dir: string): Promise<void> => {
    for (const entry of await fs.readdir(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) await visit(full);
      else if (entry.isFile()) hashes.set(path.relative(root, full),
        createHash("sha256").update(await fs.readFile(full)).digest("hex"));
    }
  };
  await visit(root);
  return hashes;
};

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
      await new TeamCommunicationStore().write(packageDir, {
        schemaVersion: 1, rootTeamRunId: runId, messages: [],
      });
    }
    await new TeamRunHistoryIndexStore(memoryDir).writeIndex([
      { teamRunId: "classroom-run-1", teamDefinitionId: "classroom-team", teamDefinitionName: "Classroom Team", workspaceRootPath: "/tmp/classroom-run-1", summary: "first lesson", createdAt: "2026-08-14T00:00:00.000Z", archivedAt: null, terminatedAt: null },
      { teamRunId: "classroom-run-2", teamDefinitionId: "classroom-team", teamDefinitionName: "Classroom Team", workspaceRootPath: "/tmp/classroom-run-2", summary: "second lesson", createdAt: "2026-08-15T00:00:00.000Z", archivedAt: null, terminatedAt: null },
    ]);
    await touch(path.join(memoryDir, "agent_teams", "classroom-run-1", "teacher-run-1", "raw_traces_active.jsonl"), Date.parse("2026-08-14T01:00:00.000Z"));
    await touch(path.join(memoryDir, "agent_teams", "classroom-run-2", "teacher-run-2", "raw_traces_active.jsonl"), Date.parse("2026-08-15T01:00:00.000Z"));
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

  it("uses one read per admitted root for each imported-style list request and leaves all files unchanged", async () => {
    const before = await fileHashes(memoryDir);
    const read = vi.spyOn(TeamRunExecutionTreeStore.prototype, "read");
    try {
      const teams = await new TeamMemoryExplorerService(memoryDir, { definitions: noDefinitions }).listAgentTeamsWithMemory();
      expect(teams.entries).toHaveLength(1);
      expect(read.mock.calls.map(([, rootTeamRunId]) => rootTeamRunId).sort())
        .toEqual(["classroom-run-1", "classroom-run-2"]);
      expect(await fileHashes(memoryDir)).toEqual(before);

      read.mockClear();
      const runs = await new TeamMemoryExplorerService(memoryDir, { definitions: noDefinitions })
        .listAgentTeamRunsWithMemory("classroom-team");
      expect(runs.entries).toHaveLength(2);
      expect(read.mock.calls.map(([, rootTeamRunId]) => rootTeamRunId).sort())
        .toEqual(["classroom-run-1", "classroom-run-2"]);
      expect(await fileHashes(memoryDir)).toEqual(before);
    } finally {
      read.mockRestore();
    }
  });

  it("groups stored V1 roots by Team definition and exact configured Agent address", async () => {
    const page = await new TeamMemoryExplorerService(memoryDir, { definitions: noDefinitions }).listAgentTeamsWithMemory();
    expect(page.entries).toEqual([expect.objectContaining({
      teamDefinitionId: "classroom-team",
      teamDefinitionName: "Classroom Team",
      teamRunCount: 2,
      memberMemoryCount: 1,
      memory: expect.objectContaining({ hasRawTraces: true }),
    })]);
  });

  it("lists and filters current run/member targets without route/path compatibility identity", async () => {
    const service = new TeamMemoryExplorerService(memoryDir, { definitions: noDefinitions });
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
    const service = new TeamMemoryExplorerService(memoryDir, { definitions: noDefinitions, source: new TeamRootMemorySource(memoryDir, { locations }) });

    await service.listAgentTeamsWithMemory();
    expect(read.mock.calls.map(([, rootTeamRunId]) => rootTeamRunId)).toEqual(["classroom-run-1", "classroom-run-2"]);

    read.mockClear();
    await service.listAgentTeamRunsWithMemory("classroom-team");
    expect(read.mock.calls.map(([, rootTeamRunId]) => rootTeamRunId)).toEqual(["classroom-run-1", "classroom-run-2"]);
  });

  it("orders runs newest first and pages them", async () => {
    const service = new TeamMemoryExplorerService(memoryDir, { definitions: noDefinitions });
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

  const serviceWithoutHistory = () => new TeamMemoryExplorerService(memoryDir, { definitions: noDefinitions,
    source: new TeamRootMemorySource(memoryDir, { catalogRows: { listCatalogRows: async () => [] } }),
  });

  beforeEach(async () => {
    memoryDir = await fs.mkdtemp(path.join(os.tmpdir(), "team-memory-explorer-identity-"));
    layout = new AgentMemoryLayout(memoryDir);
    const tree = testExecutionTree({
      rootTeamRunId: "writer-root",
      rootTeamDefinitionId: "writing-team",
      teamDefinitionName: "Writing Team",
      coordinatorAddress: "/Teacher",
      createdAt: "2026-08-15T00:00:00.000Z",
      children: [testAgentNode("/Teacher", { agentRunId: "teacher-run" })],
    });
    await writeCurrentTeamRunPackage(layout.getTeamDirPath({ rootTeamRunId: "writer-root", ancestorTeamRunIds: [] }), tree);
  });

  afterEach(async () => {
    vi.restoreAllMocks();
    resetRootRunPackageReadinessIndex(memoryDir);
    await fs.rm(memoryDir, { recursive: true, force: true });
  });

  it("skips a corrupt root tree with a readiness diagnostic while other roots still list (AC-003)", async () => {
    await touch(path.join(memoryDir, "agent_teams", "writer-root", "teacher-run", "raw_traces_active.jsonl"), Date.parse("2026-08-15T01:00:00.000Z"));
    const brokenDir = layout.getTeamDirPath({ rootTeamRunId: "broken-root", ancestorTeamRunIds: [] });
    await fs.mkdir(brokenDir, { recursive: true });
    await fs.writeFile(path.join(brokenDir, "team_run_execution_tree.json"), "{ not json", "utf8");
    await new TeamCommunicationStore().write(brokenDir, { schemaVersion: 1, rootTeamRunId: "broken-root", messages: [] });

    const page = await serviceWithoutHistory().listAgentTeamsWithMemory();

    expect(page.entries.map((entry) => entry.teamDefinitionId)).toEqual(["writing-team"]);
    // Current root admission skips the unreadable package and records why.
    expect(new RootRunPackageReadinessIndex(memoryDir).listDiagnostics("agent_team")).toEqual([
      expect.objectContaining({ rootRunId: "broken-root", code: "ROOT_RUN_PACKAGE_CURRENT_VALIDATION_FAILED" }),
    ]);
  });

  it("skips a root folder whose tree names a different team run, while other roots still list", async () => {
    await touch(path.join(memoryDir, "agent_teams", "writer-root", "teacher-run", "raw_traces_active.jsonl"), Date.parse("2026-08-15T01:00:00.000Z"));
    const foreign = testExecutionTree({
      rootTeamRunId: "other-root-id",
      rootTeamDefinitionId: "foreign-team",
      coordinatorAddress: "/Teacher",
      children: [testAgentNode("/Teacher", { agentRunId: "foreign-teacher-run" })],
    });
    const mismatchDir = layout.getTeamDirPath({ rootTeamRunId: "mismatch-root", ancestorTeamRunIds: [] });
    await new TeamRunExecutionTreeStore().write(mismatchDir, foreign);
    await new TeamCommunicationStore().write(mismatchDir, { schemaVersion: 1, rootTeamRunId: "mismatch-root", messages: [] });
    await touch(path.join(memoryDir, "agent_teams", "mismatch-root", "foreign-teacher-run", "raw_traces_active.jsonl"), Date.parse("2026-08-15T03:00:00.000Z"));

    const page = await serviceWithoutHistory().listAgentTeamsWithMemory();

    expect(page.entries.map((entry) => entry.teamDefinitionId)).toEqual(["writing-team"]);
    // Current root admission skips the mismatched package and records why.
    expect(new RootRunPackageReadinessIndex(memoryDir).listDiagnostics("agent_team")).toEqual([
      expect.objectContaining({ rootRunId: "mismatch-root", code: "ROOT_RUN_PACKAGE_CURRENT_VALIDATION_FAILED" }),
    ]);
  });
});
