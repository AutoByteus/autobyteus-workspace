import { NO_RUN_PARTS, readerOfAgentRunIds } from "../../../helpers/run-agents-reader.js";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ProjectsLayout } from "../../../../src/projects/stores/projects-layout.js";
import { AdHocTasksLayout } from "../../../../src/projects/stores/ad-hoc-tasks-layout.js";
import { TaskExecutionResourceService } from "../../../../src/projects/services/task-execution-resource-service.js";
import { TaskExecutionResourceStore } from "../../../../src/projects/stores/task-execution-resource-store.js";
import { DelegationIndex } from "../../../../src/agent-collaboration/delegation/delegation-index.js";
import type { RunFilesReader as RunPartsReader } from "../../../../src/agent-collaboration/delegation/collaboration-tree.js";
import type { RootExecutionIdentity } from "../../../../src/agent-collaboration/execution/domain/root-execution-identity.js";
import { taskRunResources } from "../../../helpers/task-run-resources.js";

/**
 * autobyteus-461, contract §2.6 (TC-11), §10.2, §10.5, §12 and the cases of §13.1: the in-memory relationships between
 * runs, built from the Task records and kept current by the Task side's change notice.
 */
const run = (rootSubjectKind: RootExecutionIdentity["rootSubjectKind"], rootRunId: string) => ({ rootSubjectKind, rootRunId }) as RootExecutionIdentity;
const M = run("agent", "project_task_manager_7c8d");
const E = run("agent_team", "software_engineering_team_0218");
const P = run("agent_team", "product_team_e03d");
const I = run("agent", "image_maker_33f0");
const R = run("agent", "researcher_2f00");
const MARKETING = run("agent_team", "marketing_team_5a00");
const ORG = run("agent_org", "company_org_9d00");
const from = (kind: string, runId: string, delegatorAgentRunId: string) => ({ delegatingRun: { kind, runId }, delegatorAgentRunId });
const team = (teamRunId: string, coordinatorAgentRunId: string) => ({ kind: "team", teamRunId, coordinatorAgentRunId });
const agent = (agentRunId: string) => ({ kind: "agent", agentRunId });
const at = (minute: number) => `2026-11-10T10:${String(minute).padStart(2, "0")}:00.000Z`;

/** §13.1: D1 (M → E, T1), D5 (E's designer → P, sub-work of T1), D6-like (P's designer → I, sub-work of T1), M → R (T2). */
const MAIN = {
  T1: [
    { role: "assigned", delegatedFrom: from("agent", M.rootRunId, M.rootRunId), recipientAddress: "/software_engineering_team",
      agentRun: team(E.rootRunId, "solution_designer_65a9"), linkedAt: at(0), start: "started", closedAt: null },
    { role: "subWork", recipientAddress: "/worker", delegatedFrom: from("agent_team", E.rootRunId, "solution_designer_65a9"),
      agentRun: team(P.rootRunId, "product_designer_1a2b"), linkedAt: at(10), start: "started", closedAt: null },
    { role: "subWork", recipientAddress: "/worker", delegatedFrom: from("agent_team", P.rootRunId, "product_designer_1a2b"),
      agentRun: agent(I.rootRunId), linkedAt: at(20), start: "started", closedAt: null },
  ],
  T2: [
    { role: "assigned", delegatedFrom: from("agent", M.rootRunId, M.rootRunId), recipientAddress: "/researcher",
      agentRun: agent(R.rootRunId), linkedAt: at(30), start: "started", closedAt: null },
  ],
};

