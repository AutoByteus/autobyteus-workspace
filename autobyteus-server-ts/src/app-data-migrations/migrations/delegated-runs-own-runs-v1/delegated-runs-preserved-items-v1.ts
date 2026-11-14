import type { DefinitionNameLookup } from "../../domain/definition-name-lookup.js";
import type { RunHistoryCatalogInvalidation } from "../../domain/run-history-catalog-invalidation.js";
import {
  DELEGATED_RUNS_OWN_RUNS_V1_MIGRATION_ID,
  DelegatedRunsOwnRunsV1AppDataMigration,
  type DelegatedRunsPlan,
} from "./delegated-runs-own-runs-v1-app-data-migration.js";

/**
 * The follow-ups of `20261111_delegated_runs_own_runs_v1` (autobyteus-461 SR-078 as revised by ARCH-REV-049 AR-027 and
 * ARCH-REV-050; design DS-10, "After the predecessor finishes the item"; guideline §7, "a separate new migration").
 *
 * Our migration leaves a predecessor's unfinished item as it is and reports it (`PRESERVED_UNFINISHED_PREDECESSOR`). When
 * that predecessor later finishes the item (it is retried at every start), the item is in the predecessor's released
 * shape, which the runtime does not read. One follow-up per predecessor applies our steps that its items need, with our
 * migration's own builders, recognized as done by structure (so idempotent): an item already converted is current, an item
 * its predecessor still has unfinished stays preserved and reported (a warning success). Then it is terminal.
 *
 * The runner checks prerequisites per migration (`assertPrerequisites`): each follow-up has only our migration and its own
 * predecessor, so a predecessor that stays `FAILED` for an unrelated item holds back only its own follow-up, which waits,
 * reported, while startup continues (`requiredOnStartup`, no `holdsBackCapabilities`). Registered after our migration.
 */
// The predecessors, by their IDs (a migration folder imports no other; the sealed area's rule).
const TASK_AGENT_OWN_RUN_V1_MIGRATION_ID = "20261017_task_agent_own_run_v1";
const APPEND_ONLY_MESSAGE_LOGS_V1_MIGRATION_ID = "20261018_append_only_message_logs_v1";
const DELEGATED_COPY_OWN_FILE_COMPLETE_V1_MIGRATION_ID = "20261019_delegated_copy_own_file_complete_v1";

export const DELEGATED_RUNS_PRESERVED_ITEMS_PLANS: readonly DelegatedRunsPlan[] = [
  {
    id: "20261114_preserved_items_after_task_agent_own_run_v1",
    displayName: "Delegated runs: items finished by the task-agent own-run migration",
    description: "Converts the delegated copies 20261017 had not finished when delegated runs became runs of their own: own file, message log, history row.",
    prerequisiteMigrationIds: [DELEGATED_RUNS_OWN_RUNS_V1_MIGRATION_ID, TASK_AGENT_OWN_RUN_V1_MIGRATION_ID],
    // 4: its own file; 5b: an append-only log it already has; 8: its history row.
    steps: ["runFiles", "agentRunLogs", "historyRows"],
  },
  {
    id: "20261114_preserved_items_after_own_file_complete_v1",
    displayName: "Delegated runs: items finished by the own-file completion migration",
    description: "Converts the own files 20261019 had not completed when delegated runs became runs of their own: own file, history row.",
    prerequisiteMigrationIds: [DELEGATED_RUNS_OWN_RUNS_V1_MIGRATION_ID, DELEGATED_COPY_OWN_FILE_COMPLETE_V1_MIGRATION_ID],
    steps: ["runFiles", "historyRows"],
  },
  {
    id: "20261114_preserved_items_after_append_only_logs_v1",
    displayName: "Delegated runs: logs finished by the append-only message log migration",
    description: "Moves the message logs 20261018 had not converted when delegated runs became runs of their own into each run's own folder.",
    prerequisiteMigrationIds: [DELEGATED_RUNS_OWN_RUNS_V1_MIGRATION_ID, APPEND_ONLY_MESSAGE_LOGS_V1_MIGRATION_ID],
    steps: ["agentRunLogs"],
  },
];

export const createDelegatedRunsPreservedItemsMigrations = (appDataDir: string, memoryDir: string, names: DefinitionNameLookup,
  catalogs: RunHistoryCatalogInvalidation | null = null): DelegatedRunsOwnRunsV1AppDataMigration[] =>
  DELEGATED_RUNS_PRESERVED_ITEMS_PLANS.map((plan) => new DelegatedRunsOwnRunsV1AppDataMigration(appDataDir, memoryDir, names, catalogs, plan));
