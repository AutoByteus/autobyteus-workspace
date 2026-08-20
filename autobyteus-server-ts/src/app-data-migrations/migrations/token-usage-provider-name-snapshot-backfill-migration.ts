import { getLlmProviderDisplayName, isBuiltInLlmProviderId } from "autobyteus-ts/llm/provider-display-names.js";
import { LLMProvider } from "autobyteus-ts/llm/providers.js";
import type { PrismaClient } from "@prisma/client";
import { createConfiguredPrismaClient } from "../../config/prisma-client-factory.js";
import type {
  AppDataMigrationDefinition,
  AppDataMigrationExecutionResult,
  AppDataMigrationItemDetail,
} from "../domain/app-data-migration-types.js";
import { parseTokenUsageCompositeModelValue } from "../../token-usage/projections/token-usage-model-display-projection.js";
import { CustomProviderMigrationNameSnapshotReader } from "./custom-provider-migration-name-snapshot.js";
import {
  MAX_TOKEN_USAGE_MIGRATION_EXAMPLE_DETAILS,
  TOKEN_USAGE_SOURCE_SHAPING_BATCH_SIZE,
} from "./token-usage-source-shaping-constants.js";

export const TOKEN_USAGE_PROVIDER_NAME_SNAPSHOT_BACKFILL_MIGRATION_ID =
  "20260730_token_usage_provider_name_snapshot_backfill";

export type RawTokenUsageProviderNameBackfillRow = {
  id: number;
  usage_event_id: string;
  runtime_kind: string;
  model_provider: string | null;
  provider_name: string | null;
  model_identifier: string | null;
};

type ProviderNameUpdate = {
  id: number;
  expectedProviderName: string | null;
  nextProviderName: string;
};

export interface TokenUsageProviderNameSnapshotBackfillDatabase {
  listCandidateBatch(afterId: number, limit: number): Promise<RawTokenUsageProviderNameBackfillRow[]>;
  countRows(): Promise<bigint>;
  applyBatch(updates: readonly ProviderNameUpdate[]): Promise<number[]>;
}

type SkipReason = "SKIPPED_PROVIDER_NAME_UNRECOVERABLE" | "SKIPPED_SOURCE_CHANGED";
type Classification = { kind: "MIGRATE"; providerName: string } | { kind: "SKIP"; reason: SkipReason };
const compact = (value: string | null | undefined): string | null => value?.trim() || null;

const resolveProviderName = (
  row: RawTokenUsageProviderNameBackfillRow,
  customProviderNames: ReadonlyMap<string, string>,
): string | null => {
  const provider = compact(row.model_provider)?.toUpperCase();
  if (!provider) return null;
  if (isBuiltInLlmProviderId(provider)) return compact(getLlmProviderDisplayName(provider));
  if (provider !== LLMProvider.OPENAI_COMPATIBLE) return null;
  const composite = parseTokenUsageCompositeModelValue(row.model_identifier);
  return composite ? compact(customProviderNames.get(composite.providerId)) : null;
};

export const classifyTokenUsageProviderNameSnapshotRow = (
  row: RawTokenUsageProviderNameBackfillRow,
  customProviderNames: ReadonlyMap<string, string>,
): Classification => {
  const providerName = resolveProviderName(row, customProviderNames);
  return providerName
    ? { kind: "MIGRATE", providerName }
    : { kind: "SKIP", reason: "SKIPPED_PROVIDER_NAME_UNRECOVERABLE" };
};

export class PrismaTokenUsageProviderNameSnapshotBackfillDatabase
implements TokenUsageProviderNameSnapshotBackfillDatabase {
  private prisma: PrismaClient | null;
  constructor(prisma?: PrismaClient) { this.prisma = prisma ?? null; }
  private get client(): PrismaClient { return this.prisma ??= createConfiguredPrismaClient(); }

  listCandidateBatch(afterId: number, limit: number): Promise<RawTokenUsageProviderNameBackfillRow[]> {
    const boundedLimit = Math.min(Math.max(1, limit), TOKEN_USAGE_SOURCE_SHAPING_BATCH_SIZE);
    return this.client.$queryRaw<RawTokenUsageProviderNameBackfillRow[]>`
      SELECT "id", "usage_event_id", "runtime_kind", "model_provider", "provider_name", "model_identifier"
      FROM "token_usage_ledger_events"
      WHERE "id" > ${afterId}
        AND ("provider_name" IS NULL OR trim("provider_name") = '')
        AND lower(trim("runtime_kind")) = 'autobyteus'
      ORDER BY "id" ASC
      LIMIT ${boundedLimit}
    `;
  }

  async countRows(): Promise<bigint> {
    const rows = await this.client.$queryRaw<Array<{ count: bigint }>>`
      SELECT COUNT(*) AS "count" FROM "token_usage_ledger_events"
    `;
    return rows[0]?.count ?? 0n;
  }

  applyBatch(updates: readonly ProviderNameUpdate[]): Promise<number[]> {
    if (updates.length > TOKEN_USAGE_SOURCE_SHAPING_BATCH_SIZE) throw new Error("Provider-name update batch exceeded 250 rows.");
    return this.client.$transaction((transaction) => Promise.all(updates.map((input) =>
      transaction.$executeRaw`
        UPDATE "token_usage_ledger_events"
        SET "provider_name"=${input.nextProviderName}
        WHERE "id"=${input.id}
          AND (("provider_name" IS NULL AND ${input.expectedProviderName} IS NULL)
            OR ("provider_name"=${input.expectedProviderName} AND trim("provider_name")=''))
      `)), { maxWait: 30_000, timeout: 120_000 }) as Promise<number[]>;
  }
}

