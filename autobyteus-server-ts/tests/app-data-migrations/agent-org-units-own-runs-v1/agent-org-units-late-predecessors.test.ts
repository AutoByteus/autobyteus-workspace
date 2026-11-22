import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AppDataMigrationRegistry } from "../../../src/app-data-migrations/app-data-migration-registry.js";
import { AppDataMigrationRunner } from "../../../src/app-data-migrations/app-data-migration-runner.js";
import {
  AGENT_ORG_UNITS_OWN_RUNS_V1_MIGRATION_ID, AgentOrgUnitsOwnRunsV1AppDataMigration,
} from "../../../src/app-data-migrations/migrations/agent-org-units-own-runs-v1/agent-org-units-own-runs-v1-app-data-migration.js";
import { createAgentOrgUnitsMigrations, ORG_UNITS_FOLLOW_UPS } from "../../../src/app-data-migrations/migrations/agent-org-units-own-runs-v1/agent-org-units-follow-ups.js";
import { RunHistoryIndexV2AppDataMigration } from "../../../src/app-data-migrations/migrations/run-history-index-v2/run-history-index-v2-migration.js";
import { TeamRunHistoryIndexV2AppDataMigration } from "../../../src/app-data-migrations/migrations/team-run-history-index-v2/team-run-history-index-v2-migration.js";
import { TeamRunExecutionTreeV2AppDataMigration } from "../../../src/app-data-migrations/migrations/team-run-execution-tree-v2/team-run-execution-tree-v2-app-data-migration.js";
import type {
  AppDataMigrationDefinition, AppDataMigrationRecordRepositoryLike, AppDataMigrationRecordSnapshot,
} from "../../../src/app-data-migrations/domain/app-data-migration-types.js";
import { ORG, SET, writeReleasedOrg } from "../../fixtures/app-data-migrations/released-org-tree-v1-fixtures.js";

/**
 * org-teams-follow-definition ARCH-REV-005 residual note (data migration guideline §4 "Registry order and late
 * predecessors"): every migration registered before `20261122_agent_org_units_own_runs_v1` is classified. A writer of the
 * shapes ours converts, or a reader of the shapes ours removes, has one follow-up (`ORG_UNITS_FOLLOW_UPS`); every other
 * one is a rebuilder or none, with the evidence below. Hand-built data only (TESTING.md).
 */

/**
 * The predecessors that are neither writers nor readers. Evidence: a search of every migration folder for the Org's
 * storage (`agent_orgs|agent_org_run_execution_tree|agent_org_communication|"agent_org"`) finds only the follow-ups'
 * predecessors and the two walkers below; the Team-folder migrations were checked for what a late run does to a Team
 * unit (today's tree, no `team_run_metadata.json`).
 */
const NOT_FOLLOWED: Readonly<Record<string, "rebuilder" | "none">> = {
  // Builds a row only from agent_teams/*/team_run_metadata.json (team-run-history-index-v2-migration.ts:144), which a Team
  // unit never has; its repair re-reads only rows already listed (existing-team-row-repair.ts:80), and ours drops units' rows.
  "20260521_team_run_history_index_v2": "none",
  // Released Team packages by team_run_metadata.json (team-run-predecessor-source-resolver.ts:41): a Team unit has today's tree.
  "20260814_team_run_execution_tree_v1": "none",
  // Only CURRENT_V1-shaped roots (team-agent-memory-layout-app-data-migration.ts:97); a Team unit's tree is today's.
  "20260823_repair_team_agent_memory_layout": "none",
  // A tree today's validator accepts is SKIPPED_ALREADY_CURRENT (team-run-execution-tree-v2-app-data-migration.ts:270); a
  // Team unit's tree is today's (checked below).
  "20260824_team_run_execution_tree_v2": "none",
  // Released Team JSON logs by exact address; a Team unit's log is append-only, never JSON.
  "20260701_team_communication_projection_addresses": "none",
  // Renames manifest runtimes at every family's depth (raw-trace-manifest-runtime-names-files.ts:25): agents/1,
  // agent_teams/2, agent_orgs/3; a unit member's folder is found at its new place.
  "20261030_raw_trace_manifest_runtime_names": "none",
  // Rewrites delegated runs' links in agents/* and Team member folders (attachment-link-folders.ts:26,45), never
  // agent_orgs (no link names an Org member): a unit's folder is an ordinary run folder at its new place.
  "20261119_delegated_run_own_attachment_links": "none",
  "20261119_delegated_run_own_attachment_links_after_task_agent_own_run": "none",
  // Deletes two built-in definitions' folders under agents/ (the definitions root), never memory.
  "20261118_remove_retired_built_in_agents": "none",
  // The rest: the search finds none of the Org's storage in them, and none writes run trees, run files or logs.
  ...Object.fromEntries([
    "20260727_custom_provider_v1_secret_migration", "20260706_remove_global_skill_discovery_mode", "20260517_team_run_metadata_member_tree",
    "20260730_token_usage_custom_provider_model_value_backfill", "20260730_token_usage_provider_name_snapshot_backfill", "20260819_token_usage_run_records_v1",
    "20260731_remove_external_runtime_working_context_snapshots", "20260617_raw_trace_rotation_layout", "20260707_raw_trace_active_file_name",
    "20260731_migrate_native_working_context_snapshots_v5", "20260623_remove_self_evolution_run_metadata",
    "20260803_custom_provider_readable_identity", "20260924_remove_external_messaging_data", "20261005_projects_per_folder_v1",
    "20261017_project_task_keys_v1", "20261025_project_task_titles", "20261006_remove_built_in_project_task_manager", "20261019_remove_work_trace_exports",
    "20261020_remove_skill_improvement_data", "20261024_node_identity_file_name", "20261024_memory_sync_source_id_names",
  ].map((id) => [id, "none" as const])),
};

