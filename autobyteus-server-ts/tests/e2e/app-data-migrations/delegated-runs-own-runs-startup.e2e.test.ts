import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { createHash } from "node:crypto";
import { DatabaseSync } from "node:sqlite";
import { spawnSync } from "node:child_process";
import { afterAll, describe, expect, it } from "vitest";
import { DELEGATED_RUNS_OWN_RUNS_V1_MIGRATION_ID } from "../../../src/app-data-migrations/migrations/delegated-runs-own-runs-v1/delegated-runs-own-runs-v1-app-data-migration.js";
import {
  E, I, LEGACY, M, MARKETING, MEMBER_EDIT_TEAM, ORG, P, PEER_STARTED, PENDING_SWITCH_AGENT, PENDING_SWITCH_TEAM, RESEARCH, SWITCHED_AGENT, T0, T1, T2,
  TEAM_EDIT_TEAM, exists, paths, pendingSwitch, put, readJson, runtimeEdit, writeReleasedRuntimeEdits, writeReleasedWorld,
} from "../../fixtures/app-data-migrations/released-delegation-shape-fixtures.js";
import { RootRunPackageCurrentValidator } from "../../../src/run-history/services/root-run-package-current-validator.js";
import { killBuiltStudios, startBuiltStudio, type BuiltStudio } from "../helpers/built-studio-roots.js";
import { delegatedRunsTree } from "../helpers/run-tree-delegated.js";

// autobyteus-461 API-E03 (AC-014; design DS-10): the startup migration `20261111_delegated_runs_own_runs_v1` through the BUILT
// Studio server (`dist/app.js`) on a FAITHFUL upgrade: an app-data folder where every earlier migration completed (a first
// start of this build on an empty folder records them all) and this one never ran (its ledger row removed: it is the only
// migration this release adds), holding the stored shapes released before it. The data is hand-built
// (`released-delegation-shape-fixtures.ts`, contract §6 / §13: never real user data or a copy of it).
// - DRO-1: the start completes and the migration is recorded SUCCEEDED with nothing failed; the files have the contract's
//   shapes (spot checks; the migration's own tests check every shape); the server reads every converted run as a run of its
//   own: the run list lists the delegated agent runs and team runs; each opens (its own projection or resume config) with
//   no restore; the in-memory DelegationIndex built from the converted Task entries gives the manager one hop (E, not P or
//   I); the team E file rooted at `/` with its handoff to `/Teacher` kept loads; nothing is started.
// - DRO-2: a second start changes no file (QR-003) and records nothing new.
// - DRO-4 (autobyteus-508): released Settings edits that name another agent runtime (`writeReleasedRuntimeEdits`), each run
//   assigned by the manager through its own Task: after the upgrade start, the manager's tree (the rows Settings shows) gives
//   each edited run or member the runtime, model and settings the user chose with the Settings source as its own (not the
//   team's "Inherited from the run"); an unedited member keeps its recorded source; a pending switch stays beside the new
//   runtime; a second start changes nothing.
// Not here: messaging a converted run needs a usable model for its stored runtime (`autobyteus` with a model the fixture
// names, no provider); the contract stories (API-E02) prove messaging, waking and closing of delegated runs on this build.
// Prerequisite: `pnpm -C autobyteus-server-ts build` for the current worktree.
// Run: env -i PATH="$PATH" HOME="$(cd "$(mktemp -d)" && pwd -P)" TMPDIR="$TMPDIR" USER="$USER" RUN_AGY_FAILURE_E2E=1 \
//   ANTIGRAVITY_CLI_COMMAND=$PWD/tests/fixtures/agy-failure-cli.mjs DRO_E2E_EVIDENCE_DIR=<dir> \
//   pnpm exec vitest run tests/e2e/app-data-migrations/delegated-runs-own-runs-startup.e2e.test.ts --no-watch   (in autobyteus-server-ts)

type Json = Record<string, any>;
const ID = DELEGATED_RUNS_OWN_RUNS_V1_MIGRATION_ID;
const cli = process.env.ANTIGRAVITY_CLI_COMMAND ?? "";
const enabled = process.env.RUN_AGY_FAILURE_E2E === "1" && spawnSync(cli, ["--version"], { stdio: "ignore" }).status === 0;
const suite = enabled ? describe : describe.skip;
const roots: string[] = [];
const evidence: Json = {};

