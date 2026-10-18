import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  HandStartedRunAdoption,
  revertUnfinishedAdoptionOffline,
  type AdoptionDelegatorRoot,
} from "../../../src/agent-collaboration/execution/task/hand-started-run-adoption.js";
import type { HandStartedRun, HandStartedRuns } from "../../../src/agent-collaboration/execution/task/hand-started-runs.js";
import { createAgentRootExecutionIdentity } from "../../../src/agent-collaboration/execution/domain/root-execution-identity.js";
import type { TaskExecutionReference } from "../../../src/agent-collaboration/execution/task/task-execution-reference.js";
import { AgentMemoryLayout } from "../../../src/agent-memory/store/agent-memory-layout.js";
import { AgentRunMetadataStore } from "../../../src/run-history/store/agent-run-metadata-store.js";
import { TaskAgentOwnFiles } from "../../../src/run-history/store/task-agent-own-files.js";
import { getTeamRunExecutionTreePath } from "../../../src/run-history/store/team-run-execution-tree-path.js";
import { emptyStandaloneRootTree, type StandaloneRootTreeSnapshot } from "../../../src/standalone-agent-run-root/domain/standalone-root-tree.js";
import { StandaloneRootPackageStore } from "../../../src/standalone-agent-run-root/persistence/standalone-root-package-store.js";
import { getStandaloneRootTreePath } from "../../../src/standalone-agent-run-root/persistence/standalone-root-tree-path.js";
import { addStandaloneRootTaskExecution } from "../../../src/standalone-agent-run-root/services/standalone-root-tree-mutator.js";
import { InMemoryTaskExecutionResources } from "../../fixtures/task-execution-resource-fixtures.js";

/** Design SR-008 (DS-001): eligibility (each refusal changes nothing), steps 1–4, resumption, undo. */

const T0 = "2026-10-18T09:00:00.000Z";
const PM = "pm-run";
const WORKSPACE = "/work/superrepo";
const launch = { runtimeKind: "codex_app_server", llmModelIdentifier: "gpt-5", llmConfig: null, autoExecuteTools: true, workspaceRootPath: WORKSPACE };
const AGENT = { agentRunId: "designer-run" } as const;
const TEAM = { teamRunId: "team-run" } as const;

const roots: string[] = [];
afterEach(async () => { vi.restoreAllMocks(); await Promise.all(roots.splice(0).map((root) => fs.rm(root, { recursive: true, force: true }))); });
const readJson = async (file: string) => JSON.parse(await fs.readFile(file, "utf8"));

/** The run directory the adoption reads, over runs the test writes (the process one reads the history catalogs). */
class FakeRuns implements HandStartedRuns {
  readonly facts = new Map<string, HandStartedRun>();
  readonly listed = new Set<string>();
  readonly released: string[] = [];
  readonly readmitted: string[] = [];
  busy = false;
  constructor(private readonly memory: string) {}
  private key(target: TaskExecutionReference) { return "agentRunId" in target ? target.agentRunId : target.teamRunId; }
  async find(target: TaskExecutionReference) {
    const run = this.facts.get(this.key(target));
    // Like the process one: a run whose own file names a coordinating run is not one the user started (G1 / G2).
    if (!run || await new TaskAgentOwnFiles(this.memory).coordinatingRunOf(target)) return { found: false as const, message: `${this.key(target)} is not a run the user started on this node.` };
    return { found: true as const, run };
  }
  async isBusy() { return this.busy; }
  async release(target: TaskExecutionReference) { if (this.busy) return "busy" as const; this.released.push(this.key(target)); return "released" as const; }
  async removeFromHistory(target: TaskExecutionReference) { this.listed.delete(this.key(target)); }
  async isListed(target: TaskExecutionReference) { return this.listed.has(this.key(target)); }
  async readmit(target: TaskExecutionReference) { this.readmitted.push(this.key(target)); }
}

const agentFacts = (extra: Partial<HandStartedRun> = {}): HandStartedRun => ({ execution: AGENT, kind: "agent", definitionId: "solution-designer",
  workspaces: [WORKSPACE], applicationBound: false, archived: false, ownTaskExecutions: 0, ingressAgentRunId: AGENT.agentRunId, ...extra });
