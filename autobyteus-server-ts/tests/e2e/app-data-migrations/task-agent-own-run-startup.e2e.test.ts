import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { once } from "node:events";
import { spawn, spawnSync, type ChildProcess } from "node:child_process";
import { DatabaseSync } from "node:sqlite";
import { afterEach, describe, expect, it } from "vitest";
import { TASK_AGENT_OWN_RUN_V1_MIGRATION_ID } from "../../../src/app-data-migrations/migrations/task-agent-own-run-v1/task-agent-own-run-v1-app-data-migration.js";
import { APPEND_ONLY_MESSAGE_LOGS_V1_MIGRATION_ID } from "../../../src/app-data-migrations/migrations/append-only-message-logs-v1/append-only-message-logs-v1-app-data-migration.js";
import { DELEGATED_COPY_OWN_FILE_COMPLETE_V1_MIGRATION_ID } from "../../../src/app-data-migrations/migrations/delegated-copy-own-file-complete-v1/delegated-copy-own-file-complete-v1-app-data-migration.js";
import { NEW_FOLDERS, OLD_FOLDERS, snapshot, writeReleasedDataRoot } from "../../fixtures/app-data-migrations/released-task-agent-layout-fixtures.js";

// The startup migration `20261017_task_agent_own_run_v1` through the BUILT Studio server (`dist/app.js`) on a FAITHFUL
// upgrade: the app-data folder of an install where every earlier released migration already completed and this one never
// ran. The ledger is made by a first start of this build on an empty folder (every migration records itself) and then
// removing this migration's row and the rows of the migrations registered after it (they never ran on such an install
// either: `20261018_append_only_message_logs_v1`, which converts the message logs this migration reads and writes at the
// end of the same start, and `20261019_delegated_copy_own_file_complete_v1`, which completes the own files this migration
// writes with each copy's own source in the same start); then the released-layout test data is written (hand-built, never real user data:
// `released-task-agent-layout-fixtures.ts`). Its runtime values are set to the scripted AGY CLI so a migrated task agent's model can
// be configured (Settings model edit needs a model catalog); the record shapes stay the released ones.
// - TAU-1 (AC-008, AC-011, AC-006, AC-013, AC-005): the migration completes; every task agent's memory is at its own folder with the
//   same bytes; the hub, team run and org open with their task agents; a task agent's conversation and a context file
//   (its link through the hub) are read from its own folder; the Memory page lists agent task agents under their definition; a task agent is refused as a run the user
//   started (G1 / G2); a second start changes nothing.
// - TAU-2 (AC-010; POSIX non-root only, because the failed step is a mode-bit block): one coordinating run cannot be moved on the first start; the app starts and the other runs work; the user
//   changes a migrated task agent's model; the next start completes the move with the same bytes and keeps the edit.
// - TAU-3 (AC-012): deleting a migrated hub removes only its folder; its task agents' folders stay with every file, are not
//   listed, and a later start reports nothing.
// Not here: waking a migrated task agent (AC-004) needs the runtime state a real released run wrote (for AGY its project
// capsule), which hand-built data cannot faithfully carry; it is proven on a real released install upgraded in the desktop app.
// Prerequisite: `pnpm -C autobyteus-server-ts build` for the current worktree (a stale dist is not proof).
// Run: env -i PATH="$PATH" HOME="$(mktemp -d)" TMPDIR="$TMPDIR" \
//   pnpm -C autobyteus-server-ts exec vitest run tests/e2e/app-data-migrations/task-agent-own-run-startup.e2e.test.ts --no-watch
const ID = TASK_AGENT_OWN_RUN_V1_MIGRATION_ID;
/** Registered after own-run: an install that never ran own-run never ran these either. */
const LATER = [APPEND_ONLY_MESSAGE_LOGS_V1_MIGRATION_ID, DELEGATED_COPY_OWN_FILE_COMPLETE_V1_MIGRATION_ID];
const AGY_CLI = path.resolve("tests/fixtures/agy-failure-cli.mjs");
const MODEL = "gemini-3.8-flash-low";
const ALT = "tau-alt-model";
/** TAU-2 blocks a rename with POSIX mode bits; root ignores them and Windows has none (as project-task-boundaries.e2e). */
const modeBitsBlock = process.platform !== "win32" && process.getuid?.() !== 0;

