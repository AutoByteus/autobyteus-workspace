import type {
  TokenUsageUnitPrices,
  TokenUsageUnitPriceSummary,
  TokenUsageUnitPriceSummaryStatus,
  TokenUsageUpdatedPayload,
} from '~/types/tokenUsageMeter';

type TokenUsageUnitPricePayload = Omit<TokenUsageUpdatedPayload, 'run_id'>;

const PRICE_COMPARISON_EPSILON = 1e-9;

export const notApplicableUnitPrice = (): TokenUsageUnitPriceSummary => ({
  status: 'not_applicable',
  pricePerMillion: null,
});

export const emptyUnitPrices = (): TokenUsageUnitPrices => ({
  standardInput: notApplicableUnitPrice(),
  cacheReadInput: notApplicableUnitPrice(),
  cacheCreationInput: notApplicableUnitPrice(),
  cacheCreation5mInput: notApplicableUnitPrice(),
  cacheCreation1hInput: notApplicableUnitPrice(),
  output: notApplicableUnitPrice(),
  reasoningOutput: notApplicableUnitPrice(),
});

const normalizedUnitPriceStatus = (status?: string | null): TokenUsageUnitPriceSummaryStatus => {
  if (
    status === 'single' ||
    status === 'mixed' ||
    status === 'missing' ||
    status === 'partial_missing' ||
    status === 'not_applicable' ||
    status === 'local_no_api_bill'
  ) {
    return status;
  }
  return 'missing';
};

export const unitPricesOrEmpty = (unitPrices?: TokenUsageUnitPrices | null): TokenUsageUnitPrices => {
  if (!unitPrices) return emptyUnitPrices();
  return {
    standardInput: {
      status: normalizedUnitPriceStatus(unitPrices.standardInput?.status),
      pricePerMillion: unitPrices.standardInput?.pricePerMillion ?? null,
    },
    cacheReadInput: {
      status: normalizedUnitPriceStatus(unitPrices.cacheReadInput?.status),
      pricePerMillion: unitPrices.cacheReadInput?.pricePerMillion ?? null,
    },
    cacheCreationInput: {
      status: normalizedUnitPriceStatus(unitPrices.cacheCreationInput?.status),
      pricePerMillion: unitPrices.cacheCreationInput?.pricePerMillion ?? null,
    },
    cacheCreation5mInput: {
      status: normalizedUnitPriceStatus(unitPrices.cacheCreation5mInput?.status),
      pricePerMillion: unitPrices.cacheCreation5mInput?.pricePerMillion ?? null,
    },
    cacheCreation1hInput: {
      status: normalizedUnitPriceStatus(unitPrices.cacheCreation1hInput?.status),
      pricePerMillion: unitPrices.cacheCreation1hInput?.pricePerMillion ?? null,
    },
    output: {
      status: normalizedUnitPriceStatus(unitPrices.output?.status),
      pricePerMillion: unitPrices.output?.pricePerMillion ?? null,
    },
    reasoningOutput: {
      status: normalizedUnitPriceStatus(unitPrices.reasoningOutput?.status),
      pricePerMillion: unitPrices.reasoningOutput?.pricePerMillion ?? null,
    },
  };
};

const pricesEqual = (left: number | null, right: number | null): boolean => (
  left !== null && right !== null && Math.abs(left - right) <= PRICE_COMPARISON_EPSILON
);

const eventUnitPriceSummary = (
  payload: TokenUsageUnitPricePayload,
  tokens: number,
  pricePerMillion: number | null | undefined,
): TokenUsageUnitPriceSummary => {
  if (tokens <= 0) return notApplicableUnitPrice();
  if (payload.api_cost_status === 'mixed') return { status: 'mixed', pricePerMillion: null };
  if (payload.api_cost_status === 'local_no_api_bill') return { status: 'local_no_api_bill', pricePerMillion: null };
  if (payload.api_cost_status === 'price_missing') return { status: 'missing', pricePerMillion: null };
  if (typeof pricePerMillion === 'number' && Number.isFinite(pricePerMillion)) {
    return { status: 'single', pricePerMillion };
  }
  return { status: 'missing', pricePerMillion: null };
};

