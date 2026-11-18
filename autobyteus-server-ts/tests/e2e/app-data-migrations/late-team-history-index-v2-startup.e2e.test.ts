import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { spawnSync } from "node:child_process";
import { DatabaseSync } from "node:sqlite";
import { afterAll, describe, expect, it } from "vitest";
import { segment, type Rec } from "../helpers/collaboration-root-harness.js";
import { createRoot, killBuiltStudios, managerOf, startBuiltStudio, terminateRoot, until, type BuiltStudio } from "../helpers/built-studio-roots.js";

// autobyteus-461 SR-079 (CR-461-074): the released team history index v2 (`20260521_team_run_history_index_v2`) is a writer
// 461's follow-ups cover. Through the BUILT Studio server (`dist/app.js`), real HTTP/GraphQL/WebSocket and real restarts;
// only the external AGY CLI is scripted. No user data.
// - LTI-1: a standalone Agent run delegates a Team (461's shape: the team's own history row, written at its creation); a
//   Team the user started is beside it. The install then meets v2 late: its ledger row and its follow-up's are removed (as on
//   an install where v2 had not finished), and the server starts again. v2 rebuilds the team index and keeps the current
//   teams' rows (autobyteus-500 G-2, FU-029: asserted for the user-started team; base dropped it); its follow-up
//   (`20261114_preserved_items_after_team_run_history_index_v2`) restores the delegated team's row in the same start: the row
//   is in the index again, and the delegated team's stopped-run Settings save, which needs its row (DS-11, TC-5), works.
// Prerequisite: `pnpm -C autobyteus-server-ts build` for the current worktree.
// Run: env -i PATH="$PATH" HOME="$(mktemp -d)" TMPDIR="$TMPDIR" RUN_AGY_FAILURE_E2E=1 \
//   ANTIGRAVITY_CLI_COMMAND=$PWD/autobyteus-server-ts/tests/fixtures/agy-failure-cli.mjs \
//   pnpm -C autobyteus-server-ts exec vitest run tests/e2e/app-data-migrations/late-team-history-index-v2-startup.e2e.test.ts --no-watch
const cli = process.env.ANTIGRAVITY_CLI_COMMAND ?? "";
const enabled = process.env.RUN_AGY_FAILURE_E2E === "1" && spawnSync(cli, ["--version"], { stdio: "ignore" }).status === 0;
const suite = enabled ? describe : describe.skip;
const V2 = "20260521_team_run_history_index_v2";
const FOLLOW_UP = "20261114_preserved_items_after_team_run_history_index_v2";
const ALT = "late-index-alt-model";