/** Every file under the app-data folder except the server's own database, logs and home, by relative path → hash. */
const snapshot = async (root: string): Promise<Record<string, string>> => {
  const out: Record<string, string> = {};
  for (const entry of await fs.readdir(root, { recursive: true, withFileTypes: true })) {
    if (!entry.isFile()) continue;
    const file = path.join(entry.parentPath, entry.name);
    const rel = path.relative(root, file);
    if (/^(db|logs|home)\//.test(rel) || rel === ".env" || rel.includes("/logs/")) continue;
    out[rel] = createHash("sha256").update(await fs.readFile(file)).digest("hex");
  }
  return out;
};

const studio = (root: string) => startBuiltStudio(root, { ANTIGRAVITY_CLI_COMMAND: cli, AGY_FAKE_CASE: "linked_skills" });

suite("delegated runs own runs: the built server upgrades released app data at startup (autobyteus-461 API-E03)", () => {
  afterAll(async () => {
    killBuiltStudios();
    for (const root of roots) await fs.rm(root, { recursive: true, force: true });
    const dir = process.env["DRO_E2E_EVIDENCE_DIR"];
    if (dir) { await fs.mkdir(dir, { recursive: true }); await fs.writeFile(path.join(dir, "API-E03-delegated-runs-own-runs-startup.json"), `${JSON.stringify(evidence, null, 2)}\n`); }
  }, 60_000);

  /** DRO-1's released world on an install where every earlier migration completed (461's ledger row removed). */
  const preparedWorld = async (label: string) => {
    const root = await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(), `delegated-runs-own-runs-${label}-`))); roots.push(root);
    await fs.mkdir(path.join(root, "home"));
    await fs.writeFile(path.join(root, ".env"), "APP_ENV=test\nAUTOBYTEUS_SERVER_HOST=http://127.0.0.1:8000\n");
    const fresh = await studio(root);
    await fresh.stop();
    const db = new DatabaseSync(path.join(root, "db", "production.db"));
    db.prepare("DELETE FROM app_data_migration_records WHERE migration_id = ?").run(ID);
    db.close();
    const world = { appData: root, memory: path.join(root, "memory") };
    await writeReleasedWorld(world);
    const at = paths(world);
    for (const run of [E, P, MARKETING]) await fs.writeFile(path.join(path.dirname(at.teamFile(run)), "team_communication_messages_active.jsonl"), "");
    await fs.writeFile(path.join(path.dirname(at.orgFile(ORG)), "agent_org_communication_messages_active.jsonl"), "");
    const releasedOrg = await readJson(at.orgFile(ORG));
    Object.assign(releasedOrg.rootOrg.members[1], { role: null, description: null, coordinatorAddress: "/dev_team/lead", defaultLaunchConfiguration: releasedOrg.rootOrg.defaultLaunchConfiguration });
    await fs.writeFile(at.orgFile(ORG), JSON.stringify(releasedOrg, null, 2));
    return { root, at };
  };

  it("DRO-3 DS-15: restart resume skips a delegated run whose Task entry is closed (the same busy run with its entry open is resumed, DRO-1)", async () => {
    const { root, at } = await preparedWorld("closed");
    // P's Task entry was closed before the interrupted update restart; the busy-run record still names its designer.
    const record = await readJson(at.taskRecord(T1));
    const entry = (record.agentRunResources as Json[]).find((candidate) => candidate.agentRun?.teamRunId === P);
    expect(entry, "P's Task entry").toBeTruthy();
    entry!.closedAt = T0;
    await fs.writeFile(at.taskRecord(T1), JSON.stringify(record, null, 2));
    const server = await studio(root);
    try {
      const resumeOf = async (run: string) => (await server.gql(`query($id:String!){getTeamRunResumeConfig(teamRunId:$id){teamRunId isActive}}`, { id: run })).getTeamRunResumeConfig;
      await expect(resumeOf(P)).resolves.toMatchObject({ teamRunId: P });
      // Give a resume every chance to happen, then check: the closed run stays stopped (the fence covers restart resume).
      await new Promise((resolve) => setTimeout(resolve, 5_000));
      const p = await resumeOf(P);
      evidence.dro3 = { pAfterStart: p, logLines: server.output().split("\n").filter((line) => line.includes(P) || /restart resume|RESTART_RESUME|TASK_AGENT_RESOURCE_CLOSED/i.test(line)).slice(0, 12) };
      expect(p.isActive, `P's entry is closed: restart resume skips it (DS-15); ${JSON.stringify(evidence.dro3)}`).toBe(false);
      for (const run of [E, MARKETING]) expect((await resumeOf(run)).isActive, `${run} stays stopped`).toBe(false);
    } finally { await server.stop(); }
  }, 300_000);

  it("DRO-1 converts every stored shape at startup, the converted runs open as runs of their own; DRO-2 a second start changes nothing", async () => {
    const root = await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(), "delegated-runs-own-runs-e2e-"))); roots.push(root);
    await fs.mkdir(path.join(root, "home"));
    await fs.writeFile(path.join(root, ".env"), "APP_ENV=test\nAUTOBYTEUS_SERVER_HOST=http://127.0.0.1:8000\n");
    // An install where every earlier migration completed: a first start records them all; then this one's row goes.
    const fresh = await studio(root);
    const recorded = (await fresh.gql("{getAppDataMigrations{migrationId status}}")).getAppDataMigrations as Json[];
    await fresh.stop();
    expect(recorded.find((row) => row.migrationId === ID)?.status).toBe("SUCCEEDED");
    const db = new DatabaseSync(path.join(root, "db", "production.db"));
    db.prepare("DELETE FROM app_data_migration_records WHERE migration_id = ?").run(ID);
    const remaining = (db.prepare("SELECT migration_id FROM app_data_migration_records").all() as Json[]).length;
    db.close();
    expect(remaining).toBe(recorded.length - 1);
    const world = { appData: root, memory: path.join(root, "memory") };
    await writeReleasedWorld(world);
    const at = paths(world);
    // A released team or org package holds its own message log (every package the app wrote has one; the shared fixture
    // writes only what the migration reads). Without it the package is not admitted, as on any install.
    for (const run of [E, P, MARKETING]) await fs.writeFile(path.join(path.dirname(at.teamFile(run)), "team_communication_messages_active.jsonl"), "");
    await fs.writeFile(path.join(path.dirname(at.orgFile(ORG)), "agent_org_communication_messages_active.jsonl"), "");
    // The fixture's mounted team leaves out fields every released org file has (the migration does not read them).
    const releasedOrg = await readJson(at.orgFile(ORG));
    const mounted = releasedOrg.rootOrg.members[1];
    Object.assign(mounted, { role: null, description: null, coordinatorAddress: "/dev_team/lead", defaultLaunchConfiguration: releasedOrg.rootOrg.defaultLaunchConfiguration });
    await fs.writeFile(at.orgFile(ORG), JSON.stringify(releasedOrg, null, 2));
    const releasedFiles = Object.keys(await snapshot(root)).sort();
    evidence.setup = { ledgerRowsKept: remaining, releasedFiles };

    // DRO-1: the upgrade start.
    let server: BuiltStudio = await studio(root);
    try {
      const ledger = (await server.gql("{getAppDataMigrations{migrationId status summary errorMessage}}")).getAppDataMigrations as Json[];
      const row = ledger.find((entry) => entry.migrationId === ID);
      evidence.migration = row;
      expect(row?.status, JSON.stringify(row)).toBe("SUCCEEDED");
      expect(row?.errorMessage ?? null).toBeNull();

      // The contract's shapes (spot checks: one per stored shape the server then reads).
      const t1 = (await readJson(at.taskRecord(T1))).agentRunResources as Json[];
      expect(t1.map((entry) => [entry.role, entry.delegatedFrom, entry.recipientAddress])).toEqual([
        ["assigned", { delegatingRun: { kind: "agent", runId: M }, delegatorAgentRunId: M }, "/software_engineering_team"],
        ["subWork", { delegatingRun: { kind: "agent_team", runId: E }, delegatorAgentRunId: "solution_designer_65a9" }, "/product_team"],
        ["subWork", { delegatingRun: { kind: "agent_team", runId: P }, delegatorAgentRunId: "product_designer_1a2b" }, "/image_maker"],
      ]);
      for (const entry of t1) { expect(entry).not.toHaveProperty("hostRoot"); expect(entry).not.toHaveProperty("assignedBy"); }
      expect((await readJson(at.adHocRecord(T2))).agentRunResources[0]).toMatchObject({ nodeId: "node-b-1f0e", recipientAddress: "/research_team",
        agentRun: { kind: "team", teamRunId: RESEARCH } });
      const engineering = await readJson(at.teamFile(E));
      expect(engineering).not.toHaveProperty("taskAgent");
      expect(engineering.rootTeam.address).toBe("/");
      expect(engineering.handoffs).toEqual([{ from: "/solution_designer", to: "/Teacher", rules: ["When the plan is ready."] }]);
      expect(await readJson(at.agentFile(I))).toMatchObject({ address: "/image_maker", delegatedFrom: { delegatingRun: { kind: "agent_team", runId: P } } });
      expect(await exists(at.standaloneTree(M))).toBe(false);
      expect(await fs.readFile(at.runLog(M), "utf8")).toBe("{\"messageId\":\"m1\"}\n");
      expect((await readJson(at.orgFile(ORG))).rootOrg).not.toHaveProperty("taskExecutions");

      // The server reads every converted run as a run of its own.
      const history = (await server.gql(`{listWorkspaceRunHistory(limitPerAgent:null){workspaceRootPath agentDefinitions{agentDefinitionId runs{runId isActive}} teamDefinitions{teamDefinitionId runs{teamRunId}}}}`)).listWorkspaceRunHistory as Json[];
      const agentRuns = history.flatMap((group) => (group.agentDefinitions ?? []).flatMap((def: Json) => def.runs.map((run: Json) => run.runId)));
      const teamRuns = history.flatMap((group) => (group.teamDefinitions ?? []).flatMap((def: Json) => def.runs.map((run: Json) => run.teamRunId)));
      evidence.runList = { agentRuns, teamRuns, history };

      const opened: Json = {};
      for (const run of [M, I, LEGACY, PEER_STARTED]) {
        const projection = (await server.gql(`query($id:String!){getRunProjection(runId:$id){runId}}`, { id: run })).getRunProjection;
        opened[run] = projection?.runId ?? null;
        expect(projection?.runId, `agent run ${run} opens`).toBe(run);
      }
      for (const run of [E, P, MARKETING]) {
        const resume = (await server.gql(`query($id:String!){getTeamRunResumeConfig(teamRunId:$id){teamRunId isActive executionTree}}`, { id: run })).getTeamRunResumeConfig;
        opened[run] = { isActive: resume.isActive, root: resume.executionTree?.root_team?.address ?? null };
        expect(resume.teamRunId).toBe(run);
        // The busy-run record (step 7) names P's designer as running when an update restart interrupted it: restart resume
        // brings P back under its own root. Every other team run stays stopped: opening it starts nothing (REQ-004).
        expect(resume.isActive, run === P ? "P resumed by restart resume (its busy entry, now under its own root)" : `opening ${run} starts nothing`).toBe(run === P);
      }
      const org = (await server.gql(`query($id:String!){getAgentOrgRunConfig(orgRunId:$id){orgRunId isActive}}`, { id: ORG }).catch(async (error) => {
        // Name the admission's reason (the validator the server's readiness index runs).
        const judged = await new RootRunPackageCurrentValidator(world.memory).scanOne("agent_org", ORG);
        throw new Error(`${String(error)}; admission: ${JSON.stringify(judged.diagnostics)}`);
      })).getAgentOrgRunConfig;
      opened[ORG] = org;
      expect(org).toMatchObject({ orgRunId: ORG, isActive: false });
      evidence.opened = opened;

      // The DelegationIndex from the converted entries: the manager's view shows its delegated runs at every depth, each
      // nested under the run that delegated it (SR-058, rule 1): E under M, P (E's sub-work) under E, I (P's) under P.
      // autobyteus-461 SR-084: M's delegated runs, nested by delegator, from its tree (its view carries its own parts only).
      const collaboration = await delegatedRunsTree(server.gql, "agent", M) as Json;
      evidence.managerView = collaboration;
      const rowOf = (value: unknown, id: string): Json | null => {
        if (Array.isArray(value)) { for (const item of value) { const found = rowOf(item, id); if (found) return found; } return null; }
        if (!value || typeof value !== "object") return null;
        const record = value as Json;
        const own = record.team_run_id ?? record.teamRunId ?? record.agent_run_id ?? record.agentRunId;
        if (own === id && (record.started_at ?? record.startedAt)) return record;
        for (const child of Object.values(record)) { const found = rowOf(child, id); if (found) return found; }
        return null;
      };
      const rowE = rowOf(collaboration, E), rowP = rowOf(collaboration, P);
      expect(rowE, "E is a row of M's view").toBeTruthy();
      expect(JSON.stringify(rowE), "P is nested under E (E's sub-work)").toContain(P);
      expect(rowP, "P is a row of M's view").toBeTruthy();
      expect(JSON.stringify(rowP), "I is nested under P (P's sub-work)").toContain(I);
      const engineeringView = await delegatedRunsTree(server.gql, "agent_team", E);
      evidence.engineeringView = engineeringView;
      expect(JSON.stringify(engineeringView), "E's view lists its own child P").toContain(P);
      // BEH-007: a delegated run is a row under the run that delegated it, not a top-level run, unless that run is gone. A run
      // whose delegation no Task records (LEGACY) and a run a peer started (PEER_STARTED) are top-level.
      for (const run of [M, LEGACY, PEER_STARTED]) expect(agentRuns, `agent run ${run} listed`).toContain(run);
      expect(agentRuns, "I is listed under P, not at the top").not.toContain(I);
      for (const run of [E, P]) expect(teamRuns, `team run ${run} is listed under its delegator, not at the top`).not.toContain(run);
      expect(teamRuns, "the team the user started is listed").toContain(MARKETING);
    } finally {
      await server.stop();
      // The server's warnings of this start (a run it does not admit names its reason).
      evidence.firstStartWarnings = server.output().split("\n").filter((line) => /warn|admit|ROOT_RUN_PACKAGE|migration/i.test(line)).slice(0, 80);
    }

    // DRO-2: a second start changes nothing.
    const before = await snapshot(root);
    server = await studio(root);
    try {
      const again = ((await server.gql("{getAppDataMigrations{migrationId status}}")).getAppDataMigrations as Json[]).find((entry) => entry.migrationId === ID);
      expect(again?.status).toBe("SUCCEEDED");
    } finally {
      await server.stop();
    }
    const after = await snapshot(root);
    const changed = Object.keys({ ...before, ...after }).filter((file) => before[file] !== after[file]);
    evidence.secondStart = { files: Object.keys(after).length, changed };
    expect(changed).toEqual([]);
  }, 900_000);

  it("DRO-4 (autobyteus-508): a Settings edit that names another agent runtime keeps that runtime, model and settings as the run's own Settings edit", async () => {
    const { root, at } = await preparedWorld("runtime-edits");
    const world = { appData: root, memory: path.join(root, "memory") };
    await writeReleasedRuntimeEdits(world);
    const teams = [MEMBER_EDIT_TEAM, TEAM_EDIT_TEAM, PENDING_SWITCH_TEAM];
    for (const run of teams) await fs.writeFile(path.join(path.dirname(at.teamFile(run)), "team_communication_messages_active.jsonl"), "");
    // Each run was assigned by the manager through its own Task, as a Project Task Manager delegates (released shape).
    const assigned = (taskId: string, address: string, agentRun: Json) => put(at.taskRecord(taskId), { taskId, agentRunResources: [
      { role: "assigned", assignedBy: M, recipientAddress: address, hostRoot: { kind: "agent", runId: M }, agentRun, linkedAt: T0, start: "started", closedAt: null }] });
    await assigned("task_508_a", "/support_team", { kind: "team", teamRunId: MEMBER_EDIT_TEAM, coordinatorAgentRunId: `coordinator_${MEMBER_EDIT_TEAM}` });
    await assigned("task_508_b", "/review_team", { kind: "team", teamRunId: TEAM_EDIT_TEAM, coordinatorAgentRunId: "lead_b201" });
    await assigned("task_508_c", "/outreach_team", { kind: "team", teamRunId: PENDING_SWITCH_TEAM, coordinatorAgentRunId: "operator_c301" });
    await assigned("task_508_d", "/summarizer", { kind: "agent", agentRunId: SWITCHED_AGENT });
    await assigned("task_508_e", "/summarizer", { kind: "agent", agentRunId: PENDING_SWITCH_AGENT });

    const SETTINGS = { origin: "settings", fallbacks: [] };
    const EDITED = { runtimeKind: "codex_app_server", llmModelIdentifier: "gpt-6.1-terra", llmConfig: runtimeEdit().llmConfig };
    /** A row's launch as Settings shows it: runtime, model, settings, source, and whether the source is the row's own. */
    const shown = (launch: Json | null) => launch && { runtimeKind: launch.runtimeKind, llmModelIdentifier: launch.llmModelIdentifier,
      llmConfig: launch.llmConfig, source: launch.source, ownSource: launch.ownSource };
    const recordOf = (records: Json[], id: string): Json | null => {
      for (const record of records) {
        if (record.teamRunId === id || record.agentRunId === id) return record;
        const nested = recordOf(record.taskExecutions ?? [], id);
        if (nested) return nested;
      }
      return null;
    };
    const membersOf = (record: Json | null) => Object.fromEntries((record?.members ?? []).map((member: Json) => [member.address, shown(member.launch)]));

    let server: BuiltStudio = await studio(root);
    try {
      const row = ((await server.gql("{getAppDataMigrations{migrationId status summary errorMessage}}")).getAppDataMigrations as Json[]).find((entry) => entry.migrationId === ID);
      evidence.dro4 = { migration: row };
      expect(row?.status, JSON.stringify(row)).toBe("SUCCEEDED");
      expect(row?.errorMessage ?? null).toBeNull();

      const tree = (await delegatedRunsTree(server.gql, "agent", M)).taskExecutions as Json[];
      const seen = Object.fromEntries([...teams, SWITCHED_AGENT, PENDING_SWITCH_AGENT].map((id) => {
        const record = recordOf(tree, id);
        return [id, record && { address: record.address, launch: shown(record.launch), members: membersOf(record) }];
      }));
      evidence.dro4.managerRows = seen;
      // AC-001: the member's own edit, already made real on the new runtime; the coordinator follows a team with no edit.
      expect(seen[MEMBER_EDIT_TEAM]?.members, JSON.stringify(seen)).toEqual({
        "/coordinator": { runtimeKind: "claude_agent_sdk", llmModelIdentifier: "sonnet", llmConfig: null, source: null, ownSource: false },
        "/operator": { ...EDITED, source: SETTINGS, ownSource: true },
      });
      // AC-002: a follower takes the team's edit whole; a member's own edit wins with its own runtime; an unedited member keeps its source.
      expect(seen[TEAM_EDIT_TEAM]?.members, JSON.stringify(seen)).toEqual({
        "/lead": { ...EDITED, source: SETTINGS, ownSource: true },
        "/checker": { runtimeKind: "autobyteus", llmModelIdentifier: "opus", llmConfig: runtimeEdit().llmConfig, source: SETTINGS, ownSource: true },
        "/scribe": { runtimeKind: "claude_agent_sdk", llmModelIdentifier: "sonnet", llmConfig: null, source: { origin: "agent_default", fallbacks: [] }, ownSource: true },
      });
      // AC-005: the member whose switch is still pending shows the new runtime.
      expect(seen[PENDING_SWITCH_TEAM]?.members, JSON.stringify(seen)).toEqual({ "/operator": { ...EDITED, source: SETTINGS, ownSource: true } });
      // AC-003, AC-005: the delegated agent runs, made real and pending.
      for (const run of [SWITCHED_AGENT, PENDING_SWITCH_AGENT]) {
        expect(seen[run]?.launch, `${run}: ${JSON.stringify(seen)}`).toEqual({ ...EDITED, source: SETTINGS, ownSource: true });
      }
      // The pending switches stay, from the started binding, for the next input to make real; the runs stay stopped.
      expect((await readJson(at.teamFile(PENDING_SWITCH_TEAM))).rootTeam.members[0]).toMatchObject({ platformAgentRunId: null, pendingRuntimeSwitch: pendingSwitch });
      expect(await readJson(at.agentFile(PENDING_SWITCH_AGENT))).toMatchObject({ platformAgentRunId: null, pendingRuntimeSwitch: pendingSwitch });
      for (const run of teams) {
        const resume = (await server.gql(`query($id:String!){getTeamRunResumeConfig(teamRunId:$id){teamRunId isActive}}`, { id: run })).getTeamRunResumeConfig;
        expect(resume, `team run ${run} opens and stays stopped`).toMatchObject({ teamRunId: run, isActive: false });
      }
      for (const run of [SWITCHED_AGENT, PENDING_SWITCH_AGENT]) {
        const projection = (await server.gql(`query($id:String!){getRunProjection(runId:$id){runId}}`, { id: run })).getRunProjection;
        expect(projection?.runId, `agent run ${run} opens`).toBe(run);
      }
    } finally {
      await server.stop();
      evidence.dro4 = { ...evidence.dro4, firstStartWarnings: server.output().split("\n").filter((line) => /warn|admit|ROOT_RUN_PACKAGE|migration/i.test(line)).slice(0, 80) };
    }

    // A second start changes nothing.
    const before = await snapshot(root);
    server = await studio(root);
    try {
      const again = ((await server.gql("{getAppDataMigrations{migrationId status}}")).getAppDataMigrations as Json[]).find((entry) => entry.migrationId === ID);
      expect(again?.status).toBe("SUCCEEDED");
    } finally {
      await server.stop();
    }
    const after = await snapshot(root);
    const changed = Object.keys({ ...before, ...after }).filter((file) => before[file] !== after[file]);
    evidence.dro4.secondStart = { files: Object.keys(after).length, changed };
    expect(changed).toEqual([]);
  }, 600_000);
});
