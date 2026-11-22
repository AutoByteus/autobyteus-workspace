import type { AppDataMigrationRecordRepositoryLike } from "../../domain/app-data-migration-types.js";
import type { DefinitionNameLookup } from "../../domain/definition-name-lookup.js";
import type { RunHistoryCatalogInvalidation } from "../../domain/run-history-catalog-invalidation.js";
import {
  AGENT_ORG_UNITS_OWN_RUNS_V1_MIGRATION_ID, AgentOrgUnitsOwnRunsV1AppDataMigration, PATH_WRITER_PREDECESSORS, READER_PREDECESSORS,
} from "./agent-org-units-own-runs-v1-app-data-migration.js";

/** How a migration registered before ours acts on the shapes ours converts (guideline §4). */
export type OrgUnitsPredecessorClass = "writer" | "reader";

export type OrgUnitsFollowUpSpec = Readonly<{ id: string; predecessor: string; predecessorClass: OrgUnitsPredecessorClass; late: string }>;

const spec = (suffix: string, predecessor: string, predecessorClass: OrgUnitsPredecessorClass, late: string): OrgUnitsFollowUpSpec =>
  ({ id: `20261122_agent_org_units_after_${suffix}`, predecessor, predecessorClass, late });

/**
 * Every predecessor whose late output this conversion must still convert (writers), or whose input it must leave in
 * place until it has run (readers, `READER_PREDECESSORS`). The registry classification test classifies every other
 * earlier migration as a rebuilder or none, with the evidence.
 */
export const ORG_UNITS_FOLLOW_UPS: readonly OrgUnitsFollowUpSpec[] = [
  // Writes released Org trees (and their logs): a late Org tree v1 is converted.
  spec("org_flat_team_families_v1", "20260901_agent_org_flat_team_families_v1", "writer", "a released Org tree v1"),
  // Rebuilds the agent index from every agents/* run file: a late rebuild lists agent units as top-level runs.
  spec("run_history_index_v2", "20260521_run_history_index_v2", "writer", "an agent index row for an agent unit"),
  // Converts an Org's JSON log into its append-only log: a late Org log is split into its units' logs.
  spec("append_only_message_logs_v1", "20261018_append_only_message_logs_v1", "writer", "an Org's append-only log"),
  // Write Task entries and delegated runs' own files naming the Org as delegating run: rewritten to the unit run.
  spec("delegated_runs_own_runs_v1", "20261111_delegated_runs_own_runs_v1", "writer", "delegations naming the Org"),
  ...[
    ["task_agent_own_run_v1", "task_agent_own_run_v1"], ["own_file_complete_v1", "own_file_complete_v1"], ["append_only_logs_v1", "append_only_logs_v1"],
    ["team_run_execution_tree_v1", "team_run_execution_tree_v1"], ["team_run_execution_tree_v2", "team_run_execution_tree_v2"],
    ["org_flat_team_families_v1", "org_flat_team_families_v1"], ["collaborators_to_delegated_runs_v1", "collaborators_to_delegated_runs_v1"],
    ["team_run_history_index_v2", "team_run_history_index_v2"], ["remove_skill_improvement_data", "remove_skill_improvement_data"],
  ].map(([suffix, name]) => spec(`preserved_items_after_${suffix}`, `20261114_preserved_items_after_${name}`, "writer", "delegations naming the Org")),
  // SR-018: write or move files the node pass rewrites (every Org waits for them; their follow-up re-runs the pass, also
  // for converted Orgs). The append-only log migration is one already (above).
  ...PATH_WRITER_PREDECESSORS.filter((predecessor) => predecessor !== "20261018_append_only_message_logs_v1")
    .map((predecessor) => spec(predecessor.replace(/^\d+_/, ""), predecessor, "writer", "files naming an Org member's old folder")),
  // Read released Org trees or logs: every Org waits for them, then their follow-up converts it.
  ...READER_PREDECESSORS.map((predecessor) => spec(predecessor.replace(/^\d+_/, ""), predecessor, "reader", "Orgs left as they were while it had not run")),
];

/**
 * `OrgUnitsFollowUp(predecessor)`: the one definition of every follow-up: our conversion again, after its predecessor and
 * ours (each step recognizes finished work by its structure: idempotent). A path writer's follow-up's node pass also moves
 * the paths of Orgs already converted, from their container files, when its predecessor completed after our conversion
 * started (SR-018: a file it wrote late; CRR-012 T-1). `requiredOnStartup`, no hold,
 * registered after our migration; a predecessor stuck `FAILED` or `NOT_RUN` holds back only its own follow-up.
 */
export class OrgUnitsFollowUp extends AgentOrgUnitsOwnRunsV1AppDataMigration {
  constructor(appDataDir: string, memoryDir: string, names: DefinitionNameLookup, catalogs: RunHistoryCatalogInvalidation | null,
    ledger: Pick<AppDataMigrationRecordRepositoryLike, "getRecord">, readonly spec: OrgUnitsFollowUpSpec) {
    super(appDataDir, memoryDir, names, catalogs, { ledger, plan: {
      id: spec.id,
      displayName: `Org units: what ${spec.predecessor} left`,
      description: `Converts ${spec.late}, which ${spec.predecessor} ${spec.predecessorClass === "writer" ? "wrote" : "held back"} after Org units became runs of their own.`,
      prerequisiteMigrationIds: [AGENT_ORG_UNITS_OWN_RUNS_V1_MIGRATION_ID, spec.predecessor],
      ...(PATH_WRITER_PREDECESSORS.includes(spec.predecessor) ? { lateWriterOf: spec.predecessor } : {}),
    } });
  }
}

export const createAgentOrgUnitsMigrations = (appDataDir: string, memoryDir: string, names: DefinitionNameLookup,
  catalogs: RunHistoryCatalogInvalidation | null, ledger: Pick<AppDataMigrationRecordRepositoryLike, "getRecord">) => [
  new AgentOrgUnitsOwnRunsV1AppDataMigration(appDataDir, memoryDir, names, catalogs, { ledger }),
  ...ORG_UNITS_FOLLOW_UPS.map((followUp) => new OrgUnitsFollowUp(appDataDir, memoryDir, names, catalogs, ledger, followUp)),
];
