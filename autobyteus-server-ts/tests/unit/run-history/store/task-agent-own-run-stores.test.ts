import { createHash } from "node:crypto";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AgentMemoryLayout } from "../../../../src/agent-memory/store/agent-memory-layout.js";
import { emptyStandaloneRootTree, type StandaloneRootTreeFile } from "../../../../src/standalone-agent-run-root/domain/standalone-root-tree.js";
import { StandaloneRootPackageStore } from "../../../../src/standalone-agent-run-root/persistence/standalone-root-package-store.js";
import { validateStandaloneRootTreePayload } from "../../../../src/standalone-agent-run-root/persistence/standalone-root-tree-schema.js";
import { AgentRunMetadataStore } from "../../../../src/run-history/store/agent-run-metadata-store.js";
import { AgentOrgRunExecutionTreeStore } from "../../../../src/run-history/store/agent-org-run-execution-tree-store.js";
import { validateAgentOrgRunExecutionTreePayload } from "../../../../src/run-history/store/agent-org-run-execution-tree-schema.js";
import {
  AtomicRunPackageFileCommitWriter,
  type RunPackageFileWriteResult,
} from "../../../../src/run-history/store/atomic-run-package-file-commit-writer.js";
import { TeamRunExecutionTreeStore } from "../../../../src/run-history/store/team-run-execution-tree-store.js";
import { validateTeamRunExecutionTreePayload } from "../../../../src/run-history/store/team-run-execution-tree-schema.js";
import { RootRunPackageReadinessIndex, resetRootRunPackageReadinessIndex } from "../../../../src/run-history/services/root-run-package-readiness-index.js";
import { testAgentNode, testExecutionTree } from "../../../fixtures/current-team-run-fixtures.js";
import { testAgentOrgExecutionTree, testOrgAgentNode, testOrgLaunchConfiguration, testOrgTeamNode } from "../../../fixtures/current-agent-org-run-fixtures.js";

/** Design D-1 (compose at load, split at save), D-3 (G1, G2, task-agent readers / writers), contract §3, L4–L6. */

const HOST = "host-run";
const T0 = "2026-10-17T09:00:00.000Z";
const launch = testOrgLaunchConfiguration("/workspace");
const roots: string[] = [];
afterEach(async () => {
  vi.restoreAllMocks();
  await Promise.all(roots.splice(0).map((root) => { resetRootRunPackageReadinessIndex(root); return fs.rm(root, { recursive: true, force: true }); }));
});
const memoryRoot = async (): Promise<string> => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "task-agent-own-run-"));
  roots.push(root);
  return root;
};
const readJson = async (file: string): Promise<Record<string, any>> => JSON.parse(await fs.readFile(file, "utf8"));
const sha = async (file: string): Promise<string> => createHash("sha256").update(await fs.readFile(file)).digest("hex");
const exists = (file: string): Promise<boolean> => fs.access(file).then(() => true, () => false);

const agentCopy = (agentRunId: string, extra: Record<string, unknown> = {}) => ({
  address: "/code_reviewer", agentRunId, platformAgentRunId: null, delegatorAgentRunId: HOST, startedAt: T0,
  source: { kind: "agent", agentDefinitionId: "code-reviewer", launchConfiguration: launch }, ...extra,
});
const teamCopy = (teamRunId: string, extra: Record<string, unknown> = {}) => ({
  address: "/product_team", teamRunId, delegatorAgentRunId: HOST, startedAt: T0,
  members: [
    { address: "/product_team/lead", agentRunId: `${teamRunId}-lead`, platformAgentRunId: "provider-lead" },
    { address: "/product_team/designer", agentRunId: `${teamRunId}-designer`, platformAgentRunId: null },
  ],
  taskExecutions: [],
  source: { kind: "agent_team", teamDefinitionId: "product-team", coordinatorAddress: "/product_team/lead",
    members: [{ address: "/product_team/lead", agentDefinitionId: "lead" }, { address: "/product_team/designer", agentDefinitionId: "designer",
      launchConfiguration: { ...launch, llmModelIdentifier: "designer-model" } }],
    handoffs: [{ from: "/product_team/lead", to: "/product_team/designer", rules: ["deliver"] }], defaultLaunchConfiguration: launch },
  ...extra,
});
const hostTree = (taskExecutions: unknown[]): StandaloneRootTreeFile => validateStandaloneRootTreePayload({
  ...emptyStandaloneRootTree({ host: { address: "/assistant" as never, agentRunId: HOST, agentDefinitionId: "assistant" }, createdAt: T0 }),
  taskExecutions,
}, HOST);

