import type { DistinctValueSummary } from "../../domain/token-usage-distinct-value-summary.js";
import {
  TOKEN_USAGE_UNIT_PRICE_FIELDS,
  type TokenUsagePricingSummary,
} from "../../domain/token-usage-accounting-summary.js";
import type { TokenUsageIdentitySummary } from "../../domain/token-usage-run-record.js";
import type { TokenUsageUnitPriceSummary } from "../../domain/token-usage-unit-price-summary.js";

const MAX_QUALITY_FLAGS = 32;
const MAX_QUALITY_FLAG_LENGTH = 96;

const asRecord = (value: unknown): Record<string, unknown> => {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("Token usage summary state must be an object.");
  }
  return value as Record<string, unknown>;
};

const parseDistinct = <T extends string | number>(
  value: unknown,
  primitive: "string" | "number",
): DistinctValueSummary<T> => {
  const record = asRecord(value);
  if (record.status === "unknown" || record.status === "mixed") return { status: record.status };
  if (record.status !== "single" || typeof record.value !== primitive) {
    throw new Error("Token usage distinct-value state is invalid.");
  }
  if (primitive === "number" && !Number.isFinite(record.value)) {
    throw new Error("Token usage numeric distinct-value state is not finite.");
  }
  return { status: "single", value: record.value as T };
};

export const decodeTokenUsageIdentitySummary = (value: string): TokenUsageIdentitySummary => {
  const record = asRecord(JSON.parse(value) as unknown);
  return {
    runtimeKinds: parseDistinct(record.runtimeKinds, "string"),
    modelProviders: parseDistinct(record.modelProviders, "string"),
    providerNames: parseDistinct(record.providerNames, "string"),
    modelIdentifiers: parseDistinct(record.modelIdentifiers, "string"),
    modelValues: parseDistinct(record.modelValues, "string"),
    rootTeamRunIds: parseDistinct(record.rootTeamRunIds, "string"),
  };
};

export const decodeTokenUsagePricingSummary = (value: string): TokenUsagePricingSummary => {
  const record = asRecord(JSON.parse(value) as unknown);
  const unitPrices = asRecord(record.unitPrices);
  return {
    currencies: parseDistinct(record.currencies, "string"),
    apiCostStatuses: parseDistinct(record.apiCostStatuses, "string"),
    pricingPolicyKeys: parseDistinct(record.pricingPolicyKeys, "string"),
    selectedPricingTierIds: parseDistinct(record.selectedPricingTierIds, "string"),
    missingPriceDimensions: Array.isArray(record.missingPriceDimensions)
      ? [...new Set(record.missingPriceDimensions.filter((item): item is string => typeof item === "string"))].sort()
      : [],
    unitPrices: Object.fromEntries(TOKEN_USAGE_UNIT_PRICE_FIELDS.map((field) => {
      const summary = asRecord(unitPrices[field]);
      const statuses = ["single", "mixed", "missing", "partial_missing", "not_applicable", "local_no_api_bill"];
      if (typeof summary.status !== "string" || !statuses.includes(summary.status)) {
        throw new Error("Token usage unit-price state is invalid.");
      }
      if (summary.price_per_million !== null && (typeof summary.price_per_million !== "number" || !Number.isFinite(summary.price_per_million))) {
        throw new Error("Token usage unit-price value is invalid.");
      }
      return [field, {
        status: summary.status,
        price_per_million: summary.price_per_million,
      } as TokenUsageUnitPriceSummary];
    })) as unknown as TokenUsagePricingSummary["unitPrices"],
  };
};

export const normalizeTokenUsageQualityFlags = (flags: readonly string[]): string[] => {
  const accepted = [...new Set(flags.map((flag) => flag.trim()).filter((flag) => (
    flag.length > 0 && flag.length <= MAX_QUALITY_FLAG_LENGTH && /^[a-z0-9_]+$/.test(flag)
  )))].sort();
  if (accepted.length <= MAX_QUALITY_FLAGS) return accepted;
  return [...accepted.slice(0, MAX_QUALITY_FLAGS - 1), "quality_flags_compacted"];
};
