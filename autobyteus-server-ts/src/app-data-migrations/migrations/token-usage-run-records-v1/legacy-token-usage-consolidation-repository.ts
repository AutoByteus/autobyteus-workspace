import { Prisma, type PrismaClient } from "@prisma/client";
import { isDeepStrictEqual } from "node:util";
import { rootPrismaClient } from "repository_prisma";
import {
  TOKEN_USAGE_COST_FIELDS,
  TOKEN_USAGE_TOKEN_FIELDS,
  type TokenUsageRunRecord,
} from "../../../token-usage/domain/token-usage-run-record.js";
import {
  fromPrismaTokenUsageRunRecord,
  toPrismaTokenUsageRunRecordData,
} from "../../../token-usage/repositories/sql/token-usage-run-record-codec.js";
import { TOKEN_USAGE_SOURCE_SHAPING_BATCH_SIZE } from "../token-usage-source-shaping-constants.js";
import type { LegacyTokenUsageLedgerRow } from "./legacy-token-usage-row.js";

const asBigInt = (value: bigint | number | null | undefined): bigint =>
  typeof value === "bigint" ? value : BigInt(value ?? 0);

const UNKNOWN_INPUT_TOKEN_FIELDS: ReadonlySet<string> = new Set([
  "standard_input_tokens",
  "cache_miss_input_tokens",
  "cache_read_input_tokens",
  "cache_creation_input_tokens",
  "cache_creation_5m_input_tokens",
  "cache_creation_1h_input_tokens",
]);
const UNKNOWN_INPUT_COST_FIELDS: ReadonlySet<string> = new Set([
  "estimated_api_input_cost",
  "estimated_api_standard_input_cost",
  "estimated_api_cache_read_input_cost",
  "estimated_api_cache_creation_input_cost",
  "estimated_api_cache_creation_5m_input_cost",
  "estimated_api_cache_creation_1h_input_cost",
]);
const nonLocalUnknownInput = Prisma.sql`
  "input_token_semantic" NOT IN ('gross_includes_cache', 'base_excludes_cache')
  AND "pricing_status" <> 'local_no_api_bill'
  AND "api_cost_status" <> 'local_no_api_bill'
`;

const legacyTokenAggregate = (field: string): Prisma.Sql => UNKNOWN_INPUT_TOKEN_FIELDS.has(field)
  ? Prisma.sql`COALESCE(SUM(CASE WHEN ${nonLocalUnknownInput} THEN NULL ELSE ${Prisma.raw(`"${field}"`)} END), 0)
      AS ${Prisma.raw(`"${field}"`)}`
  : Prisma.sql`COALESCE(SUM(${Prisma.raw(`"${field}"`)}), 0) AS ${Prisma.raw(`"${field}"`)}`;

const legacyCostAggregate = (field: string): Prisma.Sql => {
  if (UNKNOWN_INPUT_COST_FIELDS.has(field)) {
    return Prisma.sql`SUM(CASE WHEN ${nonLocalUnknownInput} THEN NULL ELSE ${Prisma.raw(`"${field}"`)} END)
      AS ${Prisma.raw(`"${field}"`)}`;
  }
  if (field === "estimated_api_total_cost") {
    return Prisma.sql`SUM(CASE WHEN ${nonLocalUnknownInput}
      THEN "estimated_api_output_cost" ELSE "estimated_api_total_cost" END) AS "estimated_api_total_cost"`;
  }
  return Prisma.sql`SUM(${Prisma.raw(`"${field}"`)}) AS ${Prisma.raw(`"${field}"`)}`;
};

const sameCostTotals = (
  left: TokenUsageRunRecord["costTotals"],
  right: TokenUsageRunRecord["costTotals"],
): boolean =>
  TOKEN_USAGE_COST_FIELDS.every((field) => {
    const leftCost = left[field];
    const rightCost = right[field];
    return leftCost === null ? rightCost === null : rightCost !== null && Math.abs(leftCost - rightCost) <= 1e-9;
  });

const sameRecordAfterRoundTrip = (left: TokenUsageRunRecord, right: TokenUsageRunRecord): boolean => {
  const { costTotals: leftCosts, ...leftExact } = left;
  const { costTotals: rightCosts, ...rightExact } = right;
  return isDeepStrictEqual(leftExact, rightExact) && sameCostTotals(leftCosts, rightCosts);
};

export class LegacyTokenUsageConsolidationTransaction {
  constructor(private readonly transaction: Prisma.TransactionClient) {}

  async countLegacyRows(): Promise<bigint> {
    const rows = await this.transaction.$queryRaw<Array<{ count: bigint }>>`
      SELECT COUNT(*) AS "count" FROM "token_usage_ledger_events"
    `;
    return asBigInt(rows[0]?.count);
  }