const teamFacts = (extra: Partial<HandStartedRun> = {}): HandStartedRun => ({ execution: TEAM, kind: "agent_team", definitionId: "software-engineering-team",
  workspaces: [WORKSPACE, WORKSPACE], applicationBound: false, archived: false, ownTaskExecutions: 0, ingressAgentRunId: "team-run-sd", ...extra });

const fixture = async (options: Readonly<{ pm?: string }> = {}) => {
  const memory = await fs.mkdtemp(path.join(os.tmpdir(), "adoption-")); roots.push(memory);
  const layout = new AgentMemoryLayout(memory);
  const pm = options.pm ?? PM;
  const root = createAgentRootExecutionIdentity(pm);
  const collaborationDir = layout.getAgentRunCollaborationDirPath(pm);
  const store = new StandaloneRootPackageStore();
  let tree: StandaloneRootTreeSnapshot = emptyStandaloneRootTree({ host: { address: "/project_task_manager" as never, agentRunId: pm, agentDefinitionId: "ptm" }, createdAt: T0 });
  const commitAdopted = vi.fn(async (record: Parameters<AdoptionDelegatorRoot["commitAdopted"]>[0]) => {
    const next = addStandaloneRootTaskExecution({ tree, execution: record });
    const written = await store.writeTree(collaborationDir, next);
    if (written.outcome !== "committed") return { committed: false as const, message: "tree not written" };
    tree = next;
    return { committed: true as const };
  });
  const delegator: AdoptionDelegatorRoot = {
    root, workspaceRootPath: WORKSPACE,
    catalogAddressOf: async (kind, definitionId) => ({ "agent:solution-designer": "/solution_designer", "agent_team:software-engineering-team": "/software_engineering_team" } as Record<string, string>)[`${kind}:${definitionId}`] as never ?? null,
    containsTaskExecution: (execution) => tree.taskExecutions.some((task) => "agentRunId" in execution ? "agentRunId" in task && task.agentRunId === execution.agentRunId
      : "teamRunId" in task && task.teamRunId === execution.teamRunId),
    commitAdopted,
  };
  const runs = new FakeRuns(memory);
  const ownFiles = new TaskAgentOwnFiles(memory);
  const adoption = new HandStartedRunAdoption({ delegator, runs, ownFiles });
  const resources = new InMemoryTaskExecutionResources();
  resources.addTask("task-10", "Work Journal", "autobyteus-10");
  const metadataPath = new AgentRunMetadataStore(memory).getMetadataPath(AGENT.agentRunId);
  const teamTreePath = getTeamRunExecutionTreePath(layout.getTeamDirPath({ rootTeamRunId: TEAM.teamRunId, ancestorTeamRunIds: [] }));
  const writeAgentRun = async () => {
    await fs.mkdir(path.dirname(metadataPath), { recursive: true });
    await fs.writeFile(metadataPath, JSON.stringify({ runId: AGENT.agentRunId, agentDefinitionId: "solution-designer", workspaceRootPath: WORKSPACE,
      memoryDir: path.dirname(metadataPath), llmModelIdentifier: "gpt-5", llmConfig: null, autoExecuteTools: true, runtimeKind: "codex_app_server",
      platformAgentRunId: "thread-a", startedAt: T0, preparedAt: T0, applicationExecutionContext: null }, null, 2));
    runs.facts.set(AGENT.agentRunId, agentFacts()); runs.listed.add(AGENT.agentRunId);
  };
  const writeTeamRun = async () => {
    await fs.mkdir(path.dirname(teamTreePath), { recursive: true });
    await fs.writeFile(teamTreePath, JSON.stringify({ createdAt: T0, archivedAt: null, applicationBinding: null,
      handoffs: [{ from: "/solution_designer", to: "/implementation_engineer", rules: ["When ready."] }],
      rootTeam: { address: "/", teamDefinitionId: "software-engineering-team", teamDefinitionName: "Software Engineering Team", teamRunId: TEAM.teamRunId,
        coordinatorAddress: "/solution_designer", defaultLaunchConfiguration: launch, members: [
          { address: "/solution_designer", agentDefinitionId: "solution-designer", role: "Designer", description: "Designs.", agentRunId: "team-run-sd", platformAgentRunId: "thread-sd", launchConfiguration: launch },
          { address: "/implementation_engineer", agentDefinitionId: "implementation-engineer", role: null, description: null, agentRunId: "team-run-ie", platformAgentRunId: null, launchConfiguration: launch },
        ], taskExecutions: [] } }, null, 2));
    runs.facts.set(TEAM.teamRunId, teamFacts()); runs.listed.add(TEAM.teamRunId);
  };
  const request = (execution: TaskExecutionReference, delegatorAgentRunId = pm) => ({ delegatorAgentRunId, execution, taskId: "task-10" });
  return { memory, layout, root, adoption, runs, resources, ownFiles, delegator, commitAdopted, request, metadataPath, teamTreePath, writeAgentRun, writeTeamRun,
    treeFile: () => getStandaloneRootTreePath(collaborationDir), tree: () => tree };
};

