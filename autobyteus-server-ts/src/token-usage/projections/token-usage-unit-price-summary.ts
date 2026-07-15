import type { TokenUsageUpdatedPayload } from "../../agent-execution/domain/agent-run-token-usage.js";
import type {
  TokenUsageUnitPrices,
  TokenUsageUnitPriceSummary,
} from "../domain/token-usage-unit-price-summary.js";

type TokenSelector = (event: TokenUsageUpdatedPayload) => number | null | undefined;
type PriceSelector = (event: TokenUsageUpdatedPayload) => number | null | undefined;

const PRICE_COMPARISON_EPSILON = 1e-9;

export const notApplicableUnitPriceSummary = (): TokenUsageUnitPriceSummary => ({
  status: "not_applicable",
  price_per_million: null,
});

const isPositiveTokenEvent = (
  event: TokenUsageUpdatedPayload,
  selectTokens: TokenSelector,
): boolean => (selectTokens(event) ?? 0) > 0;

const isLocalNoApiBill = (event: TokenUsageUpdatedPayload): boolean => (
  event.api_cost_status === "local_no_api_bill" || event.pricing_status === "local_no_api_bill"
);

const uniquePrices = (prices: number[]): number[] => {
  const unique: number[] = [];
  for (const price of prices) {
    if (!Number.isFinite(price)) continue;
    if (!unique.some((existing) => Math.abs(existing - price) <= PRICE_COMPARISON_EPSILON)) {
      unique.push(price);
    }
  }
  return unique;
};

export const buildTokenUsageUnitPriceSummary = (
  events: TokenUsageUpdatedPayload[],
  selectTokens: TokenSelector,
  selectPrice: PriceSelector,
  options: { forceMixed?: boolean } = {},
): TokenUsageUnitPriceSummary => {
  const relevantEvents = events.filter((event) => isPositiveTokenEvent(event, selectTokens));
  if (relevantEvents.length === 0) return notApplicableUnitPriceSummary();
  if (options.forceMixed) return { status: "mixed", price_per_million: null };

  const localEvents = relevantEvents.filter(isLocalNoApiBill);
  if (localEvents.length === relevantEvents.length) {
    return { status: "local_no_api_bill", price_per_million: null };
  }
  if (localEvents.length > 0) return { status: "mixed", price_per_million: null };

  const trustableEvents = relevantEvents.filter((event) => (
    event.api_cost_status !== "price_missing" && event.pricing_status === "trusted"
  ));
  if (trustableEvents.length === 0) return { status: "missing", price_per_million: null };

  const prices = uniquePrices(
    trustableEvents
      .map(selectPrice)
      .filter((price): price is number => typeof price === "number" && Number.isFinite(price)),
  );
  const pricedEventCount = trustableEvents.filter((event) => {
    const price = selectPrice(event);
    return typeof price === "number" && Number.isFinite(price);
  }).length;
  const missingEventCount = relevantEvents.length - pricedEventCount;

  if (prices.length > 1) return { status: "mixed", price_per_million: null };
  if (prices.length === 1 && missingEventCount === 0) {
    return { status: "single", price_per_million: prices[0]! };
  }
  if (prices.length === 1) {
    return { status: "partial_missing", price_per_million: prices[0]! };
  }
  return { status: "missing", price_per_million: null };
};

export const buildTokenUsageUnitPrices = (
  events: TokenUsageUpdatedPayload[],
  options: { forceMixed?: boolean } = {},
): TokenUsageUnitPrices => ({
  standard_input: buildTokenUsageUnitPriceSummary(
    events,
    (event) => event.standard_input_tokens,
    (event) => event.input_price_per_million,
    options,
  ),
  cache_read_input: buildTokenUsageUnitPriceSummary(
    events,
    (event) => event.cache_read_input_tokens,
    (event) => event.cached_input_read_price_per_million,
    options,
  ),
  cache_creation_input: buildTokenUsageUnitPriceSummary(
    events,
    (event) => {
      const aggregateTokens = event.cache_creation_input_tokens;
      if (aggregateTokens === null || aggregateTokens === undefined) return aggregateTokens;
      return Math.max(
        aggregateTokens - (event.cache_creation_5m_input_tokens ?? 0) - (event.cache_creation_1h_input_tokens ?? 0),
        0,
      );
    },
    (event) => event.cached_input_write_price_per_million,
    options,
  ),
  cache_creation_5m_input: buildTokenUsageUnitPriceSummary(
    events,
    (event) => event.cache_creation_5m_input_tokens,
    (event) => event.cached_input_write_5m_price_per_million,
    options,
  ),
  cache_creation_1h_input: buildTokenUsageUnitPriceSummary(
    events,
    (event) => event.cache_creation_1h_input_tokens,
    (event) => event.cached_input_write_1h_price_per_million,
    options,
  ),
  output: buildTokenUsageUnitPriceSummary(
    events,
    (event) => event.billable_output_tokens ?? event.accounting_output_tokens,
    (event) => event.output_price_per_million,
    options,
  ),
  reasoning_output: buildTokenUsageUnitPriceSummary(
    events,
    (event) => event.reasoning_output_tokens,
    (event) => event.output_price_per_million,
    options,
  ),
});
