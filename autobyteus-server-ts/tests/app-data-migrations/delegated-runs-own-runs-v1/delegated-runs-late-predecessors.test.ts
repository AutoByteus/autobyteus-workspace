import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  DELEGATED_RUNS_OWN_RUNS_V1_MIGRATION_ID,
  DelegatedRunsOwnRunsV1AppDataMigration,
} from "../../../src/app-data-migrations/migrations/delegated-runs-own-runs-v1/delegated-runs-own-runs-v1-app-data-migration.js";
import {
  createDelegatedRunsPreservedItemsMigrations,
  PRESERVED_ITEMS_FOLLOW_UPS,
} from "../../../src/app-data-migrations/migrations/delegated-runs-own-runs-v1/delegated-runs-preserved-items-v1.js";
import { AppDataMigrationRegistry } from "../../../src/app-data-migrations/app-data-migration-registry.js";
import { AppDataMigrationRunner } from "../../../src/app-data-migrations/app-data-migration-runner.js";
import { RunHistoryIndexV2AppDataMigration } from "../../../src/app-data-migrations/migrations/run-history-index-v2/run-history-index-v2-migration.js";
import { TeamRunHistoryIndexV2AppDataMigration } from "../../../src/app-data-migrations/migrations/team-run-history-index-v2/team-run-history-index-v2-migration.js";
import type {
  AppDataMigrationDefinition,
  AppDataMigrationRecordRepositoryLike,
  AppDataMigrationRecordSnapshot,
} from "../../../src/app-data-migrations/domain/app-data-migration-types.js";
import { I, ORG, T0, paths, put, readJson, writeReleasedWorld, type World } from "../../fixtures/app-data-migrations/released-delegation-shape-fixtures.js";

/**
 * autobyteus-461 SR-079 (CR-461-074, F-53; design DS-10, "Every late predecessor, not only the FAILED ones"): a migration
 * registered before ours can run after it, FAILED and retried or NOT_RUN behind a failed prerequisite. Every one is
 * classified; a writer's or reader's late output is converted by its follow-up. Hand-built data only (TESTING.md).
 */

/**
 * The predecessors that are not writers or readers, with the evidence. Two searches of each migration folder:
 * - names: `taskExecutions|remoteTaskExecutions|taskAgent|hostRoot|assignedBy|collaboration_tree|communication_messages|
 *   run_history_index|team_run_history_index|agent_run_resources` (the shapes our steps convert);
 * - addresses and paths (ARCH-REV-052 note 1): what a late run writes for a delegated team: member addresses (step 4
 *   rebases a delegated team's members to `/`), a run's own folder and logs (step 5b), and the run folders.
 * Writers and readers are the follow-ups' (`PRESERVED_ITEMS_FOLLOW_UPS`).
 */
const NOT_WRITERS: Readonly<Record<string, "rebuilder" | "none">> = {
  // Rebuilds run_history_index.json with a row for every agents/*/run_metadata.json (run-history-index-v2-migration.ts:236-300),
  // delegated agent runs included: its late output is built from the current target files.
  "20260521_run_history_index_v2": "rebuilder",
  // Writes attachment locators by run ID (team-context-file-locator-transition.ts:71), resolved by run ID and directory
  // (context-file-owner-resolver.ts:71-97); a converted team file does not match its released source shape.
  "20260926_team_context_file_execution_locators_v1": "none",
  // Moves nested sub-team members' memory folders only in v1-shaped roots (CURRENT_V1); ours leaves those untouched.
  "20260823_repair_team_agent_memory_layout": "none",
  // Writes exact addresses into a team's JSON message log (team_communication_messages.json), 20261018's input; ours
  // converts no message records.
  "20260701_team_communication_projection_addresses": "none",
  // The rest: neither search finds any of our shapes, addresses or paths in them.
  ...Object.fromEntries([
    "20260727_custom_provider_v1_secret_migration", "20260706_remove_global_skill_discovery_mode", "20260517_team_run_metadata_member_tree",
    "20260730_token_usage_custom_provider_model_value_backfill", "20260730_token_usage_provider_name_snapshot_backfill", "20260819_token_usage_run_records_v1",
    "20260731_remove_external_runtime_working_context_snapshots", "20260617_raw_trace_rotation_layout", "20260707_raw_trace_active_file_name",
    "20260731_migrate_native_working_context_snapshots_v5", "20260905_agent_org_history_first_message_summary_v1", "20260623_remove_self_evolution_run_metadata",
    "20260803_custom_provider_readable_identity", "20260924_remove_external_messaging_data", "20261005_projects_per_folder_v1",
    "20261017_project_task_keys_v1", "20261025_project_task_titles", "20261006_remove_built_in_project_task_manager", "20261019_remove_work_trace_exports",
    "20261024_node_identity_file_name", "20261024_memory_sync_source_id_names", "20261030_raw_trace_manifest_runtime_names",
  ].map((id) => [id, "none" as const])),
};