describe("eligibility: each refusal is clear and changes nothing", () => {
  const refusals: Array<[string, (f: Awaited<ReturnType<typeof fixture>>) => void, string | RegExp]> = [
    ["a delegator that is not the run itself (a task agent or member)", () => undefined, "Only a standalone agent run can give a Task to a run the user started."],
    ["another workspace", (f) => f.runs.facts.set(AGENT.agentRunId, agentFacts({ workspaces: ["/work/other"] })), "another workspace"],
    ["a launch without a workspace", (f) => f.runs.facts.set(AGENT.agentRunId, agentFacts({ workspaces: [null] })), "another workspace"],
    ["delegated runs of its own (REQ-007)", (f) => f.runs.facts.set(AGENT.agentRunId, agentFacts({ ownTaskExecutions: 2 })), "has delegated runs of its own"],
    ["a run bound to an application", (f) => f.runs.facts.set(AGENT.agentRunId, agentFacts({ applicationBound: true })), "belongs to an application"],
    ["an archived run", (f) => f.runs.facts.set(AGENT.agentRunId, agentFacts({ archived: true })), "unarchive it first"],
    ["a definition no longer in the catalog", (f) => f.runs.facts.set(AGENT.agentRunId, agentFacts({ definitionId: "retired" })), "no longer in the catalog"],
    ["a run in the middle of a turn", (f) => { f.runs.busy = true; }, "try again when it is idle"],
    ["a run unknown to this node", (f) => f.runs.facts.delete(AGENT.agentRunId), "is not a run the user started"],
  ];
  it.each(refusals)("refuses %s", async (label, arrange, message) => {
    const f = await fixture();
    await f.writeAgentRun();
    arrange(f);
    const before = await fs.readFile(f.metadataPath, "utf8");
    const sender = label.startsWith("a delegator") ? "task-agent-run" : PM;
    await expect(f.adoption.admit(f.request(AGENT, sender), f.resources)).rejects.toMatchObject({ code: "TASK_COPY_NOT_ASSIGNABLE", message: expect.stringMatching(message) });
    expect(f.resources.adoptions).toEqual([]);
    expect(await fs.readFile(f.metadataPath, "utf8")).toBe(before);
    expect(f.runs.released).toEqual([]);
  });

  it("refuses a run that already works on a Task (an open entry not of this adoption)", async () => {
    const f = await fixture();
    await f.writeAgentRun();
    f.resources.addTask("task-other");
    await f.resources.assignAdoptedRun({ hostRoot: createAgentRootExecutionIdentity("other-pm"), execution: AGENT, taskId: "task-other",
      assignedBy: "other-pm", recipientAddress: "/solution_designer" });
    await expect(f.adoption.admit(f.request(AGENT), f.resources)).rejects.toThrow("already works on a Task");
    expect(f.resources.adoptions).toHaveLength(1);
  });
});

