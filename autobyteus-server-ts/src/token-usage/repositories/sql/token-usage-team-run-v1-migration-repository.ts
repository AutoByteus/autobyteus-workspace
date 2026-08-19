import type { PrismaClient } from "@prisma/client";
import { isDeepStrictEqual } from "node:util";
import { createConfiguredPrismaClient } from "../../../config/prisma-client-factory.js";

export type TokenUsageTeamRunV1EvidenceRow = Readonly<{
  id: number;
  usageEventId: string;
  runId: string;
  rootTeamRunId: string | null;
  executionAddressJson: string | null;
  memberAgentRunId: string | null;
  memberRouteKey: string | null;
  taskAgentRunId: string | null;
  taskId: string | null;
}>;

export type TokenUsageRuntimeSchemaSnapshot = Readonly<{
  rows: readonly TokenUsageTeamRunV1EvidenceRow[];
  rowCount: number;
  columns: ReadonlySet<string>;
  evidenceColumns: ReadonlySet<string>;
  hasCurrentRootIndex: boolean;
}>;

export type TokenUsageTeamRunV1RootUpdate = Readonly<{
  id: number;
  finalRootTeamRunId: string;
}>;

export type TokenUsageTeamRunV1ApplyResult =
  | Readonly<{ kind: "APPLIED"; updatedRows: number; alreadyCurrent: boolean }>
  | Readonly<{ kind: "ROLLED_BACK_WARNING"; message: string; rollbackVerified: boolean }>;

type ColumnRow = { name: string };
type IndexRow = { name: string };
type CountRow = { count: number | bigint };
type RootRow = { id: number; root_team_run_id: string | null };
type FactRow = Record<string, unknown> & { id: number; root_team_run_id: string | null };
type RawEvidence = {
  id: number;
  usage_event_id: string;
  run_id: string;
  root_team_run_id: string | null;
  execution_address_json: string | null;
  member_agent_run_id: string | null;
  member_route_key: string | null;
  task_agent_run_id: string | null;
  task_id: string | null;
};

const TABLE = "token_usage_ledger_events";
const CURRENT_ROOT_INDEX = "token_usage_ledger_events_root_team_run_id_observed_at_idx";
const CURRENT_REQUIRED_COLUMNS = [
  "id",
  "usage_event_id",
  "run_id",
  "root_team_run_id",
  "observed_at",
] as const;
const PREDECESSOR_EVIDENCE_COLUMNS = [
  "execution_address_json",
  "team_run_path_json",
  "member_agent_run_id",
  "member_path_json",
  "member_route_key",
  "task_agent_instance_id",
  "task_agent_run_id",
] as const;

const nullableColumn = (columns: ReadonlySet<string>, name: string): string =>
  columns.has(name) ? `"${name}"` : `NULL`;

const normalizedRows = (rows: readonly RawEvidence[]): TokenUsageTeamRunV1EvidenceRow[] =>
  rows.map((row) => Object.freeze({
    id: row.id,
    usageEventId: row.usage_event_id,
    runId: row.run_id,
    rootTeamRunId: row.root_team_run_id,
    executionAddressJson: row.execution_address_json,
    memberAgentRunId: row.member_agent_run_id,
    memberRouteKey: row.member_route_key,
    taskAgentRunId: row.task_agent_run_id,
    taskId: row.task_id,
  }));

const validateUpdates = (
  updates: readonly TokenUsageTeamRunV1RootUpdate[],
): readonly TokenUsageTeamRunV1RootUpdate[] => {
  const ordered = [...updates].sort((left, right) => left.id - right.id);
  const seen = new Set<number>();
  for (const update of ordered) {
    if (!Number.isSafeInteger(update.id) || update.id <= 0) {
      throw new Error(`Token root update row ID '${update.id}' is invalid.`);
    }
    if (!update.finalRootTeamRunId.trim()) {
      throw new Error(`Token root update row '${update.id}' has no final root TeamRun ID.`);
    }
    if (seen.has(update.id)) throw new Error(`Token root update repeats row '${update.id}'.`);
    seen.add(update.id);
  }
  return Object.freeze(ordered);
};

