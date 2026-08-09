import type { PrismaClient } from "@prisma/client";
import { createConfiguredPrismaClient } from "../../config/prisma-client-factory.js";
import type {
  AppDataMigrationDefinition,
  AppDataMigrationExecutionResult,
  AppDataMigrationItemDetail,
  AppDataMigrationStatus,
  AppDataMigrationSummary,
} from "../domain/app-data-migration-types.js";
import { TEAM_CANONICAL_IDENTITY_MIGRATION_ID } from "./team-canonical-identity-migration.js";

export const TOKEN_USAGE_LEGACY_PATH_COLUMNS_DROP_MIGRATION_ID =
  "20260703_drop_token_usage_legacy_path_columns";

const TOKEN_USAGE_LEDGER_TABLE = "token_usage_ledger_events";
const LEGACY_PATH_COLUMNS = ["team_run_path_json", "member_path_json"] as const;
const CANONICAL_HIERARCHY_COLUMNS = ["root_team_run_id", "execution_address_json"] as const;

type LegacyPathColumn = (typeof LEGACY_PATH_COLUMNS)[number];

type TableColumn = {
  name: string;
};

type CountRow = {
  count: number | bigint;
};

type MigrationStatusRow = {
  status: string | null;
};

export interface TokenUsageLegacyPathColumnsDropDatabase {
  getAppDataMigrationStatus(migrationId: string): Promise<AppDataMigrationStatus | null>;
  listTokenUsageLedgerColumns(): Promise<string[]>;
  countTokenUsageLedgerRows(): Promise<number>;
  dropTokenUsageLedgerColumn(column: LegacyPathColumn): Promise<void>;
  disconnect?(): Promise<void>;
}

type DropOutcome = {
  droppedColumns: LegacyPathColumn[];
  skippedColumns: LegacyPathColumn[];
  initialColumns: string[];
  finalColumns: string[];
  beforeRowCount: number;
  afterRowCount: number;
  prerequisiteStatus: AppDataMigrationStatus;
};

const detail = (
  itemId: string,
  status: AppDataMigrationItemDetail["status"],
  message: string,
): AppDataMigrationItemDetail => ({ itemId, status, message });

const failureSummary = (message: string, details: AppDataMigrationItemDetail[]): AppDataMigrationSummary => ({
  scannedCount: 0,
  migratedCount: 0,
  skippedCount: 0,
  failedCount: 1,
  details: [...details, detail("token-usage-legacy-path-columns:failure", "FAILED", message)],
});

const successSummary = (outcome: DropOutcome): AppDataMigrationSummary => ({
  scannedCount: LEGACY_PATH_COLUMNS.length,
  migratedCount: outcome.droppedColumns.length,
  skippedCount: outcome.skippedColumns.length,
  failedCount: 0,
  details: [
    detail(
      "token-usage-legacy-path-columns:prerequisite",
      "SKIPPED",
      `Canonical identity prerequisite status: ${outcome.prerequisiteStatus}.`,
    ),
    ...outcome.droppedColumns.map((column) =>
      detail(
        `token-usage-legacy-path-columns:${column}`,
        "MIGRATED" as const,
        `Dropped obsolete token usage ledger column '${column}'.`,
      )),
    ...outcome.skippedColumns.map((column) =>
      detail(
        `token-usage-legacy-path-columns:${column}`,
        "SKIPPED" as const,
        `Obsolete token usage ledger column '${column}' was already absent.`,
      )),
    detail(
      "token-usage-legacy-path-columns:data-preservation",
      "SKIPPED",
      `Token usage ledger row count preserved: ${outcome.beforeRowCount} -> ${outcome.afterRowCount}.`,
    ),
    detail(
      "token-usage-legacy-path-columns:final-schema",
      "MIGRATED",
      `Final schema has ${outcome.finalColumns.length} columns and excludes ${LEGACY_PATH_COLUMNS.join(", ")}.`,
    ),
  ],
});

const assertFinalSchema = (columns: readonly string[]): void => {
  const legacyStillPresent = LEGACY_PATH_COLUMNS.filter((column) => columns.includes(column));
  if (legacyStillPresent.length > 0) {
    throw new Error(`Legacy token usage path columns still present: ${legacyStillPresent.join(", ")}.`);
  }
  const missingCanonical = CANONICAL_HIERARCHY_COLUMNS.filter((column) => !columns.includes(column));
  if (missingCanonical.length > 0) {
    throw new Error(`Canonical token usage hierarchy columns missing: ${missingCanonical.join(", ")}.`);
  }
};

export class PrismaTokenUsageLegacyPathColumnsDropDatabase implements TokenUsageLegacyPathColumnsDropDatabase {
  private prisma: PrismaClient | null;
  private readonly ownsClient: boolean;

  constructor(prisma?: PrismaClient) {
    this.prisma = prisma ?? null;
    this.ownsClient = prisma === undefined;
  }

