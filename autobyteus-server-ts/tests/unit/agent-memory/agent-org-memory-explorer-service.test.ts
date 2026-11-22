import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AgentOrgMemoryExplorerService } from "../../../src/agent-memory/services/agent-org-memory-explorer-service.js";
import { AgentOrgRootMemorySource } from "../../../src/agent-memory/services/agent-org-root-memory-source.js";
import { AgentMemoryLayout } from "../../../src/agent-memory/store/agent-memory-layout.js";
import { AgentOrgExecutionTreeLocationService } from "../../../src/agent-org-execution/services/agent-org-execution-tree-location-service.js";
import { assertAgentTeamAddress } from "../../../src/agent-collaboration/domain/agent-team-address.js";
import type { AgentOrgRunExecutionTreeSnapshot } from "../../../src/agent-org-execution/domain/agent-org-run-execution-tree.js";
import { writeStoredOrgContainer } from "../../helpers/stored-org-container.js";
import { AgentOrgContainerStore } from "../../../src/run-history/store/agent-org-container-store.js";
import { resetCollaborationRunHistoryCatalogState } from "../../../src/run-history/services/collaboration-run-history-catalog-core.js";
import { RootRunPackageReadinessIndex, resetRootRunPackageReadinessIndex } from "../../../src/run-history/services/root-run-package-readiness-index.js";
import { AgentOrgRunHistoryIndexStore } from "../../../src/run-history/store/agent-org-run-history-index-store.js";
import { validateAgentOrgRunExecutionTreePayload } from "../../../src/run-history/store/agent-org-run-execution-tree-schema.js";
import { testAgentOrgExecutionTree, testOrgAgentNode, testOrgLaunchConfiguration, testOrgTeamNode } from "../../fixtures/current-agent-org-run-fixtures.js";

/** No definitions on this node: cards and members come from the stored runs alone (autobyteus-554). */
const noDefinitions = {
  teamById: async () => null, orgById: async () => null, allTeams: async () => [], allOrgs: async () => [], agentNames: async () => new Map<string, string>(),
};

const touch = async (filePath: string, mtime: number) => {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, "{}", "utf8");
  const at = new Date(mtime);
  await fs.utimes(filePath, at, at);
};