const mergeUnitPriceSummary = (
  current: TokenUsageUnitPriceSummary,
  incoming: TokenUsageUnitPriceSummary,
): TokenUsageUnitPriceSummary => {
  if (incoming.status === 'not_applicable') return current;
  if (current.status === 'not_applicable') return incoming;
  if (current.status === 'mixed' || incoming.status === 'mixed') return { status: 'mixed', pricePerMillion: null };
  if (current.status === 'local_no_api_bill' || incoming.status === 'local_no_api_bill') {
    return current.status === incoming.status
      ? { status: 'local_no_api_bill', pricePerMillion: null }
      : { status: 'mixed', pricePerMillion: null };
  }

  const currentPrice = current.pricePerMillion;
  const incomingPrice = incoming.pricePerMillion;
  if (currentPrice !== null && incomingPrice !== null && !pricesEqual(currentPrice, incomingPrice)) {
    return { status: 'mixed', pricePerMillion: null };
  }

  const pricePerMillion = currentPrice ?? incomingPrice;
  if (current.status === 'missing' && incoming.status === 'missing') {
    return { status: 'missing', pricePerMillion: null };
  }
  if (current.status === 'missing' || incoming.status === 'missing' || current.status === 'partial_missing' || incoming.status === 'partial_missing') {
    return { status: 'partial_missing', pricePerMillion };
  }
  return { status: 'single', pricePerMillion };
};

const genericCacheCreationTokens = (total: number, fiveMinute: number, oneHour: number): number =>
  Math.max(total - fiveMinute - oneHour, 0);

export const mergeUnitPrices = (
  current: TokenUsageUnitPrices,
  payload: TokenUsageUnitPricePayload,
): TokenUsageUnitPrices => ({
  standardInput: mergeUnitPriceSummary(current.standardInput, eventUnitPriceSummary(payload, payload.standard_input_tokens ?? 0, payload.input_price_per_million)),
  cacheReadInput: mergeUnitPriceSummary(current.cacheReadInput, eventUnitPriceSummary(payload, payload.cache_read_input_tokens ?? 0, payload.cached_input_read_price_per_million)),
  cacheCreationInput: mergeUnitPriceSummary(current.cacheCreationInput, eventUnitPriceSummary(payload, genericCacheCreationTokens(
    payload.cache_creation_input_tokens ?? 0,
    payload.cache_creation_5m_input_tokens ?? 0,
    payload.cache_creation_1h_input_tokens ?? 0,
  ), payload.cached_input_write_price_per_million)),
  cacheCreation5mInput: mergeUnitPriceSummary(current.cacheCreation5mInput, eventUnitPriceSummary(payload, payload.cache_creation_5m_input_tokens ?? 0, payload.cached_input_write_5m_price_per_million)),
  cacheCreation1hInput: mergeUnitPriceSummary(current.cacheCreation1hInput, eventUnitPriceSummary(payload, payload.cache_creation_1h_input_tokens ?? 0, payload.cached_input_write_1h_price_per_million)),
  output: mergeUnitPriceSummary(current.output, eventUnitPriceSummary(payload, payload.billable_output_tokens ?? payload.meter_delta_output_tokens ?? 0, payload.output_price_per_million)),
  reasoningOutput: mergeUnitPriceSummary(current.reasoningOutput, eventUnitPriceSummary(payload, payload.reasoning_output_tokens ?? 0, payload.output_price_per_million)),
});

const mixedSummary = (tokens: number): TokenUsageUnitPriceSummary => (
  tokens > 0 ? { status: 'mixed', pricePerMillion: null } : notApplicableUnitPrice()
);

export const forceMixedUnitPrices = (tokens: {
  standardInputTokens: number;
  cacheReadInputTokens: number;
  cacheCreationInputTokens: number;
  cacheCreation5mInputTokens: number;
  cacheCreation1hInputTokens: number;
  outputTokens: number;
  reasoningOutputTokens: number;
}): TokenUsageUnitPrices => ({
  standardInput: mixedSummary(tokens.standardInputTokens),
  cacheReadInput: mixedSummary(tokens.cacheReadInputTokens),
  cacheCreationInput: mixedSummary(genericCacheCreationTokens(tokens.cacheCreationInputTokens, tokens.cacheCreation5mInputTokens, tokens.cacheCreation1hInputTokens)),
  cacheCreation5mInput: mixedSummary(tokens.cacheCreation5mInputTokens),
  cacheCreation1hInput: mixedSummary(tokens.cacheCreation1hInputTokens),
  output: mixedSummary(tokens.outputTokens),
  reasoningOutput: mixedSummary(tokens.reasoningOutputTokens),
});