const roots: string[] = [];
afterEach(async () => { vi.restoreAllMocks(); await Promise.all(roots.splice(0).map((root) => fs.rm(root, { recursive: true, force: true }))); });
type World = { appData: string; memory: string };
const world = async (): Promise<World> => {
  const appData = await fs.mkdtemp(path.join(os.tmpdir(), "org-units-late-"));
  roots.push(appData);
  vi.spyOn(console, "warn").mockImplementation(() => undefined);
  return { appData, memory: path.join(appData, "memory") };
};
const names = { agentDefinitionName: vi.fn(async () => null), teamDefinitionName: vi.fn(async () => null) };
const catalogs = { agentRunHistoryChanged: vi.fn(), collaborationRunHistoryChanged: vi.fn() };
const terminal = { getRecord: async () => ({ status: "SUCCEEDED" }) } as never;
const json = async (file: string) => JSON.parse(await fs.readFile(file, "utf8"));
const orgFile = (w: World, id = ORG) => path.join(w.memory, "agent_orgs", id, "agent_org_run_execution_tree.json");
const followUpsAfter = (w: World, ledger: AppDataMigrationRecordRepositoryLike, ...predecessors: string[]) =>
  createAgentOrgUnitsMigrations(w.appData, w.memory, names, null, ledger).slice(1)
    .filter((migration) => predecessors.includes((migration as unknown as { spec: { predecessor: string } }).spec.predecessor));
const stand = (id: string, state: () => "FAILED" | "SUCCEEDED", work: () => Promise<void> = async () => undefined): AppDataMigrationDefinition => ({
  id, displayName: id, description: id, requiredOnStartup: true, executionPolicy: "STARTUP_ONLY", prerequisiteMigrationIds: [],
  execute: async () => {
    const status = state();
    if (status === "SUCCEEDED") await work();
    return { status, summary: { scannedCount: 1, migratedCount: 0, skippedCount: 0, failedCount: status === "FAILED" ? 1 : 0, details: [] },
      errorMessage: status === "FAILED" ? "an item is unfinished" : null };
  },
});
const run = async (runner: AppDataMigrationRunner) => new Map((await runner.runPending()).map((status) => [status.migrationId, status]));

