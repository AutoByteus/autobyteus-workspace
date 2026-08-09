import type { PrismaClient } from "@prisma/client";
import { serializeTeamExecutionAddress } from "../../agent-team-execution/domain/team-execution-address.js";
import { createConfiguredPrismaClient } from "../../config/prisma-client-factory.js";
import type {
  AppDataMigrationDefinition,
  AppDataMigrationExecutionResult,
  AppDataMigrationItemDetail,
  AppDataMigrationSummary,
} from "../domain/app-data-migration-types.js";
import {
  planTokenUsageExecutionAddressBackfillRow,
  type RawTokenUsageLedgerBackfillRow,
} from "./token-usage-execution-address-backfill-planner.js";
import {
  buildTokenUsageTaskTeamRunIndex,
  type TokenUsageTaskTeamRunIndex,
} from "./token-usage-task-team-run-index.js";

const MIGRATION_ID = "20260703_token_usage_execution_address_backfill";

export type TokenUsageExecutionAddressBackfillCategoryCounts = {
  directMemberBackfills: number;
  taskTeamCorrections: number;
  taskAgentBackfills: number;
  alreadyAddressedRows: number;
  standaloneSkips: number;
  insufficientDataSkips: number;
  failures: number;
};

export interface TokenUsageExecutionAddressBackfillDatabase {
  listTokenUsageLedgerRows(): Promise<RawTokenUsageLedgerBackfillRow[]>;
  updateTokenUsageLedgerRow(input: {
    id: number;
    rootTeamRunId: string;
    executionAddressJson: string;
  }): Promise<void>;
  disconnect?(): Promise<void>;
}

export type { RawTokenUsageLedgerBackfillRow } from "./token-usage-execution-address-backfill-planner.js";

const errorMessage = (error: unknown): string =>
  error instanceof Error ? error.message : String(error);

const buildSummary = (details: AppDataMigrationItemDetail[]): AppDataMigrationSummary => ({
  scannedCount: details.length,
  migratedCount: details.filter((item) => item.status === "MIGRATED").length,
  skippedCount: details.filter((item) => item.status === "SKIPPED").length,
  failedCount: details.filter((item) => item.status === "FAILED").length,
  details,
});

export class PrismaTokenUsageExecutionAddressBackfillDatabase implements TokenUsageExecutionAddressBackfillDatabase {
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

  listTokenUsageLedgerRows(): Promise<RawTokenUsageLedgerBackfillRow[]> {
    return this.client.$queryRaw<RawTokenUsageLedgerBackfillRow[]>`
      SELECT "id", "usage_event_id", "run_id", "root_team_run_id", "execution_address_json",
             "member_route_key", "task_agent_run_id", "task_id"
      FROM "token_usage_ledger_events" ORDER BY "id" ASC`;
  }

  async updateTokenUsageLedgerRow(input: {
    id: number;
    rootTeamRunId: string;
    executionAddressJson: string;
  }): Promise<void> {
    await this.client.$executeRaw`UPDATE "token_usage_ledger_events"
      SET "root_team_run_id"=${input.rootTeamRunId}, "execution_address_json"=${input.executionAddressJson}
      WHERE "id"=${input.id}`;
  }

  async disconnect(): Promise<void> {
    if (this.ownsClient && this.prisma) await this.prisma.$disconnect();
  }
}

export class TokenUsageExecutionAddressBackfillMigration implements AppDataMigrationDefinition {
  readonly id = MIGRATION_ID;
  readonly displayName = "Token usage canonical execution address migration";
  readonly description = "Converts every Team token row to exact TeamExecutionAddress; unresolved Team rows block startup.";
  readonly requiredOnStartup = true;
  private database: TokenUsageExecutionAddressBackfillDatabase | null;

  constructor(
    private readonly memoryDir: string,
    database?: TokenUsageExecutionAddressBackfillDatabase,
  ) {
    this.database = database ?? null;
  }

  private get db(): TokenUsageExecutionAddressBackfillDatabase {
    return this.database ??= new PrismaTokenUsageExecutionAddressBackfillDatabase();
  }

  async execute(): Promise<AppDataMigrationExecutionResult> {
    try {
      const rows = await this.db.listTokenUsageLedgerRows();
      let index: TokenUsageTaskTeamRunIndex;
      try {
        index = await buildTokenUsageTaskTeamRunIndex(this.memoryDir);
      } catch (error) {
        const detail: AppDataMigrationItemDetail = {
          itemId: "task-records:index",
          status: "FAILED",
          message: `Cannot discover strict current task records: ${errorMessage(error)}`,
        };
        return { status: "FAILED", summary: buildSummary([detail]), errorMessage: detail.message };
      }
      if (index.issues.length > 0) {
        const details = index.issues.map((issue): AppDataMigrationItemDetail => ({
          ...issue,
          status: "FAILED",
        }));
        return {
          status: "FAILED",
          summary: buildSummary(details),
          errorMessage: `${details.length} strict task TeamRun mapping issue(s) block token attribution migration.`,
        };
      }
      const plans = rows.map((row) => planTokenUsageExecutionAddressBackfillRow(row, index));
      if (plans.some((plan) => plan.kind === "fail")) {
        const summary = buildSummary(plans.map((plan) => plan.detail));
        return {
          status: "FAILED",
          summary,
          errorMessage: `${summary.failedCount} Team token row(s) require manual identity repair.`,
        };
      }
      const details: AppDataMigrationItemDetail[] = [];
      for (const [index, plan] of plans.entries()) {
        if (plan.kind === "migrate") {
          try {
            await this.db.updateTokenUsageLedgerRow({
              id: rows[index]!.id,
              rootTeamRunId: plan.address.rootTeamRunId,
              executionAddressJson: serializeTeamExecutionAddress(plan.address),
            });
          } catch (error) {
            details.push({
              ...plan.detail,
              status: "FAILED",
              message: `Failed persisting canonical execution address: ${errorMessage(error)}`,
            });
            continue;
          }
        }
        details.push(plan.detail);
      }
      const summary = buildSummary(details);
      return {
        status: summary.failedCount ? "FAILED" : "SUCCEEDED",
        summary,
        errorMessage: summary.failedCount
          ? `${summary.failedCount} Team token row(s) could not be persisted.`
          : null,
      };
    } finally {
      await this.db.disconnect?.();
    }
  }
}

export const TOKEN_USAGE_EXECUTION_ADDRESS_BACKFILL_MIGRATION_ID = MIGRATION_ID;
