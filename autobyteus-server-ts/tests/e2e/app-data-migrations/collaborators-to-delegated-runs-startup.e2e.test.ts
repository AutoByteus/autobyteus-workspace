import fs from "node:fs/promises";
import { TASK_AGENT_OWN_RUN_V1_MIGRATION_ID } from "../../../src/app-data-migrations/migrations/task-agent-own-run-v1/task-agent-own-run-v1-app-data-migration.js";
import os from "node:os";
import path from "node:path";
import { once } from "node:events";
import { createHash } from "node:crypto";
import { spawn, type ChildProcess } from "node:child_process";
import { afterEach, describe, expect, it } from "vitest";
import { AgentMemoryLayout } from "../../../src/agent-memory/store/agent-memory-layout.js";
import { StandaloneRootPackageStore } from "../../../src/standalone-agent-run-root/persistence/standalone-root-package-store.js";
import { getStandaloneRootDirPath, getStandaloneRootTreePath } from "../../../src/standalone-agent-run-root/persistence/standalone-root-tree-path.js";
import { emptyStandaloneRootTree } from "../../../src/standalone-agent-run-root/domain/standalone-root-tree.js";
import { TeamRunExecutionTreeStore } from "../../../src/run-history/store/team-run-execution-tree-store.js";
import { AgentOrgRunExecutionTreeStore } from "../../../src/run-history/store/agent-org-run-execution-tree-store.js";
import { getTeamRunExecutionTreePath } from "../../../src/run-history/store/team-run-execution-tree-path.js";
import { getAgentOrgRunExecutionTreePath } from "../../../src/run-history/store/agent-org-run-execution-tree-path.js";
import { testAgentNode, testExecutionTree } from "../../fixtures/current-team-run-fixtures.js";
import { testAgentOrgExecutionTree, testOrgAgentNode } from "../../fixtures/current-agent-org-run-fixtures.js";
import { agentCollaborator, sourcelessCopy, T1, T2, teamCollaborator, type Json } from "../../unit/app-data-migrations/collaborators-to-delegated-runs/released-collaborator-fixtures.js";

// The startup migration `20261015_collaborators_to_delegated_runs_v1` through the BUILT Studio server (`dist/app.js`), the way a
// user meets it: a new version starts on an app-data folder written by the previous version. The source is SYNTHESIZED test data
// (never real user data) with the released structure; the target is what the new build makes of it.
// Source: an Agent root, a Team root and an Org root that each carry collaborators — the oldest released entry shapes seen in
// production data (no launchSource, no per-member launch, no team selection) and the newest ones — plus a sourceless copy at a
// collaborator's address (AC-011) and memory files that must not move (AC-007).
// Proves: the migration is registered and succeeds at startup; every collaborator becomes a delegated run of its root with
// the same run ID; the roots open through the public API; only the three tree files change; a second start changes nothing.
// Prerequisite: pnpm -C autobyteus-server-ts build (a stale dist is not proof). Not covered here (covered elsewhere): waking a
// converted run by its run ID (integration native-compaction-root, scripted e2e task-reactivation-root-visibility).
const MIGRATION_ID = "20261015_collaborators_to_delegated_runs_v1";

/** The key sets of released collaborator entries in production data (read-only survey, 2026-10-15). */
const RELEASED_KEYS = {
  agent: ["addedAt", "addedViaAgentRunId", "address", "agentDefinitionId", "agentRunId", "kind", "launchConfiguration", "platformAgentRunId"],
  agent_team: ["addedAt", "addedViaAgentRunId", "address", "coordinatorAddress", "defaultLaunchConfiguration", "handoffs", "kind", "members", "taskExecutions", "teamDefinitionId", "teamRunId"],
  member: ["address", "agentDefinitionId", "agentRunId", "platformAgentRunId"],
  launchConfiguration: ["autoExecuteTools", "llmConfig", "llmModelIdentifier", "runtimeKind", "workspaceRootPath"],
  handoff: ["from", "rules", "to"],
} as const;
const sorted = (value: object) => Object.keys(value).sort();