type Json = Record<string, any>;
const children: ChildProcess[] = [];
const roots: string[] = [];
const logs: string[] = [];
afterEach(async () => {
  for (const child of children.splice(0)) if (child.exitCode === null && child.signalCode === null) child.kill("SIGKILL");
  for (const root of roots.splice(0)) {
    spawnSync("chmod", ["-R", "u+w", root]);
    await fs.rm(root, { recursive: true, force: true });
  }
});
const objectsIn = (value: unknown): Json[] => {
  const out: Json[] = [];
  const visit = (v: unknown) => {
    if (Array.isArray(v)) v.forEach(visit);
    else if (v && typeof v === "object") { out.push(v as Json); Object.values(v).forEach(visit); }
  };
  visit(value); return out;
};
const until = async (check: () => Promise<boolean> | boolean, label: string, timeout = 120_000) => {
  const deadline = Date.now() + timeout;
  while (Date.now() < deadline) { if (await check()) return; await new Promise((resolve) => setTimeout(resolve, 100)); }
  throw new Error(`Timed out ${label}: ${logs.join("\n").slice(-3000)}`);
};

// ---- the built Studio server ----------------------------------------------------------------------------------------------
const studio = async (root: string) => {
  await fs.access(path.resolve("dist/app.js"));
  const env: NodeJS.ProcessEnv = Object.fromEntries(["PATH", "USER", "LANG", "TMPDIR", "SHELL"].flatMap((key) => process.env[key] === undefined ? [] : [[key, process.env[key]]]));
  Object.assign(env, { HOME: path.join(root, "home"), DATABASE_URL: `file:${path.join(root, "db", "production.db")}`,
    ANTIGRAVITY_CLI_COMMAND: AGY_CLI, AGY_FAKE_CASE: "linked_skills", AGY_FAKE_EXTRA_MODELS: ALT });
  const child = spawn(process.execPath, [path.resolve("dist/app.js"), "--data-dir", root, "--host", "127.0.0.1", "--port", "0"], { env, stdio: ["ignore", "pipe", "pipe"] });
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
  /** True when a restore of `id` as a run the user started is refused (an error or success:false). */
  const restoreRefused = async (mutation: "restoreAgentRun" | "restoreAgentTeamRun", id: string) => {
    const arg = mutation === "restoreAgentRun" ? "agentRunId" : "teamRunId";
    const response = await fetch(`${origin}/graphql`, { method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ query: `mutation($id:String!){${mutation}(${arg}:$id){success message}}`, variables: { id } }) });
    const body = await response.json() as { data?: any; errors?: unknown[] };
    return Boolean(body.errors?.length) || body.data?.[mutation]?.success === false;
  };
  const migration = async (id = ID) => (await gql("{getAppDataMigrations{migrationId status attempts summary errorMessage logPath}}"))
    .getAppDataMigrations.find((m: Json) => m.migrationId === id);
  const stop = async () => {
    if (child.exitCode !== null || child.signalCode !== null) return;
    const exited = once(child, "exit");
    child.kill("SIGTERM");
    const force = setTimeout(() => child.kill("SIGKILL"), 8_000);
    try { await exited; } finally { clearTimeout(force); }
  };
  return { gql, migration, restoreRefused, stop, origin, output: () => logs[index]!, health: async () => (await fetch(`${origin}/rest/health`)).status };
};

