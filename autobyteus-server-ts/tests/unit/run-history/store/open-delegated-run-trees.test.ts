import { createHash } from "node:crypto";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AgentMemoryLayout } from "../../../../src/agent-memory/store/agent-memory-layout.js";
import { emptyStandaloneRootTree } from "../../../../src/standalone-agent-run-root/domain/standalone-root-tree.js";
import { StandaloneRootPackageStore } from "../../../../src/standalone-agent-run-root/persistence/standalone-root-package-store.js";
import { validateStandaloneRootTreePayload } from "../../../../src/standalone-agent-run-root/persistence/standalone-root-tree-schema.js";
import { AgentOrgRunExecutionTreeStore } from "../../../../src/run-history/store/agent-org-run-execution-tree-store.js";
import { validateAgentOrgRunExecutionTreePayload } from "../../../../src/run-history/store/agent-org-run-execution-tree-schema.js";
import { AtomicRunPackageFileCommitWriter } from "../../../../src/run-history/store/atomic-run-package-file-commit-writer.js";
import { TeamRunExecutionTreeStore } from "../../../../src/run-history/store/team-run-execution-tree-store.js";
import { validateTeamRunExecutionTreePayload } from "../../../../src/run-history/store/team-run-execution-tree-schema.js";
import { TaskAgentOwnFiles } from "../../../../src/run-history/store/task-agent-own-files.js";
import { TaskAgentMessageLogs, isMessageOfView } from "../../../../src/run-history/store/task-agent-message-logs.js";
import { projectTeamRunHistoryIndexRow } from "../../../../src/run-history/services/team-run-history-index-row-projector.js";
import { projectAgentOrgRunHistoryRow } from "../../../../src/run-history/services/agent-org-run-history-row-projector.js";
import { testAgentNode, testExecutionTree } from "../../../fixtures/current-team-run-fixtures.js";
import { testAgentOrgExecutionTree, testOrgAgentNode, testOrgLaunchConfiguration, testOrgTeamNode } from "../../../fixtures/current-agent-org-run-fixtures.js";
import { FixedOpenDelegatedRuns } from "../../../fixtures/open-delegated-run-sources.js";
import type { OpenDelegatedRunSource } from "../../../../src/run-history/store/open-delegated-run-source.js";

/**
 * autobyteus-469 D-1 … D-3, D-11, REQ-007: no top run stores a list of its local delegated runs. A tree read asks the
 * Task records (here a fixed source) for the open runs and composes them from their own files; a save writes own files
 * and only the links to runs on another node. Each case is small hand-built data per shape of the stored inventory
 * (evidence/unlink-cases-2026-11-10.txt): links of closed, open and no-Task runs, an older Org link in a configured
 * Team's list, a link to a run on another node.
 */

const T0 = "2026-11-01T10:00:00.000Z";
const T1 = "2026-11-01T11:00:00.000Z";
const launch = testOrgLaunchConfiguration("/workspace");
const roots: string[] = [];
afterEach(async () => {
  vi.restoreAllMocks();
  await Promise.all(roots.splice(0).map((root) => fs.rm(root, { recursive: true, force: true })));
});
const memoryRoot = async (): Promise<string> => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "open-delegated-run-trees-"));
  roots.push(root);
  return root;
};
const readJson = async (file: string): Promise<Record<string, any>> => JSON.parse(await fs.readFile(file, "utf8"));
const sha = async (file: string): Promise<string> => createHash("sha256").update(await fs.readFile(file)).digest("hex");
const listFiles = async (dir: string): Promise<string[]> => (await fs.readdir(dir, { recursive: true, withFileTypes: true }))
  .filter((entry) => entry.isFile()).map((entry) => path.join(entry.parentPath, entry.name)).sort();
const hashes = async (dir: string) => Object.fromEntries(await Promise.all((await listFiles(dir)).map(async (file) => [file, await sha(file)])));

