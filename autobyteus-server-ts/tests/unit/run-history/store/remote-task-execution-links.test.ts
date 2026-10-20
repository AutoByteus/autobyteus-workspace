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
import { TeamRunExecutionTreeStore } from "../../../../src/run-history/store/team-run-execution-tree-store.js";
import { validateTeamRunExecutionTreePayload } from "../../../../src/run-history/store/team-run-execution-tree-schema.js";
import { resetRootRunPackageReadinessIndex } from "../../../../src/run-history/services/root-run-package-readiness-index.js";
import { testAgentNode, testExecutionTree } from "../../../fixtures/current-team-run-fixtures.js";
import { testAgentOrgExecutionTree, testOrgAgentNode, testOrgLaunchConfiguration } from "../../../fixtures/current-agent-org-run-fixtures.js";

/**
 * Design § On-Disk Data Model item 4 and § Remote Links In Memory (AR-001, N-7, RSK-108): a remote link is a
 * `taskExecutions` entry with `nodeId` on disk, loaded into `remoteTaskExecutions` in memory, written once
 * and kept unchanged by every later save, for each of the three coordinating tree kinds.
 */

const T0 = "2026-10-20T10:00:00.000Z";
const T1 = "2026-10-20T10:05:00.000Z";
const launch = testOrgLaunchConfiguration("/workspace");
const roots: string[] = [];
afterEach(async () => {
  vi.restoreAllMocks();
  await Promise.all(roots.splice(0).map((root) => { resetRootRunPackageReadinessIndex(root); return fs.rm(root, { recursive: true, force: true }); }));
});
const memoryRoot = async (): Promise<string> => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "remote-links-"));
  roots.push(root);
  return root;
};
const readJson = async (file: string): Promise<Record<string, any>> => JSON.parse(await fs.readFile(file, "utf8"));
const writeJson = (file: string, value: unknown) => fs.writeFile(file, JSON.stringify(value, null, 2));

const localCopy = (agentRunId: string, delegator: string) => ({
  address: "/code_reviewer", agentRunId, platformAgentRunId: null, delegatorAgentRunId: delegator, startedAt: T0,
  source: { kind: "agent", agentDefinitionId: "code-reviewer", launchConfiguration: launch },
});
const remoteLink = (agentRunId: string, delegator: string, startedAt = T0) => ({
  address: "/publisher", agentRunId, nodeId: "srv_peer_b", delegatorAgentRunId: delegator, startedAt,
});
const storedLocalLink = (agentRunId: string, delegator: string) => ({ address: "/code_reviewer", agentRunId, delegatorAgentRunId: delegator, startedAt: T0 });

type Kind = Readonly<{
  name: string;
  delegator: string;
  /** A fresh tree of this kind with the given local copies and remote links (validated, in memory). */
  tree(local: unknown[], remote: unknown[]): unknown;
  dir(memory: string): string;
  file(dir: string): string;
  write(dir: string, tree: unknown): Promise<{ outcome: string }>;
  read(dir: string): Promise<any>;
  /** The on-disk root task list of a raw tree file. */
  rootList(raw: Record<string, any>): unknown[];
  withRootList(raw: Record<string, any>, list: unknown[]): Record<string, any>;
  memoryHolder(tree: any): any;
}>;

const HOST = "host-run";
const standaloneKind: Kind = {
  name: "standalone Agent run",
  delegator: HOST,
  tree: (local, remote) => validateStandaloneRootTreePayload({
    ...emptyStandaloneRootTree({ host: { address: "/assistant" as never, agentRunId: HOST, agentDefinitionId: "assistant" }, createdAt: T0 }),
    taskExecutions: local, remoteTaskExecutions: remote,
  }, HOST),
  dir: (memory) => new AgentMemoryLayout(memory).getAgentRunCollaborationDirPath(HOST),
  file: (dir) => path.join(dir, "collaboration_tree.json"),
  write: (dir, tree) => new StandaloneRootPackageStore().writeTree(dir, tree as never),
  read: (dir) => new StandaloneRootPackageStore().readTree(dir, HOST),
  rootList: (raw) => raw.taskExecutions,
  withRootList: (raw, list) => ({ ...raw, taskExecutions: list }),
  memoryHolder: (tree) => tree,
};

const teamBase = () => testExecutionTree({ rootTeamRunId: "team-root", coordinatorAddress: "/lead",
  children: [testAgentNode("/lead", { agentRunId: "lead-run" }), testAgentNode("/writer", { agentRunId: "writer-run" })] });
const teamKind: Kind = {
  name: "Team run",
  delegator: "lead-run",
  tree: (local, remote) => {
    const base = teamBase();
    return validateTeamRunExecutionTreePayload({ ...base, rootTeam: { ...base.rootTeam, taskExecutions: local, remoteTaskExecutions: remote } }, "team-root");
  },
  dir: (memory) => new AgentMemoryLayout(memory).getTeamDirPath({ rootTeamRunId: "team-root", ancestorTeamRunIds: [] }),
  file: (dir) => path.join(dir, "team_run_execution_tree.json"),
  write: (dir, tree) => new TeamRunExecutionTreeStore().write(dir, tree as never),
  read: (dir) => new TeamRunExecutionTreeStore().read(dir, "team-root"),
  rootList: (raw) => raw.rootTeam.taskExecutions,
  withRootList: (raw, list) => ({ ...raw, rootTeam: { ...raw.rootTeam, taskExecutions: list } }),
  memoryHolder: (tree) => tree.rootTeam,
};

