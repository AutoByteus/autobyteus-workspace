import { isCacheState } from "../../domain/token-usage-component-basis.js";
import {
  TOKEN_USAGE_COST_FIELDS,
  TOKEN_USAGE_TOKEN_FIELDS,
  type TokenUsageCostTotals,
  type TokenUsageTokenTotals,
} from "../../domain/token-usage-accounting-summary.js";
import type { TokenUsageAnalyticsDailyFacet } from "../../domain/token-usage-analytics.js";
import { decodeTokenUsagePricingSummary } from "./token-usage-run-summary-codec.js";

export type TokenUsageAnalyticsFacetRow = Record<string, unknown> & {
  bucket_start: Date | string;
  facet_key: string;
  identity_key: string;
  provider_key: string;
  model_key: string;
  runtime_kind: string;
  model_provider: string | null;
  provider_name: string | null;
  model_identifier: string | null;
  model_value: string | null;
  cache_state: string;
  pricing_summary_json: string;
  usage_report_count: bigint | number;
  latest_observed_at: Date | string;
};

const date = (value: Date | string, field: string): Date => {
  const parsed = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(parsed.getTime())) throw new Error(`TOKEN_USAGE_ANALYTICS_INVALID_DATE:${field}`);
  return parsed;
};
const bigint = (value: unknown, field: string): bigint => {
  if (typeof value === "bigint") return value;
  if (typeof value === "number" && Number.isSafeInteger(value)) return BigInt(value);
  if (typeof value === "string" && /^\d+$/.test(value)) return BigInt(value);
  throw new Error(`TOKEN_USAGE_ANALYTICS_INVALID_BIGINT:${field}`);
};
const nullableCost = (value: unknown, field: string): number | null => {
  if (value === null || value === undefined) return null;
  if (typeof value !== "number" || !Number.isFinite(value)) throw new Error(`TOKEN_USAGE_ANALYTICS_INVALID_COST:${field}`);
  return value;
};

export const fromTokenUsageAnalyticsFacetRow = (row: TokenUsageAnalyticsFacetRow): TokenUsageAnalyticsDailyFacet => {
  if (!isCacheState(row.cache_state)) throw new Error("TOKEN_USAGE_ANALYTICS_INVALID_CACHE_STATE");
  return {
    bucketStart: date(row.bucket_start, "bucket_start"),
    facetKey: row.facet_key,
    identityKey: row.identity_key,
    providerKey: row.provider_key,
    modelKey: row.model_key,
    runtimeKind: row.runtime_kind,
    modelProvider: row.model_provider,
    providerName: row.provider_name,
    modelIdentifier: row.model_identifier,
    modelValue: row.model_value,
    cacheState: row.cache_state,
    pricingSummary: decodeTokenUsagePricingSummary(row.pricing_summary_json),
    tokenTotals: Object.fromEntries(TOKEN_USAGE_TOKEN_FIELDS.map((field) => [field, bigint(row[field], field)])) as TokenUsageTokenTotals,
    costTotals: Object.fromEntries(TOKEN_USAGE_COST_FIELDS.map((field) => [field, nullableCost(row[field], field)])) as TokenUsageCostTotals,
    usageReportCount: bigint(row.usage_report_count, "usage_report_count"),
    latestObservedAt: date(row.latest_observed_at, "latest_observed_at"),
    observedRuntimeKinds: [row.runtime_kind],
    observedModelProviders: row.model_provider ? [row.model_provider] : [],
    observedModelIdentifiers: [row.model_identifier ?? row.model_value ?? "Unknown"],
  };
};