const agentCopy = (agentRunId: string, delegator: string, startedAt = T0) => ({
  address: "/code_reviewer", agentRunId, platformAgentRunId: null, delegatorAgentRunId: delegator, startedAt,
  source: { kind: "agent", agentDefinitionId: "code-reviewer", launchConfiguration: launch },
});
const teamCopy = (teamRunId: string, delegator: string, startedAt = T1) => ({
  address: "/product_team", teamRunId, delegatorAgentRunId: delegator, startedAt, taskExecutions: [],
  members: [{ address: "/product_team/lead", agentRunId: `${teamRunId}-lead`, platformAgentRunId: null }],
  source: { kind: "agent_team", teamDefinitionId: "product-team", coordinatorAddress: "/product_team/lead",
    members: [{ address: "/product_team/lead", agentDefinitionId: "lead", launchConfiguration: launch, followsTeam: true }],
    handoffs: [], defaultLaunchConfiguration: launch },
});
/** The link an older build stored for a local run (what the user's trees still hold). */
const olderLocalLink = (record: Record<string, any>) => ({ address: record.address,
  ...(record.agentRunId ? { agentRunId: record.agentRunId } : { teamRunId: record.teamRunId }),
  delegatorAgentRunId: record.delegatorAgentRunId, startedAt: record.startedAt });
const storedRemote = (delegator: string) => ({ address: "/publisher", agentRunId: "remote-run", nodeId: "srv_peer_b", delegatorAgentRunId: delegator, startedAt: T0 });

type Kind = Readonly<{
  name: string;
  coordinating: Readonly<{ kind: "agent" | "agent_team" | "agent_org"; runId: string }>;
  delegator: string;
  dir(memory: string): string;
  treeFile(memory: string): string;
  /** A validated in-memory tree of this kind with these local records in its root list. */
  tree(records: readonly unknown[]): any;
  /** The stored root list of a raw tree file object; `set` replaces it. */
  rootList(raw: Record<string, any>): unknown[];
  setRootList(raw: Record<string, any>, list: unknown[]): void;
  store(source: OpenDelegatedRunSource | null, writer?: AtomicRunPackageFileCommitWriter): {
    read(dir: string, id: string): Promise<any>; readSync(dir: string, id: string): any; write(dir: string, tree: any): Promise<{ outcome: string }>;
    readTaskExecution(dir: string, id: string, run: { agentRunId: string } | { teamRunId: string }): Promise<unknown>;
  };
}>;

const HOST = "host-run";
const standalone: Kind = {
  name: "standalone agent run", coordinating: { kind: "agent", runId: HOST }, delegator: HOST,
  dir: (memory) => new AgentMemoryLayout(memory).getAgentRunCollaborationDirPath(HOST),
  treeFile: (memory) => path.join(new AgentMemoryLayout(memory).getAgentRunCollaborationDirPath(HOST), "collaboration_tree.json"),
  tree: (records) => validateStandaloneRootTreePayload({ ...emptyStandaloneRootTree({ host: { address: "/assistant" as never, agentRunId: HOST,
    agentDefinitionId: "assistant" }, createdAt: T0 }), taskExecutions: records }, HOST),
  rootList: (raw) => raw.taskExecutions, setRootList: (raw, list) => { raw.taskExecutions = list; },
  store: (source, writer) => {
    const store = new StandaloneRootPackageStore(writer, source);
    return { read: (dir, id) => store.readTree(dir, id), readSync: (dir, id) => store.readTreeSync(dir, id),
      write: (dir, tree) => store.writeTree(dir, tree), readTaskExecution: (dir, id, run) => store.readTaskExecution(dir, id, run) };
  },
};
const TEAM = "team-root";
const team: Kind = {
  name: "team run", coordinating: { kind: "agent_team", runId: TEAM }, delegator: "lead-run",
  dir: (memory) => new AgentMemoryLayout(memory).getTeamDirPath({ rootTeamRunId: TEAM, ancestorTeamRunIds: [] }),
  treeFile: (memory) => path.join(new AgentMemoryLayout(memory).getTeamDirPath({ rootTeamRunId: TEAM, ancestorTeamRunIds: [] }), "team_run_execution_tree.json"),
  tree: (records) => {
    const base = testExecutionTree({ rootTeamRunId: TEAM, coordinatorAddress: "/lead", children: [testAgentNode("/lead", { agentRunId: "lead-run" })] });
    return validateTeamRunExecutionTreePayload({ ...base, rootTeam: { ...base.rootTeam, taskExecutions: records } }, TEAM);
  },
  rootList: (raw) => raw.rootTeam.taskExecutions, setRootList: (raw, list) => { raw.rootTeam.taskExecutions = list; },
  store: (source, writer) => {
    const store = new TeamRunExecutionTreeStore(writer, source);
    return { read: (dir, id) => store.read(dir, id), readSync: (dir, id) => store.readSync(dir, id), write: (dir, tree) => store.write(dir, tree),
      readTaskExecution: (dir, id, run) => store.readTaskExecution(dir, id, run) };
  },
};
const ORG = "org-root";
const orgBase = () => testAgentOrgExecutionTree({ orgRunId: ORG, members: [testOrgAgentNode("/director", "director-run"),
  testOrgTeamNode({ address: "/team", teamRunId: "mounted", coordinatorAddress: "/team/lead", members: [testOrgAgentNode("/team/lead", "mounted-lead")] })] });
