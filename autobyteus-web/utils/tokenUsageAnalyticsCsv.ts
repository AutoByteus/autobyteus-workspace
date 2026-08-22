import type { TokenUsageAnalyticsGrouping, TokenUsageAnalyticsResult } from '~/types/tokenUsageAnalytics';

const cell = (value: unknown): string => `"${String(value ?? '').replace(/"/g, '""')}"`;
const dateOnly = (value: string): string => value.slice(0, 10);

export const serializeTokenUsageAnalyticsCsv = (
  result: TokenUsageAnalyticsResult,
  grouping: TokenUsageAnalyticsGrouping,
): { filename: string; csv: string } => {
  const headers = [
    'range_start_utc', 'range_end_exclusive_utc', 'coverage_start_utc', 'coverage_status', 'grouping',
    'filter_runtime_kind', 'filter_provider_key', 'filter_model_key', 'row_key', 'runtime_kind',
    'model_provider', 'provider_name', 'provider_display_name', 'model_identifier', 'model_value', 'model_display_name',
    'gross_input_tokens', 'standard_input_tokens', 'cache_miss_input_tokens', 'cache_read_input_tokens',
    'cache_creation_input_tokens', 'cache_creation_5m_input_tokens', 'cache_creation_1h_input_tokens',
    'output_tokens', 'reasoning_output_tokens', 'billable_output_tokens', 'total_tokens',
    'estimated_api_input_cost', 'estimated_api_standard_input_cost', 'estimated_api_cache_read_input_cost',
    'estimated_api_cache_creation_input_cost', 'estimated_api_cache_creation_5m_input_cost',
    'estimated_api_cache_creation_1h_input_cost', 'estimated_api_output_cost',
    'estimated_api_reasoning_output_cost', 'estimated_api_total_cost', 'currency',
    'captured_api_cost_status', 'derived_cost_quality', 'missing_price_dimensions', 'usage_report_count',
  ];
  const rows = result.breakdownRows.map((row) => {
    const aggregate = row.aggregate;
    return [
      result.appliedRange.startTime, result.appliedRange.endTimeExclusive, result.coverage.coverageStart,
      result.coverage.status, grouping, result.appliedFilters.runtimeKind, result.appliedFilters.providerKey,
      result.appliedFilters.modelKey, row.rowKey, row.runtimeKind, row.modelProvider, row.providerName,
      row.providerDisplayName, row.modelIdentifier, row.modelValue, row.modelDisplayName,
      aggregate.grossInputTokens, aggregate.standardInputTokens, aggregate.cacheMissInputTokens,
      aggregate.cacheReadInputTokens, aggregate.cacheCreationInputTokens, aggregate.cacheCreation5mInputTokens,
      aggregate.cacheCreation1hInputTokens, aggregate.outputTokens, aggregate.reasoningOutputTokens,
      aggregate.billableOutputTokens, aggregate.totalTokens, aggregate.estimatedApiInputCost,
      aggregate.estimatedApiStandardInputCost, aggregate.estimatedApiCacheReadInputCost,
      aggregate.estimatedApiCacheCreationInputCost, aggregate.estimatedApiCacheCreation5mInputCost,
      aggregate.estimatedApiCacheCreation1hInputCost, aggregate.estimatedApiOutputCost,
      aggregate.estimatedApiReasoningOutputCost, aggregate.estimatedApiTotalCost, aggregate.currency,
      aggregate.apiCostStatus, row.costQuality.kind, row.costQuality.missingPriceDimensions.join('|'), aggregate.usageReportCount,
    ].map(cell).join(',');
  });
  const inclusiveEnd = new Date(Date.parse(result.appliedRange.endTimeExclusive) - 86_400_000).toISOString();
  return {
    filename: `token-usage-analytics_${dateOnly(result.appliedRange.startTime)}_${dateOnly(inclusiveEnd)}.csv`,
    csv: [headers.map(cell).join(','), ...rows].join('\r\n'),
  };
};

export const downloadTokenUsageAnalyticsCsv = (result: TokenUsageAnalyticsResult, grouping: TokenUsageAnalyticsGrouping): void => {
  const serialized = serializeTokenUsageAnalyticsCsv(result, grouping);
  const url = URL.createObjectURL(new Blob([serialized.csv], { type: 'text/csv;charset=utf-8' }));
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = serialized.filename;
  anchor.click();
  URL.revokeObjectURL(url);
};
