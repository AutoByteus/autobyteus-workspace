import { createHash } from "node:crypto";
import type { TokenUsageUpdatedPayload } from "../../agent-execution/domain/agent-run-token-usage.js";
import {
  TOKEN_USAGE_COST_FIELDS,
  TOKEN_USAGE_TOKEN_FIELDS,
  type TokenUsageCostTotals,
  type TokenUsageTokenTotals,
} from "../domain/token-usage-accounting-summary.js";
import type { TokenUsageAnalyticsFacetIncrement } from "../domain/token-usage-analytics.js";
import { pricingSummaryFromPayload } from "./token-usage-pricing-summary.js";

const nullable = (value: string | null | undefined): string | null => value?.trim() || null;
const tuple = (values: readonly (string | null)[]): string => values.map((value) => {
  if (value === null) return "N;";
  return `S${Buffer.byteLength(value, "utf8")}:${value};`;
}).join("");
const digest = (subject: string, values: readonly (string | null)[]): string =>
  `v1:${createHash("sha256").update(`token-usage-analytics:${subject}:v1;${tuple(values)}`).digest("hex")}`;
const costSignature = (payload: TokenUsageUpdatedPayload): string => JSON.stringify({
  currency: nullable(payload.currency),
  status: payload.api_cost_status,
  missing: [...new Set(payload.missing_price_dimensions)].sort(),
  policy: nullable(payload.pricing_policy_key),
  tier: nullable(payload.selected_pricing_tier_id),
  input: payload.input_price_per_million,
  output: payload.output_price_per_million,
  cacheRead: payload.cached_input_read_price_per_million,
  cacheWrite: payload.cached_input_write_price_per_million,
  cacheWrite5m: payload.cached_input_write_5m_price_per_million,
  cacheWrite1h: payload.cached_input_write_1h_price_per_million,
});
const nonNegativeBigInt = (value: number | null, field: string): bigint => {
  if (value === null) return 0n;
  if (!Number.isSafeInteger(value) || value < 0) throw new Error(`Token usage analytics field '${field}' is outside JavaScript SafeInt.`);
  return BigInt(value);
};

export const isTokenUsageAnalyticsOpaqueKey = (value: string): boolean => /^v1:[a-f0-9]{64}$/.test(value);

export const projectTokenUsageAnalyticsContribution = (
  payload: TokenUsageUpdatedPayload,
): TokenUsageAnalyticsFacetIncrement => {
  const observedAt = new Date(payload.observed_at);
  if (Number.isNaN(observedAt.getTime())) throw new Error("TOKEN_USAGE_ANALYTICS_OBSERVED_AT_INVALID");
  const bucketStart = new Date(Date.UTC(observedAt.getUTCFullYear(), observedAt.getUTCMonth(), observedAt.getUTCDate()));
  const runtimeKind = payload.runtime_kind.trim() || "Unknown";
  const modelProvider = nullable(payload.model_provider);
  const providerName = nullable(payload.provider_name);
  const modelIdentifier = nullable(payload.model_identifier);
  const modelValue = nullable(payload.model_value);
  const providerKey = digest("provider", [modelProvider, providerName]);
  const modelKey = digest("model", [modelIdentifier, modelValue]);
  const identityKey = digest("identity", [runtimeKind, modelProvider, providerName, modelIdentifier, modelValue]);
  const facetKey = digest("facet", [identityKey, payload.cache_state, costSignature(payload)]);
  const tokenTotals = Object.fromEntries(TOKEN_USAGE_TOKEN_FIELDS.map((field) => [
    field, nonNegativeBigInt(payload[field], field),
  ])) as TokenUsageTokenTotals;
  const costTotals = Object.fromEntries(TOKEN_USAGE_COST_FIELDS.map((field) => [field, payload[field]])) as TokenUsageCostTotals;
  return {
    bucketStart,
    facetKey,
    identityKey,
    providerKey,
    modelKey,
    runtimeKind,
    modelProvider,
    providerName,
    modelIdentifier,
    modelValue,
    cacheState: payload.cache_state,
    pricingSummary: pricingSummaryFromPayload(payload),
    tokenTotals,
    costTotals,
    usageReportCount: 1n,
    latestObservedAt: observedAt,
  };
};