const orgBase = () => testAgentOrgExecutionTree({ orgRunId: "org-root", members: [testOrgAgentNode("/director", "director-run")] });
const orgKind: Kind = {
  name: "Org run",
  delegator: "director-run",
  tree: (local, remote) => {
    const base = orgBase();
    return validateAgentOrgRunExecutionTreePayload({ ...base, rootOrg: { ...base.rootOrg, taskExecutions: local, remoteTaskExecutions: remote } }, "org-root");
  },
  dir: (memory) => new AgentMemoryLayout(memory).getOrgDirPath("org-root"),
  file: (dir) => path.join(dir, "agent_org_run_execution_tree.json"),
  write: (dir, tree) => new AgentOrgRunExecutionTreeStore().write(dir, tree as never),
  read: (dir) => new AgentOrgRunExecutionTreeStore().read(dir, "org-root"),
  rootList: (raw) => raw.rootOrg.taskExecutions,
  withRootList: (raw, list) => ({ ...raw, rootOrg: { ...raw.rootOrg, taskExecutions: list } }),
  memoryHolder: (tree) => tree.rootOrg,
};

describe.each([standaloneKind, teamKind, orgKind])("remote links in a $name tree", (kind) => {
  it("stores a remote link as a taskExecutions entry with nodeId (exact keys) and loads it into remoteTaskExecutions only", async () => {
    const dir = kind.dir(await memoryRoot());
    const tree = kind.tree([localCopy("reviewer-run", kind.delegator)], [remoteLink("publisher_7f3", kind.delegator)]);
    expect((await kind.write(dir, tree)).outcome).toBe("committed");

    const raw = await readJson(kind.file(dir));
    expect(kind.rootList(raw)).toEqual([storedLocalLink("reviewer-run", kind.delegator), remoteLink("publisher_7f3", kind.delegator)]);
    expect(Object.keys(kind.rootList(raw)[1] as object)).toEqual(["address", "agentRunId", "nodeId", "delegatorAgentRunId", "startedAt"]);
    expect(JSON.stringify(raw)).not.toContain("remoteTaskExecutions");
    // No folder is created on this node for the remote run.
    await expect(fs.access(path.join(dir, "..", "..", "agents", "publisher_7f3"))).rejects.toThrow();

    const loaded = await kind.read(dir);
    expect(loaded).toEqual(tree);
    expect(kind.memoryHolder(loaded).taskExecutions.map((task: { agentRunId: string }) => task.agentRunId)).toEqual(["reviewer-run"]);
    expect(kind.memoryHolder(loaded).remoteTaskExecutions).toEqual([remoteLink("publisher_7f3", kind.delegator)]);
  });

  it("keeps a stored remote link unchanged and in place on every later save, and appends a new one (RSK-108)", async () => {
    const dir = kind.dir(await memoryRoot());
    await kind.write(dir, kind.tree([], [remoteLink("first", kind.delegator)]));
    const loaded = await kind.read(dir);
    const next = kind.tree([localCopy("reviewer-run", kind.delegator)],
      [...kind.memoryHolder(loaded).remoteTaskExecutions, remoteLink("second", kind.delegator, T1)]);
    expect((await kind.write(dir, next)).outcome).toBe("committed");
    expect(kind.rootList(await readJson(kind.file(dir)))).toEqual([
      remoteLink("first", kind.delegator), storedLocalLink("reviewer-run", kind.delegator), remoteLink("second", kind.delegator, T1),
    ]);
    expect(kind.memoryHolder(await kind.read(dir)).remoteTaskExecutions.map((link: { agentRunId: string }) => link.agentRunId)).toEqual(["first", "second"]);
  });

  it("partitions a tree whose only link is remote (no own file to compose; N-7)", async () => {
    const dir = kind.dir(await memoryRoot());
    await kind.write(dir, kind.tree([], []));
    const raw = await readJson(kind.file(dir));
    await writeJson(kind.file(dir), kind.withRootList(raw, [remoteLink("only-remote", kind.delegator)]));
    const loaded = await kind.read(dir);
    expect(kind.memoryHolder(loaded).taskExecutions).toEqual([]);
    expect(kind.memoryHolder(loaded).remoteTaskExecutions).toEqual([remoteLink("only-remote", kind.delegator)]);
  });

  it("leaves out an unreadable remote link or one whose delegator is not in the tree, with a warning; the save keeps it on disk", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const dir = kind.dir(await memoryRoot());
    await kind.write(dir, kind.tree([localCopy("reviewer-run", kind.delegator)], []));
    const raw = await readJson(kind.file(dir));
    const broken = { address: "/publisher", agentRunId: "broken", nodeId: "srv_peer_b", startedAt: T0 };
    const orphan = remoteLink("orphan", "not-in-this-tree");
    await writeJson(kind.file(dir), kind.withRootList(raw, [...kind.rootList(raw), broken, orphan]));

    const loaded = await kind.read(dir);
    expect(kind.memoryHolder(loaded).taskExecutions.map((task: { agentRunId: string }) => task.agentRunId)).toEqual(["reviewer-run"]);
    expect(kind.memoryHolder(loaded).remoteTaskExecutions).toEqual([]);
    expect(warn.mock.calls.map(([line]) => String(line)).join("\n")).toMatch(/Remote run 'broken'[\s\S]*Remote run 'orphan'/);

    await kind.write(dir, kind.tree([localCopy("reviewer-run", kind.delegator)], []));
    expect(kind.rootList(await readJson(kind.file(dir)))).toEqual([storedLocalLink("reviewer-run", kind.delegator), broken, orphan]);
  });
});
