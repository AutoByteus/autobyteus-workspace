import type { PrismaClient } from "@prisma/client";
import { createConfiguredPrismaClient } from "../../config/prisma-client-factory.js";
import { createAgentTeamAddress } from "../../agent-collaboration/domain/agent-team-address.js";
import { createTeamExecutionAddress, type TeamExecutionAddress } from "../../agent-team-execution/domain/team-execution-address.js";
import { normalizeTokenUsageExecutionAddress } from "../../token-usage/domain/execution-address.js";
import type { AppDataMigrationDefinition, AppDataMigrationExecutionResult, AppDataMigrationItemDetail, AppDataMigrationSummary } from "../domain/app-data-migration-types.js";

const MIGRATION_ID = "20260703_token_usage_execution_address_backfill";
export type TokenUsageExecutionAddressBackfillCategoryCounts = {
  directMemberBackfills: number; taskTeamCorrections: number; taskAgentBackfills: number;
  alreadyAddressedRows: number; standaloneSkips: number; insufficientDataSkips: number; failures: number;
};
export type RawTokenUsageLedgerBackfillRow = {
  id: number; usage_event_id: string; run_id: string; root_team_run_id: string | null;
  execution_address_json: string | null; member_route_key: string | null;
  task_agent_run_id: string | null; task_id: string | null;
};
export interface TokenUsageExecutionAddressBackfillDatabase {
  listTokenUsageLedgerRows(): Promise<RawTokenUsageLedgerBackfillRow[]>;
  updateTokenUsageLedgerRow(input: { id: number; rootTeamRunId: string; executionAddressJson: string }): Promise<void>;
  disconnect?(): Promise<void>;
}
const text = (value: unknown): string | null => typeof value === "string" && value.trim() ? value.trim() : null;
const asRecord = (value: unknown): Record<string, unknown> | null => value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : null;
const rooted = (value: string) => createAgentTeamAddress(value.replace(/^\//, "").split("/").map((item) => item.trim()).filter(Boolean));

const legacyAddress = (value: unknown, row: RawTokenUsageLedgerBackfillRow): TeamExecutionAddress | null => {
  const current = normalizeTokenUsageExecutionAddress(value);
  if (current) return current;
  const record = asRecord(value);
  const segments = Array.isArray(record?.segments) ? record!.segments : [];
  let member = text(row.member_route_key);
  const taskTeamRunIds: string[] = [];
  let taskAgentRunId = text(row.task_agent_run_id);
  for (const raw of segments) {
    const segment = asRecord(raw);
    if (segment?.kind === "member") {
      member = text(segment.memberRouteKey ?? segment.member_route_key) ??
        (Array.isArray(segment.memberPath ?? segment.member_path)
          ? ((segment.memberPath ?? segment.member_path) as unknown[]).map(text).filter(Boolean).join("/")
          : member);
    }
    if (segment?.kind === "task_team") {
      const id = text(segment.taskTeamRunId ?? segment.task_team_run_id);
      if (id) taskTeamRunIds.push(id);
    }
    if (segment?.kind === "task_agent") taskAgentRunId = text(segment.taskAgentRunId ?? segment.task_agent_run_id) ?? taskAgentRunId;
  }
  const rootTeamRunId = text(row.root_team_run_id);
  if (!rootTeamRunId || !member) return null;
  return createTeamExecutionAddress({ rootTeamRunId, taskTeamRunIds, memberAddress: rooted(member), taskAgentRunId });
};
const parseStored = (row: RawTokenUsageLedgerBackfillRow): TeamExecutionAddress | null => {
  if (!row.execution_address_json) return legacyAddress(null, row);
  try { return legacyAddress(JSON.parse(row.execution_address_json) as unknown, row); } catch { return null; }
};
const buildSummary = (details: AppDataMigrationItemDetail[]): AppDataMigrationSummary => ({
  scannedCount: details.length, migratedCount: details.filter((item) => item.status === "MIGRATED").length,
  skippedCount: details.filter((item) => item.status === "SKIPPED").length,
  failedCount: details.filter((item) => item.status === "FAILED").length, details,
});

export class PrismaTokenUsageExecutionAddressBackfillDatabase implements TokenUsageExecutionAddressBackfillDatabase {
  private prisma: PrismaClient | null;
  private readonly owns: boolean;
  constructor(prisma?: PrismaClient) { this.prisma = prisma ?? null; this.owns = !prisma; }
  private get client(): PrismaClient { return this.prisma ??= createConfiguredPrismaClient(); }
  listTokenUsageLedgerRows(): Promise<RawTokenUsageLedgerBackfillRow[]> {
    return this.client.$queryRaw<RawTokenUsageLedgerBackfillRow[]>`
      SELECT "id", "usage_event_id", "run_id", "root_team_run_id", "execution_address_json",
             "member_route_key", "task_agent_run_id", "task_id"
      FROM "token_usage_ledger_events" ORDER BY "id" ASC`;
  }
  async updateTokenUsageLedgerRow(input: { id: number; rootTeamRunId: string; executionAddressJson: string }): Promise<void> {
    await this.client.$executeRaw`UPDATE "token_usage_ledger_events"
      SET "root_team_run_id"=${input.rootTeamRunId}, "execution_address_json"=${input.executionAddressJson}
      WHERE "id"=${input.id}`;
  }
  async disconnect(): Promise<void> { if (this.owns && this.prisma) await this.prisma.$disconnect(); }
}

export class TokenUsageExecutionAddressBackfillMigration implements AppDataMigrationDefinition {
  readonly id = MIGRATION_ID;
  readonly displayName = "Token usage canonical execution address migration";
  readonly description = "Converts every Team token row to exact TeamExecutionAddress; unresolved Team rows block startup.";
  readonly requiredOnStartup = true;
  private database: TokenUsageExecutionAddressBackfillDatabase | null;
  constructor(_memoryDir: string, database?: TokenUsageExecutionAddressBackfillDatabase) { this.database = database ?? null; }
  private get db() { return this.database ??= new PrismaTokenUsageExecutionAddressBackfillDatabase(); }
  async execute(): Promise<AppDataMigrationExecutionResult> {
    const details: AppDataMigrationItemDetail[] = [];
    try {
      for (const row of await this.db.listTokenUsageLedgerRows()) {
        if (!text(row.root_team_run_id)) {
          details.push({ itemId: row.usage_event_id, status: "SKIPPED", message: "Standalone Agent token row." });
          continue;
        }
        const address = parseStored(row);
        if (!address || address.rootTeamRunId !== text(row.root_team_run_id)) {
          details.push({ itemId: row.usage_event_id, status: "FAILED", message: "Team token row lacks a reconstructable canonical execution address." });
          continue;
        }
        const current = row.execution_address_json && normalizeTokenUsageExecutionAddress(JSON.parse(row.execution_address_json) as unknown);
        if (current) {
          details.push({ itemId: row.usage_event_id, status: "SKIPPED", message: "Already canonical." });
          continue;
        }
        await this.db.updateTokenUsageLedgerRow({ id: row.id, rootTeamRunId: address.rootTeamRunId, executionAddressJson: JSON.stringify(address) });
        details.push({ itemId: row.usage_event_id, status: "MIGRATED", message: "Canonical execution address persisted." });
      }
    } finally { await this.db.disconnect?.(); }
    const summary = buildSummary(details);
    return { status: summary.failedCount ? "FAILED" : "SUCCEEDED", summary,
      errorMessage: summary.failedCount ? `${summary.failedCount} Team token row(s) require manual identity repair.` : null };
  }
}
export const TOKEN_USAGE_EXECUTION_ADDRESS_BACKFILL_MIGRATION_ID = MIGRATION_ID;
