import { createHash } from "node:crypto";
import {
  ReleasedAgentOrgRunExecutionTreeReader,
  ReleasedStandaloneRootTreeReader,
  ReleasedTeamRunExecutionTreeReader,
} from "../../../src/app-data-migrations/frozen/released-run-package-shapes/released-trees-before-task-agent-own-run.js";
import { TASK_AGENT_OWN_RUN_V1_MIGRATION_ID } from "../../../src/app-data-migrations/migrations/task-agent-own-run-v1/task-agent-own-run-v1-app-data-migration.js";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AppDataMigrationRegistry } from "../../../src/app-data-migrations/app-data-migration-registry.js";
import {
  COLLABORATORS_TO_DELEGATED_RUNS_V1_MIGRATION_ID,
  CollaboratorsToDelegatedRunsV1AppDataMigration,
} from "../../../src/app-data-migrations/migrations/collaborators-to-delegated-runs-v1/collaborators-to-delegated-runs-v1-app-data-migration.js";
import { AgentMemoryLayout } from "../../../src/agent-memory/store/agent-memory-layout.js";
import { StandaloneRootPackageStore } from "../../../src/standalone-agent-run-root/persistence/standalone-root-package-store.js";
import { AtomicRunPackageFileCommitWriter } from "../../../src/app-data-migrations/frozen/server/run-history/store/atomic-run-package-file-commit-writer.js";
import { getStandaloneRootDirPath, getStandaloneRootTreePath } from "../../../src/standalone-agent-run-root/persistence/standalone-root-tree-path.js";
import { emptyStandaloneRootTree } from "../../../src/standalone-agent-run-root/domain/standalone-root-tree.js";
import { TeamRunExecutionTreeStore } from "../../../src/run-history/store/team-run-execution-tree-store.js";
import { AgentOrgRunExecutionTreeStore } from "../../../src/run-history/store/agent-org-run-execution-tree-store.js";
import { getTeamRunExecutionTreePath } from "../../../src/run-history/store/team-run-execution-tree-path.js";
import { getAgentOrgRunExecutionTreePath } from "../../../src/run-history/store/agent-org-run-execution-tree-path.js";
import { testAgentNode, testExecutionTree } from "../../fixtures/current-team-run-fixtures.js";
import { testAgentOrgExecutionTree, testOrgAgentNode } from "../../fixtures/current-agent-org-run-fixtures.js";
import { agentCollaborator, sourcelessCopy, T1, teamCollaborator, type Json } from "./released-collaborator-fixtures.js";

const roots: string[] = [];
afterEach(async () => {
  vi.restoreAllMocks();
  await Promise.all(roots.splice(0).map((root) => fs.rm(root, { recursive: true, force: true })));
});

const put = async (file: string, value: unknown) => {
  await fs.mkdir(path.dirname(file), { recursive: true });
  await fs.writeFile(file, typeof value === "string" ? value : JSON.stringify(value, null, 2) + "\n");
};
const sha = async (file: string) => createHash("sha256").update(await fs.readFile(file)).digest("hex");
const filesUnder = async (dir: string): Promise<string[]> => {
  const out: string[] = [];
  for (const entry of await fs.readdir(dir, { withFileTypes: true }).catch(() => [])) {
    const file = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...await filesUnder(file)); else out.push(file);
  }
  return out.sort();
};
const TREE_FILES = /(collaboration_tree|team_run_execution_tree|agent_org_run_execution_tree)\.json$/;
/** Hash of every file under `dir` except the three tree files, plus the directory listing. */
const nonTreeState = async (dir: string): Promise<Record<string, string>> => {
  const state: Record<string, string> = {};
  for (const file of await filesUnder(dir)) if (!TREE_FILES.test(file)) state[path.relative(dir, file)] = await sha(file);
  return state;
};
const dirsUnder = async (dir: string): Promise<string[]> => {
  const out: string[] = [];
  for (const entry of await fs.readdir(dir, { withFileTypes: true }).catch(() => [])) {
    if (entry.isDirectory()) out.push(path.join(dir, entry.name), ...await dirsUnder(path.join(dir, entry.name)));
  }
  return out.map((entry) => path.relative(dir, entry)).sort();
};