describe("steps 1–4 make the run the delegator's task agent without rewriting its facts", () => {
  it("adopts an agent run: entry starting, hand-off, `taskAgent` added, link only, history row removed", async () => {
    const f = await fixture();
    await f.writeAgentRun();
    const original = await readJson(f.metadataPath);
    await f.adoption.admit(f.request(AGENT), f.resources);
    expect(f.resources.adoptions).toEqual([expect.objectContaining({ hostRoot: f.root, execution: AGENT, assignedBy: PM, recipientAddress: "/solution_designer" })]);
    expect(f.resources.entry(AGENT)).toMatchObject({ open: true, start: "starting" });
    const target = await f.adoption.complete(f.request(AGENT));
    expect(target).toEqual({ root: f.root, execution: AGENT, ingressAgentRunId: AGENT.agentRunId });
    expect(f.runs.released).toEqual([AGENT.agentRunId]);
    // The own file gained only `taskAgent`; the commit wrote only the link (every other key, `preparedAt` included, kept).
    expect(await readJson(f.metadataPath)).toEqual({ ...original, taskAgent: { coordinatingRun: { kind: "agent", runId: PM },
      delegatorAgentRunId: PM, address: "/solution_designer", origin: "catalog" } });
    expect((await readJson(f.treeFile())).taskExecutions).toEqual([{ address: "/solution_designer", agentRunId: AGENT.agentRunId, delegatorAgentRunId: PM, startedAt: T0 }]);
    expect(f.tree().taskExecutions).toEqual([expect.objectContaining({ agentRunId: AGENT.agentRunId, platformAgentRunId: "thread-a",
      source: expect.objectContaining({ agentDefinitionId: "solution-designer", launchConfiguration: launch }) })]);
    expect(await f.runs.isListed(AGENT)).toBe(false);
  });

  it("adopts a team run: its addresses move under the catalog address, every other key stays, the commit writes only the link", async () => {
    const f = await fixture();
    await f.writeTeamRun();
    await f.adoption.admit(f.request(TEAM), f.resources);
    expect(f.resources.adoptions[0]).toMatchObject({ teamCoordinatorAgentRunId: "team-run-sd", recipientAddress: "/software_engineering_team" });
    const target = await f.adoption.complete(f.request(TEAM));
    expect(target.ingressAgentRunId).toBe("team-run-sd");
    const ownAfterStep3 = await fs.readFile(f.teamTreePath, "utf8");
    const own = JSON.parse(ownAfterStep3);
    expect(own.rootTeam).toMatchObject({ address: "/software_engineering_team", teamDefinitionName: "Software Engineering Team",
      coordinatorAddress: "/software_engineering_team/solution_designer",
      members: [expect.objectContaining({ address: "/software_engineering_team/solution_designer", role: "Designer", description: "Designs." }),
        expect.objectContaining({ address: "/software_engineering_team/implementation_engineer" })] });
    expect(own.handoffs).toEqual([{ from: "/software_engineering_team/solution_designer", to: "/software_engineering_team/implementation_engineer", rules: ["When ready."] }]);
    expect((await readJson(f.treeFile())).taskExecutions).toEqual([{ address: "/software_engineering_team", teamRunId: TEAM.teamRunId, delegatorAgentRunId: PM, startedAt: T0 }]);
    // Link-time equality (review note): a later save of the same tree leaves the own file byte-identical.
    await new StandaloneRootPackageStore().writeTree(path.dirname(f.treeFile()), f.tree());
    expect(await fs.readFile(f.teamTreePath, "utf8")).toBe(ownAfterStep3);
  });
});

describe("a stopped adoption is finished by the same delegator's retry (DEC-109, ARCH-F-001)", () => {
  const stops = ["after step 1", "after step 2", "inside step 3 (own file, no link)", "after step 3 (link, history row kept)"] as const;
  it.each(stops)("continues %s", async (stop) => {
    const f = await fixture();
    await f.writeAgentRun();
    await f.adoption.admit(f.request(AGENT), f.resources);
    if (stop !== "after step 1") await f.runs.release(AGENT);
    if (stop.startsWith("inside step 3") || stop.startsWith("after step 3")) {
      await f.ownFiles.adoptOwnFile(AGENT, { coordinatingRun: { kind: "agent", runId: PM }, delegatorAgentRunId: PM, address: "/solution_designer" as never, origin: "catalog" });
    }
    if (stop.startsWith("after step 3")) {
      const state = await f.ownFiles.readAgent(AGENT.agentRunId);
      if (state.kind !== "present") throw new Error("own file");
      const { composeTaskAgentRecord } = await import("../../../src/run-history/store/task-agent-own-records.js");
      await f.delegator.commitAdopted(composeTaskAgentRecord({ address: "/solution_designer" as never, agentRunId: AGENT.agentRunId, delegatorAgentRunId: PM, startedAt: T0 }, state.metadata));
    }
    // The retry: the open entry is recognized first (no second entry), and the first missing step continues.
    await f.adoption.admit(f.request(AGENT), f.resources);
    expect(f.resources.adoptions).toHaveLength(1);
    await f.adoption.complete(f.request(AGENT));
    expect(f.delegator.containsTaskExecution(AGENT)).toBe(true);
    expect(f.commitAdopted).toHaveBeenCalledTimes(1);
    expect(await f.runs.isListed(AGENT)).toBe(false);
    expect((await readJson(f.metadataPath)).taskAgent).toMatchObject({ coordinatingRun: { kind: "agent", runId: PM } });
  });

  it("returns 'not finished, retry' while the run is busy again at the hand-off, and the entry stays starting", async () => {
    const f = await fixture();
    await f.writeAgentRun();
    await f.adoption.admit(f.request(AGENT), f.resources);
    f.runs.busy = true;
    await expect(f.adoption.complete(f.request(AGENT))).rejects.toMatchObject({ code: "TASK_ADOPTION_NOT_FINISHED", message: expect.stringContaining("call delegate_task again") });
    expect(f.resources.entry(AGENT)).toMatchObject({ open: true, start: "starting" });
    f.runs.busy = false;
    await f.adoption.complete(f.request(AGENT));
    expect(f.delegator.containsTaskExecution(AGENT)).toBe(true);
  });

  it("refuses another delegator's retry of an adoption in progress", async () => {
    const f = await fixture();
    await f.writeAgentRun();
    await f.adoption.admit(f.request(AGENT), f.resources);
    const other = await fixture({ pm: "other-pm" });
    const adoption = new HandStartedRunAdoption({ delegator: { ...other.delegator, root: createAgentRootExecutionIdentity("other-pm") }, runs: f.runs, ownFiles: f.ownFiles });
    await expect(adoption.admit(f.request(AGENT, "other-pm"), f.resources)).rejects.toThrow("already works on a Task");
  });
});

