import type { AppDataMigrationRecordRepositoryLike } from "../../domain/app-data-migration-types.js";
import type { DefinitionNameLookup } from "../../domain/definition-name-lookup.js";
import type { RunHistoryCatalogInvalidation } from "../../domain/run-history-catalog-invalidation.js";
import {
  DELEGATED_RUNS_OWN_RUNS_V1_MIGRATION_ID,
  DelegatedRunsOwnRunsV1AppDataMigration,
  REMOVE_SKILL_IMPROVEMENT_DATA_MIGRATION_ID,
  type DelegatedRunsStep,
} from "./delegated-runs-own-runs-v1-app-data-migration.js";

/** How a migration registered before ours acts on the shapes ours converts (SR-079, DS-10's classification table). */
export type PredecessorClass = "writer" | "reader";

/** One follow-up: its predecessor, how that predecessor acts on our shapes, and the steps its late output needs. */
export type PreservedItemsFollowUpSpec = Readonly<{
  id: string;
  predecessor: string;
  predecessorClass: PredecessorClass;
  /** What the predecessor writes or reads, in plain words (for the follow-up's description). */
  late: string;
  steps: readonly DelegatedRunsStep[];
}>;

/**
 * Every predecessor whose late output our migration must still convert (autobyteus-461 SR-078, SR-079; design DS-10,
 * "Every late predecessor, not only the FAILED ones"). A predecessor can run after ours when it is `FAILED` and retried,
 * or `NOT_RUN` behind a failed prerequisite. The writers write our source shapes (`taskExecutions` lists, a `taskAgent`
 * section, the delegated runs' history rows); the reader selects by them. The other predecessors are classified rebuilder
 * or none in the registry classification test, which requires every predecessor to have a class.
 */
export const PRESERVED_ITEMS_FOLLOW_UPS: readonly PreservedItemsFollowUpSpec[] = [
  { id: "20261114_preserved_items_after_task_agent_own_run_v1", predecessor: "20261017_task_agent_own_run_v1", predecessorClass: "writer",
    late: "a delegated copy's own file and its append-only log", steps: ["runFiles", "agentRunLogs", "historyRows"] },
  { id: "20261114_preserved_items_after_own_file_complete_v1", predecessor: "20261019_delegated_copy_own_file_complete_v1", predecessorClass: "writer",
    late: "a completed own file", steps: ["runFiles", "historyRows"] },
  { id: "20261114_preserved_items_after_append_only_logs_v1", predecessor: "20261018_append_only_message_logs_v1", predecessorClass: "writer",
    late: "an agent run's append-only log in its collaboration folder", steps: ["agentRunLogs"] },
  { id: "20261114_preserved_items_after_team_run_execution_tree_v1", predecessor: "20260814_team_run_execution_tree_v1", predecessorClass: "writer",
    late: "team trees with taskExecutions lists and a task team's taskAgent section", steps: ["runFiles", "lists", "historyRows"] },
  { id: "20261114_preserved_items_after_team_run_execution_tree_v2", predecessor: "20260824_team_run_execution_tree_v2", predecessorClass: "writer",
    late: "team trees with taskExecutions lists and a task team's taskAgent section", steps: ["runFiles", "lists", "historyRows"] },
  { id: "20261114_preserved_items_after_org_flat_team_families_v1", predecessor: "20260901_agent_org_flat_team_families_v1", predecessorClass: "writer",
    late: "org trees with taskExecutions lists", steps: ["runFiles", "lists", "historyRows"] },
  { id: "20261114_preserved_items_after_collaborators_to_delegated_runs_v1", predecessor: "20261015_collaborators_to_delegated_runs_v1", predecessorClass: "writer",
    late: "taskExecutions links and sourceless copies in trees", steps: ["runFiles", "lists", "historyRows"] },
  // The team index is rebuilt only from team_run_metadata.json and drops every other row as stale: a delegated team
  // run's row goes (user-started teams' rows too: base's behavior, FU-029).
  { id: "20261114_preserved_items_after_team_run_history_index_v2", predecessor: "20260521_team_run_history_index_v2", predecessorClass: "writer",
    late: "a team history index without the delegated team runs' rows", steps: ["historyRows"] },
  { id: "20261114_preserved_items_after_remove_skill_improvement_data", predecessor: REMOVE_SKILL_IMPROVEMENT_DATA_MIGRATION_ID, predecessorClass: "reader",
    late: "the improver's delegated copies it left (ours preserves them until it has run)", steps: ["runFiles", "agentRunLogs", "historyRows"] },
];

/**
 * `PreservedItemsFollowUp(predecessor, steps)`: the one definition of every follow-up. It applies our steps, with our
 * migration's own builders, to what its predecessor wrote (or left) after ours ran; each step recognizes finished work by
 * its structure, so it is idempotent, and an item still unfinished stays preserved and reported. Its prerequisites are
 * its predecessor and our migration, so it waits, reported, while its predecessor is `FAILED` or `NOT_RUN`, and a
 * predecessor stuck there holds back only its own follow-up. `requiredOnStartup` with no `holdsBackCapabilities`;
 * registered after our migration; terminal once it has run.
 */
export class PreservedItemsFollowUp extends DelegatedRunsOwnRunsV1AppDataMigration {
  constructor(appDataDir: string, memoryDir: string, names: DefinitionNameLookup, catalogs: RunHistoryCatalogInvalidation | null,
    ledger: Pick<AppDataMigrationRecordRepositoryLike, "getRecord"> | null, readonly spec: PreservedItemsFollowUpSpec) {
    super(appDataDir, memoryDir, names, catalogs, {
      ...(ledger ? { ledger } : {}),
      plan: {
        id: spec.id,
        displayName: `Delegated runs: what ${spec.predecessor} wrote after them`,
        description: `Converts ${spec.late}, which ${spec.predecessor} produced after delegated runs became runs of their own.`,
        prerequisiteMigrationIds: [DELEGATED_RUNS_OWN_RUNS_V1_MIGRATION_ID, spec.predecessor],
        steps: spec.steps,
      },
    });
  }
}

export const createDelegatedRunsPreservedItemsMigrations = (appDataDir: string, memoryDir: string, names: DefinitionNameLookup,
  catalogs: RunHistoryCatalogInvalidation | null = null, ledger: Pick<AppDataMigrationRecordRepositoryLike, "getRecord"> | null = null): PreservedItemsFollowUp[] =>
  PRESERVED_ITEMS_FOLLOW_UPS.map((spec) => new PreservedItemsFollowUp(appDataDir, memoryDir, names, catalogs, ledger, spec));
