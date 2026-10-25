import { AppDataMigrationRegistry } from "../../src/app-data-migrations/app-data-migration-registry.js";
import { AppDataMigrationRunner } from "../../src/app-data-migrations/app-data-migration-runner.js";
import type {
  AppDataMigrationDefinition,
  AppDataMigrationExecutionResult,
  AppDataMigrationRecordRepositoryLike,
  AppDataMigrationRecordSnapshot,
} from "../../src/app-data-migrations/domain/app-data-migration-types.js";
import { AGENT_ORG_FLAT_TEAM_FAMILIES_V1_MIGRATION_ID } from "../../src/app-data-migrations/migrations/agent-org-flat-team-families-v1/agent-org-flat-team-families-v1-app-data-migration.js";
import { AGENT_ORG_HISTORY_FIRST_MESSAGE_SUMMARY_V1_MIGRATION_ID } from "../../src/app-data-migrations/migrations/agent-org-history-first-message-summary-v1/agent-org-history-first-message-summary-v1-app-data-migration.js";
import { APPEND_ONLY_MESSAGE_LOGS_V1_MIGRATION_ID } from "../../src/app-data-migrations/migrations/append-only-message-logs-v1/append-only-message-logs-v1-app-data-migration.js";
import { COLLABORATORS_TO_DELEGATED_RUNS_V1_MIGRATION_ID } from "../../src/app-data-migrations/migrations/collaborators-to-delegated-runs-v1/collaborators-to-delegated-runs-v1-app-data-migration.js";
import { RAW_TRACE_ACTIVE_FILE_NAME_MIGRATION_ID } from "../../src/app-data-migrations/migrations/raw-trace-active-file-name/raw-trace-active-file-name-migration.js";
import { RAW_TRACE_ROTATION_LAYOUT_MIGRATION_ID } from "../../src/app-data-migrations/migrations/raw-trace-rotation-layout/raw-trace-rotation-layout-migration.js";
import { TASK_AGENT_OWN_RUN_V1_MIGRATION_ID } from "../../src/app-data-migrations/migrations/task-agent-own-run-v1/task-agent-own-run-v1-app-data-migration.js";
import { TEAM_COMMUNICATION_PROJECTION_ADDRESS_MIGRATION_ID } from "../../src/app-data-migrations/migrations/team-communication-projection-address/team-communication-projection-address-migration.js";
import { TEAM_CONTEXT_FILE_EXECUTION_LOCATORS_V1_MIGRATION_ID } from "../../src/app-data-migrations/migrations/team-context-file-execution-locators-v1/team-context-file-execution-locators-v1-app-data-migration.js";
import { TEAM_RUN_EXECUTION_TREE_V1_MIGRATION_ID } from "../../src/app-data-migrations/migrations/team-run-execution-tree-v1/team-run-execution-tree-v1-constants.js";
import { TOKEN_USAGE_RUN_RECORDS_V1_MIGRATION_ID } from "../../src/app-data-migrations/migrations/token-usage-run-records-v1/token-usage-run-records-v1-app-data-migration.js";
import { TEAM_RUN_EXECUTION_TREE_V2_MIGRATION_ID } from "../../src/app-data-migrations/migrations/team-run-execution-tree-v2/team-run-execution-tree-v2-app-data-migration.js";

/**
 * Starts of the real runner over the message-log-relevant part of the production registry, in its
 * order (app-data-migration-registry.ts). A test supplies the real definitions it exercises; every
 * other entry is a stub whose outcome per start the test chooses (for example a prerequisite that fails
 * in start 1 and succeeds in start 2). The ledger lives in memory and persists across starts.
 */