/** Released record values pointed at the scripted runtime (shapes unchanged): runtime, model ids, a config it accepts. */
const toScriptedRuntime = (value: unknown): unknown => {
  if (Array.isArray(value)) return value.map(toScriptedRuntime);
  if (!value || typeof value !== "object") return value;
  const out: Json = {};
  for (const [key, inner] of Object.entries(value)) {
    if (key === "runtimeKind" && inner === "codex_app_server") out[key] = "antigravity_cli";
    else if (key === "llmModelIdentifier" && typeof inner === "string") out[key] = inner === "gpt-5-mini" ? ALT : MODEL;
    else if (key === "llmConfig" && inner && typeof inner === "object") out[key] = null;
    else out[key] = toScriptedRuntime(inner);
  }
  return out;
};
const jsonFiles = async (dir: string): Promise<string[]> => (await fs.readdir(dir, { recursive: true, withFileTypes: true }))
  .filter((entry) => entry.isFile() && entry.name.endsWith(".json")).map((entry) => path.join(entry.parentPath, entry.name));

/** An app-data folder of an install where every earlier migration completed and ours never ran, holding the released layout. */
const faithfulRoot = async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "task-agent-own-run-e2e-")); roots.push(root);
  await fs.mkdir(path.join(root, "home")); await fs.mkdir(path.join(root, "workspace"));
  await fs.writeFile(path.join(root, ".env"), "APP_ENV=test\nAUTOBYTEUS_SERVER_HOST=http://127.0.0.1:8000\n");
  const fresh = await studio(root);
  const recorded = (await fresh.gql("{getAppDataMigrations{migrationId status}}")).getAppDataMigrations as Json[];
  await fresh.stop();
  const db = new DatabaseSync(path.join(root, "db", "production.db"));
  for (const id of [ID, ...LATER]) db.prepare("DELETE FROM app_data_migration_records WHERE migration_id = ?").run(id);
  const remaining = db.prepare("SELECT migration_id, status FROM app_data_migration_records").all() as Json[];
  db.close();
  expect(remaining.some((row) => [ID, ...LATER].includes(row["migration_id"]))).toBe(false);
  expect(remaining.length, "every earlier migration stays recorded").toBe(recorded.length - 1 - LATER.length);
  const memory = path.join(root, "memory");
  await writeReleasedDataRoot(memory);
  for (const file of await jsonFiles(memory)) await fs.writeFile(file, `${JSON.stringify(toScriptedRuntime(JSON.parse(await fs.readFile(file, "utf8"))), null, 2)}\n`);
  return { root, memory, ledgerBefore: remaining };
};

/** The memory files of a task agent's folder (its memory, not the coordinating run's records), by relative path → hash. */
const taskAgentFiles = (files: Record<string, string>, folder: string) => Object.fromEntries(Object.entries(files)
  .filter(([file]) => file.startsWith(`${folder}/`)).map(([file, hash]) => [file.slice(folder.length + 1), hash]));
const MOVED = Object.entries(OLD_FOLDERS).flatMap(([id, old]) => old ? [[id, old, NEW_FOLDERS[id]!] as const] : []);
/** A task agent folder's own memory before the move: a nested task agent's folder is excluded from its parent team's. */
const ownMemory = (files: Record<string, string>, old: string) => Object.fromEntries(Object.entries(taskAgentFiles(files, old))
  .filter(([file]) => !MOVED.some(([, other]) => other !== old && other.startsWith(`${old}/`) && `${old}/${file}`.startsWith(`${other}/`))));

