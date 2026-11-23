import { AppendOnlyMessageLogsV1AppDataMigration } from "../../src/app-data-migrations/migrations/append-only-message-logs-v1/append-only-message-logs-v1-app-data-migration.js";
import type { AppDataMigrationRecordSnapshot } from "../../src/app-data-migrations/domain/app-data-migration-types.js";
import { TaskAgentOwnRunV1AppDataMigration } from "../../src/app-data-migrations/migrations/task-agent-own-run-v1/task-agent-own-run-v1-app-data-migration.js";
import { DelegatedCopyOwnFileCompleteV1AppDataMigration } from "../../src/app-data-migrations/migrations/delegated-copy-own-file-complete-v1/delegated-copy-own-file-complete-v1-app-data-migration.js";
import { DelegatedRunsOwnRunsV1AppDataMigration } from "../../src/app-data-migrations/migrations/delegated-runs-own-runs-v1/delegated-runs-own-runs-v1-app-data-migration.js";
import { AgentOrgUnitsOwnRunsV1AppDataMigration } from "../../src/app-data-migrations/migrations/agent-org-units-own-runs-v1/agent-org-units-own-runs-v1-app-data-migration.js";

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

/**
 * org-teams-follow-definition: what a real start runs after the released Org migrations, before the runtime reads an Org:
 * task agents become their own runs, the message logs append-only, delegated copies' files complete, delegated runs their
 * own runs, and then every Org a container of runs (`20261122_agent_org_units_own_runs_v1`, registered last; today's
 * readers read only containers). Every predecessor counts as succeeded; the results in order.
 */
export const runOrgStartupChain = async (appDataDir: string, memoryDir: string) => {
  const ledger = { getRecord: async (migrationId: string) => ({ migrationId, status: "SUCCEEDED" }) as AppDataMigrationRecordSnapshot };
  const names = { agentDefinitionName: async () => null, teamDefinitionName: async () => null };
  const results = [];
  for (const migration of [
    new TaskAgentOwnRunV1AppDataMigration(memoryDir, { ledger }),
    new AppendOnlyMessageLogsV1AppDataMigration(memoryDir, { ledger }),
    new DelegatedCopyOwnFileCompleteV1AppDataMigration(memoryDir, { ledger }),
    new DelegatedRunsOwnRunsV1AppDataMigration(appDataDir, memoryDir, names, null, { ledger }),
    new AgentOrgUnitsOwnRunsV1AppDataMigration(appDataDir, memoryDir, names, null, { ledger }),
  ]) results.push({ id: migration.id, ...(await migration.execute()) });
  return results;
};
