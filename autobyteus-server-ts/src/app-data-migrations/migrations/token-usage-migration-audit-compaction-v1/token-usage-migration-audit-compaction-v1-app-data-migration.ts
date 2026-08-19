import path from "node:path";
import { appConfigProvider } from "../../../config/app-config-provider.js";
import type {
  AppDataMigrationDefinition,
  AppDataMigrationExecutionResult,
  AppDataMigrationItemDetail,
  AppDataMigrationSummary,
} from "../../domain/app-data-migration-types.js";
import {
  APP_DATA_MIGRATION_SUMMARY_BYTE_LIMIT_LABEL,
  MAX_APP_DATA_MIGRATION_SUMMARY_BYTES,
} from "../../repositories/app-data-migration-summary-projection.js";
import { TOKEN_USAGE_CUSTOM_PROVIDER_MODEL_VALUE_BACKFILL_MIGRATION_ID } from "../token-usage-custom-provider-model-value-backfill-migration.js";
import { TOKEN_USAGE_PROVIDER_NAME_SNAPSHOT_BACKFILL_MIGRATION_ID } from "../token-usage-provider-name-snapshot-backfill-migration.js";
import {
  TokenUsageMigrationAuditLogCompactor,
  type TokenUsageMigrationAuditLogCompactorLike,
} from "./token-usage-migration-audit-log-compactor.js";
import {
  TokenUsageMigrationAuditCompactionRepository,
  type TerminalMigrationAuditRecord,
  type TokenUsageMigrationAuditCompactionRepositoryLike,
} from "./token-usage-migration-audit-compaction-repository.js";

export const TOKEN_USAGE_MIGRATION_AUDIT_COMPACTION_V1_MIGRATION_ID =
  "20260819_token_usage_migration_audit_compaction_v1";

export const TOKEN_USAGE_MIGRATION_AUDIT_SOURCE_IDS = [
  TOKEN_USAGE_CUSTOM_PROVIDER_MODEL_VALUE_BACKFILL_MIGRATION_ID,
  TOKEN_USAGE_PROVIDER_NAME_SNAPSHOT_BACKFILL_MIGRATION_ID,
] as const;

export const STORED_AUDIT_DETAILS_COMPACTED_ITEM_ID =
  "__stored_summary_details_compacted__";

type Disposition = Readonly<{
  migrated: boolean;
  warning: boolean;
  detail: AppDataMigrationItemDetail;
}>;

const detail = (
  itemId: string,
  status: "MIGRATED" | "SKIPPED",
  message: string,
): AppDataMigrationItemDetail => ({ itemId, status, message });

const compactedSummary = (record: TerminalMigrationAuditRecord): string => {
  const source = record.summary!;
  const summary: AppDataMigrationSummary = {
    ...source.counts,
    details: [detail(
      STORED_AUDIT_DETAILS_COMPACTED_ITEM_ID,
      "SKIPPED",
      `Compacted ${source.detailCount} stored detail items because historical audit evidence exceeded the ${APP_DATA_MIGRATION_SUMMARY_BYTE_LIMIT_LABEL}-byte limit.`,
    )],
  };
  return JSON.stringify(summary);
};

export class TokenUsageMigrationAuditCompactionV1AppDataMigration
implements AppDataMigrationDefinition {
  readonly id = TOKEN_USAGE_MIGRATION_AUDIT_COMPACTION_V1_MIGRATION_ID;
  readonly displayName = "Token usage migration audit compaction V1";
  readonly description = "Compacts bounded audit evidence for two terminal token migrations.";
  readonly requiredOnStartup = true;
  readonly executionPolicy = "STARTUP_ONLY" as const;

  constructor(
    private readonly repository: TokenUsageMigrationAuditCompactionRepositoryLike =
      new TokenUsageMigrationAuditCompactionRepository(),
    private readonly logCompactor: TokenUsageMigrationAuditLogCompactorLike =
      new TokenUsageMigrationAuditLogCompactor(
        path.join(appConfigProvider.config.getLogsDir(), "app-data-migrations"),
      ),
  ) {}

  async execute(): Promise<AppDataMigrationExecutionResult> {
    const dispositions: Disposition[] = [];
    for (const migrationId of TOKEN_USAGE_MIGRATION_AUDIT_SOURCE_IDS) {
      dispositions.push(await this.compactOne(migrationId));
    }
    const migratedCount = dispositions.filter(({ migrated }) => migrated).length;
    const warningCount = dispositions.filter(({ warning }) => warning).length;
    return {
      status: warningCount > 0 ? "SUCCEEDED_WITH_WARNINGS" : "SUCCEEDED",
      summary: {
        scannedCount: TOKEN_USAGE_MIGRATION_AUDIT_SOURCE_IDS.length,
        migratedCount,
        skippedCount: dispositions.length - migratedCount,
        failedCount: 0,
        details: dispositions.map(({ detail: item }) => item),
      },
      errorMessage: warningCount > 0
        ? `Audit compaction preserved ${warningCount} unsupported source record(s); see bounded details.`
        : null,
    };
  }

  private async compactOne(migrationId: string): Promise<Disposition> {
    const record = await this.repository.inspect(migrationId);
    if (!record) {
      return { migrated: false, warning: false, detail: detail(migrationId, "SKIPPED", "record_missing") };
    }
    if (record.status !== "SUCCEEDED" && record.status !== "SUCCEEDED_WITH_WARNINGS") {
      return { migrated: false, warning: false, detail: detail(migrationId, "SKIPPED", "record_not_terminal") };
    }
    if (!record.summary) {
      return { migrated: false, warning: true, detail: detail(migrationId, "SKIPPED", "summary_shape_unsupported") };
    }

    const logResult = await this.logCompactor.compact(record);
    const summaryCompacted = record.summaryBytes > MAX_APP_DATA_MIGRATION_SUMMARY_BYTES;
    if (summaryCompacted) {
      await this.repository.replaceOversizedSummary(record, compactedSummary(record));
    }
    const logCompacted = logResult.kind === "COMPACTED";
    const migrated = summaryCompacted || logCompacted;
    if (logResult.kind === "WARNING") {
      return {
        migrated,
        warning: true,
        detail: detail(migrationId, migrated ? "MIGRATED" : "SKIPPED", `log_${logResult.reason.toLowerCase()}`),
      };
    }
    return {
      migrated,
      warning: false,
      detail: detail(
        migrationId,
        migrated ? "MIGRATED" : "SKIPPED",
        migrated
          ? `compacted_details=${record.summary.detailCount}; log=${logResult.kind.toLowerCase()}`
          : `already_bounded; log=${logResult.kind.toLowerCase()}`,
      ),
    };
  }
}