  async countLegacyRuns(): Promise<bigint> {
    const rows = await this.transaction.$queryRaw<Array<{ count: bigint }>>`
      SELECT COUNT(DISTINCT "run_id") AS "count" FROM "token_usage_ledger_events"
    `;
    return asBigInt(rows[0]?.count);
  }

  async countBlankLegacyRunIds(): Promise<bigint> {
    const rows = await this.transaction.$queryRaw<Array<{ count: bigint }>>`
      SELECT COUNT(*) AS "count" FROM "token_usage_ledger_events"
      WHERE trim("run_id") = ''
    `;
    return asBigInt(rows[0]?.count);
  }

  async hasRunIdOverlap(): Promise<boolean> {
    const rows = await this.transaction.$queryRaw<Array<{ found: bigint }>>`
      SELECT EXISTS(
        SELECT 1
        FROM "token_usage_ledger_events" legacy
        JOIN "token_usage_run_records" current ON current."run_id" = legacy."run_id"
        LIMIT 1
      ) AS "found"
    `;
    return asBigInt(rows[0]?.found) === 1n;
  }

  async countCurrentRows(): Promise<bigint> {
    const rows = await this.transaction.$queryRaw<Array<{ count: bigint }>>`
      SELECT COUNT(*) AS "count" FROM "token_usage_run_records"
    `;
    return asBigInt(rows[0]?.count);
  }

  async nextLegacyRunId(afterRunId: string | null): Promise<string | null> {
    const rows = afterRunId === null
      ? await this.transaction.$queryRaw<Array<{ run_id: string }>>`
          SELECT "run_id" FROM "token_usage_ledger_events"
          GROUP BY "run_id" ORDER BY "run_id" ASC LIMIT 1
        `
      : await this.transaction.$queryRaw<Array<{ run_id: string }>>`
          SELECT "run_id" FROM "token_usage_ledger_events"
          WHERE "run_id" > ${afterRunId}
          GROUP BY "run_id" ORDER BY "run_id" ASC LIMIT 1
        `;
    return rows[0]?.run_id ?? null;
  }

  listLegacyRunBatch(runId: string, afterId: number): Promise<LegacyTokenUsageLedgerRow[]> {
    return this.transaction.$queryRaw<LegacyTokenUsageLedgerRow[]>`
      SELECT
        "id", "usage_event_id", "idempotency_key", "observed_at", "persisted_at", "run_id",
        "root_team_run_id", "turn_id", "llm_call_id", "call_sequence", "agent_definition_id",
        "workspace_id", "task_id", "team_name", "agent_name", "run_summary", "run_created_at",
        "member_display_name", "runtime_kind", "model_provider", "provider_name", "model_identifier",
        "model_value", "ingestion_kind", "usage_scope", "snapshot_series_key",
        "previous_snapshot_event_id", "input_token_semantic", "reported_input_tokens",
        "reported_output_tokens", "reported_total_tokens", "accounting_input_tokens",
        "accounting_output_tokens", "accounting_total_tokens", "standard_input_tokens",
        "cache_miss_input_tokens", "cache_read_input_tokens", "cache_creation_input_tokens",
        "cache_creation_5m_input_tokens", "cache_creation_1h_input_tokens", "cache_state",
        "reasoning_output_tokens", "billable_input_tokens", "billable_output_tokens",
        "quality_flags_json", "cost_basis", "currency", "input_price_per_million",
        "output_price_per_million", "cached_input_read_price_per_million",
        "cached_input_write_price_per_million", "cached_input_write_5m_price_per_million",
        "cached_input_write_1h_price_per_million", "pricing_source", "pricing_status",
        "pricing_missing_reason", "pricing_policy_key", "selected_pricing_tier_id",
        "missing_price_dimensions_json", "estimated_api_input_cost",
        "estimated_api_standard_input_cost", "estimated_api_cache_read_input_cost",
        "estimated_api_cache_creation_input_cost", "estimated_api_cache_creation_5m_input_cost",
        "estimated_api_cache_creation_1h_input_cost", "estimated_api_output_cost",
        "estimated_api_reasoning_output_cost", "estimated_api_total_cost", "api_cost_status",
        "latest_prompt_tokens", "effective_context_window_tokens", "context_window_usage_percent",
        json_extract("raw_event_json", '$.autobyteus_cumulative_snapshot_source_tokens.reported_input_tokens') AS "source_reported_input_tokens",
        json_extract("raw_event_json", '$.autobyteus_cumulative_snapshot_source_tokens.reported_output_tokens') AS "source_reported_output_tokens",
        json_extract("raw_event_json", '$.autobyteus_cumulative_snapshot_source_tokens.reported_total_tokens') AS "source_reported_total_tokens",
        json_extract("raw_event_json", '$.autobyteus_cumulative_snapshot_source_tokens.accounting_input_tokens') AS "source_accounting_input_tokens",
        json_extract("raw_event_json", '$.autobyteus_cumulative_snapshot_source_tokens.accounting_output_tokens') AS "source_accounting_output_tokens",
        json_extract("raw_event_json", '$.autobyteus_cumulative_snapshot_source_tokens.accounting_total_tokens') AS "source_accounting_total_tokens",
        json_extract("raw_event_json", '$.autobyteus_cumulative_snapshot_source_tokens.standard_input_tokens') AS "source_standard_input_tokens",
        json_extract("raw_event_json", '$.autobyteus_cumulative_snapshot_source_tokens.cache_miss_input_tokens') AS "source_cache_miss_input_tokens",
        json_extract("raw_event_json", '$.autobyteus_cumulative_snapshot_source_tokens.cache_read_input_tokens') AS "source_cache_read_input_tokens",
        json_extract("raw_event_json", '$.autobyteus_cumulative_snapshot_source_tokens.cache_creation_input_tokens') AS "source_cache_creation_input_tokens",
        json_extract("raw_event_json", '$.autobyteus_cumulative_snapshot_source_tokens.cache_creation_5m_input_tokens') AS "source_cache_creation_5m_input_tokens",
        json_extract("raw_event_json", '$.autobyteus_cumulative_snapshot_source_tokens.cache_creation_1h_input_tokens') AS "source_cache_creation_1h_input_tokens",
        json_extract("raw_event_json", '$.autobyteus_cumulative_snapshot_source_tokens.reasoning_output_tokens') AS "source_reasoning_output_tokens",
        json_extract("raw_event_json", '$.autobyteus_cumulative_snapshot_source_tokens.billable_input_tokens') AS "source_billable_input_tokens",
        json_extract("raw_event_json", '$.autobyteus_cumulative_snapshot_source_tokens.billable_output_tokens') AS "source_billable_output_tokens"
      FROM "token_usage_ledger_events"
      WHERE "run_id"=${runId} AND "id">${afterId}
      ORDER BY "id" ASC
      LIMIT ${TOKEN_USAGE_SOURCE_SHAPING_BATCH_SIZE}
    `;
  }