const roots: string[] = [];
afterEach(async () => {
  vi.restoreAllMocks();
  await Promise.all(roots.splice(0).map((root) => fs.rm(root, { recursive: true, force: true })));
});
const world = async (): Promise<World> => {
  const appData = await fs.mkdtemp(path.join(os.tmpdir(), "delegated-runs-late-"));
  roots.push(appData);
  vi.spyOn(console, "warn").mockImplementation(() => undefined);
  return { appData, memory: path.join(appData, "memory") };
};
/** The ledger with every predecessor terminal (the reader 20261020 is not this test's subject). */
const terminalLedger = { getRecord: async () => ({ status: "SUCCEEDED" }) } as unknown as Pick<AppDataMigrationRecordRepositoryLike, "getRecord">;
const names = { agentDefinitionName: vi.fn(async () => null), teamDefinitionName: vi.fn(async () => null) };
const catalogs = { agentRunHistoryChanged: vi.fn(), collaborationRunHistoryChanged: vi.fn() };
const followUpsAfter = (w: World, ledger: AppDataMigrationRecordRepositoryLike, ...predecessors: string[]) =>
  createDelegatedRunsPreservedItemsMigrations(w.appData, w.memory, names, null, ledger).filter((followUp) => predecessors.includes(followUp.spec.predecessor));
/** A predecessor stand-in under its real ID: FAILED or SUCCEEDED as the test sets it, doing `work` when it succeeds. */
const stand = (id: string, state: () => "FAILED" | "SUCCEEDED", work: () => Promise<void> = async () => undefined,
  prerequisiteMigrationIds: readonly string[] = []): AppDataMigrationDefinition => ({
  id, displayName: id, description: id, requiredOnStartup: true, executionPolicy: "STARTUP_ONLY", prerequisiteMigrationIds,
  execute: async () => {
    const status = state();
    if (status === "SUCCEEDED") await work();
    return { status, summary: { scannedCount: 1, migratedCount: 0, skippedCount: 0, failedCount: status === "FAILED" ? 1 : 0, details: [] },
      errorMessage: status === "FAILED" ? "an item is unfinished" : null };
  },
});
const run = async (runner: AppDataMigrationRunner) => new Map((await runner.runPending()).map((status) => [status.migrationId, status]));

