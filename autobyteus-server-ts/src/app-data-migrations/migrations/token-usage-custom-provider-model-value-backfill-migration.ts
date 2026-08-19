import type { PrismaClient } from "@prisma/client";
import { createConfiguredPrismaClient } from "../../config/prisma-client-factory.js";
import {
  parseTokenUsageCompositeModelValue,
  type TokenUsageCompositeModelValue,
} from "../../token-usage/projections/token-usage-model-display-projection.js";
import type {
  AppDataMigrationDefinition,
  AppDataMigrationExecutionResult,
  AppDataMigrationItemDetail,
} from "../domain/app-data-migration-types.js";
import {
  MAX_TOKEN_USAGE_MIGRATION_EXAMPLE_DETAILS,
  TOKEN_USAGE_SOURCE_SHAPING_BATCH_SIZE,
} from "./token-usage-source-shaping-constants.js";

export const TOKEN_USAGE_CUSTOM_PROVIDER_MODEL_VALUE_BACKFILL_MIGRATION_ID =
  "20260730_token_usage_custom_provider_model_value_backfill";

const COMPOSITE_MODEL_PREFIX = "openai-compatible:";

type Candidate = {
  id: number;
  usage_event_id: string;
  runtime_kind: string;
  model_provider: string | null;
  model_identifier: string | null;
  model_value: string | null;
};

type Update = { id: number; expectedModelValue: string; nextModelValue: string };

export interface TokenUsageCustomProviderModelValueBackfillDatabase {
  listCandidateBatch(afterId: number, limit: number): Promise<Candidate[]>;
  countRows(): Promise<bigint>;
  applyBatch(updates: readonly Update[]): Promise<number[]>;
}

type SkipReason =
  | "SKIPPED_INVALID_COMPOSITE_MODEL_VALUE"
  | "SKIPPED_RAW_IDENTITY_MISSING"
  | "SKIPPED_CONFLICTING_COMPOSITE_VALUES"
  | "SKIPPED_RAW_IDENTITY_NOT_COMPOSITE"
  | "SKIPPED_SOURCE_CHANGED";

type Classification =
  | { kind: "MIGRATE"; parsed: TokenUsageCompositeModelValue }
  | { kind: "SKIP"; reason: SkipReason };

const compact = (value: string | null | undefined): string | null => value?.trim() || null;

export const classifyTokenUsageCustomProviderModelValueRow = (
  row: Candidate,
): Classification => {
  const modelValue = compact(row.model_value);
  const modelIdentifier = compact(row.model_identifier);
  const valueComposite = parseTokenUsageCompositeModelValue(modelValue);
  if (!valueComposite) return { kind: "SKIP", reason: "SKIPPED_INVALID_COMPOSITE_MODEL_VALUE" };
  if (!modelIdentifier) return { kind: "SKIP", reason: "SKIPPED_RAW_IDENTITY_MISSING" };
  const identifierComposite = parseTokenUsageCompositeModelValue(modelIdentifier);
  if (!identifierComposite) return { kind: "SKIP", reason: "SKIPPED_RAW_IDENTITY_NOT_COMPOSITE" };
  if (identifierComposite.providerId !== valueComposite.providerId ||
      identifierComposite.modelName !== valueComposite.modelName) {
    return { kind: "SKIP", reason: "SKIPPED_CONFLICTING_COMPOSITE_VALUES" };
  }
  return { kind: "MIGRATE", parsed: valueComposite };
};