const org: Kind = {
  name: "org run", coordinating: { kind: "agent_org", runId: ORG }, delegator: "director-run",
  dir: (memory) => new AgentMemoryLayout(memory).getOrgDirPath(ORG),
  treeFile: (memory) => path.join(new AgentMemoryLayout(memory).getOrgDirPath(ORG), "agent_org_run_execution_tree.json"),
  tree: (records) => {
    const base = orgBase();
    return validateAgentOrgRunExecutionTreePayload({ ...base, rootOrg: { ...base.rootOrg, taskExecutions: records } }, ORG);
  },
  rootList: (raw) => raw.rootOrg.taskExecutions, setRootList: (raw, list) => { raw.rootOrg.taskExecutions = list; },
  store: (source) => {
    const store = new AgentOrgRunExecutionTreeStore(undefined, undefined, source);
    return { read: (dir, id) => store.read(dir, id), readSync: (dir, id) => store.readSync(dir, id), write: (dir, tree) => store.write(dir, tree),
      readTaskExecution: (dir, id, run) => store.readTaskExecution(dir, id, run) };
  },
};

/**
 * A top run as an older build left it: own files of an open Agent run, an open Team run, a closed run and a run with no
 * Task record, and a tree file listing all four plus a link to a run on another node.
 */
const olderTopRun = async (kind: Kind) => {
  const memory = await memoryRoot();
  const records = [agentCopy("open-agent", kind.delegator), teamCopy("open-team", kind.delegator),
    agentCopy("closed-agent", kind.delegator), agentCopy("no-task-agent", kind.delegator)];
  const writeAll = new FixedOpenDelegatedRuns();
  await kind.store(writeAll).write(kind.dir(memory), kind.tree(records));
  const raw = await readJson(kind.treeFile(memory));
  kind.setRootList(raw, [...records.map(olderLocalLink), storedRemote(kind.delegator)]);
  await fs.writeFile(kind.treeFile(memory), JSON.stringify(raw, null, 2));
  const source = new FixedOpenDelegatedRuns().set(kind.coordinating, [{ agentRunId: "open-agent" }, { teamRunId: "open-team" }]);
  return { memory, records, source, dir: kind.dir(memory) };
};
const runIds = (tree: any, kind: Kind): string[] => kind.rootList(tree).map((task: any) => task.agentRunId ?? task.teamRunId);
const remoteRunIds = (tree: any): string[] => {
  const holder = tree.rootTeam ?? tree.rootOrg ?? tree;
  return (holder.remoteTaskExecutions ?? []).map((link: any) => link.agentRunId);
};