describe("every late predecessor of 20261111_delegated_runs_own_runs_v1 (SR-079)", () => {
  it("every migration registered before ours is classified once: a writer or reader with a follow-up, a rebuilder, or none", () => {
    const ids = new AppDataMigrationRegistry().listDefinitions().map((definition) => definition.id);
    const before = ids.slice(0, ids.indexOf(DELEGATED_RUNS_OWN_RUNS_V1_MIGRATION_ID));
    const followed = PRESERVED_ITEMS_FOLLOW_UPS.map((spec) => spec.predecessor);
    expect(new Set(followed).size).toBe(followed.length);
    for (const id of followed) expect(NOT_WRITERS[id], `${id} has a follow-up and another class`).toBeUndefined();
    expect([...followed, ...Object.keys(NOT_WRITERS)].sort()).toEqual([...before].sort());
    for (const spec of PRESERVED_ITEMS_FOLLOW_UPS) {
      expect(ids.indexOf(spec.id)).toBeGreaterThan(ids.indexOf(DELEGATED_RUNS_OWN_RUNS_V1_MIGRATION_ID));
      expect(new AppDataMigrationRegistry().getDefinition(spec.id)).toMatchObject({ requiredOnStartup: true,
        prerequisiteMigrationIds: [DELEGATED_RUNS_OWN_RUNS_V1_MIGRATION_ID, spec.predecessor] });
    }
  });

  it("F-53: token usage FAILED on the first start, so the flat-families migration runs on the restart after ours; its follow-up leaves no stored list", async () => {
    const w = await world();
    await writeReleasedWorld(w);
    const records = new InMemoryRecords();
    let tokenUsage: "FAILED" | "SUCCEEDED" = "FAILED";
    // Its late output: the Org tree in its released shape, with a stored taskExecutions list linking a run that has its own
    // file (a link without one would be 20261017's unfinished item, preserved).
    const flatFamiliesWrites = async () => {
      const org = await readJson(paths(w).orgFile(ORG));
      org.rootOrg.taskExecutions = [{ address: "/image_maker", agentRunId: I, startedAt: T0, delegatorAgentRunId: "ceo_agent_1f2e" }];
      await put(paths(w).orgFile(ORG), org);
    };
    const runner = new AppDataMigrationRunner(new AppDataMigrationRegistry([
      stand("20260819_token_usage_run_records_v1", () => tokenUsage),
      stand("20260901_agent_org_flat_team_families_v1", () => "SUCCEEDED", flatFamiliesWrites, ["20260819_token_usage_run_records_v1"]),
      new DelegatedRunsOwnRunsV1AppDataMigration(w.appData, w.memory, names, null, { ledger: records }),
      ...followUpsAfter(w, records, "20260901_agent_org_flat_team_families_v1"),
    ]), records, { logsDir: path.join(w.appData, "logs") });
    const first = await run(runner);
    expect(first.get("20260901_agent_org_flat_team_families_v1")?.errorMessage).toContain("APP_DATA_MIGRATION_PREREQUISITE_INCOMPLETE");
    // Ours runs (no hold; a preserved item makes it a warning success).
    expect(first.get(DELEGATED_RUNS_OWN_RUNS_V1_MIGRATION_ID)?.status).toMatch(/^SUCCEEDED/);
    // Its follow-up waits while its predecessor is NOT_RUN.
    expect(first.get("20261114_preserved_items_after_org_flat_team_families_v1")?.errorMessage).toContain("APP_DATA_MIGRATION_PREREQUISITE_INCOMPLETE");
    tokenUsage = "SUCCEEDED";
    const second = await run(runner);
    expect(second.get("20261114_preserved_items_after_org_flat_team_families_v1")?.status).toMatch(/^SUCCEEDED/);
    expect(JSON.stringify(await readJson(paths(w).orgFile(ORG)))).not.toContain("taskExecutions");
  });

  it("20261020 FAILED on the first start and finishing on the next: the improver's delegated copy is kept, then converted (F-25)", async () => {
    const w = await world();
    await writeReleasedWorld(w);
    // The image maker's copy is the improver's delegated copy here.
    const copy = await readJson(paths(w).agentFile(I));
    await put(paths(w).agentFile(I), { ...copy, agentDefinitionId: "autobyteus-retrospective-skill-improver" });
    const records = new InMemoryRecords();
    let improver: "FAILED" | "SUCCEEDED" = "FAILED";
    // As 20261020 selects (remove-skill-improvement-data-migration.ts:250-268): the improver's runs without taskAgent.
    const removesHelperRuns = async () => {
      for (const entry of await fs.readdir(path.join(w.memory, "agents"))) {
        const file = await readJson(path.join(w.memory, "agents", entry, "run_metadata.json")).catch(() => null);
        if (file && !("taskAgent" in file) && file.agentDefinitionId === "autobyteus-retrospective-skill-improver") {
          await fs.rm(path.join(w.memory, "agents", entry), { recursive: true, force: true });
        }
      }
    };
    const runner = new AppDataMigrationRunner(new AppDataMigrationRegistry([
      stand("20261020_remove_skill_improvement_data", () => improver, removesHelperRuns),
      new DelegatedRunsOwnRunsV1AppDataMigration(w.appData, w.memory, names, null, { ledger: records }),
      ...followUpsAfter(w, records, "20261020_remove_skill_improvement_data"),
    ]), records, { logsDir: path.join(w.appData, "logs") });
    const first = await run(runner);
    expect(first.get(DELEGATED_RUNS_OWN_RUNS_V1_MIGRATION_ID)?.status).toBe("SUCCEEDED_WITH_WARNINGS");
    // Preserved in its released shape while the reader is not terminal.
    expect(await readJson(paths(w).agentFile(I))).toHaveProperty("taskAgent");
    improver = "SUCCEEDED";
    const second = await run(runner);
    expect(second.get("20261114_preserved_items_after_remove_skill_improvement_data")?.status).toBe("SUCCEEDED");
    const converted = await readJson(paths(w).agentFile(I));
    expect(converted).not.toHaveProperty("taskAgent");
    expect(converted).toHaveProperty("delegatedFrom");
    expect((await readJson(paths(w).agentIndex()) as Array<{ runId: string }>).map((row) => row.runId)).toContain(I);
  });

  it("a late index rebuild: the agent index keeps every delegated run's row; the team index drops the delegated team runs' rows and its follow-up restores them", async () => {
    const w = await world();
    await writeReleasedWorld(w);
    await new DelegatedRunsOwnRunsV1AppDataMigration(w.appData, w.memory, names, null, { ledger: terminalLedger }).execute();
    const delegated = async (dir: string, file: string) => {
      const ids: string[] = [];
      for (const id of await fs.readdir(path.join(w.memory, dir))) {
        const own = await readJson(path.join(w.memory, dir, id, file)).catch(() => null);
        if (own?.delegatedFrom) ids.push(id);
      }
      return ids;
    };
    const agentRows = async () => (await readJson(paths(w).agentIndex()) as Array<{ runId: string }>).map((row) => row.runId);
    const teamRows = async () => (await readJson(paths(w).teamIndex()) as Array<{ teamRunId: string }>).map((row) => row.teamRunId);
    const delegatedAgents = await delegated("agents", "run_metadata.json");
    const delegatedTeams = await delegated("agent_teams", "team_run_execution_tree.json");
    expect(delegatedAgents.length).toBeGreaterThan(0);
    expect(delegatedTeams.length).toBeGreaterThan(0);
    for (const id of delegatedTeams) expect(await teamRows()).toContain(id);
    await new RunHistoryIndexV2AppDataMigration(w.memory, names, catalogs).execute();
    for (const id of delegatedAgents) expect(await agentRows()).toContain(id);
    // autobyteus-500 G-2 (FU-029): the late rebuild keeps a delegated team's row (no metadata file, but its folder and tree);
    // the follow-up then adds nothing.
    await new TeamRunHistoryIndexV2AppDataMigration(w.memory, names, catalogs).execute();
    for (const id of delegatedTeams) expect(await teamRows()).toContain(id);
    const rowsAfterRebuild = await teamRows();
    const followUp = createDelegatedRunsPreservedItemsMigrations(w.appData, w.memory, names, null, terminalLedger).find((migration) => migration.spec.predecessor === "20260521_team_run_history_index_v2")!;
    await followUp.execute();
    expect((await teamRows()).sort()).toEqual([...rowsAfterRebuild].sort());
  });
});

