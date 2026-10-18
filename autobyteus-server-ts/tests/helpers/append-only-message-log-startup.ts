import { AppendOnlyMessageLogsV1AppDataMigration } from "../../src/app-data-migrations/migrations/append-only-message-logs-v1/append-only-message-logs-v1-app-data-migration.js";
import type { AppDataMigrationRecordSnapshot } from "../../src/app-data-migrations/domain/app-data-migration-types.js";

/**
 * A released migration's test that checks current admission afterwards: on a real start the append-only
 * message log conversion (`20261018_append_only_message_logs_v1`, registered last) converts the JSON logs
 * that migration read or wrote, before the runtime admits runs. Every log-writing predecessor counts as
 * succeeded here.
 */
export const convertMessageLogsAsOnStartup = async (memoryDir: string) =>
  new AppendOnlyMessageLogsV1AppDataMigration(memoryDir, {
    ledger: { getRecord: async (migrationId: string) => ({ migrationId, status: "SUCCEEDED" }) as AppDataMigrationRecordSnapshot },
  }).execute();