const roots: string[] = [];
const children: ChildProcess[] = [];
afterEach(async () => {
  for (const child of children.splice(0)) {
    if (child.exitCode === null && child.signalCode === null) {
      const exited = once(child, "exit");
      child.kill("SIGTERM");
      const force = setTimeout(() => child.kill("SIGKILL"), 8_000);
      try { await exited; } finally { clearTimeout(force); }
    }
  }
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
const state = async (memory: string) => {
  const trees: Record<string, string> = {}, others: Record<string, string> = {};
  for (const file of await filesUnder(memory)) (TREE_FILES.test(file) ? trees : others)[path.relative(memory, file)] = await sha(file);
  return { trees, others };
};
const objectsIn = (value: unknown): Record<string, any>[] => Array.isArray(value) ? value.flatMap(objectsIn)
  : value && typeof value === "object" ? [value as Record<string, any>, ...Object.values(value).flatMap(objectsIn)] : [];

// ---- released-structure builders (the oldest shapes seen in production) --------------------------------------------------
const legacyLaunch = (workspace: string): Json => ({ runtimeKind: "autobyteus", llmModelIdentifier: "model-a", llmConfig: null, autoExecuteTools: true, workspaceRootPath: workspace });
const oldestAgentEntry = (address: string, runId: string, via: string, workspace: string): Json => ({
  kind: "agent", address, agentDefinitionId: "writer-definition", agentRunId: runId, platformAgentRunId: null,
  launchConfiguration: legacyLaunch(workspace), addedAt: T1, addedViaAgentRunId: via,
});
const oldestTeamEntry = (address: string, teamRunId: string, via: string, workspace: string): Json => ({
  kind: "agent_team", address, teamDefinitionId: "squad-definition", teamRunId, coordinatorAddress: `${address}/lead`,
  members: [
    { address: `${address}/lead`, agentDefinitionId: "lead-definition", agentRunId: `${teamRunId}-lead`, platformAgentRunId: null },
    { address: `${address}/mate`, agentDefinitionId: "mate-definition", agentRunId: `${teamRunId}-mate`, platformAgentRunId: null },
  ],
  handoffs: [{ from: `${address}/lead`, to: `${address}/mate`, rules: ["Ask the mate."] }],
  defaultLaunchConfiguration: legacyLaunch(workspace), taskExecutions: [], addedAt: T2, addedViaAgentRunId: via,
});

const withCollaborators = async (file: string, containerKey: null | "rootTeam" | "rootOrg", collaborators: Json[], tasks: Json[] = []) => {
  const document = JSON.parse(await fs.readFile(file, "utf8")) as Json;
  const container = (containerKey ? document[containerKey] : document) as Json;
  container["collaborators"] = collaborators;
  if (tasks.length) container["taskExecutions"] = [...(container["taskExecutions"] as Json[]), ...tasks];
  await put(file, document);
};

const seed = async (root: string) => {
  const memory = path.join(root, "memory");
  const layout = new AgentMemoryLayout(memory);
  const workspace = path.join(root, "workspace");
  // Structure check: the synthesized source has the released keys.
  expect(sorted(oldestAgentEntry("/w", "r", "v", workspace))).toEqual([...RELEASED_KEYS.agent]);
  const probeTeam = oldestTeamEntry("/t", "t", "v", workspace);
  expect(sorted(probeTeam)).toEqual([...RELEASED_KEYS.agent_team]);
  for (const member of probeTeam["members"] as Json[]) expect(sorted(member)).toEqual([...RELEASED_KEYS.member]);
  for (const handoff of probeTeam["handoffs"] as Json[]) expect(sorted(handoff)).toEqual([...RELEASED_KEYS.handoff]);
  expect(sorted(legacyLaunch(workspace))).toEqual([...RELEASED_KEYS.launchConfiguration]);
  for (const newest of [agentCollaborator({ address: "/n", runId: "r", definitionId: "d", viaRunId: "v" }), teamCollaborator({ address: "/m", teamRunId: "t", definitionId: "d", viaRunId: "v" })]) {
    const base = newest["kind"] === "agent" ? RELEASED_KEYS.agent : RELEASED_KEYS.agent_team;
    expect(sorted(newest), "the newest shapes extend the released ones").toEqual(expect.arrayContaining([...base]));
  }

  // Agent root `agent-host`: oldest Agent entry + oldest Team entry (never started: no memory folder) + newest Agent entry + a sourceless copy.
  const agentDir = getStandaloneRootDirPath(memory, "agent-host");
  const agentTree = emptyStandaloneRootTree({ host: { address: "/host" as never, agentRunId: "agent-host", agentDefinitionId: "host-definition" }, createdAt: T1 });
  expect((await new StandaloneRootPackageStore().writeTree(agentDir, agentTree)).outcome).toBe("committed");
  await withCollaborators(getStandaloneRootTreePath(agentDir), null, [
    oldestAgentEntry("/writer", "agent-writer", "agent-host", workspace),
    oldestTeamEntry("/squad", "agent-squad", "agent-host", workspace),
    agentCollaborator({ address: "/code_reviewer", runId: "agent-reviewer", definitionId: "reviewer", viaRunId: "agent-host", addedAt: T2 }),
  ], [sourcelessCopy("/code_reviewer", "agent-reviewer-copy", "agent-host")]);
  await put(path.join(agentDir, "agent-writer", "raw_traces_active.jsonl"), "writer memory\n");
  await put(path.join(agentDir, "agent-reviewer", "raw_traces_active.jsonl"), "reviewer memory\n");
  await put(path.join(agentDir, "agent-reviewer-copy", "raw_traces_active.jsonl"), "reviewer copy memory\n");
  await put(path.join(agentDir, "communication_messages.json"), { schemaVersion: 1, subjectKind: "agent", hostRunId: "agent-host", messages: [] });

  // Team root: a collaborator Team (oldest shape) added by the coordinator.
  const teamDir = layout.getTeamDirPath({ rootTeamRunId: "team-root", ancestorTeamRunIds: [] });
  const teamTree = testExecutionTree({ rootTeamRunId: "team-root", coordinatorAddress: "/lead", createdAt: T1, children: [testAgentNode("/lead", { agentRunId: "team-lead" })] });
  expect((await new TeamRunExecutionTreeStore().write(teamDir, teamTree)).outcome).toBe("committed");
  await withCollaborators(getTeamRunExecutionTreePath(teamDir), "rootTeam", [oldestTeamEntry("/qa_team", "team-qa", "team-lead", workspace)]);
  await put(path.join(teamDir, "team-qa-lead", "raw_traces_active.jsonl"), "qa lead memory\n");
  await put(path.join(teamDir, "team_communication_messages.json"), { schemaVersion: 1, rootTeamRunId: "team-root", messages: [] });

  // Org root: a collaborator Agent (oldest shape) added by a director, plus a sourceless copy at its address.
  const orgDir = layout.getOrgDirPath("org-root");
  const orgTree = testAgentOrgExecutionTree({ orgRunId: "org-root", members: [testOrgAgentNode("/director", "org-director")] });
  expect((await new AgentOrgRunExecutionTreeStore().write(orgDir, orgTree)).outcome).toBe("committed");
  await withCollaborators(getAgentOrgRunExecutionTreePath(orgDir), "rootOrg", [oldestAgentEntry("/designer", "org-designer", "org-director", workspace)],
    [sourcelessCopy("/designer", "org-designer-copy", "org-director")]);
  await put(path.join(orgDir, "org-designer", "raw_traces_active.jsonl"), "designer memory\n");
  await put(path.join(orgDir, "agent_org_communication_messages.json"), { schemaVersion: 1, subjectKind: "agent_org", orgRunId: "org-root", messages: [] });
  return { agentDir, teamDir, orgDir };
};

// ---- the built Studio server ---------------------------------------------------------------------------------------------
const logs: string[] = [];
const until = async (check: () => Promise<boolean> | boolean, label: string, timeout = 120_000) => {
  const deadline = Date.now() + timeout;
  while (Date.now() < deadline) { if (await check()) return; await new Promise((resolve) => setTimeout(resolve, 100)); }
  throw new Error(`Timed out ${label}: ${logs.join("\n").slice(-3000)}`);
};
const environment = (root: string): NodeJS.ProcessEnv => {
  const env: NodeJS.ProcessEnv = Object.fromEntries(["PATH", "USER", "LANG", "LC_ALL", "TMPDIR", "SHELL", "TERM"].flatMap((key) => process.env[key] === undefined ? [] : [[key, process.env[key]]]));
  return Object.assign(env, { HOME: path.join(root, "home"), DATABASE_URL: `file:${path.join(root, "db", "production.db")}` });
};
const studio = async (root: string) => {
  await fs.access(path.resolve("dist/app.js"));
  const child = spawn(process.execPath, [path.resolve("dist/app.js"), "--data-dir", root, "--host", "127.0.0.1", "--port", "0"],
    { env: environment(root), stdio: ["ignore", "pipe", "pipe"] });
  children.push(child);
  const index = logs.push("") - 1;
  const capture = (data: Buffer) => { logs[index] += data.toString(); };
  child.stdout!.on("data", capture); child.stderr!.on("data", capture);
  await until(() => {
    if (child.exitCode !== null || child.signalCode !== null) throw new Error(`Studio startup exited: ${logs[index]}`);
    return logs[index]!.includes("Server listening on 127.0.0.1:0");
  }, "Studio readiness");
  const origin = [...logs[index]!.matchAll(/Server listening at (http:\/\/127\.0\.0\.1:\d+)/g)].at(-1)![1]!;
  const gql = async (query: string, variables: Record<string, unknown> = {}) => {
    const response = await fetch(`${origin}/graphql`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ query, variables }) });
    const body = await response.json() as { data?: any; errors?: Array<{ message: string }> };
    expect(body.errors, JSON.stringify(body.errors)).toBeUndefined();
    return body.data;
  };
  const migration = async () => (await gql("{getAppDataMigrations{migrationId status attempts requiredOnStartup summary errorMessage}}"))
    .getAppDataMigrations.find((m: { migrationId: string }) => m.migrationId === MIGRATION_ID);
  const stop = async () => {
    if (child.exitCode !== null || child.signalCode !== null) return;
    const exited = once(child, "exit");
    child.kill("SIGTERM");
    const force = setTimeout(() => child.kill("SIGKILL"), 8_000);
    try { await exited; } finally { clearTimeout(force); }
  };
  return { gql, migration, stop, health: async () => (await fetch(`${origin}/rest/health`)).status };
};

