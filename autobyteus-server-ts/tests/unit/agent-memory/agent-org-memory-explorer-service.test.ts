import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AgentOrgMemoryExplorerService } from "../../../src/agent-memory/services/agent-org-memory-explorer-service.js";
import { AgentOrgRootMemorySource } from "../../../src/agent-memory/services/agent-org-root-memory-source.js";
import { AgentMemoryLayout } from "../../../src/agent-memory/store/agent-memory-layout.js";
import { AgentOrgExecutionTreeLocationService } from "../../../src/agent-org-execution/services/agent-org-execution-tree-location-service.js";
import { assertAgentTeamAddress } from "../../../src/agent-collaboration/domain/agent-team-address.js";
import type { TaskDelegationRecordV1, TaskExecutionReference } from "../../../src/agent-collaboration/execution/task/task-delegation-record-v1.js";
import type { AgentOrgRunExecutionTreeSnapshot } from "../../../src/agent-org-execution/domain/agent-org-run-execution-tree.js";
import { AgentOrgCommunicationMessagesV1Store } from "../../../src/agent-org-execution/persistence/agent-org-communication-messages-v1-store.js";
import { AgentOrgTaskDelegationRecordsV1Store } from "../../../src/agent-org-execution/persistence/agent-org-task-delegation-records-v1-store.js";
import { resetCollaborationRunHistoryCatalogState } from "../../../src/run-history/services/collaboration-run-history-catalog-core.js";
import { RootRunPackageReadinessIndex, resetRootRunPackageReadinessIndex } from "../../../src/run-history/services/root-run-package-readiness-index.js";
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

/**
 * `/ceo`; configured team `/engineering` with `/engineering/solution_designer`. With tasks: a delegated `/ceo`
 * task agent and a task team delegated to the configured team address `/engineering` (same address, own
 * teamRunId) whose members are `/engineering/solution_designer` and a nested team `/engineering/review`.
 */
const orgTree = (orgRunId: string, orgDefinitionId: string, withTasks: boolean): AgentOrgRunExecutionTreeSnapshot => {
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
  if (!withTasks) return base;
  return validateAgentOrgRunExecutionTreePayload({
    ...base,
    rootOrg: {
      ...base.rootOrg,
      taskExecutions: [
        { address: assertAgentTeamAddress("/ceo"), agentRunId: `${orgRunId}-task-ceo`, platformAgentRunId: null, startedAt: "2026-09-01T00:01:00.000Z", settledAt: null },
        {
          address: assertAgentTeamAddress("/engineering"),
          teamRunId: `${orgRunId}-engineering-task`,
          members: [
            { address: assertAgentTeamAddress("/engineering/solution_designer"), agentRunId: `${orgRunId}-task-team-designer`, platformAgentRunId: null },
            {
              address: assertAgentTeamAddress("/engineering/review"),
              teamRunId: `${orgRunId}-review`,
              members: [{ address: assertAgentTeamAddress("/engineering/review/reviewer"), agentRunId: `${orgRunId}-reviewer`, platformAgentRunId: null }],
              taskExecutions: [],
            },
          ],
          taskExecutions: [],
          startedAt: "2026-09-01T00:02:00.000Z",
          settledAt: null,
        },
      ],
    },
  }, orgRunId);
};