describe.each([standalone, team, org])("a $name's tree is composed from the Task records (D-1, D-2, AC-009)", (kind) => {
  it("holds the runs of open Tasks and the run on another node; the read writes nothing", async () => {
    const f = await olderTopRun(kind);
    const before = await hashes(f.memory);
    const write = vi.spyOn(AtomicRunPackageFileCommitWriter.prototype, "write");
    const tree = await kind.store(f.source).read(f.dir, kind.coordinating.runId);
    expect(runIds(tree, kind)).toEqual(["open-agent", "open-team"]);
    expect(remoteRunIds(tree)).toEqual(["remote-run"]);
    expect(kind.store(f.source).readSync(f.dir, kind.coordinating.runId)).toEqual(tree);
    expect(write).not.toHaveBeenCalled();
    expect(await hashes(f.memory)).toEqual(before);
  });

  it("the first save leaves out the older local entries; the link to another node and every run's own files stay byte-identical", async () => {
    const f = await olderTopRun(kind);
    const ownFilesBefore = { agents: await hashes(path.join(f.memory, "agents")), teams: await hashes(path.join(f.memory, "agent_teams")) };
    const store = kind.store(f.source);
    const tree = await store.read(f.dir, kind.coordinating.runId);
    expect((await store.write(f.dir, tree)).outcome).toBe("committed");
    expect(kind.rootList(await readJson(kind.treeFile(f.memory)))).toEqual([storedRemote(kind.delegator)]);
    const ownAgents = Object.fromEntries(Object.entries(await hashes(path.join(f.memory, "agents"))).filter(([file]) => !file.includes(`${HOST}${path.sep}collaboration`)));
    expect(ownAgents).toEqual(Object.fromEntries(Object.entries(ownFilesBefore.agents).filter(([file]) => !file.includes(`${HOST}${path.sep}collaboration`))));
    expect(await hashes(path.join(f.memory, "agent_teams"))).toEqual(ownFilesBefore.teams);
    // A later save finds nothing to write.
    const treeFile = await sha(kind.treeFile(f.memory));
    const write = vi.spyOn(AtomicRunPackageFileCommitWriter.prototype, "write");
    expect((await store.write(f.dir, await store.read(f.dir, kind.coordinating.runId))).outcome).toBe("committed");
    expect(write).not.toHaveBeenCalled();
    expect(await sha(kind.treeFile(f.memory))).toBe(treeFile);
  });

  it("reads no own file of a run of a closed Task (AC-010, QR-001)", async () => {
    const f = await olderTopRun(kind);
    const agents = vi.spyOn(TaskAgentOwnFiles.prototype, "readAgent");
    const teams = vi.spyOn(TaskAgentOwnFiles.prototype, "readTeam");
    await kind.store(f.source).read(f.dir, kind.coordinating.runId);
    expect(agents.mock.calls.map(([id]) => id)).toEqual(["open-agent"]);
    expect(teams.mock.calls.map(([id]) => id)).toEqual(["open-team"]);
  });

  it("a run that is open again is composed back from its own file; a missing own file warns only for a started run", async () => {
    const f = await olderTopRun(kind);
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const source = new FixedOpenDelegatedRuns().set(kind.coordinating, [{ agentRunId: "closed-agent" },
      { run: { agentRunId: "starting-agent" }, started: false }, { run: { agentRunId: "failed-agent" }, started: false },
      { agentRunId: "lost-agent" }]);
    const tree = await kind.store(source).read(f.dir, kind.coordinating.runId);
    expect(runIds(tree, kind)).toEqual(["closed-agent"]);
    expect(warn.mock.calls.flat().join("\n")).toMatch(/lost-agent.*own file is missing/);
    expect(warn.mock.calls.flat().join("\n")).not.toMatch(/starting-agent|failed-agent/);
    expect(await kind.store(source).readTaskExecution(f.dir, kind.coordinating.runId, { agentRunId: "closed-agent" }))
      .toEqual(kind.rootList(kind.tree([agentCopy("closed-agent", kind.delegator)]))[0]);
    await expect(kind.store(source).readTaskExecution(f.dir, kind.coordinating.runId, { agentRunId: "lost-agent" })).rejects.toThrow("own file is missing");
  });

  it("refuses a composed read before the Task records are bound", async () => {
    const f = await olderTopRun(kind);
    await expect(kind.store(null).read(f.dir, kind.coordinating.runId)).rejects.toThrow("before the Task records were loaded");
  });
});

describe("an Org run's older entry in a configured Team's list (U-004, FU-003)", () => {
  it("is ignored: open runs go to the root list, the configured list stays empty, and the save leaves the entry out", async () => {
    const f = await olderTopRun(org);
    const raw = await readJson(org.treeFile(f.memory));
    const older = olderLocalLink(agentCopy("older-under-team", "mounted-lead"));
    raw.rootOrg.members[1].taskExecutions = [older];
    await fs.writeFile(org.treeFile(f.memory), JSON.stringify(raw));
    const store = org.store(f.source);
    const tree = await store.read(f.dir, ORG);
    expect(runIds(tree, org)).toEqual(["open-agent", "open-team"]);
    expect(tree.rootOrg.members[1].taskExecutions).toEqual([]);
    await store.write(f.dir, tree);
    expect((await readJson(org.treeFile(f.memory))).rootOrg.members[1].taskExecutions).toEqual([]);
  });
});

