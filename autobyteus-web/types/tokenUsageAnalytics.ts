import type { GetTokenUsageAnalyticsQuery } from '~/generated/graphql';

export type TokenUsageAnalyticsRangePreset = 'THIS_MONTH' | 'LAST_MONTH' | 'LAST_3_MONTHS' | 'LAST_12_MONTHS' | 'CUSTOM';
export type TokenUsageAnalyticsMetric = 'TOKENS' | 'COST';
export type TokenUsageAnalyticsGrouping = 'RUNTIME_MODEL' | 'RUNTIME' | 'PROVIDER' | 'MODEL';
export type TokenUsageAnalyticsResult = GetTokenUsageAnalyticsQuery['tokenUsageAnalytics'];
export type TokenUsageAnalyticsBreakdownRow = TokenUsageAnalyticsResult['breakdownRows'][number];

export interface TokenUsageAnalyticsSelection {
  rangePreset: TokenUsageAnalyticsRangePreset;
  startDate: string;
  endDate: string;
  runtimeKind: string | null;
  providerKey: string | null;
  modelKey: string | null;
}
