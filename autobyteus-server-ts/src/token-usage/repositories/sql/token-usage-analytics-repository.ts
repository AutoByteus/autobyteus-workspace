import { Prisma, type PrismaClient } from "@prisma/client";
import { rootPrismaClient } from "repository_prisma";
import {
  TOKEN_USAGE_COST_FIELDS,
  TOKEN_USAGE_TOKEN_FIELDS,
} from "../../domain/token-usage-accounting-summary.js";
import {
  TOKEN_USAGE_ANALYTICS_COVERAGE_ID,
  type TokenUsageAnalyticsFacetIncrement,
  type TokenUsageAnalyticsRange,
  type TokenUsageAnalyticsRangePlan,
  type TokenUsageAnalyticsSnapshot,
} from "../../domain/token-usage-analytics.js";
import type { TokenUsageRunTransaction } from "./token-usage-run-repository.js";
import {
  fromTokenUsageAnalyticsFacetRow,
  type TokenUsageAnalyticsFacetRow,
} from "./token-usage-analytics-record-codec.js";

const sqlColumn = (field: string): Prisma.Sql => Prisma.raw(`"${field}"`);
const nullableIncrement = (field: string): Prisma.Sql => Prisma.sql`
  ${sqlColumn(field)} = CASE
    WHEN ${Prisma.raw('"token_usage_analytics_daily_facets"')}.${sqlColumn(field)} IS NULL AND excluded.${sqlColumn(field)} IS NULL THEN NULL
    ELSE COALESCE(${Prisma.raw('"token_usage_analytics_daily_facets"')}.${sqlColumn(field)}, 0) + COALESCE(excluded.${sqlColumn(field)}, 0)
  END`;

export interface TokenUsageAnalyticsFilters {
  runtimeKind: string | null;
  providerKey: string | null;
  modelKey: string | null;
}

export class SqlTokenUsageAnalyticsRepository {
  constructor(private readonly client: PrismaClient = rootPrismaClient) {}

  async initializeCoverage(now: Date): Promise<Date> {
    const row = await this.client.tokenUsageAnalyticsCoverage.upsert({
      where: { id: TOKEN_USAGE_ANALYTICS_COVERAGE_ID },
      create: { id: TOKEN_USAGE_ANALYTICS_COVERAGE_ID, coverageStart: now },
      update: {},
    });
    return row.coverageStart;
  }

  async incrementFacet(transaction: TokenUsageRunTransaction, facet: TokenUsageAnalyticsFacetIncrement): Promise<void> {
    const columns = [
      "bucket_start", "facet_key", "identity_key", "provider_key", "model_key", "runtime_kind",
      "model_provider", "provider_name", "model_identifier", "model_value", "cache_state", "pricing_summary_json",
      ...TOKEN_USAGE_TOKEN_FIELDS, ...TOKEN_USAGE_COST_FIELDS, "usage_report_count", "latest_observed_at",
    ];
    const values: unknown[] = [
      facet.bucketStart, facet.facetKey, facet.identityKey, facet.providerKey, facet.modelKey, facet.runtimeKind,
      facet.modelProvider, facet.providerName, facet.modelIdentifier, facet.modelValue, facet.cacheState,
      JSON.stringify(facet.pricingSummary),
      ...TOKEN_USAGE_TOKEN_FIELDS.map((field) => facet.tokenTotals[field]),
      ...TOKEN_USAGE_COST_FIELDS.map((field) => facet.costTotals[field]),
      facet.usageReportCount, facet.latestObservedAt,
    ];
    const updates = [
      ...TOKEN_USAGE_TOKEN_FIELDS.map((field) => Prisma.sql`${sqlColumn(field)} = ${Prisma.raw('"token_usage_analytics_daily_facets"')}.${sqlColumn(field)} + excluded.${sqlColumn(field)}`),
      ...TOKEN_USAGE_COST_FIELDS.map(nullableIncrement),
      Prisma.sql`"usage_report_count" = "token_usage_analytics_daily_facets"."usage_report_count" + excluded."usage_report_count"`,
      Prisma.sql`"latest_observed_at" = MAX("token_usage_analytics_daily_facets"."latest_observed_at", excluded."latest_observed_at")`,
    ];
    await transaction.$executeRaw(Prisma.sql`
      INSERT INTO "token_usage_analytics_daily_facets" (${Prisma.join(columns.map(sqlColumn))})
      VALUES (${Prisma.join(values)})
      ON CONFLICT("bucket_start", "facet_key") DO UPDATE SET ${Prisma.join(updates)}
    `);
  }

  async readSnapshot(plan: TokenUsageAnalyticsRangePlan, filters: TokenUsageAnalyticsFilters): Promise<TokenUsageAnalyticsSnapshot> {
    return this.client.$transaction(async (transaction) => {
      const coverage = await transaction.tokenUsageAnalyticsCoverage.findUnique({
        where: { id: TOKEN_USAGE_ANALYTICS_COVERAGE_ID },
      });
      if (!coverage) throw new Error("TOKEN_USAGE_ANALYTICS_COVERAGE_NOT_INITIALIZED");
      const [selectedFacets, comparisonFacets, filterFacets] = await Promise.all([
        this.listFacets(transaction, plan.selected, filters),
        plan.comparison ? this.listFacets(transaction, plan.comparison, filters) : Promise.resolve([]),
        this.listFacets(transaction, plan.selected, { runtimeKind: null, providerKey: null, modelKey: null }),
      ]);
      return { coverageStart: coverage.coverageStart, selectedFacets, comparisonFacets, filterFacets };
    }, { maxWait: 30_000, timeout: 120_000 });
  }

  private async listFacets(
    transaction: TokenUsageRunTransaction,
    range: TokenUsageAnalyticsRange,
    filters: TokenUsageAnalyticsFilters,
  ) {
    const predicates: Prisma.Sql[] = [
      Prisma.sql`"bucket_start" >= ${range.startTime}`,
      Prisma.sql`"bucket_start" < ${range.endTimeExclusive}`,
    ];
    if (filters.runtimeKind) predicates.push(Prisma.sql`"runtime_kind" = ${filters.runtimeKind}`);
    if (filters.providerKey) predicates.push(Prisma.sql`"provider_key" = ${filters.providerKey}`);
    if (filters.modelKey) predicates.push(Prisma.sql`"model_key" = ${filters.modelKey}`);
    const rows = await transaction.$queryRaw<TokenUsageAnalyticsFacetRow[]>(Prisma.sql`
      SELECT * FROM "token_usage_analytics_daily_facets"
      WHERE ${Prisma.join(predicates, " AND ")}
      ORDER BY "bucket_start" ASC, "identity_key" ASC, "facet_key" ASC
    `);
    return rows.map(fromTokenUsageAnalyticsFacetRow);
  }
}