const withoutRootAttribution = (row: FactRow): Readonly<Record<string, unknown>> => {
  const { root_team_run_id: _ignored, ...facts } = row;
  return Object.freeze(facts);
};

/** SQL-only adapter. Historical identity interpretation stays in the V1 migration. */
export class TokenUsageTeamRunV1MigrationRepository {
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

  async inspectRuntimeSchemaAndEvidence(): Promise<TokenUsageRuntimeSchemaSnapshot> {
    const columns = await this.columns(this.client);
    const missing = CURRENT_REQUIRED_COLUMNS.filter((column) => !columns.has(column));
    if (missing.length) {
      throw new Error(`Token ledger lacks current runtime column(s): ${missing.join(", ")}.`);
    }
    const rows = await this.client.$queryRawUnsafe<RawEvidence[]>(
      `SELECT "id", "usage_event_id", "run_id", "root_team_run_id", `
      + `${nullableColumn(columns, "execution_address_json")} AS "execution_address_json", `
      + `${nullableColumn(columns, "member_agent_run_id")} AS "member_agent_run_id", `
      + `${nullableColumn(columns, "member_route_key")} AS "member_route_key", `
      + `${nullableColumn(columns, "task_agent_run_id")} AS "task_agent_run_id", `
      + `${nullableColumn(columns, "task_id")} AS "task_id" `
      + `FROM "${TABLE}" ORDER BY "id" ASC`,
    );
    const indexes = await this.indexes(this.client);
    return Object.freeze({
      rows: Object.freeze(normalizedRows(rows)),
      rowCount: rows.length,
      columns,
      evidenceColumns: new Set(
        PREDECESSOR_EVIDENCE_COLUMNS.filter((column) => columns.has(column)),
      ),
      hasCurrentRootIndex: indexes.has(CURRENT_ROOT_INDEX),
    });
  }

