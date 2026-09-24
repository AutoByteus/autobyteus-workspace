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
import { AgentOrgRunExecutionTreeStore } from "../../../src/run-history/store/agent-org-run-execution-tree-store.js";
import { AgentOrgRunHistoryIndexStore } from "../../../src/run-history/store/agent-org-run-history-index-store.js";
import { validateAgentOrgRunExecutionTreePayload } from "../../../src/run-history/store/agent-org-run-execution-tree-schema.js";
import { testAgentOrgExecutionTree, testOrgAgentNode, testOrgTeamNode } from "../../fixtures/current-agent-org-run-fixtures.js";

const touch = async (filePath: string, mtime: number) => {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, "{}", "utf8");
  const at = new Date(mtime);
  await fs.utimes(filePath, at, at);
};

/** Adds a delegated task instance of `/ceo` and a task team whose member has no configured placement. */
const withTaskExecutions = (tree: AgentOrgRunExecutionTreeSnapshot, orgRunId: string): AgentOrgRunExecutionTreeSnapshot =>
  validateAgentOrgRunExecutionTreePayload({
    ...tree,
    rootOrg: {
      ...tree.rootOrg,
      taskExecutions: [
        {
          address: assertAgentTeamAddress("/ceo"),
          agentRunId: `${orgRunId}-task-ceo`,
          platformAgentRunId: null,
          startedAt: "2026-09-01T00:01:00.000Z",
          settledAt: null,
        },
        {
          address: assertAgentTeamAddress("/review_squad"),
          teamRunId: `${orgRunId}-review-squad`,
          members: [{
            address: assertAgentTeamAddress("/review_squad/reviewer"),
            agentRunId: `${orgRunId}-reviewer`,
            platformAgentRunId: null,
          }],
          taskExecutions: [],
          startedAt: "2026-09-01T00:02:00.000Z",
          settledAt: null,
        },
      ],
    },
  }, orgRunId);