const standalone = async () => {
  const memory = await memoryRoot();
  const layout = new AgentMemoryLayout(memory);
  return { memory, layout, dir: layout.getAgentRunCollaborationDirPath(HOST), store: new StandaloneRootPackageStore() };
};

describe("a delegation writes the task agent's own files first, then its link (D-1, contract §3, §4)", () => {
  it("splits a standalone run's tree into links and own files at L1, and composes today's records back", async () => {
    const f = await standalone();
    const tree = hostTree([agentCopy("reviewer-run", { userLaunchSelection: { llmModelIdentifier: "edited", llmConfig: null, selectedAt: T0 } }), teamCopy("team-run")]);
    expect((await f.store.writeTree(f.dir, tree)).outcome).toBe("committed");

    const rawTree = await readJson(path.join(f.dir, "collaboration_tree.json"));
    expect(rawTree.taskExecutions).toEqual([
      { address: "/code_reviewer", agentRunId: "reviewer-run", delegatorAgentRunId: HOST, startedAt: T0 },
      { address: "/product_team", teamRunId: "team-run", delegatorAgentRunId: HOST, startedAt: T0 },
    ]);
    const own = await readJson(path.join(f.memory, "agents", "reviewer-run", "run_metadata.json"));
    expect(own).toEqual({
      runId: "reviewer-run", agentDefinitionId: "code-reviewer", workspaceRootPath: "/workspace",
      memoryDir: path.join(f.memory, "agents", "reviewer-run"), llmModelIdentifier: "test-model", llmConfig: null,
      autoExecuteTools: true, runtimeKind: launch.runtimeKind, platformAgentRunId: null, startedAt: T0,
      taskAgent: { coordinatingRun: { kind: "agent", runId: HOST }, delegatorAgentRunId: HOST, address: "/code_reviewer", origin: "catalog",
        userLaunchSelection: { llmModelIdentifier: "edited", llmConfig: null, selectedAt: T0 } },
    });
    const ownTeam = await readJson(path.join(f.memory, "agent_teams", "team-run", "team_run_execution_tree.json"));
    expect(ownTeam).toMatchObject({
      createdAt: T0, archivedAt: null, applicationBinding: null,
      handoffs: [{ from: "/product_team/lead", to: "/product_team/designer", rules: ["deliver"] }],
      rootTeam: { address: "/product_team", teamDefinitionId: "product-team", teamRunId: "team-run", coordinatorAddress: "/product_team/lead",
        members: [
          { address: "/product_team/lead", agentDefinitionId: "lead", agentRunId: "team-run-lead", platformAgentRunId: "provider-lead", role: null, description: null },
          { address: "/product_team/designer", agentDefinitionId: "designer", agentRunId: "team-run-designer", platformAgentRunId: null, role: null, description: null,
            launchConfiguration: { ...launch, llmModelIdentifier: "designer-model" } },
        ], taskExecutions: [] },
      taskAgent: { coordinatingRun: { kind: "agent", runId: HOST }, delegatorAgentRunId: HOST, address: "/product_team", origin: "catalog" },
    });
    expect("teamDefinitionName" in ownTeam.rootTeam).toBe(false);
    expect(await readJson(path.join(f.memory, "agent_teams", "team-run", "team_communication_messages.json")))
      .toEqual({ schemaVersion: 1, rootTeamRunId: "team-run", messages: [] });
    // The coordinating folder holds nothing of a task agent (L3).
    expect((await fs.readdir(f.dir)).sort()).toEqual(["collaboration_tree.json"]);

    expect(await f.store.readTree(f.dir, HOST)).toEqual(tree);
    expect(f.store.readTreeSync(f.dir, HOST)).toEqual(tree);
  });

  it("writes only the changed task agent's own file on a Settings edit; the links tree is not rewritten (H3)", async () => {
    const f = await standalone();
    await f.store.writeTree(f.dir, hostTree([agentCopy("one"), agentCopy("two"), teamCopy("team-run")]));
    const files = {
      tree: path.join(f.dir, "collaboration_tree.json"),
      one: path.join(f.memory, "agents", "one", "run_metadata.json"),
      two: path.join(f.memory, "agents", "two", "run_metadata.json"),
      team: path.join(f.memory, "agent_teams", "team-run", "team_run_execution_tree.json"),
    };
    const before = Object.fromEntries(await Promise.all(Object.entries(files).map(async ([key, file]) => [key, await sha(file)])));
    const write = vi.spyOn(AtomicRunPackageFileCommitWriter.prototype, "write");
    const edited = hostTree([agentCopy("one"), agentCopy("two", { userLaunchSelection: { llmModelIdentifier: "other", llmConfig: null, selectedAt: T0 } }), teamCopy("team-run")]);
    expect((await f.store.writeTree(f.dir, edited)).outcome).toBe("committed");
    expect(write.mock.calls.map(([input]) => input.filePath)).toEqual([files.two]);
    expect(await sha(files.one)).toBe(before.one);
    expect(await sha(files.team)).toBe(before.team);
    expect(await sha(files.tree)).toBe(before.tree);
    expect(await sha(files.two)).not.toBe(before.two);
    expect(await f.store.readTree(f.dir, HOST)).toEqual(edited);
  });

  it("writes no link when a task agent's own file does not commit, and a link only after its own file exists", async () => {
    const f = await standalone();
    await f.store.writeTree(f.dir, hostTree([]));
    const treeBefore = await sha(path.join(f.dir, "collaboration_tree.json"));
    const failing = new (class extends AtomicRunPackageFileCommitWriter {
      override async write(input: Parameters<AtomicRunPackageFileCommitWriter["write"]>[0]): Promise<RunPackageFileWriteResult<any>> {
        if (input.file === "task_agent_run_metadata") return { outcome: "not_renamed", file: input.file, stage: "write_temp", cause: new Error("disk full") };
        return super.write(input);
      }
    })();
    const result = await new StandaloneRootPackageStore(failing).writeTree(f.dir, hostTree([agentCopy("reviewer-run")]));
    expect(result).toMatchObject({ outcome: "not_renamed", file: "execution_tree" });
    expect(await sha(path.join(f.dir, "collaboration_tree.json"))).toBe(treeBefore);
    expect(await exists(path.join(f.memory, "agents", "reviewer-run"))).toBe(false);

    // A crash after the own file and before the link leaves an unlinked own file; the run loads without it.
    const linkFails = new (class extends AtomicRunPackageFileCommitWriter {
      override async write(input: Parameters<AtomicRunPackageFileCommitWriter["write"]>[0]): Promise<RunPackageFileWriteResult<any>> {
        if (input.file === "execution_tree") return { outcome: "not_renamed", file: input.file, stage: "rename", cause: new Error("stopped") };
        return super.write(input);
      }
    })();
    expect((await new StandaloneRootPackageStore(linkFails).writeTree(f.dir, hostTree([agentCopy("reviewer-run")]))).outcome).toBe("not_renamed");
    expect(await exists(path.join(f.memory, "agents", "reviewer-run", "run_metadata.json"))).toBe(true);
    expect(await sha(path.join(f.dir, "collaboration_tree.json"))).toBe(treeBefore);
    expect(await f.store.readTree(f.dir, HOST)).toEqual(hostTree([]));
  });

  it("refuses a coordinating directory outside a memory root, so own files never land elsewhere", async () => {
    const outside = await memoryRoot();
    await expect(new StandaloneRootPackageStore().writeTree(path.join(outside, "collaboration"), hostTree([agentCopy("reviewer-run")])))
      .rejects.toThrow("is not inside a memory root's 'agents' folder");
    await expect(new TeamRunExecutionTreeStore().write(outside, testExecutionTree({ rootTeamRunId: "x", coordinatorAddress: "/a",
      children: [testAgentNode("/a", { agentRunId: "a" })] }))).resolves.toMatchObject({ outcome: "committed" });
  });
});

