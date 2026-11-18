import { describe, expect, it } from "vitest";
import { AppDataMigrationRegistry } from "../../../src/app-data-migrations/app-data-migration-registry.js";

/**
 * The registry's order is the order migrations run in on data that has not run them yet (CR-461-048). A released
 * migration keeps its place, and no new migration runs ahead of one: data that has not yet run a released migration
 * would otherwise meet the new one in a shape no released build left it in.
 *
 * The registry as released in v1.5.14-beta.1 (cut from personal at `05dde06bb4`), in its order (dependency order,
 * not date order). A later release only appends to it, so this list stays correct when it is not updated.
 */
const RELEASED = [
  "20260727_custom_provider_v1_secret_migration",
  "20260706_remove_global_skill_discovery_mode",
  "20260517_team_run_metadata_member_tree",
  "20260814_team_run_execution_tree_v1",
  "20260823_repair_team_agent_memory_layout",
  "20260824_team_run_execution_tree_v2",
  "20260730_token_usage_custom_provider_model_value_backfill",
  "20260730_token_usage_provider_name_snapshot_backfill",
  "20260819_token_usage_run_records_v1",
  "20260901_agent_org_flat_team_families_v1",
  "20260731_remove_external_runtime_working_context_snapshots",
  "20260617_raw_trace_rotation_layout",
  "20260707_raw_trace_active_file_name",
  "20260926_team_context_file_execution_locators_v1",
  "20260731_migrate_native_working_context_snapshots_v5",
  "20260905_agent_org_history_first_message_summary_v1",
  "20260701_team_communication_projection_addresses",
  "20260623_remove_self_evolution_run_metadata",
  "20260521_team_run_history_index_v2",
  "20260521_run_history_index_v2",
  "20260803_custom_provider_readable_identity",
  "20260924_remove_external_messaging_data",
  "20261005_projects_per_folder_v1",
  "20261017_project_task_keys_v1",
  "20261025_project_task_titles",
  "20261006_remove_built_in_project_task_manager",
  "20261015_collaborators_to_delegated_runs_v1",
  "20261017_task_agent_own_run_v1",
  "20261018_append_only_message_logs_v1",
  "20261019_remove_work_trace_exports",
  "20261019_delegated_copy_own_file_complete_v1",
  "20261020_remove_skill_improvement_data",
  "20261024_node_identity_file_name",
  "20261024_memory_sync_source_id_names",
  "20261030_raw_trace_manifest_runtime_names",
  "20261111_delegated_runs_own_runs_v1",
  "20261114_preserved_items_after_task_agent_own_run_v1",
  "20261114_preserved_items_after_own_file_complete_v1",
  "20261114_preserved_items_after_append_only_logs_v1",
  "20261114_preserved_items_after_team_run_execution_tree_v1",
  "20261114_preserved_items_after_team_run_execution_tree_v2",
  "20261114_preserved_items_after_org_flat_team_families_v1",
  "20261114_preserved_items_after_collaborators_to_delegated_runs_v1",
  "20261114_preserved_items_after_team_run_history_index_v2",
  "20261114_preserved_items_after_remove_skill_improvement_data",
  "20261118_remove_retired_built_in_agents",
];

const dateOf = (id: string) => id.slice(0, 8);

describe("app-data migration registry order (CR-461-048)", () => {
  const ids = new AppDataMigrationRegistry().listDefinitions().map((definition) => definition.id);

  it("the released migrations come first, in their released order", () => {
    expect(ids.slice(0, RELEASED.length)).toEqual(RELEASED);
  });

  it("every later migration runs after them, in date order, none dated before the newest released one", () => {
    const later = ids.slice(RELEASED.length);
    const newestReleased = RELEASED.map(dateOf).sort().at(-1)!;
    expect(later.filter((id) => dateOf(id) < newestReleased)).toEqual([]);
    expect(later.map(dateOf)).toEqual([...later.map(dateOf)].sort());
  });

  it("autobyteus-461's migration runs after the Skill Improvement removal, which deletes the improver's helper runs first", () => {
    expect(ids.indexOf("20261111_delegated_runs_own_runs_v1")).toBeGreaterThan(ids.indexOf("20261020_remove_skill_improvement_data"));
  });
});