describe("undo of an unfinished adoption after its Task closed (design SR-008)", () => {
  it("restores a team run stopped inside step 3 (root active), which is then listed again; a later adoption works", async () => {
    const f = await fixture();
    await f.writeTeamRun();
    const original = await readJson(f.teamTreePath);
    await f.adoption.admit(f.request(TEAM), f.resources);
    await f.ownFiles.adoptOwnFile(TEAM, { coordinatingRun: { kind: "agent", runId: PM }, delegatorAgentRunId: PM, address: "/software_engineering_team" as never, origin: "catalog" });
    f.resources.close("task-10");
    expect(await f.adoption.revertUnfinished(TEAM)).toBe(true);
    expect(await readJson(f.teamTreePath)).toEqual(original);
    expect(f.runs.readmitted).toEqual([TEAM.teamRunId]);
    // A closed entry never blocks a later adoption.
    f.resources.addTask("task-11");
    await f.adoption.admit({ delegatorAgentRunId: PM, execution: TEAM, taskId: "task-11" }, f.resources);
    expect(f.resources.entry(TEAM)).toMatchObject({ taskId: "task-11", open: true });
  });

  it("undoes nothing for a finished adoption, a run not listed (a new copy), or a run named by another root", async () => {
    const f = await fixture();
    await f.writeAgentRun();
    await f.adoption.admit(f.request(AGENT), f.resources);
    await f.adoption.complete(f.request(AGENT));
    expect(await f.adoption.revertUnfinished(AGENT)).toBe(false); // linked: finished
    await f.writeTeamRun();
    await f.ownFiles.adoptOwnFile(TEAM, { coordinatingRun: { kind: "agent", runId: PM }, origin: "catalog", address: "/software_engineering_team" as never });
    f.runs.listed.delete(TEAM.teamRunId);
    expect(await f.adoption.revertUnfinished(TEAM)).toBe(false); // not listed: never a hand-started run
    f.runs.listed.add(TEAM.teamRunId);
    const other = createAgentRootExecutionIdentity("other-pm");
    expect(await revertUnfinishedAdoptionOffline(f.memory, other, TEAM, f.runs)).toBe(false); // names PM, not other-pm
  });

  it("undoes it from the files when the delegator's root is not active", async () => {
    const f = await fixture();
    await f.writeAgentRun();
    const original = await readJson(f.metadataPath);
    await f.adoption.admit(f.request(AGENT), f.resources);
    await f.ownFiles.adoptOwnFile(AGENT, { coordinatingRun: { kind: "agent", runId: PM }, delegatorAgentRunId: PM, address: "/solution_designer" as never, origin: "catalog" });
    expect(await revertUnfinishedAdoptionOffline(f.memory, f.root, AGENT, f.runs)).toBe(true);
    expect(await readJson(f.metadataPath)).toEqual(original);
  });
});