describe("DelegationIndex (autobyteus-461, contract §2.6)", () => {
  let appData: string, layout: ProjectsLayout, service: TaskExecutionResourceService, tree: DelegationIndex;
  const write = async (taskId: string, agentRunResources: unknown) => {
    const file = layout.taskExecutionResourcesFile("project_P", taskId);
    await fs.mkdir(path.dirname(file), { recursive: true });
    await fs.writeFile(file, typeof agentRunResources === "string" ? agentRunResources : JSON.stringify({ taskId, agentRunResources }));
  };
  const boot = async (tasks: Record<string, unknown> = MAIN, reader?: RunPartsReader) => {
    for (const [taskId, entries] of Object.entries(tasks)) await write(taskId, entries);
    service = taskRunResources(new TaskExecutionResourceStore(layout, new AdHocTasksLayout(path.join(appData, "ad-hoc-tasks"))));
    await service.load();
    tree = new DelegationIndex(() => service, reader ?? NO_RUN_PARTS);
    tree.build();
    service.setEntriesListener(tree);
  };

  beforeEach(async () => {
    appData = await fs.mkdtemp(path.join(os.tmpdir(), "delegation-index-"));
    layout = new ProjectsLayout(path.join(appData, "projects"));
  });
  afterEach(async () => { vi.restoreAllMocks(); await fs.rm(appData, { recursive: true, force: true }); });

  it("one hop (S9, S10, DS-8): each run shows the runs it delegated to while their Task is open, whatever their start", async () => {
    await boot();
    expect(tree.openChildrenOf(M).map((child) => child.run)).toEqual([{ teamRunId: E.rootRunId }, { agentRunId: R.rootRunId }]);
    expect(tree.openChildrenOf(E)).toEqual([{ run: { teamRunId: P.rootRunId }, taskId: "T1", delegatorAgentRunId: "solution_designer_65a9",
      entryAgentRunId: "product_designer_1a2b", started: true, linkedAt: at(10), recipientAddress: "/worker" }]);
    expect(tree.openChildrenOf(P).map((child) => child.run)).toEqual([{ agentRunId: I.rootRunId }]);
    expect(tree.openChildrenOf(I)).toEqual([]);
    expect(tree.parentOf({ teamRunId: P.rootRunId })).toEqual({ delegatingRun: E, delegatorAgentRunId: "solution_designer_65a9" });
    expect(tree.parentOf({ agentRunId: "never-delegated" })).toBeNull();
    // Walk down (token totals, the restart notice): every local run below, each once.
    expect(tree.subtreeOf(M)).toEqual([{ teamRunId: E.rootRunId }, { teamRunId: P.rootRunId }, { agentRunId: I.rootRunId }, { agentRunId: R.rootRunId }]);
  });

  it("the message rule (§10.2, W1 … W9): one open Task, or the assigner of the other's open Task; never two Tasks apart", async () => {
    await boot();
    expect(tree.canMessage(M, E)).toBe(true); // W1: (b)
    expect(tree.canMessage(E, M)).toBe(true); // W2: (b), either direction
    expect(tree.canMessage(P, M)).toBe(true); // W3: (b), any depth
    expect(tree.canMessage(P, E)).toBe(true); // W4: (a)
    expect(tree.canMessage(P, I)).toBe(true); // W5: (a)
    expect(tree.canMessage(M, R)).toBe(true); // M assigned T2
    expect(tree.canMessage(P, R)).toBe(false); // W8: different Tasks
    expect(tree.canMessage(E, E)).toBe(false); // one run is not a cross-run message
    expect(tree.assignerOf("T1")).toEqual(M);
    expect(tree.assignerOf("unknown")).toBeNull();
  });

  it("follows every change synchronously: closure removes the runs from views and the rule; a reopen brings one back (W7, W9, L3, L4)", async () => {
    await boot();
    await service.closeTask({ projectId: "project_P", taskId: "T1" }, async () => {
      // Inside the Task's ordered change, the tree already agrees with the record.
      expect(tree.openChildrenOf(M).map((child) => child.run)).toEqual([{ agentRunId: R.rootRunId }]);
    });
    expect(tree.canMessage(M, E)).toBe(false);
    expect(tree.canMessage(P, I)).toBe(false);
    expect(tree.currentTaskOf({ teamRunId: E.rootRunId })).toMatchObject({ taskId: "T1", open: false, role: "assigned" });
    await service.reopenAssignment({ projectId: "project_P", taskId: "T1" }, { teamRunId: E.rootRunId }, M.rootRunId);
    expect(tree.canMessage(M, E)).toBe(true);
    // A sub-work run stays closed.
    expect(tree.canMessage(P, E)).toBe(false);
    expect(tree.openChildrenOf(E)).toEqual([]);
  });

  it("several open Tasks (DEC-012): the newest open Task is current; the run reaches the runs of every open Task", async () => {
    await boot({
      ...MAIN,
      T3: [{ role: "assigned", delegatedFrom: from("agent", M.rootRunId, M.rootRunId), recipientAddress: "/software_engineering_team",
        agentRun: team(E.rootRunId, "solution_designer_65a9"), linkedAt: at(40), start: "started", closedAt: null },
      { role: "subWork", recipientAddress: "/worker", delegatedFrom: from("agent_team", E.rootRunId, "solution_designer_65a9"), agentRun: agent("helper_on_t3"),
        linkedAt: at(41), start: "started", closedAt: null }],
    });
    const helper = run("agent", "helper_on_t3");
    expect(tree.currentTaskOf({ teamRunId: E.rootRunId })?.taskId).toBe("T3");
    expect(tree.openTaskIdsOf({ teamRunId: E.rootRunId })).toEqual(["T1", "T3"]);
    expect(tree.canMessage(E, helper)).toBe(true);
    expect(tree.canMessage(P, helper)).toBe(false);
    // One row per child, under its parent, for its newest open Task.
    expect(tree.openChildrenOf(M).map((child) => [child.run, child.taskId])).toEqual([[{ teamRunId: E.rootRunId }, "T3"], [{ agentRunId: R.rootRunId }, "T2"]]);
  });

  it("runOfAgent (§10.5, V-14, AR-014): entry agents and standalone runs from the entries; team and org agents read once from their own file; an org again on a miss", async () => {
    const orgAgents = ["ceo_agent_1f2e"];
    const reads: string[] = [];
    await boot({
      ...MAIN,
      T3: [{ role: "assigned", delegatedFrom: from("agent_team", MARKETING.rootRunId, "copywriter_77c1"), recipientAddress: "/image_maker",
        agentRun: agent("image_maker_d2"), linkedAt: at(50), start: "started", closedAt: null }],
      T4: [{ role: "assigned", delegatedFrom: from("agent_org", ORG.rootRunId, "ceo_agent_1f2e"), recipientAddress: "/product_team",
        agentRun: team("product_team_d3", "pd_d3"), linkedAt: at(51), start: "started", closedAt: null }],
    }, readerOfAgentRunIds(async (target) => {
      reads.push(`${target.rootSubjectKind}:${target.rootRunId}`);
      if (target.rootRunId === E.rootRunId) return ["solution_designer_65a9", "code_reviewer_m_3b10"];
      if (target.rootRunId === MARKETING.rootRunId) return ["copywriter_77c1"];
      if (target.rootSubjectKind === "agent_org") return [...orgAgents];
      return [];
    }));
    expect(await tree.runOfAgent("solution_designer_65a9")).toEqual(E);
    expect(await tree.runOfAgent(M.rootRunId)).toEqual(M);
    expect(await tree.runOfAgent(I.rootRunId)).toEqual(I);
    expect(reads).toEqual([]);
    // A non-entry member of a (possibly stopped) team: read from its own file, once.
    expect(await tree.runOfAgent("code_reviewer_m_3b10")).toEqual(E);
    expect(await tree.runOfAgent("copywriter_77c1")).toEqual(MARKETING);
    expect(await tree.runOfAgent("ceo_agent_1f2e")).toEqual(ORG);
    const firstReads = reads.length;
    expect(reads.filter((read) => read === `agent_team:${E.rootRunId}`)).toHaveLength(1);
    // An org mounts a team later (D4): its member is found by reading the org again; team runs are not read again.
    orgAgents.push("dev_lead_4c3d");
    reads.length = 0;
    expect(await tree.runOfAgent("dev_lead_4c3d")).toEqual(ORG);
    expect(reads).toEqual([`agent_org:${ORG.rootRunId}`]);
    expect(firstReads).toBeGreaterThan(0);
    expect(await tree.runOfAgent("nobody")).toBeNull();
    // D2, D3: a member of a user-started team and an org's agent assigned their Tasks.
    expect(tree.canMessage(MARKETING, run("agent", "image_maker_d2"))).toBe(true);
    expect(tree.canMessage(ORG, run("agent_team", "product_team_d3"))).toBe(true);
  });

  it("D8: a peer's run is a node with its members from its entry, never read from a file, and never in the local subtree", async () => {
    const reader = { partsOf: vi.fn(async () => null), orgPlacementsOf: async () => null, configuredPlacementOf: async () => null, isStored: async () => true };
    await boot({ T1: [{ role: "assigned", delegatedFrom: from("agent", M.rootRunId, M.rootRunId), recipientAddress: "/research_team",
      agentRun: team("research_team_77aa", "lead_0c11"), nodeId: "node-b-1f0e",
      members: [{ address: "/research_team/lead", agentRunId: "lead_0c11" }, { address: "/research_team/analyst", agentRunId: "analyst_5d20" }],
      linkedAt: at(5), start: "started", closedAt: null }] }, reader);
    expect(await tree.runOfAgent("analyst_5d20")).toEqual(run("agent_team", "research_team_77aa"));
    expect(tree.openChildrenOf(M)).toEqual([expect.objectContaining({ nodeId: "node-b-1f0e", members: expect.any(Array) })]);
    expect(tree.subtreeOf(M)).toEqual([]);
    expect(await tree.runOfAgent("nobody")).toBeNull();
    expect(reader.partsOf).not.toHaveBeenCalledWith(run("agent_team", "research_team_77aa"));
  });

  it("S16: a deleted Task drops its runs from the tree; a run still named by another Task stays", async () => {
    await boot();
    service.forget({ projectId: "project_P", taskId: "T1" });
    expect(tree.hasNode(E)).toBe(false);
    expect(tree.hasNode(P)).toBe(false);
    expect(tree.hasNode(M)).toBe(true);
    expect(tree.openChildrenOf(M).map((child) => child.run)).toEqual([{ agentRunId: R.rootRunId }]);
    expect(await tree.runOfAgent("product_designer_1a2b")).toBeNull();
    service.forget({ projectId: "project_P", taskId: "T2" });
    expect(tree.hasNode(M)).toBe(false);
  });

  it("a damaged Task contributes nothing; the others build (DEC-010)", async () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    await boot({ T1: "{ not json", T2: MAIN.T2 });
    expect(tree.openChildrenOf(M).map((child) => child.run)).toEqual([{ agentRunId: R.rootRunId }]);
    expect(tree.hasNode(E)).toBe(false);
  });
});