export const PRODUCTION_ORDER: readonly Readonly<{ id: string; prerequisites?: readonly string[] }>[] = Object.freeze([
  { id: TEAM_RUN_EXECUTION_TREE_V1_MIGRATION_ID },
  { id: TEAM_RUN_EXECUTION_TREE_V2_MIGRATION_ID },
  { id: TOKEN_USAGE_RUN_RECORDS_V1_MIGRATION_ID },
  { id: AGENT_ORG_FLAT_TEAM_FAMILIES_V1_MIGRATION_ID, prerequisites: [TEAM_RUN_EXECUTION_TREE_V2_MIGRATION_ID, TOKEN_USAGE_RUN_RECORDS_V1_MIGRATION_ID] },
  { id: RAW_TRACE_ROTATION_LAYOUT_MIGRATION_ID },
  { id: RAW_TRACE_ACTIVE_FILE_NAME_MIGRATION_ID },
  { id: TEAM_CONTEXT_FILE_EXECUTION_LOCATORS_V1_MIGRATION_ID },
  { id: AGENT_ORG_HISTORY_FIRST_MESSAGE_SUMMARY_V1_MIGRATION_ID },
  { id: TEAM_COMMUNICATION_PROJECTION_ADDRESS_MIGRATION_ID },
  { id: COLLABORATORS_TO_DELEGATED_RUNS_V1_MIGRATION_ID },
  { id: TASK_AGENT_OWN_RUN_V1_MIGRATION_ID },
  { id: APPEND_ONLY_MESSAGE_LOGS_V1_MIGRATION_ID },
]);

export type StubOutcome = AppDataMigrationExecutionResult["status"];

export class InMemoryMigrationLedger implements AppDataMigrationRecordRepositoryLike {
  readonly records = new Map<string, AppDataMigrationRecordSnapshot>();

  async getRecord(migrationId: string) { return this.records.get(migrationId) ?? null; }
  async listRecords() { return [...this.records.values()]; }
  async markRunning(input: { migrationId: string; displayName: string; startedAt: Date }) {
    return this.save({ ...input, status: "RUNNING", attempts: (this.records.get(input.migrationId)?.attempts ?? 0) + 1,
      completedAt: null, summary: null, errorMessage: null, logPath: null });
  }
  async complete(input: Parameters<AppDataMigrationRecordRepositoryLike["complete"]>[0]) {
    const previous = this.records.get(input.migrationId);
    return this.save({ ...input, attempts: previous?.attempts ?? 1, startedAt: previous?.startedAt ?? null });
  }
  async markFailed(input: Parameters<AppDataMigrationRecordRepositoryLike["markFailed"]>[0]) {
    const previous = this.records.get(input.migrationId);
    return this.save({ ...input, status: "FAILED", attempts: previous?.attempts ?? 1, startedAt: previous?.startedAt ?? null });
  }
  /** A migration terminal from an earlier release. */
  succeeded(...migrationIds: string[]): this {
    for (const migrationId of migrationIds) {
      this.save({ migrationId, displayName: migrationId, status: "SUCCEEDED", attempts: 1, startedAt: null, completedAt: null,
        summary: "earlier release", errorMessage: null, logPath: null });
    }
    return this;
  }
  statusOf(migrationId: string) { return this.records.get(migrationId)?.status ?? "NOT_RUN"; }
  private save(record: AppDataMigrationRecordSnapshot) { this.records.set(record.migrationId, record); return record; }
}

const emptySummary = () => ({ scannedCount: 0, migratedCount: 0, skippedCount: 0, failedCount: 0, details: [] });

/**
 * One start: the production order with `real` definitions where given and stubs elsewhere; `stubs`
 * chooses a stub's outcome (default SUCCEEDED). Returns each definition's status after the start.
 */
export const runStart = async (input: Readonly<{
  ledger: InMemoryMigrationLedger;
  logsDir: string;
  real: readonly AppDataMigrationDefinition[];
  stubs?: Readonly<Record<string, StubOutcome>>;
}>): Promise<Record<string, string>> => {
  const real = new Map(input.real.map((definition) => [definition.id, definition]));
  const definitions = PRODUCTION_ORDER.map(({ id, prerequisites }): AppDataMigrationDefinition => real.get(id) ?? {
    id, displayName: `stub ${id}`, description: "test stub", requiredOnStartup: true, executionPolicy: "STARTUP_ONLY",
    prerequisiteMigrationIds: prerequisites,
    execute: async () => ({ status: input.stubs?.[id] ?? "SUCCEEDED", summary: emptySummary(),
      errorMessage: (input.stubs?.[id] ?? "SUCCEEDED") === "FAILED" ? "stub failure" : null }),
  });
  const results = await new AppDataMigrationRunner(new AppDataMigrationRegistry(definitions), input.ledger, { logsDir: input.logsDir }).runPending();
  return Object.fromEntries(results.map((result) => [result.migrationId, result.status]));
};