describe("G1 and G2: a task agent is never read as a run the user started (D-3, contract §5.1)", () => {
  it("hides a task agent's run_metadata.json from the standalone reader and serves it to the task-agent reader", async () => {
    const f = await standalone();
    await f.store.writeTree(f.dir, hostTree([agentCopy("reviewer-run")]));
    const metadata = new AgentRunMetadataStore(f.memory);
    expect(await metadata.readMetadata("reviewer-run")).toBeNull();
    expect(await metadata.readMetadataState("reviewer-run")).toEqual({ kind: "missing" });
    expect(await metadata.readTaskAgentMetadata("reviewer-run")).toMatchObject({ runId: "reviewer-run", taskAgent: { origin: "catalog" } });
    // The synchronous task-agent reader (the stores' sync composed reads) shares the same parse path.
    expect(metadata.readTaskAgentMetadataStateSync("reviewer-run")).toEqual(await metadata.readTaskAgentMetadataState("reviewer-run"));
    expect(metadata.readTaskAgentMetadataStateSync("no-such-run")).toEqual({ kind: "missing" });
  });

  it("hides a task agent team's own tree from the team-run reader and from startup admission, linked or detached", async () => {
    const f = await standalone();
    await new AgentRunMetadataStore(f.memory).writeMetadata(HOST, {
      runId: HOST, agentDefinitionId: "assistant", workspaceRootPath: "/workspace", memoryDir: f.layout.getStandaloneRunDirPath(HOST),
      llmModelIdentifier: "model", llmConfig: null, autoExecuteTools: true, runtimeKind: launch.runtimeKind, platformAgentRunId: null,
    });
    await f.store.writeTree(f.dir, hostTree([agentCopy("reviewer-run"), teamCopy("team-run")]));
    await f.store.writeMessages(f.dir, { schemaVersion: 1, subjectKind: "agent", hostRunId: HOST, messages: [] });
    const teamDir = f.layout.getTeamDirPath({ rootTeamRunId: "team-run", ancestorTeamRunIds: [] });
    expect(await new TeamRunExecutionTreeStore().read(teamDir, "team-run")).toBeNull();
    expect(await new TeamRunExecutionTreeStore().isTaskAgentTeamDir(teamDir)).toBe(true);

    const admitted = async () => {
      resetRootRunPackageReadinessIndex(f.memory);
      const readiness = new RootRunPackageReadinessIndex(f.memory);
      await readiness.rebuild();
      return { agents: readiness.listAdmitted("agent"), teams: readiness.listAdmitted("agent_team"), diagnostics: readiness.listDiagnostics() };
    };
    expect(await admitted()).toEqual({ agents: [HOST], teams: [], diagnostics: [] });
    // Detached (the coordinating run deleted): still not a root candidate, never reported (contract §10).
    await fs.rm(f.layout.getStandaloneRunDirPath(HOST), { recursive: true });
    expect(await admitted()).toEqual({ agents: [], teams: [], diagnostics: [] });
  });
});

