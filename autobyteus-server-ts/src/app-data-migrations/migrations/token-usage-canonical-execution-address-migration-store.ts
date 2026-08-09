import type { PrismaClient } from "@prisma/client";
import { createConfiguredPrismaClient } from "../../config/prisma-client-factory.js";
import type { RawTokenUsageLedgerBackfillRow } from "./token-usage-execution-address-backfill-planner.js";

export type TokenUsageCanonicalExecutionAddressUpdate = Readonly<{
  id: number;
  rootTeamRunId: string;
  executionAddressJson: string;
}>;

export interface TokenUsageCanonicalExecutionAddressMigrationStore {
  listRows(): Promise<readonly RawTokenUsageLedgerBackfillRow[]>;
  applyCanonicalExecutionAddressBatch(
    updates: readonly TokenUsageCanonicalExecutionAddressUpdate[],
  ): Promise<void>;
  disconnect?(): Promise<void>;
}

type PersistedCanonicalAddressRow = {
  id: number;
  root_team_run_id: string | null;
  execution_address_json: string | null;
};

const TOKEN_MIGRATION_TRANSACTION_MAX_WAIT_MS = 60_000;
const TOKEN_MIGRATION_TRANSACTION_TIMEOUT_MS = 30 * 60_000;

const assertValidBatch = (
  updates: readonly TokenUsageCanonicalExecutionAddressUpdate[],
): readonly TokenUsageCanonicalExecutionAddressUpdate[] => {
  const ordered = updates
    .map((update) => Object.freeze({ ...update }))
    .sort((left, right) => left.id - right.id);
  const seen = new Set<number>();
  for (const update of ordered) {
    if (!Number.isSafeInteger(update.id) || update.id <= 0) {
      throw new Error(`Canonical token update row ID '${update.id}' is invalid.`);
    }
    if (seen.has(update.id)) {
      throw new Error(`Canonical token update batch contains duplicate row ID '${update.id}'.`);
    }
    seen.add(update.id);
  }
  return ordered;
};

export class PrismaTokenUsageCanonicalExecutionAddressMigrationStore
implements TokenUsageCanonicalExecutionAddressMigrationStore {
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

  listRows(): Promise<RawTokenUsageLedgerBackfillRow[]> {
    return this.client.$queryRaw<RawTokenUsageLedgerBackfillRow[]>`
      SELECT "id", "usage_event_id", "run_id", "root_team_run_id", "execution_address_json",
             "member_route_key", "task_agent_run_id", "task_id"
      FROM "token_usage_ledger_events" ORDER BY "id" ASC`;
  }

  async applyCanonicalExecutionAddressBatch(
    updates: readonly TokenUsageCanonicalExecutionAddressUpdate[],
  ): Promise<void> {
    const ordered = assertValidBatch(updates);
    if (ordered.length === 0) return;

    await this.client.$transaction(async (transaction) => {
      for (const update of ordered) {
        const affectedRows = await transaction.$executeRaw`
          UPDATE "token_usage_ledger_events"
          SET "root_team_run_id"=${update.rootTeamRunId},
              "execution_address_json"=${update.executionAddressJson}
          WHERE "id"=${update.id}`;
        if (affectedRows !== 1) {
          throw new Error(
            `Canonical token update for row '${update.id}' affected ${affectedRows} rows; expected exactly one.`,
          );
        }
      }

      for (const update of ordered) {
        const persisted = await transaction.$queryRaw<PersistedCanonicalAddressRow[]>`
          SELECT "id", "root_team_run_id", "execution_address_json"
          FROM "token_usage_ledger_events"
          WHERE "id"=${update.id}`;
        const row = persisted[0];
        if (
          persisted.length !== 1
          || row?.id !== update.id
          || row.root_team_run_id !== update.rootTeamRunId
          || row.execution_address_json !== update.executionAddressJson
        ) {
          throw new Error(
            `Canonical token update verification failed for row '${update.id}'.`,
          );
        }
      }
    }, {
      maxWait: TOKEN_MIGRATION_TRANSACTION_MAX_WAIT_MS,
      timeout: TOKEN_MIGRATION_TRANSACTION_TIMEOUT_MS,
    });
  }

  async disconnect(): Promise<void> {
    if (this.ownsClient && this.prisma) await this.prisma.$disconnect();
  }
}