  async insertCurrentRecord(record: TokenUsageRunRecord): Promise<void> {
    const persisted = await this.transaction.tokenUsageRunRecord.create({
      data: toPrismaTokenUsageRunRecordData(record),
    });
    const decoded = fromPrismaTokenUsageRunRecord(persisted);
    if (!sameRecordAfterRoundTrip(decoded, record)) {
      throw new Error(`Current token usage round-trip validation failed for run '${record.runId}'.`);
    }
  }

  async validateRunAggregate(record: TokenUsageRunRecord): Promise<void> {
    const rows = await this.transaction.$queryRaw<Array<Record<string, bigint | number | null>>>(
      Prisma.sql`SELECT COUNT(*) AS "usage_report_count",
        ${Prisma.join(TOKEN_USAGE_TOKEN_FIELDS.map(legacyTokenAggregate))},
        ${Prisma.join(TOKEN_USAGE_COST_FIELDS.map(legacyCostAggregate))}
      FROM "token_usage_ledger_events" WHERE "run_id"=${record.runId}`,
    );
    const aggregate = rows[0];
    if (!aggregate || asBigInt(aggregate.usage_report_count) !== record.usageReportCount) {
      throw new Error(`Legacy aggregate report-count validation failed for run '${record.runId}'.`);
    }
    for (const field of TOKEN_USAGE_TOKEN_FIELDS) {
      if (asBigInt(aggregate[field]) !== record.tokenTotals[field]) {
        throw new Error(`Legacy aggregate token validation failed for run '${record.runId}', field '${field}'.`);
      }
    }
    for (const field of TOKEN_USAGE_COST_FIELDS) {
      const expected = record.costTotals[field];
      const actual = aggregate[field] === null ? null : Number(aggregate[field]);
      if (expected === null ? actual !== null : actual === null || Math.abs(actual - expected) > 1e-9) {
        throw new Error(`Legacy aggregate cost validation failed for run '${record.runId}', field '${field}'.`);
      }
    }
  }

  async deleteLegacyRows(): Promise<number> {
    return this.transaction.$executeRaw`DELETE FROM "token_usage_ledger_events"`;
  }
}

export class LegacyTokenUsageConsolidationRepository {
  constructor(private readonly prisma: PrismaClient = rootPrismaClient) {}

  runTransaction<T>(work: (transaction: LegacyTokenUsageConsolidationTransaction) => Promise<T>): Promise<T> {
    return this.prisma.$transaction(
      (transaction) => work(new LegacyTokenUsageConsolidationTransaction(transaction)),
      { maxWait: 30_000, timeout: 30 * 60 * 1000 },
    );
  }
}