describe("L4–L6: a save never removes what it did not load", () => {
  it("leaves out a full record whose own file does not exist (migration not finished) and writes it back unchanged in place", async () => {
    const f = await standalone();
    await f.store.writeTree(f.dir, hostTree([agentCopy("migrated")]));
    const raw = await readJson(path.join(f.dir, "collaboration_tree.json"));
    const unmigrated = agentCopy("unmigrated");
    raw.taskExecutions = [unmigrated, ...raw.taskExecutions];
    await fs.writeFile(path.join(f.dir, "collaboration_tree.json"), JSON.stringify(raw));

    const loaded = (await f.store.readTree(f.dir, HOST))!;
    expect(loaded.taskExecutions.map((task) => "agentRunId" in task && task.agentRunId)).toEqual(["migrated"]);
    await f.store.writeTree(f.dir, { ...loaded, taskExecutions: [...loaded.taskExecutions, agentCopy("new") as never] });
    expect((await readJson(path.join(f.dir, "collaboration_tree.json"))).taskExecutions).toEqual([
      unmigrated,
      { address: "/code_reviewer", agentRunId: "migrated", delegatorAgentRunId: HOST, startedAt: T0 },
      { address: "/code_reviewer", agentRunId: "new", delegatorAgentRunId: HOST, startedAt: T0 },
    ]);
  });

  it("becomes a link once the full record's own file exists (the own file is the authority)", async () => {
    const f = await standalone();
    await f.store.writeTree(f.dir, hostTree([agentCopy("reviewer-run")]));
    await fs.writeFile(path.join(f.dir, "collaboration_tree.json"), JSON.stringify(hostTree([agentCopy("reviewer-run", { platformAgentRunId: "stale" })])));
    const loaded = (await f.store.readTree(f.dir, HOST))!;
    expect(loaded.taskExecutions[0]).toMatchObject({ platformAgentRunId: null });
    await f.store.writeTree(f.dir, loaded);
    expect((await readJson(path.join(f.dir, "collaboration_tree.json"))).taskExecutions)
      .toEqual([{ address: "/code_reviewer", agentRunId: "reviewer-run", delegatorAgentRunId: HOST, startedAt: T0 }]);
  });

  it("loads the run without a task agent whose own file is missing, and without the copies it delegated (L5)", async () => {
    const f = await standalone();
    const delegated = agentCopy("delegated-by-lead", { delegatorAgentRunId: "team-run-lead" });
    await f.store.writeTree(f.dir, hostTree([agentCopy("kept"), teamCopy("team-run"), delegated]));
    await fs.rm(path.join(f.memory, "agent_teams", "team-run"), { recursive: true });
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const loaded = (await f.store.readTree(f.dir, HOST))!;
    expect(loaded.taskExecutions.map((task) => "agentRunId" in task ? task.agentRunId : task.teamRunId)).toEqual(["kept"]);
    expect(warn.mock.calls.flat().join(" ")).toMatch(/team-run.*not available[\s\S]*delegated-by-lead.*delegator 'team-run-lead'/);
    await f.store.writeTree(f.dir, loaded);
    expect((await readJson(path.join(f.dir, "collaboration_tree.json"))).taskExecutions.map((task: any) => task.agentRunId ?? task.teamRunId))
      .toEqual(["kept", "team-run", "delegated-by-lead"]);
  });
});