describe("AgentOrgMemoryExplorerService", () => {
  let memoryDir: string;
  let layout: AgentMemoryLayout;

  const writeOrg = async (orgRunId: string, orgDefinitionId: string, withTasks = false) => {
    const tree = orgTree(orgRunId, orgDefinitionId, withTasks);
    const packageDir = layout.getOrgDirPath(orgRunId);
    await new AgentOrgRunExecutionTreeStore().write(packageDir, tree);
    const records = tree.rootOrg.taskExecutions.map((execution, index) =>
      activeTask(`${orgRunId}-task-${index}`, `${orgRunId}-ceo`, execution.address,
        "teamRunId" in execution ? { teamRunId: execution.teamRunId } : { agentRunId: execution.agentRunId }, execution.startedAt));
    await new AgentOrgTaskDelegationRecordsV1Store().write(packageDir, { schemaVersion: 1, subjectKind: "agent_org", orgRunId, records });
    await new AgentOrgCommunicationMessagesV1Store().write(packageDir, { schemaVersion: 1, subjectKind: "agent_org", orgRunId, messages: [] });
  };

  const orgDir = (...parts: string[]) => path.join(memoryDir, "agent_orgs", ...parts);

  const resetState = () => {
    resetCollaborationRunHistoryCatalogState(memoryDir, "agent_org");
    resetRootRunPackageReadinessIndex(memoryDir);
  };

  beforeEach(async () => {
    memoryDir = await fs.mkdtemp(path.join(os.tmpdir(), "org-memory-explorer-"));
    layout = new AgentMemoryLayout(memoryDir);

    // Org A, run 1: configured agents and every task execution kind.
    await writeOrg("org-a-1", "org-a", true);
    await touch(orgDir("org-a-1", "org-a-1-ceo", "working_context_snapshot.json"), Date.parse("2026-09-01T01:00:00.000Z"));
    await touch(orgDir("org-a-1", "org-a-1-engineering", "org-a-1-designer", "raw_traces_active.jsonl"), Date.parse("2026-09-01T02:00:00.000Z"));
    await touch(orgDir("org-a-1", "org-a-1-task-ceo", "episodic.jsonl"), Date.parse("2026-09-01T03:00:00.000Z"));
    await touch(orgDir("org-a-1", "org-a-1-engineering-task", "org-a-1-task-team-designer", "semantic.jsonl"), Date.parse("2026-09-01T04:00:00.000Z"));
    await touch(orgDir("org-a-1", "org-a-1-engineering-task", "org-a-1-review", "org-a-1-reviewer", "semantic.jsonl"), Date.parse("2026-09-01T05:00:00.000Z"));

    // Org A, run 2: only the root agent has memory; newer.
    await writeOrg("org-a-2", "org-a");
    await touch(orgDir("org-a-2", "org-a-2-ceo", "semantic.jsonl"), Date.parse("2026-09-02T01:00:00.000Z"));

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
    const page = await new AgentOrgMemoryExplorerService(memoryDir).listAgentOrgsWithMemory();
    expect(page).toMatchObject({ total: 1, page: 1, totalPages: 1 });
    expect(page.entries).toEqual([{
      orgDefinitionId: "org-a",
      orgDefinitionName: "Alpha Org",
      orgRunCount: 2,
      memberMemoryCount: 3,
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

  it("lists every agent run with memory in its execution structure, depth-first with contiguous groups (REQ-012, AC-014)", async () => {
    const page = await new AgentOrgMemoryExplorerService(memoryDir).listAgentOrgRunsWithMemory("org-a");
    expect(page.entries.map((entry) => entry.orgRunId)).toEqual(["org-a-2", "org-a-1"]);
    expect(page.entries[0]).toMatchObject({ orgDefinitionName: "Alpha Org", summary: null, workspaceRootPath: null, createdAt: "2026-09-02T00:00:00.000Z" });
    expect(page.entries[1]).toMatchObject({ summary: "first alpha run", workspaceRootPath: "/tmp/alpha", lastUpdatedAt: "2026-09-01T05:00:00Z" });

    const engineering = { teamRunId: "org-a-1-engineering", address: "/engineering", displayName: "engineering", kind: "CONFIGURED_TEAM", startedAt: null };
    const engineeringTask = { teamRunId: "org-a-1-engineering-task", address: "/engineering", displayName: "engineering", kind: "TASK_TEAM", startedAt: "2026-09-01T00:02:00.000Z" };
    const review = { teamRunId: "org-a-1-review", address: "/engineering/review", displayName: "engineering/review", kind: "TASK_TEAM", startedAt: null };
    expect(page.entries[1]?.memberTargets.map((member) => ({
      displayName: member.displayName,
      agentRunId: member.agentRunId,
      agentDefinitionId: member.agentDefinitionId,
      executionKind: member.executionKind,
      startedAt: member.startedAt,
      groupPath: member.groupPath,
    }))).toEqual([
      { displayName: "ceo", agentRunId: "org-a-1-ceo", agentDefinitionId: "definition-org-a-1-ceo", executionKind: "CONFIGURED", startedAt: null, groupPath: [] },
      { displayName: "ceo", agentRunId: "org-a-1-task-ceo", agentDefinitionId: "definition-org-a-1-ceo", executionKind: "TASK_AGENT", startedAt: "2026-09-01T00:01:00.000Z", groupPath: [] },
      { displayName: "engineering/solution_designer", agentRunId: "org-a-1-designer", agentDefinitionId: "definition-org-a-1-designer", executionKind: "CONFIGURED", startedAt: null, groupPath: [engineering] },
      { displayName: "engineering/solution_designer", agentRunId: "org-a-1-task-team-designer", agentDefinitionId: "definition-org-a-1-designer", executionKind: "TASK_TEAM_MEMBER", startedAt: null, groupPath: [engineeringTask] },
      { displayName: "engineering/review/reviewer", agentRunId: "org-a-1-reviewer", agentDefinitionId: null, executionKind: "TASK_TEAM_MEMBER", startedAt: null, groupPath: [engineeringTask, review] },
    ]);
  });

  it("searches org runs by summary, workspace and any member's address or own run ID, and pages", async () => {
    const service = new AgentOrgMemoryExplorerService(memoryDir);
    const runIds = async (search: string) =>
      (await service.listAgentOrgRunsWithMemory("org-a", search)).entries.map((entry) => entry.orgRunId);
    expect(await runIds("first alpha")).toEqual(["org-a-1"]);
    expect(await runIds("/tmp/alpha")).toEqual(["org-a-1"]);
    expect(await runIds("engineering/solution")).toEqual(["org-a-1"]);
    expect(await runIds("org-a-1-task-ceo")).toEqual(["org-a-1"]);
    expect(await runIds("org-a-1-task-team-designer")).toEqual(["org-a-1"]);
    expect(await runIds("review/reviewer")).toEqual(["org-a-1"]);
    expect(await runIds("ceo")).toEqual(["org-a-2", "org-a-1"]);

    expect((await service.listAgentOrgsWithMemory("solution_designer")).entries.map((entry) => entry.orgDefinitionId)).toEqual(["org-a"]);
    expect((await service.listAgentOrgsWithMemory("nothing-matches")).entries).toEqual([]);

    const secondPage = await service.listAgentOrgRunsWithMemory("org-a", null, 2, 1);
    expect(secondPage).toMatchObject({ total: 2, page: 2, pageSize: 1, totalPages: 2 });
    expect(secondPage.entries.map((entry) => entry.orgRunId)).toEqual(["org-a-1"]);
  });

  it("omits a group whose members have no memory", async () => {
    await fs.rm(orgDir("org-a-1", "org-a-1-engineering-task"), { recursive: true, force: true });
    const page = await new AgentOrgMemoryExplorerService(memoryDir).listAgentOrgRunsWithMemory("org-a", "org-a-1");
    const members = page.entries[0]?.memberTargets ?? [];
    expect(members.map((member) => member.agentRunId)).toEqual(["org-a-1-ceo", "org-a-1-task-ceo", "org-a-1-designer"]);
    expect(members.some((member) => member.groupPath.some((group) => group.kind === "TASK_TEAM"))).toBe(false);
  });

  it("falls back to the tree name and createdAt when the org has no history row", async () => {
    await fs.rm(path.join(memoryDir, "agent_org_run_history_index.json"));
    resetCollaborationRunHistoryCatalogState(memoryDir, "agent_org");
    const service = new AgentOrgMemoryExplorerService(memoryDir);
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
    const store = new AgentOrgRunExecutionTreeStore();
    const read = vi.spyOn(store, "read");
    const service = new AgentOrgMemoryExplorerService(memoryDir, {
      source: new AgentOrgRootMemorySource(memoryDir, { locations: new AgentOrgExecutionTreeLocationService({ memoryDir, store }) }),
    });

    const page = await service.listAgentOrgsWithMemory();

    expect(page.entries.map((entry) => entry.orgDefinitionId)).toEqual(["org-a"]);
    expect(read.mock.calls.map(([, orgRunId]) => orgRunId).sort()).toEqual(["org-a-1", "org-a-2", "org-b-1"]);
    expect(warn).toHaveBeenCalledWith(expect.stringContaining("Skipping agent org run 'org-b-1' in memory explorer"));
  });

  it("returns an empty page for an unknown org definition and requires a definition ID", async () => {
    const service = new AgentOrgMemoryExplorerService(memoryDir);
    await expect(service.listAgentOrgRunsWithMemory("missing")).resolves.toMatchObject({ entries: [], total: 0, totalPages: 1 });
    await expect(service.listAgentOrgRunsWithMemory("  ")).rejects.toThrow("orgDefinitionId is required.");
  });
});
