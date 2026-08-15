import { serializeTeamExecutionAddress } from "../legacy/team-execution-address.js";
import type { AppDataMigrationItemDetail } from "../domain/app-data-migration-types.js";
import {
  planTokenUsageExecutionAddressBackfillRow,
} from "./token-usage-canonical-execution-address-planner.js";
import {
  PrismaTokenUsageCanonicalIdentityMigrationStore,
  type TokenUsageCanonicalIdentityMigrationStore,
  type TokenUsageCanonicalIdentityUpdate,
} from "./token-usage-canonical-identity-migration-store.js";
import { buildTokenUsageTaskTeamRunIndex } from "./token-usage-task-team-run-index.js";

const MAX_FAILED_BATCH_ROW_IDS = 20;

const errorMessage = (error: unknown): string =>
  error instanceof Error ? error.message : String(error);

const failedDetail = (itemId: string, message: string): AppDataMigrationItemDetail => ({
  itemId,
  status: "FAILED",
  message,
});

const describeBatchRows = (
  updates: readonly TokenUsageCanonicalIdentityUpdate[],
): string => {
  const visible = updates.slice(0, MAX_FAILED_BATCH_ROW_IDS).map((update) => update.id);
  const hiddenCount = updates.length - visible.length;
  return hiddenCount > 0
    ? `${visible.join(", ")} (+${hiddenCount} more)`
    : visible.join(", ");
};

export interface TokenUsageCanonicalExecutionAddressMigratorLike {
  migrate(): Promise<readonly AppDataMigrationItemDetail[]>;
}

export class TokenUsageCanonicalExecutionAddressMigrator
implements TokenUsageCanonicalExecutionAddressMigratorLike {
  private store: TokenUsageCanonicalIdentityMigrationStore | null;

  constructor(
    private readonly memoryDir: string,
    store?: TokenUsageCanonicalIdentityMigrationStore,
  ) {
    this.store = store ?? null;
  }

  private get migrationStore(): TokenUsageCanonicalIdentityMigrationStore {
    return this.store ??= new PrismaTokenUsageCanonicalIdentityMigrationStore();
  }

  async migrate(): Promise<readonly AppDataMigrationItemDetail[]> {
    try {
      let taskTeamIndex;
      try {
        taskTeamIndex = await buildTokenUsageTaskTeamRunIndex(this.memoryDir);
      } catch (error) {
        return [failedDetail(
          "token-usage:task-records:index",
          `Cannot discover strict current task records: ${errorMessage(error)}`,
        )];
      }
      if (taskTeamIndex.issues.length > 0) {
        return taskTeamIndex.issues.map((issue) => ({ ...issue, status: "FAILED" as const }));
      }

      let rows;
      try {
        rows = await this.migrationStore.listRows();
      } catch (error) {
        return [failedDetail(
          "token-usage:rows:scan",
          `Cannot read token rows for canonical execution-address planning: ${errorMessage(error)}`,
        )];
      }

      const plans = rows.map((row) => planTokenUsageExecutionAddressBackfillRow(row, taskTeamIndex));
      const planFailures = plans
        .filter((plan) => plan.kind === "fail")
        .map((plan) => plan.detail);
      if (planFailures.length > 0) return planFailures;

      const updates: readonly TokenUsageCanonicalIdentityUpdate[] = Object.freeze(
        plans.flatMap((plan, index) => plan.kind === "migrate"
          ? [Object.freeze({
            id: rows[index]!.id,
            executionAddressJson: serializeTeamExecutionAddress(plan.address),
          })]
          : []),
      );
      try {
        await this.migrationStore.applyCanonicalTeamIdentityTransaction(updates);
      } catch (error) {
        return [failedDetail(
          "token-usage:canonical-address-batch",
          `Canonical token transaction rolled back ${updates.length} update(s) for row IDs [${describeBatchRows(updates)}]: ${errorMessage(error)}`,
        )];
      }

      return plans.map((plan) => plan.detail);
    } finally {
      await this.migrationStore.disconnect?.();
    }
  }
}
