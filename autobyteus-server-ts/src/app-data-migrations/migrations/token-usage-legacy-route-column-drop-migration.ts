import type { PrismaClient } from "@prisma/client";
import { createConfiguredPrismaClient } from "../../config/prisma-client-factory.js";
import type { AppDataMigrationDefinition, AppDataMigrationExecutionResult, AppDataMigrationStatus } from "../domain/app-data-migration-types.js";
import { TEAM_CANONICAL_IDENTITY_MIGRATION_ID } from "./team-canonical-identity-migration.js";

const MIGRATION_ID = "20260801_drop_token_usage_legacy_route_column";
const TABLE = "token_usage_ledger_events";
const COLUMN = "member_route_key";

export class TokenUsageLegacyRouteColumnDropMigration implements AppDataMigrationDefinition {
  readonly id = MIGRATION_ID;
  readonly displayName = "Token usage legacy route identity removal";
  readonly description = "Drops member_route_key only after exact canonical identity migration has succeeded.";
  readonly requiredOnStartup = true;
  constructor(private readonly suppliedClient?: PrismaClient) {}

  async execute(): Promise<AppDataMigrationExecutionResult> {
    const client = this.suppliedClient ?? createConfiguredPrismaClient();
    try {
      const statusRows = await client.$queryRawUnsafe<Array<{ status: AppDataMigrationStatus }>>(
        `SELECT status FROM app_data_migration_records WHERE migration_id = ? LIMIT 1`,
        TEAM_CANONICAL_IDENTITY_MIGRATION_ID,
      );
      const prerequisite = statusRows[0]?.status ?? "NOT_RUN";
      if (prerequisite !== "SUCCEEDED") {
        const message = `Canonical identity prerequisite status is ${prerequisite}.`;
        return { status: "FAILED", summary: { scannedCount: 1, migratedCount: 0, skippedCount: 0, failedCount: 1, details: [{ itemId: COLUMN, status: "FAILED", message }] }, errorMessage: message };
      }
      const columns = await client.$queryRawUnsafe<Array<{ name: string }>>(`PRAGMA table_info("${TABLE}")`);
      if (!columns.some((column) => column.name === COLUMN)) {
        return { status: "SUCCEEDED", summary: { scannedCount: 1, migratedCount: 0, skippedCount: 1, failedCount: 0, details: [{ itemId: COLUMN, status: "SKIPPED", message: "Legacy route column is already absent." }] }, errorMessage: null };
      }
      const beforeRows = await client.$queryRawUnsafe<Array<{ count: bigint }>>(`SELECT COUNT(*) AS count FROM "${TABLE}"`);
      await client.$executeRawUnsafe(`ALTER TABLE "${TABLE}" DROP COLUMN "${COLUMN}"`);
      const afterRows = await client.$queryRawUnsafe<Array<{ count: bigint }>>(`SELECT COUNT(*) AS count FROM "${TABLE}"`);
      if (Number(beforeRows[0]?.count ?? 0) !== Number(afterRows[0]?.count ?? 0)) throw new Error("Token usage row count changed during route-column removal.");
      return { status: "SUCCEEDED", summary: { scannedCount: 1, migratedCount: 1, skippedCount: 0, failedCount: 0, details: [{ itemId: COLUMN, status: "MIGRATED", message: "Dropped obsolete member_route_key after canonical backfill." }] }, errorMessage: null };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return { status: "FAILED", summary: { scannedCount: 1, migratedCount: 0, skippedCount: 0, failedCount: 1, details: [{ itemId: COLUMN, status: "FAILED", message }] }, errorMessage: message };
    } finally {
      if (!this.suppliedClient) await client.$disconnect();
    }
  }
}

export const TOKEN_USAGE_LEGACY_ROUTE_COLUMN_DROP_MIGRATION_ID = MIGRATION_ID;