describe("every late predecessor of 20261122_agent_org_units_own_runs_v1", () => {
  it("every migration registered before ours is classified once: a writer or reader with a follow-up, a rebuilder, or none", () => {
    const registry = new AppDataMigrationRegistry();
    const ids = registry.listDefinitions().map((definition) => definition.id);
    const before = ids.slice(0, ids.indexOf(AGENT_ORG_UNITS_OWN_RUNS_V1_MIGRATION_ID));
    const followed = ORG_UNITS_FOLLOW_UPS.map((spec) => spec.predecessor);
    expect(new Set(followed).size).toBe(followed.length);
    for (const id of followed) expect(NOT_FOLLOWED[id], `${id} has a follow-up and another class`).toBeUndefined();
    expect([...followed, ...Object.keys(NOT_FOLLOWED)].sort()).toEqual([...before].sort());
    for (const spec of ORG_UNITS_FOLLOW_UPS) {
      expect(ids.indexOf(spec.id)).toBeGreaterThan(ids.indexOf(AGENT_ORG_UNITS_OWN_RUNS_V1_MIGRATION_ID));
      expect(registry.getDefinition(spec.id)).toMatchObject({ requiredOnStartup: true, prerequisiteMigrationIds: [AGENT_ORG_UNITS_OWN_RUNS_V1_MIGRATION_ID, spec.predecessor] });
    }
    // Ours is the last released conversion: no hold, required on startup.
    expect(registry.getDefinition(AGENT_ORG_UNITS_OWN_RUNS_V1_MIGRATION_ID)).toMatchObject({ requiredOnStartup: true, prerequisiteMigrationIds: [] });
  });

  it("a reader FAILED on the first start: every Org waits as it is; on the next start the reader's follow-up converts it", async () => {
    const w = await world();
    await writeReleasedOrg(w.memory);
    const records = new InMemoryRecords();
    let reader: "FAILED" | "SUCCEEDED" = "FAILED";
    const runner = new AppDataMigrationRunner(new AppDataMigrationRegistry([
      stand("20261015_collaborators_to_delegated_runs_v1", () => reader),
      new AgentOrgUnitsOwnRunsV1AppDataMigration(w.appData, w.memory, names, null, { ledger: records }),
      ...followUpsAfter(w, records, "20261015_collaborators_to_delegated_runs_v1"),
    ]), records, { logsDir: path.join(w.appData, "logs") });
    const first = await run(runner);
    expect(first.get(AGENT_ORG_UNITS_OWN_RUNS_V1_MIGRATION_ID)?.status).toBe("SUCCEEDED_WITH_WARNINGS");
    expect((await json(orgFile(w))).rootOrg.members).toBeDefined();
    reader = "SUCCEEDED";
    const second = await run(runner);
    expect(second.get("20261122_agent_org_units_after_collaborators_to_delegated_runs_v1")?.status).toBe("SUCCEEDED");
    expect((await json(orgFile(w))).rootOrg.units.map((unit: { runId: string }) => unit.runId)).toContain(SET);
  });

  it("a writer late: the flat-families migration writes a released Org tree after ours; its follow-up converts it", async () => {
    const w = await world();
    const records = new InMemoryRecords();
    let writer: "FAILED" | "SUCCEEDED" = "FAILED";
    const runner = new AppDataMigrationRunner(new AppDataMigrationRegistry([
      stand("20260901_agent_org_flat_team_families_v1", () => writer, async () => writeReleasedOrg(w.memory, { orgRunId: "late_org" })),
      new AgentOrgUnitsOwnRunsV1AppDataMigration(w.appData, w.memory, names, null, { ledger: records }),
      ...followUpsAfter(w, records, "20260901_agent_org_flat_team_families_v1"),
    ]), records, { logsDir: path.join(w.appData, "logs") });
    await run(runner);
    writer = "SUCCEEDED";
    const second = await run(runner);
    expect(second.get("20261122_agent_org_units_after_org_flat_team_families_v1")?.status).toBe("SUCCEEDED");
    expect((await json(orgFile(w, "late_org"))).rootOrg).toHaveProperty("units");
  });

  it("a late index rebuild lists an agent unit as a top-level run; its follow-up removes the row (the Org's stays)", async () => {
    const w = await world();
    await writeReleasedOrg(w.memory);
    await new AgentOrgUnitsOwnRunsV1AppDataMigration(w.appData, w.memory, names, null, { ledger: terminal }).execute();
    await new RunHistoryIndexV2AppDataMigration(w.memory, names, catalogs).execute();
    const rows = async () => ((await json(path.join(w.memory, "run_history_index.json")).catch(() => [])) as Array<{ runId: string }>).map((row) => row.runId);
    const followUp = createAgentOrgUnitsMigrations(w.appData, w.memory, names, null, terminal)
      .find((migration) => (migration as unknown as { spec?: { predecessor: string } }).spec?.predecessor === "20260521_run_history_index_v2")!;
    expect(await rows()).toContain("concierge_1");
    await followUp.execute();
    expect(await rows()).not.toContain("concierge_1");
  });

  it("the Team-folder predecessors run late leave a Team unit as it is (classified none)", async () => {
    const w = await world();
    await writeReleasedOrg(w.memory);
    await new AgentOrgUnitsOwnRunsV1AppDataMigration(w.appData, w.memory, names, null, { ledger: terminal }).execute();
    const tree = path.join(w.memory, "agent_teams", SET, "team_run_execution_tree.json");
    const before = await fs.readFile(tree, "utf8");
    await new TeamRunExecutionTreeV2AppDataMigration(w.memory).execute();
    await new TeamRunHistoryIndexV2AppDataMigration(w.memory, names, catalogs).execute();
    expect(await fs.readFile(tree, "utf8")).toBe(before);
    const teamRows = (await json(path.join(w.memory, "team_run_history_index.json")).catch(() => [])) as Array<{ teamRunId: string }>;
    expect(teamRows.map((row) => row.teamRunId)).not.toContain(SET);
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
