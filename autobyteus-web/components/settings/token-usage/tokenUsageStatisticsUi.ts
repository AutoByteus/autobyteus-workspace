import type { TokenUsageCostSummaryAggregate } from '~/types/tokenUsageCostSummary';
import type { TokenUsageApiCostStatus } from '~/types/tokenUsageMeter';

export type TokenUsageTranslator = (key: string, params?: Record<string, string | number>) => string;

const runtimeLabels: Record<string, string> = {
  autobyteus: 'Autobyteus',
  codex_app_server: 'Codex',
  claude_agent_sdk: 'Claude SDK',
};

export const shortId = (value: string | null | undefined): string => {
  const normalized = value?.trim();
  if (!normalized) return '';
  return normalized.length <= 8 ? normalized : `…${normalized.slice(-8)}`;
};

export const createTokenUsageStatisticsFormatter = (t: TokenUsageTranslator) => {
  const formatInteger = (value: number): string => new Intl.NumberFormat().format(value);

  const formatCompactInteger = (value: number): string => {
    const absoluteValue = Math.abs(value);
    if (absoluteValue < 10_000) return formatInteger(value);
    return new Intl.NumberFormat(undefined, {
      notation: 'compact',
      compactDisplay: 'short',
      maximumFractionDigits: absoluteValue >= 1_000_000 ? 2 : 1,
    }).format(value);
  };

  const formatRatePercent = (value: number | null): string => (
    value === null ? t('shell.tokenUsage.unknown') : `${(value * 100).toFixed(1)}%`
  );

  const formatCostAmount = (value: number | null, currency: string | null): string => {
    if (value === null) return t('shell.tokenUsage.unpriced');
    const fractionDigits = Math.abs(value) >= 1 ? 2 : 4;
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency: currency || 'USD',
      currencyDisplay: 'narrowSymbol',
      minimumFractionDigits: fractionDigits,
      maximumFractionDigits: fractionDigits,
    }).format(value);
  };

  const formatCostCell = (
    value: number | null,
    currency: string | null,
    status: TokenUsageApiCostStatus,
  ): string => {
    if (status === 'local_no_api_bill') return t('shell.tokenUsage.priceStatusLocal');
    if (value === null) {
      if (status === 'mixed') return t('shell.tokenUsage.mixedEstimateSuffix');
      return t('shell.tokenUsage.unpriced');
    }
    const formatted = formatCostAmount(value, currency);
    if (status === 'partial_price_missing') return `${formatted} ${t('shell.tokenUsage.partialEstimateSuffix')}`;
    if (status === 'mixed') return `${formatted} ${t('shell.tokenUsage.mixedEstimateSuffix')}`;
    return formatted;
  };

  const formatStatus = (status: string): string => {
    if (status === 'estimated') return t('shell.tokenUsage.priceStatusComplete');
    if (status === 'partial_price_missing') return t('shell.tokenUsage.priceStatusPartial');
    if (status === 'price_missing') return t('shell.tokenUsage.priceStatusMissing');
    if (status === 'local_no_api_bill') return t('shell.tokenUsage.priceStatusLocal');
    if (status === 'mixed') return t('shell.tokenUsage.priceStatusMixed');
    return status.replace(/_/g, ' ');
  };

  const statusClass = (status: string): string => {
    const base = 'inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset';
    if (status === 'estimated') return `${base} bg-emerald-50 text-emerald-700 ring-emerald-100`;
    if (status === 'local_no_api_bill') return `${base} bg-sky-50 text-sky-700 ring-sky-100`;
    if (status === 'mixed') return `${base} bg-slate-100 text-slate-700 ring-slate-200`;
    return `${base} bg-amber-50 text-amber-700 ring-amber-100`;
  };

  const formatRuntimeKind = (runtimeKind: string): string => runtimeLabels[runtimeKind] ?? runtimeKind;

  const formatDistinctValues = (values: string[], kind: 'runtime' | 'model'): string => {
    const normalized = values.filter(Boolean);
    if (normalized.length === 0) return t('settings.components.settings.TokenUsageStatistics.unknown');
    if (normalized.length === 1) return kind === 'runtime' ? formatRuntimeKind(normalized[0]!) : normalized[0]!;
    return t('settings.components.settings.TokenUsageStatistics.mixedWithValues', {
      values: normalized.map((value) => kind === 'runtime' ? formatRuntimeKind(value) : value).join(', '),
    });
  };

  const formatCreatedAt = (value: string): string => {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return new Intl.DateTimeFormat(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  };

  const cacheSubline = (aggregate: TokenUsageCostSummaryAggregate): string => {
    if (aggregate.cacheState === 'positive' || aggregate.cacheState === 'zero_reported') {
      return t('settings.components.settings.TokenUsageStatistics.cacheHitWithCached', {
        percent: formatRatePercent(aggregate.cacheReadInputTokenRate),
        cached: formatCompactInteger(aggregate.cacheReadInputTokens),
      });
    }
    if (aggregate.cacheState === 'unsupported_or_local') return t('shell.tokenUsage.cacheUnsupportedLocal');
    return t('settings.components.settings.TokenUsageStatistics.noCacheData');
  };

  const thinkingSubline = (aggregate: TokenUsageCostSummaryAggregate): string => (
    aggregate.reasoningOutputTokens > 0
      ? t('settings.components.settings.TokenUsageStatistics.thinkingIncluded', {
        tokens: formatCompactInteger(aggregate.reasoningOutputTokens),
      })
      : ''
  );

  return {
    cacheSubline,
    formatCompactInteger,
    formatCostAmount,
    formatCostCell,
    formatCreatedAt,
    formatDistinctValues,
    formatInteger,
    formatRuntimeKind,
    formatStatus,
    statusClass,
    thinkingSubline,
  };
};