  async applyResolvedRootUpdates(
    updates: readonly TokenUsageTeamRunV1RootUpdate[],
    snapshot: TokenUsageRuntimeSchemaSnapshot,
  ): Promise<TokenUsageTeamRunV1ApplyResult> {
    const ordered = validateUpdates(updates);
    const beforeRoots = new Map(snapshot.rows.map((row) => [row.id, row.rootTeamRunId]));
    const beforeFacts = new Map<number, Readonly<Record<string, unknown>>>();
    try {
      await this.client.$transaction(async (transaction) => {
        for (const update of ordered) {
          const rows = await transaction.$queryRaw<FactRow[]>`
            SELECT * FROM "token_usage_ledger_events" WHERE "id"=${update.id}`;
          if (rows.length !== 1) {
            throw new Error(`Token root update row '${update.id}' could not be snapshotted.`);
          }
          beforeFacts.set(update.id, withoutRootAttribution(rows[0]!));
        }
        for (const update of ordered) {
          if (!beforeRoots.has(update.id)) {
            throw new Error(`Token root update row '${update.id}' was not in the evidence snapshot.`);
          }
          const affected = await transaction.$executeRaw`
            UPDATE "token_usage_ledger_events"
            SET "root_team_run_id"=${update.finalRootTeamRunId}
            WHERE "id"=${update.id}`;
          if (affected !== 1) {
            throw new Error(`Token root update row '${update.id}' affected ${affected} rows.`);
          }
        }
        for (const update of ordered) {
          const persisted = await transaction.$queryRaw<RootRow[]>`
            SELECT "id", "root_team_run_id"
            FROM "token_usage_ledger_events" WHERE "id"=${update.id}`;
          if (
            persisted.length !== 1
            || persisted[0]!.root_team_run_id !== update.finalRootTeamRunId
          ) {
            throw new Error(`Token root update verification failed for row '${update.id}'.`);
          }
          const factRows = await transaction.$queryRaw<FactRow[]>`
            SELECT * FROM "token_usage_ledger_events" WHERE "id"=${update.id}`;
          if (
            factRows.length !== 1
            || !isDeepStrictEqual(
              withoutRootAttribution(factRows[0]!),
              beforeFacts.get(update.id),
            )
          ) {
            throw new Error(`Token accounting fact verification failed for row '${update.id}'.`);
          }
        }
        await transaction.$executeRawUnsafe(
          `CREATE INDEX IF NOT EXISTS "${CURRENT_ROOT_INDEX}" `
          + `ON "${TABLE}" ("root_team_run_id", "observed_at")`,
        );
        const [count] = await transaction.$queryRaw<CountRow[]>`
          SELECT COUNT(*) AS "count" FROM "token_usage_ledger_events"`;
        if (Number(count?.count ?? -1) !== snapshot.rowCount) {
          throw new Error("Token ledger row count changed during root attribution.");
        }
        const columns = await this.columns(transaction);
        for (const evidenceColumn of snapshot.evidenceColumns) {
          if (!columns.has(evidenceColumn)) {
            throw new Error(`Token predecessor evidence column '${evidenceColumn}' was removed.`);
          }
        }
        const indexes = await this.indexes(transaction);
        if (!indexes.has(CURRENT_ROOT_INDEX)) {
          throw new Error("Token current root/observed-time index is unavailable.");
        }
      }, { maxWait: 60_000, timeout: 30 * 60_000 });
      return Object.freeze({
        kind: "APPLIED" as const,
        updatedRows: ordered.length,
        alreadyCurrent: ordered.length === 0,
      });
    } catch (error) {
      const original = error instanceof Error ? error.message : String(error);
      try {
        const current = await this.readRoots(ordered.map((update) => update.id));
        const [count] = await this.client.$queryRaw<CountRow[]>`
          SELECT COUNT(*) AS "count" FROM "token_usage_ledger_events"`;
        let unchanged = Number(count?.count ?? -1) === snapshot.rowCount
          && ordered.every((update) => current.get(update.id) === beforeRoots.get(update.id));
        for (const update of ordered) {
          const expectedFacts = beforeFacts.get(update.id);
          if (!expectedFacts) continue;
          const rows = await this.client.$queryRaw<FactRow[]>`
            SELECT * FROM "token_usage_ledger_events" WHERE "id"=${update.id}`;
          unchanged = unchanged
            && rows.length === 1
            && isDeepStrictEqual(withoutRootAttribution(rows[0]!), expectedFacts);
        }
        return Object.freeze({
          kind: "ROLLED_BACK_WARNING" as const,
          rollbackVerified: unchanged,
          message: unchanged
            ? `Token root transaction rolled back with all planned roots unchanged: ${original}`
            : `Token root transaction failed and rollback could not be verified: ${original}`,
        });
      } catch (verificationError) {
        return Object.freeze({
          kind: "ROLLED_BACK_WARNING" as const,
          rollbackVerified: false,
          message: `Token root transaction failed; rollback verification also failed: ${original}; ${
            verificationError instanceof Error ? verificationError.message : String(verificationError)
          }`,
        });
      }
    }
  }

  async disconnect(): Promise<void> {
    if (this.ownsClient && this.prisma) await this.prisma.$disconnect();
  }

  private async readRoots(ids: readonly number[]): Promise<Map<number, string | null>> {
    const result = new Map<number, string | null>();
    for (const id of ids) {
      const rows = await this.client.$queryRaw<RootRow[]>`
        SELECT "id", "root_team_run_id"
        FROM "token_usage_ledger_events" WHERE "id"=${id}`;
      if (rows.length === 1) result.set(id, rows[0]!.root_team_run_id);
    }
    return result;
  }

  private async columns(client: Pick<PrismaClient, "$queryRaw">): Promise<ReadonlySet<string>> {
    const rows = await client.$queryRaw<ColumnRow[]>`
      PRAGMA table_info("token_usage_ledger_events")`;
    return new Set(rows.map((row) => row.name));
  }

  private async indexes(client: Pick<PrismaClient, "$queryRaw">): Promise<ReadonlySet<string>> {
    const rows = await client.$queryRaw<IndexRow[]>`
      PRAGMA index_list("token_usage_ledger_events")`;
    return new Set(rows.map((row) => row.name));
  }
}