describe("collaborators → delegated runs: the built server upgrades released app data at startup", () => {
  it("converts collaborators of an Agent, Team and Org root, keeps run IDs and memory, opens the roots, and a second start changes nothing", async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "collaborators-startup-e2e-")); roots.push(root);
    await fs.mkdir(path.join(root, "home")); await fs.mkdir(path.join(root, "workspace"));
    await fs.writeFile(path.join(root, ".env"), "APP_ENV=test\nAUTOBYTEUS_SERVER_HOST=http://127.0.0.1:8000\n");
    const dirs = await seed(root);
    const memory = path.join(root, "memory");
    const before = await state(memory);
    expect(Object.keys(before.trees)).toHaveLength(3);

    // First start: the migration runs before the server serves.
    const first = await studio(root);
    const migration = await first.migration();
    expect(migration, JSON.stringify(migration)).toMatchObject({ status: "SUCCEEDED", requiredOnStartup: true });
    expect(JSON.stringify(migration.summary)).toContain("3");
    // task-agent-own-run runs last in the same start and moves the converted delegated runs. This fresh ledger also runs the
    // released `20260701` projection migration over the team root's current message log, which it rewrites into a shape
    // the current reader rejects: task-agent-own-run reports that log as a preserved warning and moves the task agents.
    const ownRun = (await first.gql("{getAppDataMigrations{migrationId status summary errorMessage logPath}}"))
      .getAppDataMigrations.find((m: { migrationId: string }) => m.migrationId === TASK_AGENT_OWN_RUN_V1_MIGRATION_ID);
    expect(ownRun, JSON.stringify(ownRun)).toMatchObject({ status: "SUCCEEDED_WITH_WARNINGS" });
    const ownRunLog = await fs.readFile(ownRun.logPath, "utf8");
    expect(ownRunLog).toContain("agent_team:team-root");
    expect(ownRunLog).toContain("PRESERVED_UNREADABLE_LOG");
    expect(ownRunLog).not.toMatch(/FAILED_OPERATION|WAITING_FOR_PREDECESSOR/);
    expect(await first.health()).toBe(200);

    // Collaborators-v1 changed only the three trees; then task-agent-own-run (registered last, same start) moved every
    // delegated run that wrote memory to its own run folder (contract L1). Every memory file keeps its bytes.
    const after = await state(memory);
    const traces = (files: Record<string, string>) => Object.fromEntries(Object.entries(files).filter(([file]) => /raw_traces_active\.jsonl$/.test(file)));
    expect(Object.keys(traces(before.others))).toHaveLength(5);
    const movedTo: Record<string, string> = {
      "agents/agent-host/collaboration/agent-writer/raw_traces_active.jsonl": "agents/agent-writer/raw_traces_active.jsonl",
      "agents/agent-host/collaboration/agent-reviewer/raw_traces_active.jsonl": "agents/agent-reviewer/raw_traces_active.jsonl",
      "agents/agent-host/collaboration/agent-reviewer-copy/raw_traces_active.jsonl": "agents/agent-reviewer-copy/raw_traces_active.jsonl",
      "agent_orgs/org-root/org-designer/raw_traces_active.jsonl": "agents/org-designer/raw_traces_active.jsonl",
    };
    expect(traces(after.others)).toEqual(Object.fromEntries(Object.entries(traces(before.others)).map(([file, hash]) => [movedTo[file] ?? file, hash])));
    for (const file of Object.keys(before.trees)) expect(after.trees[file], `${file} was rewritten`).not.toBe(before.trees[file]);
    await expect(fs.stat(path.join(dirs.teamDir, "team-qa"))).rejects.toMatchObject({ code: "ENOENT" });
    await expect(fs.stat(path.join(dirs.agentDir, "agent-squad"))).rejects.toMatchObject({ code: "ENOENT" });

    // The trees on disk hold no collaborators; the current stores compose every collaborator as a delegated run with its
    // run ID and delegator, copies carrying a source.
    const agentRaw = JSON.parse(await fs.readFile(getStandaloneRootTreePath(dirs.agentDir), "utf8"));
    const teamRaw = JSON.parse(await fs.readFile(getTeamRunExecutionTreePath(dirs.teamDir), "utf8"));
    const orgRaw = JSON.parse(await fs.readFile(getAgentOrgRunExecutionTreePath(dirs.orgDir), "utf8"));
    for (const [name, json] of [["agent", agentRaw], ["team", teamRaw], ["org", orgRaw]] as const) {
      expect(objectsIn(json).some((record) => "collaborators" in record), `${name} tree has no collaborators`).toBe(false);
    }
    const agentJson = await new StandaloneRootPackageStore().readTree(dirs.agentDir, "agent-host");
    const teamJson = await new TeamRunExecutionTreeStore().read(dirs.teamDir, "team-root");
    const orgJson = await new AgentOrgRunExecutionTreeStore().read(dirs.orgDir, "org-root");
    const copyOf = (json: unknown, address: string, runId: string) => objectsIn(json).find((record) =>
      record["address"] === address && (record["agentRunId"] === runId || record["teamRunId"] === runId) && record["startedAt"]);
    const writer = copyOf(agentJson, "/writer", "agent-writer");
    const squad = copyOf(agentJson, "/squad", "agent-squad");
    const reviewer = copyOf(agentJson, "/code_reviewer", "agent-reviewer");
    const reviewerCopy = copyOf(agentJson, "/code_reviewer", "agent-reviewer-copy");
    const qa = copyOf(teamJson, "/qa_team", "team-qa");
    const designer = copyOf(orgJson, "/designer", "org-designer");
    const designerCopy = copyOf(orgJson, "/designer", "org-designer-copy");
    for (const [label, copy, delegator] of [["writer", writer, "agent-host"], ["squad", squad, "agent-host"], ["reviewer", reviewer, "agent-host"],
      ["qa", qa, "team-lead"], ["designer", designer, "org-director"]] as const) {
      expect(copy, `${label} is a delegated run`).toBeTruthy();
      expect(copy!["delegatorAgentRunId"], `${label} delegator`).toBe(delegator);
      expect(copy!["source"], `${label} carries a source`).toBeTruthy();
    }
    expect(squad!["members"].map((member: Json) => member["agentRunId"]).sort()).toEqual(["agent-squad-lead", "agent-squad-mate"]);
    // AC-011: the sourceless copies at a collaborator's address are stamped from that collaborator's snapshot.
    expect(reviewerCopy!["source"], "agent sourceless copy stamped").toBeTruthy();
    expect(designerCopy!["source"], "org sourceless copy stamped").toBeTruthy();

    // The roots open through the public API with their delegated runs.
    const agentView = (await first.gql(`query($id:String!){agentRunCollaboration(runId:$id)}`, { id: "agent-host" })).agentRunCollaboration.root_agent.execution_tree;
    expect(objectsIn(agentView).filter((record) => record["startedAt"] || record["started_at"]).map((record) => record["agentRunId"] ?? record["agent_run_id"] ?? record["teamRunId"] ?? record["team_run_id"]))
      .toEqual(expect.arrayContaining(["agent-writer", "agent-squad", "agent-reviewer", "agent-reviewer-copy"]));
    const teamView = (await first.gql(`query($id:String!){getTeamRunResumeConfig(teamRunId:$id){executionTree}}`, { id: "team-root" })).getTeamRunResumeConfig.executionTree;
    expect(JSON.stringify(teamView)).toContain("team-qa");
    const orgView = (await first.gql(`query($id:String!){getAgentOrgRunConfig(orgRunId:$id){executionTree}}`, { id: "org-root" })).getAgentOrgRunConfig.executionTree;
    expect(JSON.stringify(orgView)).toContain("org-designer");
    await first.stop();

    // Second start: nothing changes (idempotent), the migration stays done. The one new file is the standalone run history
    // index: this fresh ledger retries the released `20260521_run_history_index_v2` migration (it failed on the first start
    // because `agent-host` has no run metadata), and the retry now indexes the task agents' own run metadata. Those rows are
    // not standalone runs, so the history never lists them (the readiness index admits no task agent).
    const second = await studio(root);
    expect((await second.migration()).status).toBe("SUCCEEDED");
    const again = await state(memory);
    expect(again.trees).toEqual(after.trees);
    const { ["run_history_index.json"]: retriedIndex, ...othersAgain } = again.others;
    expect(retriedIndex, "the retried released index migration wrote the index").toBeTruthy();
    expect(othersAgain).toEqual(after.others);
    const history = await second.gql("{listWorkspaceRunHistory{agentDefinitions{runs{runId}}}}");
    const listed = objectsIn(history).flatMap((record) => typeof record["runId"] === "string" ? [record["runId"]] : []);
    expect(listed.filter((runId) => Object.values(movedTo).some((file) => file.startsWith(`agents/${runId}/`)))).toEqual([]);
    expect(await second.health()).toBe(200);
    await second.stop();
  }, 300_000);
});
