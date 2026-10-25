export type TokenUsageUnitPriceSummaryStatus =
  | "single"
  | "mixed"
  | "missing"
  | "partial_missing"
  | "not_applicable"
  | "local_no_api_bill";

export interface TokenUsageUnitPriceSummary {
  status: TokenUsageUnitPriceSummaryStatus;
  price_per_million: number | null;
}

export interface TokenUsageUnitPrices {
  standard_input: TokenUsageUnitPriceSummary;
  cache_read_input: TokenUsageUnitPriceSummary;
  cache_creation_input: TokenUsageUnitPriceSummary;
  cache_creation_5m_input: TokenUsageUnitPriceSummary;
  cache_creation_1h_input: TokenUsageUnitPriceSummary;
  output: TokenUsageUnitPriceSummary;
  reasoning_output: TokenUsageUnitPriceSummary;
}