const fixture = async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "collaborators-migration-")); roots.push(root);
  const memory = path.join(root, "memory");
  const layout = new AgentMemoryLayout(memory);
  return { root, memory, layout, migration: new CollaboratorsToDelegatedRunsV1AppDataMigration(memory) };
};
type Fixture = Awaited<ReturnType<typeof fixture>>;

const withCollaborators = async (file: string, containerKey: null | "rootTeam" | "rootOrg", collaborators: Json[], tasks: Json[] = []) => {
  const document = JSON.parse(await fs.readFile(file, "utf8")) as Json;
  const container = (containerKey ? document[containerKey] : document) as Json;
  container["collaborators"] = collaborators;
  if (tasks.length) container["taskExecutions"] = [...(container["taskExecutions"] as Json[]), ...tasks];
  await put(file, document);
};

/** The user's shape: an Agent root, a Team root and an Org root, each with collaborators; one Team collaborator never started (no memory folder). */
const seedAllFamilies = async (f: Fixture) => {
  // Agent root (host run `agent-host`): collaborator Agent + a sourceless copy of it; a collaborator Team that never started.
  const agentDir = getStandaloneRootDirPath(f.memory, "agent-host");
  const agentTree = emptyStandaloneRootTree({ host: { address: "/host" as never, agentRunId: "agent-host", agentDefinitionId: "host-definition" }, createdAt: T1 });
  expect((await new StandaloneRootPackageStore().writeTree(agentDir, agentTree)).outcome).toBe("committed");
  await withCollaborators(getStandaloneRootTreePath(agentDir), null, [
    agentCollaborator({ address: "/code_reviewer", runId: "agent-reviewer", definitionId: "reviewer", viaRunId: "agent-host" }),
    teamCollaborator({ address: "/product_team", teamRunId: "agent-product", definitionId: "product", viaRunId: "agent-host" }),
  ], [sourcelessCopy("/code_reviewer", "agent-reviewer-copy", "agent-host")]);
  await put(path.join(agentDir, "agent-reviewer", "raw_traces.jsonl"), "agent reviewer memory\n");
  await put(path.join(agentDir, "agent-reviewer-copy", "raw_traces.jsonl"), "copy memory\n");
  await put(path.join(agentDir, "communication_messages.json"), { schemaVersion: 1, subjectKind: "agent", hostRunId: "agent-host", messages: [] });

  // Team root.
  const teamDir = f.layout.getTeamDirPath({ rootTeamRunId: "team-root", ancestorTeamRunIds: [] });
  const teamTree = testExecutionTree({ rootTeamRunId: "team-root", coordinatorAddress: "/lead", createdAt: T1,
    children: [testAgentNode("/lead", { agentRunId: "team-lead" })] });
  expect((await new TeamRunExecutionTreeStore().write(teamDir, teamTree)).outcome).toBe("committed");
  await withCollaborators(getTeamRunExecutionTreePath(teamDir), "rootTeam", [
    teamCollaborator({ address: "/qa_team", teamRunId: "team-qa", definitionId: "qa", viaRunId: "team-lead" }),
  ]);
  await put(path.join(teamDir, "team-qa-lead", "raw_traces.jsonl"), "qa lead memory\n");
  await put(path.join(teamDir, "team_communication_messages.json"), { schemaVersion: 1, rootTeamRunId: "team-root", messages: [] });

  // Org root.
  const orgDir = f.layout.getOrgDirPath("org-root");
  const orgTree = testAgentOrgExecutionTree({ orgRunId: "org-root", members: [testOrgAgentNode("/director", "org-director")] });
  expect((await new AgentOrgRunExecutionTreeStore().write(orgDir, orgTree)).outcome).toBe("committed");
  await withCollaborators(getAgentOrgRunExecutionTreePath(orgDir), "rootOrg", [
    agentCollaborator({ address: "/designer", runId: "org-designer", definitionId: "designer", viaRunId: "org-director", addedAt: T1 }),
  ], [sourcelessCopy("/designer", "org-designer-copy", "org-director")]);
  await put(path.join(orgDir, "org-designer", "raw_traces.jsonl"), "designer memory\n");
  return { agentDir, teamDir, orgDir };
};