describe("a Team or Org run's own parts (D-11, U-009)", () => {
  it.each([team, org])("reads only the $name's tree file, never asks the Task records, and projects the same history row", async (kind) => {
    const f = await olderTopRun(kind);
    const asked = vi.fn(() => { throw new Error("asked"); });
    const store = kind === team ? new TeamRunExecutionTreeStore(undefined, { openDelegatedRunsOf: asked })
      : new AgentOrgRunExecutionTreeStore(undefined, undefined, { openDelegatedRunsOf: asked });
    const agents = vi.spyOn(TaskAgentOwnFiles.prototype, "readAgent");
    const own = await store.readOwnParts(f.dir, kind.coordinating.runId);
    expect(asked).not.toHaveBeenCalled();
    expect(agents).not.toHaveBeenCalled();
    expect(runIds(own, kind)).toEqual([]);
    expect(remoteRunIds(own)).toEqual([]);
    const composed = await kind.store(f.source).read(f.dir, kind.coordinating.runId);
    if (kind === team) expect(projectTeamRunHistoryIndexRow({ tree: own as never })).toEqual(projectTeamRunHistoryIndexRow({ tree: composed }));
    else expect(projectAgentOrgRunHistoryRow(own as never)).toEqual(projectAgentOrgRunHistoryRow(composed));
  });

  it("an unreadable tree file fails the read and stays untouched", async () => {
    const f = await olderTopRun(team);
    await fs.writeFile(team.treeFile(f.memory), "{ not json");
    await expect(new TeamRunExecutionTreeStore().readOwnParts(f.dir, TEAM)).rejects.toThrow();
    expect(await fs.readFile(team.treeFile(f.memory), "utf8")).toBe("{ not json");
  });
});

describe("the message view keeps an own agent's messages with a run that left the tree (D-5, AC-011)", () => {
  const message = (messageId: string, senderAgentRunId: string, receiverAgentRunId: string, createdAt = T0) => ({
    messageId, senderAgentRunId, receiverAgentRunId, content: messageId, messageType: "agent_message", referenceFiles: [], createdAt });

  it("isMessageOfView: both agents in the tree, or one is an own agent", () => {
    const own = new Set(["host"]), tree = new Set(["host", "open"]);
    expect(isMessageOfView(message("a", "host", "closed"), own, tree)).toBe(true);
    expect(isMessageOfView(message("b", "open", "host"), own, tree)).toBe(true);
    expect(isMessageOfView(message("c", "open", "closed"), own, tree)).toBe(false);
  });

  it("a standalone run's stored view: the host's log with closed runs, the open runs' logs, and no log of a closed run is read", async () => {
    const f = await olderTopRun(standalone);
    const store = new StandaloneRootPackageStore(undefined, f.source);
    await store.writeMessages(f.dir, { schemaVersion: 1, subjectKind: "agent", hostRunId: HOST, messages: [
      message("host-to-closed", HOST, "closed-agent", T0), message("host-to-open", HOST, "open-agent", T1)] });
    const logs = new TaskAgentMessageLogs(f.memory);
    await logs.append({ kind: "task_agent", agentRunId: "open-agent" }, message("open-to-closed", "open-agent", "closed-agent", T1));
    await logs.append({ kind: "task_agent", agentRunId: "closed-agent" }, message("closed-only", "closed-agent", "no-task-agent", T1));
    const read = vi.spyOn(TaskAgentMessageLogs.prototype, "read");
    const tree = (await store.readTree(f.dir, HOST))!;
    const view = await store.readMessages(f.dir, tree);
    expect(view!.messages.map((entry) => entry.messageId)).toEqual(["host-to-closed", "host-to-open"]);
    expect(read.mock.calls.map(([owner]) => owner)).toEqual([
      { kind: "task_agent", agentRunId: "open-agent" }, { kind: "task_agent_team", teamRunId: "open-team" }]);
  });
});