  private get client(): PrismaClient {
    this.prisma ??= createConfiguredPrismaClient();
    return this.prisma;
  }

  async getAppDataMigrationStatus(migrationId: string): Promise<AppDataMigrationStatus | null> {
    const rows = await this.client.$queryRaw<MigrationStatusRow[]>`
      SELECT "status"
      FROM "app_data_migration_records"
      WHERE "migration_id" = ${migrationId}
      LIMIT 1
    `;
    return (rows[0]?.status as AppDataMigrationStatus | undefined) ?? null;
  }

  async listTokenUsageLedgerColumns(): Promise<string[]> {
    const rows = await this.client.$queryRawUnsafe<TableColumn[]>(
      `PRAGMA table_info("${TOKEN_USAGE_LEDGER_TABLE}")`,
    );
    return rows.map((row) => row.name).filter((name) => typeof name === "string" && name.trim().length > 0);
  }

  async countTokenUsageLedgerRows(): Promise<number> {
    const rows = await this.client.$queryRawUnsafe<CountRow[]>(
      `SELECT COUNT(*) AS count FROM "${TOKEN_USAGE_LEDGER_TABLE}"`,
    );
    return Number(rows[0]?.count ?? 0);
  }

  async dropTokenUsageLedgerColumn(column: LegacyPathColumn): Promise<void> {
    await this.client.$executeRawUnsafe(
      `ALTER TABLE "${TOKEN_USAGE_LEDGER_TABLE}" DROP COLUMN "${column}"`,
    );
  }

  async disconnect(): Promise<void> {
    if (this.ownsClient && this.prisma) await this.prisma.$disconnect();
  }
}

export class TokenUsageLegacyPathColumnsDropMigration implements AppDataMigrationDefinition {
  readonly id = TOKEN_USAGE_LEGACY_PATH_COLUMNS_DROP_MIGRATION_ID;
  readonly displayName = "Token usage legacy path columns drop";
  readonly description = "Physically removes obsolete token usage ledger path columns after exact canonical identity success.";
  readonly requiredOnStartup = true;
  private database: TokenUsageLegacyPathColumnsDropDatabase | null;

  constructor(database?: TokenUsageLegacyPathColumnsDropDatabase) {
    this.database = database ?? null;
  }

  private getDatabase(): TokenUsageLegacyPathColumnsDropDatabase {
    this.database ??= new PrismaTokenUsageLegacyPathColumnsDropDatabase();
    return this.database;
  }

  async execute(): Promise<AppDataMigrationExecutionResult> {
    const database = this.getDatabase();
    const prerequisiteStatus = await database.getAppDataMigrationStatus(
      TEAM_CANONICAL_IDENTITY_MIGRATION_ID,
    );
    const prerequisiteDetails = [
      detail(
        "token-usage-legacy-path-columns:prerequisite",
        prerequisiteStatus === "SUCCEEDED" ? "SKIPPED" : "FAILED",
        `Canonical identity prerequisite status: ${prerequisiteStatus ?? "NOT_RUN"}.`,
      ),
    ];

    if (prerequisiteStatus !== "SUCCEEDED") {
      const message = "Token usage legacy path column cleanup requires exact-success canonical identity migration.";
      return {
        status: "FAILED",
        summary: failureSummary(message, prerequisiteDetails),
        errorMessage: message,
      };
    }

    const terminalPrerequisiteStatus = prerequisiteStatus as AppDataMigrationStatus;
    try {
      const initialColumns = await database.listTokenUsageLedgerColumns();
      const beforeRowCount = await database.countTokenUsageLedgerRows();
      const droppedColumns: LegacyPathColumn[] = [];
      const skippedColumns: LegacyPathColumn[] = [];
      let currentColumns = initialColumns;

      for (const column of LEGACY_PATH_COLUMNS) {
        if (!currentColumns.includes(column)) {
          skippedColumns.push(column);
          continue;
        }
        await database.dropTokenUsageLedgerColumn(column);
        droppedColumns.push(column);
        currentColumns = await database.listTokenUsageLedgerColumns();
      }

      const finalColumns = await database.listTokenUsageLedgerColumns();
      assertFinalSchema(finalColumns);
      const afterRowCount = await database.countTokenUsageLedgerRows();
      if (afterRowCount !== beforeRowCount) {
        throw new Error(`Token usage ledger row count changed during schema cleanup: ${beforeRowCount} -> ${afterRowCount}.`);
      }

      const summary = successSummary({
        droppedColumns,
        skippedColumns,
        initialColumns,
        finalColumns,
        beforeRowCount,
        afterRowCount,
        prerequisiteStatus: terminalPrerequisiteStatus,
      });
      return { status: "SUCCEEDED", summary, errorMessage: null };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return {
        status: "FAILED",
        summary: failureSummary(message, prerequisiteDetails),
        errorMessage: message,
      };
    }
  }
}
