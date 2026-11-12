import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { createHash } from "node:crypto";
import { DatabaseSync } from "node:sqlite";
import { spawnSync } from "node:child_process";
import { afterAll, describe, expect, it } from "vitest";
import { DELEGATED_RUNS_OWN_RUNS_V1_MIGRATION_ID } from "../../../src/app-data-migrations/migrations/delegated-runs-own-runs-v1/delegated-runs-own-runs-v1-app-data-migration.js";
import { E, I, LEGACY, M, MARKETING, ORG, P, PEER_STARTED, RESEARCH, T1, T2, exists, paths, readJson, writeReleasedWorld } from "../../fixtures/app-data-migrations/released-delegation-shape-fixtures.js";
import { RootRunPackageCurrentValidator } from "../../../src/run-history/services/root-run-package-current-validator.js";
import { killBuiltStudios, startBuiltStudio, type BuiltStudio } from "../helpers/built-studio-roots.js";

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

      // The DelegationIndex from the converted entries: the manager's view lists its own child (E) only, one hop.
      const collaboration = (await server.gql(`query($id:String!){agentRunCollaboration(runId:$id)}`, { id: M })).agentRunCollaboration as Json;
      const children = JSON.stringify(collaboration);
      evidence.managerView = collaboration;
      expect(children).toContain(E);
      expect(children, "P is E's sub-work, not M's child").not.toContain(P);
      expect(children, "I is P's sub-work, not M's child").not.toContain(I);
      const engineeringView = (await server.gql(`query($id:String!){getTeamRunResumeConfig(teamRunId:$id){executionTree}}`, { id: E })).getTeamRunResumeConfig.executionTree;
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
});