describe("copies of a configured place (U-4) and organization links (C6)", () => {
  it("records the place's definition and started launch, composes without source and keeps following the place", async () => {
    const memory = await memoryRoot();
    const dir = new AgentMemoryLayout(memory).getTeamDirPath({ rootTeamRunId: "team-root", ancestorTeamRunIds: [] });
    const base = testExecutionTree({ rootTeamRunId: "team-root", coordinatorAddress: "/lead",
      children: [testAgentNode("/lead", { agentRunId: "lead-run" }), testAgentNode("/writer", { agentRunId: "writer-run", agentDefinitionId: "writer" })] });
    const copy = { address: "/writer", agentRunId: "writer-copy", platformAgentRunId: null, delegatorAgentRunId: "lead-run", startedAt: T0 };
    const tree = validateTeamRunExecutionTreePayload({ ...base, rootTeam: { ...base.rootTeam, taskExecutions: [copy] } }, "team-root");
    const store = new TeamRunExecutionTreeStore();
    await store.write(dir, tree);
    const own = await readJson(path.join(memory, "agents", "writer-copy", "run_metadata.json"));
    const placeLaunch = base.rootTeam.members[1]!.launchConfiguration;
    expect(own).toMatchObject({ agentDefinitionId: "writer", llmModelIdentifier: placeLaunch.llmModelIdentifier, runtimeKind: placeLaunch.runtimeKind,
      taskAgent: { coordinatingRun: { kind: "agent_team", runId: "team-root" }, origin: "configured_place", delegatorAgentRunId: "lead-run" } });
    expect(await store.read(dir, "team-root")).toEqual(tree);
    // The place changes later: the copy follows it (no source) and its own file keeps what it started with.
    const changed = validateTeamRunExecutionTreePayload({ ...tree, rootTeam: { ...tree.rootTeam, members: tree.rootTeam.members.map((member) =>
      member.address === "/writer" ? { ...member, launchConfiguration: { ...member.launchConfiguration, llmModelIdentifier: "newer" } } : member) } }, "team-root");
    await store.write(dir, changed);
    expect((await readJson(path.join(memory, "agents", "writer-copy", "run_metadata.json"))).llmModelIdentifier).toBe(placeLaunch.llmModelIdentifier);
    expect((await store.read(dir, "team-root"))!.rootTeam.taskExecutions).toEqual([copy]);
  });

  it("keeps older links under a configured team, and records a copy of a mounted team as configured_place", async () => {
    const memory = await memoryRoot();
    const dir = new AgentMemoryLayout(memory).getOrgDirPath("org-root");
    const base = testAgentOrgExecutionTree({ orgRunId: "org-root", members: [testOrgAgentNode("/director", "director-run"),
      testOrgTeamNode({ address: "/team", teamRunId: "mounted", coordinatorAddress: "/team/lead", members: [testOrgAgentNode("/team/lead", "lead-run")] })] });
    const teamCopyOfPlace = { address: "/team", teamRunId: "team-copy", delegatorAgentRunId: "director-run", startedAt: T0, taskExecutions: [],
      members: [{ address: "/team/lead", agentRunId: "team-copy-lead", platformAgentRunId: null }] };
    const older = { address: "/team/lead", agentRunId: "older-copy", platformAgentRunId: null, delegatorAgentRunId: "lead-run", startedAt: T0,
      source: { kind: "agent", agentDefinitionId: "helper", launchConfiguration: launch } };
    const tree = validateAgentOrgRunExecutionTreePayload({ ...base, rootOrg: { ...base.rootOrg, taskExecutions: [teamCopyOfPlace],
      members: base.rootOrg.members.map((member) => "teamRunId" in member ? { ...member, taskExecutions: [older] } : member) } }, "org-root");
    const store = new AgentOrgRunExecutionTreeStore();
    await store.write(dir, tree);
    const raw = await readJson(path.join(dir, "agent_org_run_execution_tree.json"));
    expect(raw.rootOrg.members[1].taskExecutions).toEqual([{ address: "/team/lead", agentRunId: "older-copy", delegatorAgentRunId: "lead-run", startedAt: T0 }]);
    expect(await readJson(path.join(memory, "agent_teams", "team-copy", "team_run_execution_tree.json"))).toMatchObject({
      rootTeam: { teamDefinitionId: (base.rootOrg.members[1] as { teamDefinitionId: string }).teamDefinitionId, coordinatorAddress: "/team/lead" },
      taskAgent: { coordinatingRun: { kind: "agent_org", runId: "org-root" }, origin: "configured_place" },
    });
    expect(await store.read(dir, "org-root")).toEqual(tree);
  });
});