describe("AgentOrgMemoryExplorerService", () => {
  let memoryDir: string;
  let layout: AgentMemoryLayout;

  /**
   * An Org container (org-teams-follow-definition): `/ceo` (an agent unit) and the Team unit `/engineering` with
   * `/engineering/solution_designer` (stored at `/solution_designer` in its Team run). A run they delegated to is its own run.
   */
  const writeOrg = (orgRunId: string, orgDefinitionId: string) => writeStoredOrgContainer(memoryDir, {
    orgRunId, orgDefinitionId, orgDefinitionName: "Tree Org Name", createdAt: "2026-09-01T00:00:00.000Z",
    units: [{ kind: "agent", address: "/ceo", runId: `${orgRunId}-ceo`, agentDefinitionId: `definition-${orgRunId}-ceo` },
      { kind: "agent_team", address: "/engineering", runId: `${orgRunId}-engineering`, coordinatorAddress: "/solution_designer",
        members: [{ address: "/solution_designer", agentRunId: `${orgRunId}-designer`, agentDefinitionId: `definition-${orgRunId}-designer` }] }],
  });

  const orgDir = (...parts: string[]) => path.join(memoryDir, "agent_orgs", ...parts);
  /** A unit agent's memory folder: a direct agent's own run, a Team unit member's in its Team run. */
  const agentDir = (runId: string, ...parts: string[]) => path.join(memoryDir, "agents", runId, ...parts);
  const memberDir = (teamRunId: string, agentRunId: string, ...parts: string[]) => path.join(memoryDir, "agent_teams", teamRunId, agentRunId, ...parts);

  const resetState = () => {
    resetCollaborationRunHistoryCatalogState(memoryDir, "agent_org");
    resetRootRunPackageReadinessIndex(memoryDir);
  };

  beforeEach(async () => {
    memoryDir = await fs.mkdtemp(path.join(os.tmpdir(), "org-memory-explorer-"));
    layout = new AgentMemoryLayout(memoryDir);

    // Org A, run 1: its direct agent and its mounted team's member.
    await writeOrg("org-a-1", "org-a");
    await touch(agentDir("org-a-1-ceo", "working_context_snapshot.json"), Date.parse("2026-09-01T01:00:00.000Z"));
    await touch(memberDir("org-a-1-engineering", "org-a-1-designer", "raw_traces_active.jsonl"), Date.parse("2026-09-01T02:00:00.000Z"));

    // Org A, run 2: only the root agent has memory; newer.
    await writeOrg("org-a-2", "org-a");
    await touch(agentDir("org-a-2-ceo", "raw_traces_active.jsonl"), Date.parse("2026-09-02T01:00:00.000Z"));

    // Org B: no member memory at all -> not listed.
    await writeOrg("org-b-1", "org-b");

    await new AgentOrgRunHistoryIndexStore(memoryDir).writeIndex([
      { orgRunId: "org-a-1", orgDefinitionId: "org-a", orgDefinitionName: "Alpha Org", workspaceRootPath: "/tmp/alpha", summary: "first alpha run", createdAt: "2026-09-01T00:00:00.000Z", archivedAt: null, terminatedAt: null },
      { orgRunId: "org-a-2", orgDefinitionId: "org-a", orgDefinitionName: "Alpha Org", workspaceRootPath: null, summary: "", createdAt: "2026-09-02T00:00:00.000Z", archivedAt: null, terminatedAt: null },
    ]);
    resetState();
    const readiness = new RootRunPackageReadinessIndex(memoryDir);
    await readiness.rebuild();
    expect(readiness.listDiagnostics()).toEqual([]);
    expect(readiness.listAdmitted("agent_org")).toEqual(["org-a-1", "org-a-2", "org-b-1"]);
  });

  afterEach(async () => {
    vi.restoreAllMocks();
    resetState();
    await fs.rm(memoryDir, { recursive: true, force: true });
  });

  it("groups org runs with member memory by org definition and prefers the history catalog name", async () => {
    const page = await new AgentOrgMemoryExplorerService(memoryDir, { definitions: noDefinitions }).listAgentOrgsWithMemory();
    expect(page).toMatchObject({ total: 1, page: 1, totalPages: 1 });
    expect(page.entries).toEqual([{
      orgDefinitionId: "org-a",
      orgDefinitionName: "Alpha Org",
      orgRunCount: 2,
      memberMemoryCount: 2,
      // The newest run's own members: `/ceo` and the configured team `/engineering`.
      memberCount: 2,
      latestMemoryAt: "2026-09-02T01:00:00Z",
      memory: {
        latestMemoryAt: "2026-09-02T01:00:00Z",
        hasWorkJournal: false,
        hasRawTraces: true,
        hasRawArchive: false,
      },
    }]);
  });

  it("lists every agent of the org with memory in its structure, depth-first (REQ-012, AC-014); a run it delegated to is its own run", async () => {
    const page = await new AgentOrgMemoryExplorerService(memoryDir, { definitions: noDefinitions }).listAgentOrgRunsWithMemory("org-a");
    expect(page.entries.map((entry) => entry.orgRunId)).toEqual(["org-a-2", "org-a-1"]);
    expect(page.entries[0]).toMatchObject({ orgDefinitionName: "Alpha Org", summary: null, workspaceRootPath: null, createdAt: "2026-09-02T00:00:00.000Z" });
    expect(page.entries[1]).toMatchObject({ summary: "first alpha run", workspaceRootPath: "/tmp/alpha", lastUpdatedAt: "2026-09-01T02:00:00Z" });

    const engineering = { teamRunId: "org-a-1-engineering", address: "/engineering", displayName: "engineering", kind: "CONFIGURED_TEAM", startedAt: null };
    expect(page.entries[1]?.memberTargets.map((member) => ({
      displayName: member.displayName,
      agentRunId: member.agentRunId,
      agentDefinitionId: member.agentDefinitionId,
      executionKind: member.executionKind,
      startedAt: member.startedAt,
      groupPath: member.groupPath,
    }))).toEqual([
      { displayName: "ceo", agentRunId: "org-a-1-ceo", agentDefinitionId: "definition-org-a-1-ceo", executionKind: "CONFIGURED", startedAt: null, groupPath: [] },
      { displayName: "engineering/solution_designer", agentRunId: "org-a-1-designer", agentDefinitionId: "definition-org-a-1-designer", executionKind: "CONFIGURED", startedAt: null, groupPath: [engineering] },
    ]);
  });

  it("searches org runs by summary, workspace and any member's address or own run ID, and pages", async () => {
    const service = new AgentOrgMemoryExplorerService(memoryDir, { definitions: noDefinitions });
    const runIds = async (search: string) =>
      (await service.listAgentOrgRunsWithMemory("org-a", search)).entries.map((entry) => entry.orgRunId);
    expect(await runIds("first alpha")).toEqual(["org-a-1"]);
    expect(await runIds("/tmp/alpha")).toEqual(["org-a-1"]);
    expect(await runIds("engineering/solution")).toEqual(["org-a-1"]);
    expect(await runIds("org-a-1-designer")).toEqual(["org-a-1"]);
    expect(await runIds("ceo")).toEqual(["org-a-2", "org-a-1"]);

    expect((await service.listAgentOrgsWithMemory("solution_designer")).entries.map((entry) => entry.orgDefinitionId)).toEqual(["org-a"]);
    expect((await service.listAgentOrgsWithMemory("nothing-matches")).entries).toEqual([]);

    const secondPage = await service.listAgentOrgRunsWithMemory("org-a", null, 2, 1);
    expect(secondPage).toMatchObject({ total: 2, page: 2, pageSize: 1, totalPages: 2 });
    expect(secondPage.entries.map((entry) => entry.orgRunId)).toEqual(["org-a-1"]);
  });

  it("omits a member that has no memory", async () => {
    await fs.rm(memberDir("org-a-1-engineering", "org-a-1-designer"), { recursive: true, force: true });
    const page = await new AgentOrgMemoryExplorerService(memoryDir, { definitions: noDefinitions }).listAgentOrgRunsWithMemory("org-a", "org-a-1");
    expect((page.entries[0]?.memberTargets ?? []).map((member) => member.agentRunId)).toEqual(["org-a-1-ceo"]);
  });

  it("falls back to the tree name and createdAt when the org has no history row", async () => {
    await fs.rm(path.join(memoryDir, "agent_org_run_history_index.json"));
    resetCollaborationRunHistoryCatalogState(memoryDir, "agent_org");
    const service = new AgentOrgMemoryExplorerService(memoryDir, { definitions: noDefinitions });
    expect((await service.listAgentOrgsWithMemory()).entries[0]).toMatchObject({ orgDefinitionName: "Tree Org Name" });
    expect((await service.listAgentOrgRunsWithMemory("org-a")).entries[0]).toMatchObject({
      orgDefinitionName: "Tree Org Name",
      summary: null,
      createdAt: "2026-09-01T00:00:00.000Z",
    });
  });

  it("reads each admitted org tree once per request and skips a tree corrupted after admission with a warning", async () => {
    await fs.writeFile(orgDir("org-b-1", "agent_org_run_execution_tree.json"), "{ not json", "utf8");
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const read = vi.spyOn(AgentOrgContainerStore.prototype, "readIfContainer");
    const service = new AgentOrgMemoryExplorerService(memoryDir, { definitions: noDefinitions,
      source: new AgentOrgRootMemorySource(memoryDir, { locations: new AgentOrgExecutionTreeLocationService({ memoryDir }) }),
    });

    const page = await service.listAgentOrgsWithMemory();

    expect(page.entries.map((entry) => entry.orgDefinitionId)).toEqual(["org-a"]);
    expect(new Set(read.mock.calls.map(([, orgRunId]) => orgRunId))).toEqual(new Set(["org-a-1", "org-a-2", "org-b-1"]));
    expect(warn).toHaveBeenCalledWith(expect.stringContaining("Skipping agent org run 'org-b-1' in memory explorer"));
  });

  it("returns an empty page for an unknown org definition and requires a definition ID", async () => {
    const service = new AgentOrgMemoryExplorerService(memoryDir, { definitions: noDefinitions });
    await expect(service.listAgentOrgRunsWithMemory("missing")).resolves.toMatchObject({ entries: [], total: 0, totalPages: 1 });
    await expect(service.listAgentOrgRunsWithMemory("  ")).rejects.toThrow("orgDefinitionId is required.");
  });
});