/** Every delegated copy's own file (agent `run_metadata.json` or team tree with a `taskAgent` section) under the memory root. */
const ownFiles = async (memory: string): Promise<Array<[string, Json]>> => {
  const out: Array<[string, Json]> = [];
  for (const file of await jsonFiles(memory)) {
    if (file.includes(`${path.sep}imports${path.sep}`)) continue;
    const value = JSON.parse(await fs.readFile(file, "utf8"));
    if (value && typeof value === "object" && "taskAgent" in value) out.push([path.relative(memory, file), value]);
  }
  return out;
};
/** Every own file is in the current shape: no released `origin`, and each records its own source (REQ-001, M4). */
const expectOwnFilesComplete = async (memory: string) => {
  const files = await ownFiles(memory);
  expect(files.length, "the released data has delegated copies").toBeGreaterThan(0);
  for (const [file, own] of files) {
    expect(own.taskAgent, file).not.toHaveProperty("origin");
    if ("rootTeam" in own) {
      expect(own.rootTeam.defaultLaunchConfiguration, file).toBeTruthy();
      for (const member of own.rootTeam.members) expect(member, `${file} ${member.address}`).toMatchObject({ launchConfiguration: expect.any(Object), followsTeam: expect.any(Boolean) });
    } else {
      expect(own, file).toMatchObject({ runtimeKind: expect.any(String), llmModelIdentifier: expect.any(String), autoExecuteTools: expect.any(Boolean) });
    }
    expect(JSON.stringify(own), `${file} carries no obsolete skillAccessMode`).not.toContain("skillAccessMode");
  }
};

const historyRunIds = async (gql: (q: string) => Promise<any>) => objectsIn(await gql("{listWorkspaceRunHistory{agentDefinitions{runs{runId}}}}"))
  .flatMap((record) => typeof record["runId"] === "string" ? [record["runId"] as string] : []);
const hubTaskAgents = async (gql: (q: string, v?: Json) => Promise<any>) => objectsIn((await gql(`query($id:String!){agentRunCollaboration(runId:$id)}`, { id: "hub" }))
  .agentRunCollaboration?.root_agent?.execution_tree).filter((r) => r["started_at"] ?? r["startedAt"]).map((r) => r["agent_run_id"] ?? r["agentRunId"] ?? r["team_run_id"] ?? r["teamRunId"]);