/** This migration's output is the released shape before task-agent-own-run: read with the frozen readers. */
const readAll = async (_f: Fixture, dirs: Awaited<ReturnType<typeof seedAllFamilies>>) => ({
  agent: await new ReleasedStandaloneRootTreeReader().readTree(dirs.agentDir, "agent-host"),
  team: await new ReleasedTeamRunExecutionTreeReader().read(dirs.teamDir, "team-root"),
  org: await new ReleasedAgentOrgRunExecutionTreeReader().read(dirs.orgDir, "org-root"),
});
const runIds = (tasks: readonly { agentRunId?: string; teamRunId?: string }[]) => tasks.map((task) => task.agentRunId ?? task.teamRunId);

describe("20261015_collaborators_to_delegated_runs_v1", () => {
  it("is registered right before task-agent-own-run (then the append-only log conversion), required on startup and startup-only", () => {
    const definitions = (new AppDataMigrationRegistry() as unknown as { definitions: { id: string; requiredOnStartup?: boolean; executionPolicy?: string }[] }).definitions;
    const index = definitions.findIndex((definition) => definition.id === COLLABORATORS_TO_DELEGATED_RUNS_V1_MIGRATION_ID);
    const ours = definitions[index]!;
    expect(definitions[index + 1]!.id).toBe(TASK_AGENT_OWN_RUN_V1_MIGRATION_ID);
    expect(definitions[index + 2]!.id).toBe("20261018_append_only_message_logs_v1");
    // Only later steps that write no run tree or message log follow: the work-trace export removal, the
    // completion of delegated copies' own files (they write own files only), and the removal of the Skill
    // Improvement feature's data (it deletes whole helper runs and their history rows), and the stored-name renames of
    // autobyteus-290 (SM-1 touches only `remote-access/`; SM-2 … SM-5 only Memory Sync's files), and the raw-trace
    // manifest runtime names (autobyteus-343: it rewrites one value in each manifest, not a run tree or a message log).
    expect(definitions.slice(index + 3).map((definition) => definition.id))
      .toEqual(["20261019_remove_work_trace_exports", "20261019_delegated_copy_own_file_complete_v1", "20261020_remove_skill_improvement_data", "20261024_node_identity_file_name", "20261024_memory_sync_source_id_names", "20261030_raw_trace_manifest_runtime_names"]);
    expect(ours.id).toBe(COLLABORATORS_TO_DELEGATED_RUNS_V1_MIGRATION_ID);
    expect(ours).toMatchObject({ id: "20261015_collaborators_to_delegated_runs_v1", requiredOnStartup: true, executionPolicy: "STARTUP_ONLY" });
  });

  it("converts the Agent, Team and Org trees in place; every collaborator keeps its run ID; no memory file or folder moves (AC-007)", async () => {
    const f = await fixture();
    const dirs = await seedAllFamilies(f);
    const before = { agent: await nonTreeState(dirs.agentDir), team: await nonTreeState(dirs.teamDir), org: await nonTreeState(dirs.orgDir) };
    const folders = { agent: await dirsUnder(dirs.agentDir), team: await dirsUnder(dirs.teamDir), org: await dirsUnder(dirs.orgDir) };

    const result = await f.migration.execute();

    expect(result.status).toBe("SUCCEEDED");
    expect(result.summary).toMatchObject({ scannedCount: 3, migratedCount: 3, skippedCount: 0, failedCount: 0 });
    expect(result.summary.details.map((detail) => [detail.itemId, detail.status])).toEqual([
      ["agent:agent-host", "MIGRATED"], ["agent_team:team-root", "MIGRATED"], ["agent_org:org-root", "MIGRATED"],
    ]);
    const { agent, team, org } = await readAll(f, dirs);
    for (const raw of [agent, team?.rootTeam, org?.rootOrg]) expect(raw).not.toHaveProperty("collaborators");
    expect(runIds(agent!.taskExecutions)).toEqual(["agent-reviewer-copy", "agent-reviewer", "agent-product"]);
    expect(runIds(team!.rootTeam.taskExecutions)).toEqual(["team-qa"]);
    expect(runIds(org!.rootOrg.taskExecutions)).toEqual(["org-designer-copy", "org-designer"]);
    // Converted runs are unowned delegated runs of their root, delegated by the adding agent.
    expect(agent!.taskExecutions.find((task) => "agentRunId" in task && task.agentRunId === "agent-reviewer")).toMatchObject({
      address: "/code_reviewer", delegatorAgentRunId: "agent-host", source: { kind: "agent", agentDefinitionId: "reviewer" } });
    // No file other than the three trees changed, and no folder appeared or disappeared: the never-started Team has none.
    expect({ agent: await nonTreeState(dirs.agentDir), team: await nonTreeState(dirs.teamDir), org: await nonTreeState(dirs.orgDir) }).toEqual(before);
    expect({ agent: await dirsUnder(dirs.agentDir), team: await dirsUnder(dirs.teamDir), org: await dirsUnder(dirs.orgDir) }).toEqual(folders);
    await expect(fs.access(path.join(dirs.agentDir, "agent-product"))).rejects.toMatchObject({ code: "ENOENT" });
  });

  it("stamps a source on the sourceless copies of collaborators, so they restore without the collaborator list (AC-011)", async () => {
    const f = await fixture();
    const dirs = await seedAllFamilies(f);
    await f.migration.execute();
    const { agent, org } = await readAll(f, dirs);
    const copy = agent!.taskExecutions.find((task) => "agentRunId" in task && task.agentRunId === "agent-reviewer-copy");
    expect(copy).toMatchObject({ address: "/code_reviewer", source: { kind: "agent", agentDefinitionId: "reviewer" } });
    expect(org!.rootOrg.taskExecutions.find((task) => "agentRunId" in task && task.agentRunId === "org-designer-copy"))
      .toMatchObject({ source: { kind: "agent", agentDefinitionId: "designer" } });
  });

  it("is idempotent: a second run skips every converted tree and changes no byte", async () => {
    const f = await fixture();
    const dirs = await seedAllFamilies(f);
    await f.migration.execute();
    const trees = [getStandaloneRootTreePath(dirs.agentDir), getTeamRunExecutionTreePath(dirs.teamDir), getAgentOrgRunExecutionTreePath(dirs.orgDir)];
    const before = await Promise.all(trees.map(sha));
    const again = await f.migration.execute();
    expect(again.status).toBe("SUCCEEDED");
    expect(again.summary).toMatchObject({ scannedCount: 3, migratedCount: 0, skippedCount: 3, failedCount: 0, details: [] });
    expect(await Promise.all(trees.map(sha))).toEqual(before);
  });

  it("a tree without collaborators is read once and skipped; a data root with no runs succeeds with nothing scanned", async () => {
    const f = await fixture();
    expect((await f.migration.execute()).summary).toMatchObject({ scannedCount: 0, migratedCount: 0, failedCount: 0 });
    const agentDir = getStandaloneRootDirPath(f.memory, "plain-host");
    await new StandaloneRootPackageStore().writeTree(agentDir, emptyStandaloneRootTree({ host: { address: "/host" as never, agentRunId: "plain-host", agentDefinitionId: "h" }, createdAt: T1 }));
    const bytes = await sha(getStandaloneRootTreePath(agentDir));
    const result = await f.migration.execute();
    expect(result.summary).toMatchObject({ scannedCount: 1, migratedCount: 0, skippedCount: 1 });
    expect(await sha(getStandaloneRootTreePath(agentDir))).toBe(bytes);
  });

  it("FAILED_INVALID_COLLABORATOR: an entry that fails the frozen schema leaves that tree untouched and the others convert", async () => {
    const f = await fixture();
    const dirs = await seedAllFamilies(f);
    const orgTree = getAgentOrgRunExecutionTreePath(dirs.orgDir);
    const document = JSON.parse(await fs.readFile(orgTree, "utf8")) as { rootOrg: { collaborators: Json[] } };
    document.rootOrg.collaborators[0]!["addedAt"] = "not a time";
    await put(orgTree, document);
    const before = await sha(orgTree);
    const result = await f.migration.execute();
    expect(result.status).toBe("FAILED");
    expect(result.errorMessage).toContain("retries on the next start");
    expect(result.summary.details).toEqual(expect.arrayContaining([
      expect.objectContaining({ itemId: "agent_org:org-root", status: "FAILED", message: expect.stringMatching(/^FAILED_INVALID_COLLABORATOR: .*collaborators\[0\]/) }),
      expect.objectContaining({ itemId: "agent:agent-host", status: "MIGRATED" }),
    ]));
    expect(await sha(orgTree)).toBe(before);
    // The next start retries only what is still pending.
    document.rootOrg.collaborators[0]!["addedAt"] = T1;
    await put(orgTree, document);
    const retry = await f.migration.execute();
    expect(retry.status).toBe("SUCCEEDED");
    expect(retry.summary).toMatchObject({ migratedCount: 1, skippedCount: 2 });
  });

  it("PRESERVED_TREE_UNREADABLE_WARNING: an unparseable tree is left untouched with a warning", async () => {
    const f = await fixture();
    const dirs = await seedAllFamilies(f);
    const teamTree = getTeamRunExecutionTreePath(dirs.teamDir);
    await put(teamTree, "{ this is not json");
    const result = await f.migration.execute();
    expect(result.status).toBe("SUCCEEDED_WITH_WARNINGS");
    expect(result.summary.details).toEqual(expect.arrayContaining([
      expect.objectContaining({ itemId: "agent_team:team-root", status: "SKIPPED", message: expect.stringContaining("PRESERVED_TREE_UNREADABLE_WARNING") }),
    ]));
    expect(await fs.readFile(teamTree, "utf8")).toBe("{ this is not json");
    expect(result.summary).toMatchObject({ migratedCount: 2, failedCount: 0 });
  });

  it("FAILED_CONVERTED_TREE_INVALID: a result the current reader rejects is never written; the original tree is kept", async () => {
    const f = await fixture();
    const dirs = await seedAllFamilies(f);
    // A collaborator added by a run that is not in the tree cannot be a valid delegated run afterwards.
    const agentTree = getStandaloneRootTreePath(dirs.agentDir);
    const document = JSON.parse(await fs.readFile(agentTree, "utf8")) as { collaborators: Json[] };
    document.collaborators[0]!["addedViaAgentRunId"] = "ghost-run";
    await put(agentTree, document);
    const before = await sha(agentTree);
    const result = await f.migration.execute();
    expect(result.status).toBe("FAILED");
    expect(result.summary.details).toEqual(expect.arrayContaining([
      expect.objectContaining({ itemId: "agent:agent-host", status: "FAILED", message: expect.stringContaining("FAILED_CONVERTED_TREE_INVALID") }),
    ]));
    expect(await sha(agentTree)).toBe(before);
  });

  it("FAILED_OPERATION: a write that does not rename leaves the original tree and fails the item", async () => {
    const f = await fixture();
    const dirs = await seedAllFamilies(f);
    const agentTree = getStandaloneRootTreePath(dirs.agentDir);
    const write = AtomicRunPackageFileCommitWriter.prototype.write;
    vi.spyOn(AtomicRunPackageFileCommitWriter.prototype, "write").mockImplementation(function (this: AtomicRunPackageFileCommitWriter, input) {
      if (input.filePath === agentTree) return Promise.resolve({ outcome: "not_renamed", cause: new Error("disk full") } as never);
      return write.call(this, input);
    });
    const before = await sha(agentTree);
    const result = await f.migration.execute();
    expect(result.status).toBe("FAILED");
    expect(result.summary.details).toEqual(expect.arrayContaining([
      expect.objectContaining({ itemId: "agent:agent-host", status: "FAILED", message: "FAILED_OPERATION: disk full" }),
    ]));
    expect(await sha(agentTree)).toBe(before);
  });

  it("a converted Org tree and its memory are read by the current stores: every run ID still resolves to its old folder (reopen by run ID)", async () => {
    const f = await fixture();
    const dirs = await seedAllFamilies(f);
    await f.migration.execute();
    const { org } = await readAll(f, dirs);
    const designer = org!.rootOrg.taskExecutions.find((task) => "agentRunId" in task && task.agentRunId === "org-designer");
    expect(designer).toBeDefined();
    expect(await fs.readFile(path.join(dirs.orgDir, "org-designer", "raw_traces.jsonl"), "utf8")).toBe("designer memory\n");
  });
});