const item = (id: string, status: "SKIPPED" | "FAILED", message: string): AppDataMigrationItemDetail =>
  ({ itemId: id, status, message });

export class TokenUsageProviderNameSnapshotBackfillMigration implements AppDataMigrationDefinition {
  readonly id = TOKEN_USAGE_PROVIDER_NAME_SNAPSHOT_BACKFILL_MIGRATION_ID;
  readonly displayName = "Token usage provider-name snapshot backfill";
  readonly description = "Recovers exact provider display names in bounded legacy candidate batches.";
  readonly requiredOnStartup = true;

  constructor(
    private readonly database: TokenUsageProviderNameSnapshotBackfillDatabase =
      new PrismaTokenUsageProviderNameSnapshotBackfillDatabase(),
    private readonly providerNameReader: Pick<CustomProviderMigrationNameSnapshotReader, "read"> =
      new CustomProviderMigrationNameSnapshotReader(),
  ) {}

  async execute(): Promise<AppDataMigrationExecutionResult> {
    const reasons = new Map<SkipReason, number>();
    const details: AppDataMigrationItemDetail[] = [];
    let scannedCount = 0;
    let migratedCount = 0;
    let afterId = 0;
    const addReason = (row: RawTokenUsageProviderNameBackfillRow, reason: SkipReason): void => {
      reasons.set(reason, (reasons.get(reason) ?? 0) + 1);
      if (details.length < MAX_TOKEN_USAGE_MIGRATION_EXAMPLE_DETAILS - 1) {
        details.push(item(row.usage_event_id || `token-usage-row:${row.id}`, "SKIPPED", `reason=${reason}; row=${row.id}`));
      }
    };

    try {
      const providerNames = new Map((await this.providerNameReader.read()).map(({ id, name }) => [id, name] as const));
      const beforeCount = await this.database.countRows();
      while (true) {
        const rows = await this.database.listCandidateBatch(afterId, TOKEN_USAGE_SOURCE_SHAPING_BATCH_SIZE);
        if (rows.length > TOKEN_USAGE_SOURCE_SHAPING_BATCH_SIZE) throw new Error("Provider-name candidate batch exceeded 250 rows.");
        if (rows.length === 0) break;
        afterId = rows.at(-1)!.id;
        scannedCount += rows.length;
        const pending = rows.flatMap((row) => {
          const classification = classifyTokenUsageProviderNameSnapshotRow(row, providerNames);
          if (classification.kind === "SKIP") { addReason(row, classification.reason); return []; }
          return [{ row, update: { id: row.id, expectedProviderName: row.provider_name, nextProviderName: classification.providerName } }];
        });
        const affected = await this.database.applyBatch(pending.map(({ update }) => update));
        if (affected.length !== pending.length) throw new Error("Provider-name batch result count did not match input.");
        affected.forEach((count, index) => {
          if (count === 1) migratedCount += 1;
          else if (count === 0) addReason(pending[index]!.row, "SKIPPED_SOURCE_CHANGED");
          else throw new Error(`Provider-name CAS for row ${pending[index]!.row.id} affected ${count} rows.`);
        });
        if (rows.length < TOKEN_USAGE_SOURCE_SHAPING_BATCH_SIZE) break;
      }
      const afterCount = await this.database.countRows();
      if (afterCount !== beforeCount) throw new Error(`Token usage ledger row count changed: ${beforeCount} -> ${afterCount}.`);
      const skippedCount = [...reasons.values()].reduce((sum, value) => sum + value, 0);
      details.push(item("token-usage-provider-name:summary", "SKIPPED",
        `rows=${beforeCount}; migrated=${migratedCount}; reasons=${JSON.stringify(Object.fromEntries(reasons))}`));
      return {
        status: skippedCount > 0 ? "SUCCEEDED_WITH_WARNINGS" : "SUCCEEDED",
        summary: { scannedCount, migratedCount, skippedCount, failedCount: 0, details },
        errorMessage: null,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (details.length < MAX_TOKEN_USAGE_MIGRATION_EXAMPLE_DETAILS) {
        details.push(item("token-usage-provider-name:failure", "FAILED", message));
      }
      return {
        status: "FAILED",
        summary: {
          scannedCount,
          migratedCount,
          skippedCount: [...reasons.values()].reduce((sum, value) => sum + value, 0),
          failedCount: 1,
          details,
        },
        errorMessage: message,
      };
    }
  }
}