describe("task agent own run: the built server upgrades a faithful released install at startup", () => {
  it("TAU-1 moves every task agent with its bytes, the runs open with their task agents, the Memory page attributes them, a second start changes nothing", async () => {
    const { root, memory } = await faithfulRoot();
    const before = await snapshot(memory);

    const first = await studio(root);
    const migration = await first.migration();
    expect(migration, JSON.stringify(migration)).toMatchObject({ status: "SUCCEEDED" });
    const log = await fs.readFile(migration.logPath, "utf8");
    expect(log, log).not.toMatch(/FAILED_OPERATION|WAITING_FOR_PREDECESSOR|PRESERVED_/);
    expect(await first.health()).toBe(200);
    // The same start ends with the message log conversion: every message log own-run read or wrote is append-only now.
    expect(await first.migration(APPEND_ONLY_MESSAGE_LOGS_V1_MIGRATION_ID)).toMatchObject({ status: "SUCCEEDED" });
    expect((await jsonFiles(memory)).filter((file) => /communication_messages\.json$/.test(file)), "no JSON message log is left").toEqual([]);
    // The same start completes every copy's own file with its own source.
    const completion = await first.migration(DELEGATED_COPY_OWN_FILE_COMPLETE_V1_MIGRATION_ID);
    expect(completion, JSON.stringify(completion)).toMatchObject({ status: "SUCCEEDED" });
    const completionLog = await fs.readFile(completion.logPath, "utf8");
    expect(completionLog, completionLog).not.toMatch(/FAILED_OPERATION|PRESERVED_/);
    await expectOwnFilesComplete(memory);

    // AC-008: every task agent's memory is at its own folder (contract L1) with the same files and bytes; none is left at the old place.
    const after = await snapshot(memory);
    for (const [id, old, now] of MOVED) {
      expect(taskAgentFiles(after, now), `${id} at ${now}`).toMatchObject(ownMemory(before, old));
      expect(Object.keys(taskAgentFiles(after, old)), `${id} left nothing at ${old}`).toEqual([]);
    }
    // AC-006: the runs open with all their task agents; a task agent's conversation is read from its own folder.
    expect(await hubTaskAgents(first.gql)).toEqual(expect.arrayContaining(["c1-reviewer", "c2-team-a", "c2-team-b", "never-ran"]));
    const teamView = JSON.stringify((await first.gql(`query($id:String!){getTeamRunResumeConfig(teamRunId:$id){executionTree}}`, { id: "team-r" })).getTeamRunResumeConfig.executionTree);
    for (const id of ["c3-writer-copy", "nd-copy", "c4-qa"]) expect(teamView, `team run shows ${id}`).toContain(id);
    // (The org is read by run id: the hand-built data writes no history index rows.)
    const orgView = JSON.stringify((await first.gql(`query($id:String!){getAgentOrgRunConfig(orgRunId:$id){executionTree}}`, { id: "org-o" })).getAgentOrgRunConfig.executionTree);
    for (const id of ["c5-analyst", "c5-review", "ns-director-copy", "c6-helper"]) expect(orgView, `org shows ${id}`).toContain(id);
    const c1 = (await first.gql(`query($h:String!,$a:String!,$r:String!){agentRunCollaborationMemberProjection(hostRunId:$h,memberAddress:$a,agentRunId:$r){agentRunId conversation}}`,
      { h: "hub", a: "/code_reviewer", r: "c1-reviewer" })).agentRunCollaborationMemberProjection;
    expect(c1.agentRunId).toBe("c1-reviewer");
    expect(JSON.stringify(c1.conversation), "the conversation is read from the task agent's own folder").toContain("work of c1");
    // The task agent's context-file link (by its hub and run id) serves the moved file's bytes (REQ-008); the standalone-run
    // route does not, because a task agent is not a run the user started (G1).
    const contextFile = await fetch(`${first.origin}/rest/agent-collaborations/hub/agent-runs/c1-reviewer/context-files/ctx_notes__notes.txt`);
    expect(contextFile.status, "context file served through the hub").toBe(200);
    expect(await contextFile.text()).toBe("context bytes");
    expect((await fetch(`${first.origin}/rest/runs/c1-reviewer/context-files/ctx_notes__notes.txt`)).status, "not as a standalone run").toBe(404);
    // G1 / G2 (AC-005): a migrated task agent (agent or team) is refused as a run the user started; it is not in the history.
    expect(await first.restoreRefused("restoreAgentRun", "c1-reviewer"), "agent task agent restore refused").toBe(true);
    expect(await first.restoreRefused("restoreAgentTeamRun", "c2-team-a"), "team task agent restore refused").toBe(true);
    expect((await historyRunIds(first.gql)).filter((runId) => runId in NEW_FOLDERS), "no task agent in the history").toEqual([]);
    // AC-013: the Memory page lists agent task agents under their agent definition, never unattributed. A group that
    // only task agents form (no history row names it) shows the definition's name, or its id when the definition is
    // missing (DEC-018). The hand-built data has no definitions: "Code Reviewer" is created as the user would; `helper` stays missing.
    const created = (await first.gql(`mutation($input:CreateAgentDefinitionInput!){createAgentDefinition(input:$input){id name}}`,
      { input: { name: "Code Reviewer", role: "assistant", description: "Reviews", instructions: "Review.", toolNames: [] } })).createAgentDefinition;
    expect(created.id, "the definition the released task agent names").toBe("code-reviewer");
    const agents = (await first.gql("{listAgentsWithMemory(pageSize:100){entries{attribution agentDefinitionId displayName runCount}}}")).listAgentsWithMemory.entries as Json[];
    expect(agents.find((entry) => entry["agentDefinitionId"] === "code-reviewer"), JSON.stringify(agents)).toMatchObject({ displayName: "Code Reviewer" });
    expect(agents.find((entry) => entry["agentDefinitionId"] === "helper"), JSON.stringify(agents)).toMatchObject({ displayName: "helper" });
    expect((await first.gql(`{listAgentsWithMemory(search:"Code Reviewer",pageSize:100){entries{agentDefinitionId}}}`)).listAgentsWithMemory.entries
      .map((entry: Json) => entry["agentDefinitionId"]), "search matches the name").toContain("code-reviewer");
    const reviewerRuns = (await first.gql(`query($s:AgentWithMemorySelectorInput!){listAgentRunsWithMemory(selector:$s,pageSize:100){entries{runId}}}`,
      { s: { attribution: agents.find((entry) => entry["agentDefinitionId"] === "code-reviewer")!["attribution"], agentDefinitionId: "code-reviewer" } })).listAgentRunsWithMemory.entries as Json[];
    expect(reviewerRuns.map((entry) => entry["runId"])).toContain("c1-reviewer");
    await first.stop();

    // A second start changes nothing.
    const second = await studio(root);
    expect((await second.migration()).status).toBe("SUCCEEDED");
    expect(await second.migration(DELEGATED_COPY_OWN_FILE_COMPLETE_V1_MIGRATION_ID)).toMatchObject({ status: "SUCCEEDED", attempts: 1 });
    expect(await snapshot(memory)).toEqual(after);
    await second.stop();
  }, 300_000);

  it.skipIf(!modeBitsBlock)("TAU-2 a run that cannot be moved leaves the app working; the user edits a migrated task agent's model; the next start completes and keeps the edit (needs POSIX mode bits that bind: not root, not Windows)", async () => {
    const { root, memory } = await faithfulRoot();
    const before = await snapshot(memory);
    // The hub's task agents cannot be renamed out of its folder on this start (a step that fails).
    const blocked = path.join(memory, "agents", "hub", "collaboration");
    await fs.chmod(blocked, 0o555);
    // The block must hold before the test relies on it.
    await expect(fs.writeFile(path.join(blocked, ".tau-probe"), "x")).rejects.toMatchObject({ code: expect.stringMatching(/^(EACCES|EPERM)$/) });

    const first = await studio(root);
    const migration = await first.migration();
    expect(migration.status, JSON.stringify(migration)).not.toBe("SUCCEEDED");
    expect(await first.health()).toBe(200);
    // The failed step really did not move the hub's task agent.
    expect(await fs.stat(path.join(memory, OLD_FOLDERS["c1-reviewer"]!, "raw_traces_active.jsonl"))).toBeTruthy();
    await expect(fs.stat(path.join(memory, NEW_FOLDERS["c1-reviewer"]!, "raw_traces_active.jsonl"))).rejects.toMatchObject({ code: "ENOENT" });
    console.log(`TAU-2 first start: ${migration.status} (${migration.errorMessage ?? "no error message"})`);
    // The other runs are migrated and work; the hub still loads.
    expect(await fs.stat(path.join(memory, NEW_FOLDERS["c3-writer-copy"]!, "raw_traces_active.jsonl"))).toBeTruthy();
    expect(await fs.stat(path.join(memory, NEW_FOLDERS["c5-analyst"]!, "raw_traces_active.jsonl"))).toBeTruthy();
    expect((await first.gql(`query($id:String!){agentRunCollaboration(runId:$id)}`, { id: "hub" })).agentRunCollaboration).toBeTruthy();
    // The user keeps working: a stopped, migrated task agent's model is changed in the team run's Settings.
    const changed = (await first.gql(`mutation($input:UpdateDelegatedLaunchSelectionsInput!){updateDelegatedLaunchSelections(input:$input){success outcome message fieldErrors{path message}}}`,
      { input: { rootKind: "AGENT_TEAM", rootRunId: "team-r", changes: [{ agentRunId: "nd-copy", selection: { llmModelIdentifier: ALT, llmConfig: null } }] } })).updateDelegatedLaunchSelections;
    expect(changed, JSON.stringify(changed)).toMatchObject({ success: true });
    await first.stop();
    await fs.chmod(blocked, 0o755);

    // The next start completes the move with the same bytes and keeps the edit in the task agent's own file.
    const second = await studio(root);
    const retried = await second.migration();
    expect(retried.status, `${JSON.stringify(retried)}\n${retried.logPath ? await fs.readFile(retried.logPath, "utf8") : ""}`).toMatch(/^SUCCEEDED/);
    const after = await snapshot(memory);
    for (const [id, old, now] of MOVED) expect(taskAgentFiles(after, now), `${id} at ${now}`).toMatchObject(ownMemory(before, old));
    expect(await hubTaskAgents(second.gql)).toEqual(expect.arrayContaining(["c1-reviewer", "c2-team-a", "c2-team-b"]));
    const ndOwn = JSON.parse(await fs.readFile(path.join(memory, "agents", "nd-copy", "run_metadata.json"), "utf8"));
    expect(JSON.stringify(ndOwn), "the model edit is in the task agent's own file").toContain(ALT);
    // The own-file completion waited for the move on the first start and completes on this one.
    expect((await second.migration(DELEGATED_COPY_OWN_FILE_COMPLETE_V1_MIGRATION_ID)).status).toMatch(/^SUCCEEDED/);
    await expectOwnFilesComplete(memory);
    await second.stop();
  }, 300_000);

  it("TAU-3 deleting a migrated hub removes only its folder; its task agents' folders stay with every file and are not listed", async () => {
    const { root, memory } = await faithfulRoot();
    const first = await studio(root);
    expect((await first.migration()).status).toBe("SUCCEEDED");
    const migrated = await snapshot(memory);
    const reviewer = ((await first.gql("{listAgentsWithMemory(pageSize:100){entries{attribution agentDefinitionId}}}")).listAgentsWithMemory.entries as Json[])
      .find((entry) => entry["agentDefinitionId"] === "code-reviewer")!;
    expect(reviewer, "the agent task agent is listed before the delete").toBeTruthy();
    const deleted = (await first.gql(`mutation($id:String!){deleteStoredRun(runId:$id){success message}}`, { id: "hub" })).deleteStoredRun;
    expect(deleted, JSON.stringify(deleted)).toMatchObject({ success: true });
    await expect(fs.stat(path.join(memory, "agents", "hub"))).rejects.toMatchObject({ code: "ENOENT" });
    const after = await snapshot(memory);
    for (const id of ["c1-reviewer", "c2-team-a", "c2-team-b", "c7-helper", "never-ran"]) {
      expect(taskAgentFiles(after, NEW_FOLDERS[id]!), `${id} kept with every file`).toEqual(taskAgentFiles(migrated, NEW_FOLDERS[id]!));
    }
    expect((await historyRunIds(first.gql)).filter((runId) => runId === "hub" || runId in NEW_FOLDERS)).toEqual([]);
    expect(await first.restoreRefused("restoreAgentRun", "c1-reviewer"), "a detached task agent is not restored").toBe(true);
    const reviewerRuns = (await first.gql(`query($s:AgentWithMemorySelectorInput!){listAgentRunsWithMemory(selector:$s,pageSize:100){entries{runId}}}`,
      { s: { attribution: reviewer["attribution"], agentDefinitionId: "code-reviewer" } })).listAgentRunsWithMemory.entries as Json[];
    expect(reviewerRuns.map((entry) => entry["runId"]), "a detached task agent is not listed").not.toContain("c1-reviewer");
    await first.stop();
    // A later start keeps the detached folders and reports nothing about them.
    const second = await studio(root);
    expect(await second.health()).toBe(200);
    for (const id of ["c1-reviewer", "c2-team-a"]) expect(taskAgentFiles(await snapshot(memory), NEW_FOLDERS[id]!)).toEqual(taskAgentFiles(migrated, NEW_FOLDERS[id]!));
    expect(second.output()).not.toMatch(/c1-reviewer[^\n]*(error|invalid|unavailable)/i);
    await second.stop();
  }, 300_000);

});