describe("AgentOrgMemoryExplorerService", () => {
  let memoryDir: string;
  let layout: AgentMemoryLayout;

  const writeOrg = async (input: {
    orgRunId: string;
    orgDefinitionId: string;
    orgDefinitionName?: string;
    withTasks?: boolean;
  }) => {
    const ceo = testOrgAgentNode("/ceo", `${input.orgRunId}-ceo`);
    const designer = testOrgAgentNode("/engineering/solution_designer", `${input.orgRunId}-designer`);
    const team = testOrgTeamNode({
      address: "/engineering",
      teamRunId: `${input.orgRunId}-engineering`,
      coordinatorAddress: designer.address,
      members: [designer],
    });
    const base = testAgentOrgExecutionTree({
      orgRunId: input.orgRunId,
      orgDefinitionId: input.orgDefinitionId,
      orgDefinitionName: input.orgDefinitionName ?? "Tree Org Name",
      members: [ceo, team],
    });
    const tree = input.withTasks ? withTaskExecutions(base, input.orgRunId) : base;
    await new AgentOrgRunExecutionTreeStore().write(layout.getOrgDirPath(input.orgRunId), tree);
    return { ceo, designer, team };
  };

  const orgDir = (...parts: string[]) => path.join(memoryDir, "agent_orgs", ...parts);

  beforeEach(async () => {
    memoryDir = await fs.mkdtemp(path.join(os.tmpdir(), "org-memory-explorer-"));
    layout = new AgentMemoryLayout(memoryDir);

    // Org A, run 1: root agent + agent inside a configured team + task instance + task-team member.
    await writeOrg({ orgRunId: "org-a-1", orgDefinitionId: "org-a", withTasks: true });
    await touch(orgDir("org-a-1", "org-a-1-ceo", "working_context_snapshot.json"), Date.parse("2026-09-01T01:00:00.000Z"));
    await touch(orgDir("org-a-1", "org-a-1-engineering", "org-a-1-designer", "raw_traces_active.jsonl"), Date.parse("2026-09-01T02:00:00.000Z"));
    await touch(orgDir("org-a-1", "org-a-1-task-ceo", "episodic.jsonl"), Date.parse("2026-09-01T03:00:00.000Z"));
    await touch(orgDir("org-a-1", "org-a-1-review-squad", "org-a-1-reviewer", "semantic.jsonl"), Date.parse("2026-09-01T04:00:00.000Z"));

    // Org A, run 2: only the root agent has memory; newer.
    await writeOrg({ orgRunId: "org-a-2", orgDefinitionId: "org-a" });
    await touch(orgDir("org-a-2", "org-a-2-ceo", "semantic.jsonl"), Date.parse("2026-09-02T01:00:00.000Z"));

    // Org B: no member memory at all -> not listed.
    await writeOrg({ orgRunId: "org-b-1", orgDefinitionId: "org-b" });

    await new AgentOrgRunHistoryIndexStore(memoryDir).writeIndex([
      { orgRunId: "org-a-1", orgDefinitionId: "org-a", orgDefinitionName: "Alpha Org", workspaceRootPath: "/tmp/alpha", summary: "first alpha run", createdAt: "2026-09-01T00:00:00.000Z", archivedAt: null, terminatedAt: null },
      { orgRunId: "org-a-2", orgDefinitionId: "org-a", orgDefinitionName: "Alpha Org", workspaceRootPath: null, summary: "", createdAt: "2026-09-02T00:00:00.000Z", archivedAt: null, terminatedAt: null },
    ]);
  });

  afterEach(async () => {
    vi.restoreAllMocks();
    await fs.rm(memoryDir, { recursive: true, force: true });
  });

  it("groups org runs with member memory by org definition and prefers the history index name", async () => {
    const page = await new AgentOrgMemoryExplorerService(memoryDir).listAgentOrgsWithMemory();
    expect(page).toMatchObject({ total: 1, page: 1, totalPages: 1 });
    expect(page.entries).toEqual([{
      orgDefinitionId: "org-a",
      orgDefinitionName: "Alpha Org",
      orgRunCount: 2,
      memberMemoryCount: 2,
      latestMemoryAt: "2026-09-02T01:00:00Z",
      memory: {
        latestMemoryAt: "2026-09-02T01:00:00Z",
        hasWorkingContext: true,
        hasEpisodic: true,
        hasSemantic: true,
        hasRawTraces: true,
        hasRawArchive: false,
      },
    }]);
  });

  it("lists org runs newest first with address-path member labels and each member's own run ID", async () => {
    const page = await new AgentOrgMemoryExplorerService(memoryDir).listAgentOrgRunsWithMemory("org-a");
    expect(page.entries.map((entry) => entry.orgRunId)).toEqual(["org-a-2", "org-a-1"]);
    expect(page.entries[0]).toMatchObject({
      orgDefinitionId: "org-a",
      orgDefinitionName: "Alpha Org",
      summary: null,
      workspaceRootPath: null,
      createdAt: "2026-09-02T00:00:00.000Z",
      lastUpdatedAt: "2026-09-02T01:00:00Z",
    });
    expect(page.entries[1]).toMatchObject({ summary: "first alpha run", workspaceRootPath: "/tmp/alpha" });
    expect(page.entries[1]?.memberTargets.map((member) => ({
      memberAddress: member.memberAddress,
      displayName: member.displayName,
      agentRunId: member.agentRunId,
      agentDefinitionId: member.agentDefinitionId,
    }))).toEqual([
      { memberAddress: "/ceo", displayName: "ceo", agentRunId: "org-a-1-ceo", agentDefinitionId: "definition-org-a-1-ceo" },
      { memberAddress: "/ceo", displayName: "ceo", agentRunId: "org-a-1-task-ceo", agentDefinitionId: "definition-org-a-1-ceo" },
      {
        memberAddress: "/engineering/solution_designer",
        displayName: "engineering/solution_designer",
        agentRunId: "org-a-1-designer",
        agentDefinitionId: "definition-org-a-1-designer",
      },
    ]);
  });

  it("searches org runs by summary, workspace, member address and member run ID, and pages", async () => {
    const service = new AgentOrgMemoryExplorerService(memoryDir);
    const runIds = async (search: string) =>
      (await service.listAgentOrgRunsWithMemory("org-a", search)).entries.map((entry) => entry.orgRunId);
    expect(await runIds("first alpha")).toEqual(["org-a-1"]);
    expect(await runIds("/tmp/alpha")).toEqual(["org-a-1"]);
    expect(await runIds("engineering/solution")).toEqual(["org-a-1"]);
    expect(await runIds("org-a-1-task-ceo")).toEqual(["org-a-1"]);
    expect(await runIds("org-a-1-reviewer")).toEqual([]);
    expect(await runIds("ceo")).toEqual(["org-a-2", "org-a-1"]);

    const orgs = await service.listAgentOrgsWithMemory("solution_designer");
    expect(orgs.entries.map((entry) => entry.orgDefinitionId)).toEqual(["org-a"]);
    expect((await service.listAgentOrgsWithMemory("nothing-matches")).entries).toEqual([]);

    const secondPage = await service.listAgentOrgRunsWithMemory("org-a", null, 2, 1);
    expect(secondPage).toMatchObject({ total: 2, page: 2, pageSize: 1, totalPages: 2 });
    expect(secondPage.entries.map((entry) => entry.orgRunId)).toEqual(["org-a-1"]);
  });

  it("falls back to the tree name and createdAt when the history index is missing", async () => {
    await fs.rm(path.join(memoryDir, "agent_org_run_history_index.json"));
    const service = new AgentOrgMemoryExplorerService(memoryDir);
    expect((await service.listAgentOrgsWithMemory()).entries[0]).toMatchObject({ orgDefinitionName: "Tree Org Name" });
    expect((await service.listAgentOrgRunsWithMemory("org-a")).entries[0]).toMatchObject({
      orgDefinitionName: "Tree Org Name",
      summary: null,
      createdAt: "2026-09-01T00:00:00.000Z",
    });
  });

  it("reads each org tree once per request and skips a corrupt org tree with a warning", async () => {
    await fs.mkdir(orgDir("org-broken"), { recursive: true });
    await fs.writeFile(orgDir("org-broken", "agent_org_run_execution_tree.json"), "{ not json", "utf8");
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const store = new AgentOrgRunExecutionTreeStore();
    const read = vi.spyOn(store, "read");
    const locations = new AgentOrgExecutionTreeLocationService({ memoryDir, store });
    const service = new AgentOrgMemoryExplorerService(memoryDir, {
      source: new AgentOrgRootMemorySource(memoryDir, { locations }),
    });

    const page = await service.listAgentOrgsWithMemory();

    expect(page.entries.map((entry) => entry.orgDefinitionId)).toEqual(["org-a"]);
    const readRoots = read.mock.calls.map(([, orgRunId]) => orgRunId).sort();
    expect(readRoots).toEqual(["org-a-1", "org-a-2", "org-b-1", "org-broken"]);
    expect(warn).toHaveBeenCalledWith(expect.stringContaining("Skipping agent org run 'org-broken' in memory explorer"));
  });

  it("returns an empty page for an unknown org definition and requires a definition ID", async () => {
    const service = new AgentOrgMemoryExplorerService(memoryDir);
    await expect(service.listAgentOrgRunsWithMemory("missing")).resolves.toMatchObject({ entries: [], total: 0, totalPages: 1 });
    await expect(service.listAgentOrgRunsWithMemory("  ")).rejects.toThrow("orgDefinitionId is required.");
  });
});