export class PrismaTokenUsageCustomProviderModelValueBackfillDatabase
implements TokenUsageCustomProviderModelValueBackfillDatabase {
  private prisma: PrismaClient | null;
  constructor(prisma?: PrismaClient) { this.prisma = prisma ?? null; }
  private get client(): PrismaClient { return this.prisma ??= createConfiguredPrismaClient(); }

  listCandidateBatch(afterId: number, limit: number): Promise<Candidate[]> {
    const boundedLimit = Math.min(Math.max(1, limit), TOKEN_USAGE_SOURCE_SHAPING_BATCH_SIZE);
    return this.client.$queryRaw<Candidate[]>`
      SELECT "id", "usage_event_id", "runtime_kind", "model_provider", "model_identifier", "model_value"
      FROM "token_usage_ledger_events"
      WHERE "id" > ${afterId}
        AND lower(trim("runtime_kind")) = 'autobyteus'
        AND upper(trim("model_provider")) = 'OPENAI_COMPATIBLE'
        AND "model_value" IS NOT NULL
        AND substr(trim("model_value"), 1, length(${COMPOSITE_MODEL_PREFIX})) = ${COMPOSITE_MODEL_PREFIX}
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

  applyBatch(updates: readonly Update[]): Promise<number[]> {
    if (updates.length > TOKEN_USAGE_SOURCE_SHAPING_BATCH_SIZE) {
      throw new Error("Model-value update batch exceeded 250 rows.");
    }
    return this.client.$transaction((transaction) => Promise.all(updates.map((input) =>
      transaction.$executeRaw`
        UPDATE "token_usage_ledger_events"
        SET "model_value"=${input.nextModelValue}
        WHERE "id"=${input.id} AND "model_value"=${input.expectedModelValue}
      `)), { maxWait: 30_000, timeout: 120_000 }) as Promise<number[]>;
  }
}

const item = (id: string, status: "SKIPPED" | "FAILED", message: string): AppDataMigrationItemDetail =>
  ({ itemId: id, status, message });

export class TokenUsageCustomProviderModelValueBackfillMigration implements AppDataMigrationDefinition {
  readonly id = TOKEN_USAGE_CUSTOM_PROVIDER_MODEL_VALUE_BACKFILL_MIGRATION_ID;
  readonly displayName = "Token usage custom-provider model value backfill";
  readonly description = "Normalizes bounded batches of validated legacy custom-provider model values.";
  readonly requiredOnStartup = true;

  constructor(
    private readonly database: TokenUsageCustomProviderModelValueBackfillDatabase =
      new PrismaTokenUsageCustomProviderModelValueBackfillDatabase(),
  ) {}

  async execute(): Promise<AppDataMigrationExecutionResult> {
    const reasons = new Map<SkipReason, number>();
    const details: AppDataMigrationItemDetail[] = [];
    let scannedCount = 0;
    let migratedCount = 0;
    let afterId = 0;
    const addReason = (row: Candidate, reason: SkipReason): void => {
      reasons.set(reason, (reasons.get(reason) ?? 0) + 1);
      if (details.length < MAX_TOKEN_USAGE_MIGRATION_EXAMPLE_DETAILS - 1) {
        details.push(item(row.usage_event_id || `token-usage-row:${row.id}`, "SKIPPED", `reason=${reason}; row=${row.id}`));
      }
    };

    try {
      const beforeCount = await this.database.countRows();
      while (true) {
        const rows = await this.database.listCandidateBatch(afterId, TOKEN_USAGE_SOURCE_SHAPING_BATCH_SIZE);
        if (rows.length > TOKEN_USAGE_SOURCE_SHAPING_BATCH_SIZE) throw new Error("Model-value candidate batch exceeded 250 rows.");
        if (rows.length === 0) break;
        afterId = rows.at(-1)!.id;
        scannedCount += rows.length;
        const pending = rows.flatMap((row) => {
          const classification = classifyTokenUsageCustomProviderModelValueRow(row);
          if (classification.kind === "SKIP") { addReason(row, classification.reason); return []; }
          if (row.model_value === null) { addReason(row, "SKIPPED_SOURCE_CHANGED"); return []; }
          return [{ row, update: { id: row.id, expectedModelValue: row.model_value, nextModelValue: classification.parsed.modelName } }];
        });
        const affected = await this.database.applyBatch(pending.map(({ update }) => update));
        if (affected.length !== pending.length) throw new Error("Model-value batch result count did not match input.");
        affected.forEach((count, index) => {
          if (count === 1) migratedCount += 1;
          else if (count === 0) addReason(pending[index]!.row, "SKIPPED_SOURCE_CHANGED");
          else throw new Error(`Model-value CAS for row ${pending[index]!.row.id} affected ${count} rows.`);
        });
        if (rows.length < TOKEN_USAGE_SOURCE_SHAPING_BATCH_SIZE) break;
      }
      const afterCount = await this.database.countRows();
      if (afterCount !== beforeCount) throw new Error(`Token usage ledger row count changed: ${beforeCount} -> ${afterCount}.`);
      const skippedCount = [...reasons.values()].reduce((sum, value) => sum + value, 0);
      details.push(item("token-usage-model-value:summary", "SKIPPED",
        `rows=${beforeCount}; migrated=${migratedCount}; reasons=${JSON.stringify(Object.fromEntries(reasons))}`));
      return {
        status: skippedCount > 0 ? "SUCCEEDED_WITH_WARNINGS" : "SUCCEEDED",
        summary: { scannedCount, migratedCount, skippedCount, failedCount: 0, details },
        errorMessage: null,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (details.length < MAX_TOKEN_USAGE_MIGRATION_EXAMPLE_DETAILS) {
        details.push(item("token-usage-model-value:failure", "FAILED", message));
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