class InMemoryRecords implements AppDataMigrationRecordRepositoryLike {
  private readonly records = new Map<string, AppDataMigrationRecordSnapshot>();
  async getRecord(migrationId: string) { return this.records.get(migrationId) ?? null; }
  async listRecords() { return [...this.records.values()]; }
  async markRunning(input: { migrationId: string; displayName: string; startedAt: Date }) {
    const record: AppDataMigrationRecordSnapshot = { migrationId: input.migrationId, displayName: input.displayName, status: "RUNNING",
      attempts: (this.records.get(input.migrationId)?.attempts ?? 0) + 1, startedAt: input.startedAt, completedAt: null, summary: null, errorMessage: null, logPath: null };
    this.records.set(input.migrationId, record);
    return record;
  }
  async complete(input: { migrationId: string; displayName: string; status: "SUCCEEDED" | "FAILED" | "SUCCEEDED_WITH_WARNINGS"; completedAt: Date;
    summary: string; errorMessage: string | null; logPath: string | null }) {
    const previous = this.records.get(input.migrationId);
    const record: AppDataMigrationRecordSnapshot = { migrationId: input.migrationId, displayName: input.displayName, status: input.status,
      attempts: previous?.attempts ?? 1, startedAt: previous?.startedAt ?? null, completedAt: input.completedAt, summary: input.summary,
      errorMessage: input.errorMessage, logPath: input.logPath };
    this.records.set(input.migrationId, record);
    return record;
  }
  async markFailed(input: { migrationId: string; displayName: string; completedAt: Date; summary: string; errorMessage: string; logPath: string | null }) {
    return this.complete({ ...input, status: "FAILED" });
  }
}