suite("A late team history index v2: its follow-up restores the delegated team runs' rows (built server, SR-079)", () => {
  let root = "";
  let server: BuiltStudio | null = null;
  const env = () => ({ ANTIGRAVITY_CLI_COMMAND: cli, AGY_FAKE_CASE: "linked_skills", AGY_FAKE_EXTRA_MODELS: ALT });

  afterAll(async () => {
    await server?.stop().catch(() => undefined);
    killBuiltStudios();
    if (root) await fs.rm(root, { recursive: true, force: true });
  }, 60_000);

  const indexRows = async (): Promise<Rec[]> => {
    const text = await fs.readFile(path.join(root, "memory", "team_run_history_index.json"), "utf8").catch(() => "");
    if (!text) return [];
    const parsed = JSON.parse(text) as Rec;
    return (Array.isArray(parsed) ? parsed : parsed.rows ?? parsed.entries ?? []) as Rec[];
  };
  const hasRow = async (teamRunId: string) => (await indexRows()).some((row) => (row.teamRunId ?? row.runId) === teamRunId);
  const migration = async (s: BuiltStudio, id: string) => ((await s.gql("{getAppDataMigrations{migrationId status attempts summary}}"))
    .getAppDataMigrations as Rec[]).find((m) => m.migrationId === id);

  it("LTI-1 v2 run late drops the current teams' rows (base); its follow-up restores the delegated team's row, and its Settings save works", async () => {
    root = await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(), "late-team-index-e2e-")));
    const workspace = path.join(root, "workspace");
    for (const dir of ["home", "workspace"]) await fs.mkdir(path.join(root, dir));
    await fs.writeFile(path.join(root, ".env"), "APP_ENV=test\nAUTOBYTEUS_SERVER_HOST=http://127.0.0.1:8000\n");
    server = await startBuiltStudio(root, env());
    const s = server;
    const tag = randomUUID().slice(0, 6);
    const agent = async (name: string) => (await s.gql(`mutation($input:CreateAgentDefinitionInput!){createAgentDefinition(input:$input){id}}`,
      { input: { name, role: "assistant", description: name, instructions: "Follow the request.", toolNames: [] } })).createAgentDefinition.id as string;
    const team = async (name: string, coordinator: string, nodes: Rec[]) => (await s.gql(`mutation($input:CreateAgentTeamDefinitionInput!){createAgentTeamDefinition(input:$input){id}}`,
      { input: { name, description: name, instructions: "Deliver.", coordinatorMemberName: coordinator, nodes } })).createAgentTeamDefinition.id as string;
    const manager = await agent(`LTI Manager ${tag}`);
    const lead = await agent(`LTI Lead ${tag}`);
    const squadName = `LTI Squad ${tag}`;
    await team(squadName, "lead", [{ memberName: "lead", ref: lead, refScope: "SHARED" }]);
    const userTeamDefinition = await team(`LTI User Team ${tag}`, "manager", [{ memberName: "manager", ref: manager, refScope: "SHARED" }]);

    // A standalone Agent run delegates a Team; a Team the user started is beside it.
    const agentRoot = await createRoot(s, "agent", { manager }, workspace);
    const m = await managerOf(s, agentRoot);
    const delegated = await m.call("delegate_task", { recipient_address: `/${segment(squadName)}`, description: "Review the notes." });
    expect(delegated, JSON.stringify(delegated)).toMatchObject({ delegated: true, target_kind: "team" });
    const delegatedTeam = delegated.target_team_run_id as string;
    m.close();
    const userTeam = await createRoot(s, "team", { manager, team: userTeamDefinition }, workspace);
    await until(async () => (await hasRow(delegatedTeam)) && (await hasRow(userTeam.rootId)), "both teams' history rows", 60_000);
    const delegatedRowBefore = (await indexRows()).find((row) => (row.teamRunId ?? row.runId) === delegatedTeam);
    for (const [mutation, id] of [["terminateAgentTeamRun(teamRunId:$id)", delegatedTeam]] as const) await s.gql(`mutation($id:String!){${mutation}{success}}`, { id });
    await terminateRoot(s, userTeam);
    await terminateRoot(s, agentRoot);
    await s.stop();

    // The install meets v2 late: its ledger row and its follow-up's are removed, as where v2 had not finished.
    const db = new DatabaseSync(path.join(root, "db", "production.db"));
    const recorded = (id: string) => db.prepare("SELECT status FROM app_data_migration_records WHERE migration_id = ?").get(id) as Rec | undefined;
    expect(recorded(V2), "v2 ran on the fresh install").toBeTruthy();
    expect(recorded(FOLLOW_UP), "its follow-up ran on the fresh install").toBeTruthy();
    for (const id of [V2, FOLLOW_UP]) db.prepare("DELETE FROM app_data_migration_records WHERE migration_id = ?").run(id);
    db.close();

    server = await startBuiltStudio(root, env());
    const second = server;
    const v2 = await migration(second, V2);
    const followUp = await migration(second, FOLLOW_UP);
    expect(v2?.status, JSON.stringify(v2)).toMatch(/^SUCCEEDED/);
    expect(followUp?.status, JSON.stringify(followUp)).toMatch(/^SUCCEEDED/);
    const userRowKept = await hasRow(userTeam.rootId);
    console.log(`LTI-1: late v2 ${JSON.stringify(v2)}; follow-up ${JSON.stringify(followUp)}; the user-started team's row after v2: ${userRowKept}`);
    // autobyteus-500 G-2 (FU-029, AC-010): a late v2 keeps every team run whose folder holds a current tree; base dropped
    // the user-started team's row here.
    expect(userRowKept, `the user-started team's row is kept; rows: ${JSON.stringify(await indexRows()).slice(0, 800)}`).toBe(true);
    // The follow-up restored the delegated team's row in the same start.
    expect(await hasRow(delegatedTeam), `the delegated team's row is restored; rows: ${JSON.stringify(await indexRows()).slice(0, 800)}; before: ${JSON.stringify(delegatedRowBefore)}`).toBe(true);
    // Its stopped-run Settings save, which needs its row, works.
    const saved = (await second.gql(`mutation($input:UpdateStoppedTeamRunSelectionsInput!){updateStoppedTeamRunSelections(input:$input){success outcome message}}`,
      { input: { teamRunId: delegatedTeam, selectionPatches: [{ scopeKind: "CONFIGURED_TEAM", scopeAddress: "/", runtimeKind: "antigravity_cli", llmModelIdentifier: ALT, llmConfig: null }] } }))
      .updateStoppedTeamRunSelections as Rec;
    expect(saved, JSON.stringify(saved)).toMatchObject({ success: true });
    await second.stop();
    server = null;
  }, 600_000);
});
