import type { PrismaClient } from "@prisma/client";
import { createConfiguredPrismaClient } from "../../config/prisma-client-factory.js";
import {
  parseTeamExecutionAddress,
  serializeTeamExecutionAddress,
} from "../../agent-team-execution/domain/team-execution-address.js";
import type { RawTokenUsageLedgerBackfillRow } from "./token-usage-canonical-execution-address-planner.js";

export type TokenUsageCanonicalIdentityUpdate = Readonly<{
  id: number;
  executionAddressJson: string;
}>;

export interface TokenUsageCanonicalIdentityMigrationStore {
  listRows(): Promise<readonly RawTokenUsageLedgerBackfillRow[]>;
  applyCanonicalTeamIdentityTransaction(
    updates: readonly TokenUsageCanonicalIdentityUpdate[],
  ): Promise<void>;
  disconnect?(): Promise<void>;
}

type PersistedCanonicalAddressRow = {
  id: number;
  root_team_run_id: string | null;
  execution_address_json: string | null;
};

type SqliteColumnRow = { name: string };
type SqliteIndexRow = { name: string };

const LEGACY_IDENTITY_COLUMNS = Object.freeze([
  "root_team_run_id",
  "team_run_path_json",
  "member_agent_run_id",
  "member_path_json",
  "member_route_key",
  "task_agent_instance_id",
  "task_agent_run_id",
] as const);
const CANONICAL_ROOT_INDEX = "token_usage_ledger_events_execution_root_observed_at_idx";

const TOKEN_MIGRATION_TRANSACTION_MAX_WAIT_MS = 60_000;
const TOKEN_MIGRATION_TRANSACTION_TIMEOUT_MS = 30 * 60_000;

const assertValidBatch = (
  updates: readonly TokenUsageCanonicalIdentityUpdate[],
): readonly Readonly<TokenUsageCanonicalIdentityUpdate & { expectedRootTeamRunId: string }>[] => {
  const ordered = updates
    .map((update) => {
      const address = parseTeamExecutionAddress(update.executionAddressJson);
      if (serializeTeamExecutionAddress(address) !== update.executionAddressJson) {
        throw new Error(`Canonical token update row '${update.id}' has noncanonical address JSON.`);
      }
      return Object.freeze({ ...update, expectedRootTeamRunId: address.rootTeamRunId });
    })
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

export class PrismaTokenUsageCanonicalIdentityMigrationStore
implements TokenUsageCanonicalIdentityMigrationStore {
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

  async listRows(): Promise<RawTokenUsageLedgerBackfillRow[]> {
    const columns = await this.client.$queryRaw<SqliteColumnRow[]>`
      PRAGMA table_info("token_usage_ledger_events")`;
    const names = new Set(columns.map((column) => column.name));
    if (names.has("root_team_run_id")) {
      return this.client.$queryRaw<RawTokenUsageLedgerBackfillRow[]>`
        SELECT "id", "usage_event_id", "run_id", "root_team_run_id", "execution_address_json",
               "member_route_key", "task_agent_run_id", "task_id"
        FROM "token_usage_ledger_events" ORDER BY "id" ASC`;
    }
    return this.client.$queryRaw<RawTokenUsageLedgerBackfillRow[]>`
      SELECT "id", "usage_event_id", "run_id",
             json_extract("execution_address_json", '$.rootTeamRunId') AS "root_team_run_id",
             "execution_address_json", NULL AS "member_route_key",
             json_extract("execution_address_json", '$.taskAgentRunId') AS "task_agent_run_id",
             "task_id"
      FROM "token_usage_ledger_events" ORDER BY "id" ASC`;
  }

  async applyCanonicalTeamIdentityTransaction(
    updates: readonly TokenUsageCanonicalIdentityUpdate[],
  ): Promise<void> {
    const ordered = assertValidBatch(updates);
    await this.client.$transaction(async (transaction) => {
      for (const update of ordered) {
        const affectedRows = await transaction.$executeRaw`
          UPDATE "token_usage_ledger_events"
          SET "root_team_run_id"=${update.expectedRootTeamRunId},
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
          || row.root_team_run_id !== update.expectedRootTeamRunId
          || row.execution_address_json !== update.executionAddressJson
        ) {
          throw new Error(
            `Canonical token update verification failed for row '${update.id}'.`,
          );
        }
      }


      const columns = await transaction.$queryRaw<SqliteColumnRow[]>`
        PRAGMA table_info("token_usage_ledger_events")`;
      const names = new Set(columns.map((column) => column.name));
      if (names.has("root_team_run_id")) {
        await transaction.$executeRawUnsafe(
          'DROP INDEX IF EXISTS "token_usage_ledger_events_root_team_run_id_observed_at_idx"',
        );
        for (const column of LEGACY_IDENTITY_COLUMNS) {
          if (names.has(column)) {
            await transaction.$executeRawUnsafe(
              `ALTER TABLE "token_usage_ledger_events" DROP COLUMN "${column}"`,
            );
          }
        }
      }
      await transaction.$executeRawUnsafe(
        `CREATE INDEX IF NOT EXISTS "${CANONICAL_ROOT_INDEX}" ON "token_usage_ledger_events" (json_extract("execution_address_json", '$.rootTeamRunId'), "observed_at")`,
      );
      const contractedColumns = await transaction.$queryRaw<SqliteColumnRow[]>`
        PRAGMA table_info("token_usage_ledger_events")`;
      const contractedNames = new Set(contractedColumns.map((column) => column.name));
      const remainingLegacy = LEGACY_IDENTITY_COLUMNS.filter((column) => contractedNames.has(column));
      if (remainingLegacy.length > 0) {
        throw new Error(`Canonical token contraction retained legacy columns: ${remainingLegacy.join(", ")}.`);
      }
      const indexes = await transaction.$queryRaw<SqliteIndexRow[]>`
        PRAGMA index_list("token_usage_ledger_events")`;
      if (!indexes.some((index) => index.name === CANONICAL_ROOT_INDEX)) {
        throw new Error("Canonical token root expression index was not created.");
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
