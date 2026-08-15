import type { PrismaClient } from "@prisma/client";
import { createConfiguredPrismaClient } from "../../../config/prisma-client-factory.js";

export type TokenUsageExecutionIdentityEvidenceRow = Readonly<{
  id: number;
  usageEventId: string;
  runId: string;
  rootTeamRunId: string | null;
  executionAddressJson: string | null;
}>;

type ColumnRow = { name: string };
type TableRow = { name: string };
type RawEvidence = {
  id: number;
  usage_event_id: string;
  run_id: string;
  root_team_run_id: string | null;
  execution_address_json: string | null;
};

const EVIDENCE_TABLE = "token_usage_ledger_events_pre_v1_identity_evidence";
const TARGET_ROOT_INDEX = "token_usage_ledger_events_root_team_run_id_observed_at_idx";
const LEGACY_COLUMNS = [
  "execution_address_json",
  "team_run_path_json",
  "member_agent_run_id",
  "member_path_json",
  "member_route_key",
  "task_agent_instance_id",
  "task_agent_run_id",
] as const;

const normalizedRows = (rows: readonly RawEvidence[]): TokenUsageExecutionIdentityEvidenceRow[] =>
  rows.map((row) => Object.freeze({
    id: row.id,
    usageEventId: row.usage_event_id,
    runId: row.run_id,
    rootTeamRunId: row.root_team_run_id,
    executionAddressJson: row.execution_address_json,
  }));

/** SQL-only migration adapter used behind TokenUsageLedgerStore. */
export class TokenUsageExecutionIdentityMigrationRepository {
  private prisma: PrismaClient | null;
  private readonly ownsClient: boolean;

  constructor(prisma?: PrismaClient) {
    this.prisma = prisma ?? null;
    this.ownsClient = prisma === undefined;
  }

  private get client(): PrismaClient {
    return this.prisma ??= createConfiguredPrismaClient();
  }

  async listEvidence(): Promise<TokenUsageExecutionIdentityEvidenceRow[]> {
    const tables = await this.client.$queryRaw<TableRow[]>`
      SELECT "name" FROM "sqlite_master" WHERE "type"='table'`;
    if (tables.some((table) => table.name === EVIDENCE_TABLE)) {
      const rows = await this.client.$queryRawUnsafe<RawEvidence[]>(
        `SELECT "id", "usage_event_id", "run_id", "root_team_run_id", "execution_address_json" FROM "${EVIDENCE_TABLE}" ORDER BY "id" ASC`,
      );
      return normalizedRows(rows);
    }
    const columns = await this.columns(this.client);
    if (!columns.has("execution_address_json")) {
      const rows = await this.client.$queryRaw<RawEvidence[]>`
        SELECT "id", "usage_event_id", "run_id", "root_team_run_id",
               NULL AS "execution_address_json"
        FROM "token_usage_ledger_events" ORDER BY "id" ASC`;
      return normalizedRows(rows);
    }
    const rootExpression = columns.has("root_team_run_id")
      ? '"root_team_run_id"'
      : 'json_extract("execution_address_json", \'$.rootTeamRunId\')';
    const rows = await this.client.$queryRawUnsafe<RawEvidence[]>(
      `SELECT "id", "usage_event_id", "run_id", ${rootExpression} AS "root_team_run_id", "execution_address_json" FROM "token_usage_ledger_events" ORDER BY "id" ASC`,
    );
    return normalizedRows(rows);
  }

  async migrateToExactRunIdentity(): Promise<{ migratedRows: number; alreadyCurrent: boolean }> {
    return this.client.$transaction(async (transaction) => {
      let columns = await this.columns(transaction);
      if (!columns.has("execution_address_json")) {
        return { migratedRows: 0, alreadyCurrent: true };
      }
      const rootExpression = columns.has("root_team_run_id")
        ? '"root_team_run_id"'
        : 'json_extract("execution_address_json", \'$.rootTeamRunId\')';
      await transaction.$executeRawUnsafe(
        `CREATE TABLE IF NOT EXISTS "${EVIDENCE_TABLE}" AS ` +
        `SELECT "id", "usage_event_id", "run_id", ${rootExpression} AS "root_team_run_id", ` +
        `"execution_address_json" FROM "token_usage_ledger_events"`,
      );
      if (!columns.has("root_team_run_id")) {
        await transaction.$executeRawUnsafe(
          'ALTER TABLE "token_usage_ledger_events" ADD COLUMN "root_team_run_id" TEXT',
        );
      }
      const invalid = await transaction.$queryRawUnsafe<Array<{ id: number }>>(
        'SELECT "id" FROM "token_usage_ledger_events" WHERE "execution_address_json" IS NOT NULL ' +
        'AND (json_valid("execution_address_json") = 0 OR json_extract("execution_address_json", \'$.rootTeamRunId\') IS NULL) LIMIT 1',
      );
      if (invalid.length) throw new Error(`Token row '${invalid[0]!.id}' has invalid Team execution identity evidence.`);
      const migratedRows = await transaction.$executeRawUnsafe(
        'UPDATE "token_usage_ledger_events" SET "root_team_run_id"=' +
        'json_extract("execution_address_json", \'$.rootTeamRunId\') ' +
        'WHERE "execution_address_json" IS NOT NULL',
      );
      await transaction.$executeRawUnsafe(
        'DROP INDEX IF EXISTS "token_usage_ledger_events_execution_root_observed_at_idx"',
      );
      columns = await this.columns(transaction);
      for (const column of LEGACY_COLUMNS) {
        if (columns.has(column)) {
          await transaction.$executeRawUnsafe(
            `ALTER TABLE "token_usage_ledger_events" DROP COLUMN "${column}"`,
          );
        }
      }
      await transaction.$executeRawUnsafe(
        `CREATE INDEX IF NOT EXISTS "${TARGET_ROOT_INDEX}" ON "token_usage_ledger_events" ("root_team_run_id", "observed_at")`,
      );
      return { migratedRows, alreadyCurrent: false };
    }, { maxWait: 60_000, timeout: 30 * 60_000 });
  }

  async disconnect(): Promise<void> {
    if (this.ownsClient && this.prisma) await this.prisma.$disconnect();
  }

  private async columns(client: Pick<PrismaClient, "$queryRaw">): Promise<Set<string>> {
    const rows = await client.$queryRaw<ColumnRow[]>`
      PRAGMA table_info("token_usage_ledger_events")`;
    return new Set(rows.map((row) => row.name));
  }
}
