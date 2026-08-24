import type { TokenUsageApiCostStatus, TokenUsageRunSummary, TokenUsageUnitPriceSummary } from '~/types/tokenUsageMeter';

export type TokenUsageTranslator = (key: string, params?: Record<string, string | number>) => string;

export const createTokenUsageFormatter = (t: TokenUsageTranslator) => {
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

  const formatTokenDetail = (value: number): string => `${formatInteger(value)} ${t('shell.tokenUsage.tokensLabel')}`;

  const formatCost = (
    value: number | null,
    currency: string | null,
    status?: TokenUsageApiCostStatus | string,
  ): string => {
    if (status === 'local_no_api_bill') return t('shell.tokenUsage.priceStatusLocal');
    if (status === 'mixed') return t('shell.tokenUsage.priceStatusMixed');
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

  const formatPercent = (value: number | null): string => (
    value === null ? t('shell.tokenUsage.unknown') : `${value.toFixed(1)}%`
  );

  const formatRatePercent = (value: number | null): string => (
    value === null ? t('shell.tokenUsage.unknown') : `${(value * 100).toFixed(1)}%`
  );

  const formatProgressWidth = (value: number | null): string => `${Math.min(Math.max(value ?? 0, 0), 100)}%`;
  const trimLabel = (label: string): string => label.replace(/[:：]\s*$/, '');

  const tokenCell = (value: number): string => (
    value > 0 ? `${formatInteger(value)} ${t('shell.tokenUsage.tokenShortLabel')}` : '—'
  );

  const formatUnitPriceAmount = (value: number, currency: string | null): string => {
    const fractionDigits = Math.abs(value) >= 1 ? 2 : 4;
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency: currency || 'USD',
      currencyDisplay: 'narrowSymbol',
      minimumFractionDigits: 2,
      maximumFractionDigits: fractionDigits,
    }).format(value);
  };

  const formatUnitPrice = (
    summary: TokenUsageUnitPriceSummary,
    currency: string | null,
  ): string => {
    if (summary.status === 'not_applicable') return '—';
    if (summary.status === 'local_no_api_bill') return t('shell.tokenUsage.priceStatusLocal');
    if (summary.status === 'mixed') return t('shell.tokenUsage.variesByCall');
    if (summary.status === 'missing') return t('shell.tokenUsage.unpriced');
    if (summary.status === 'partial_missing') return t('shell.tokenUsage.partiallyMissingUnitPrice');
    if (summary.pricePerMillion === null) return t('shell.tokenUsage.unpriced');
    return t('shell.tokenUsage.pricePerMillionTokens', {
      price: formatUnitPriceAmount(summary.pricePerMillion, currency),
    });
  };

  const cacheSubline = (summary: TokenUsageRunSummary): string => {
    if (summary.cacheState === 'positive') {
      return t('shell.tokenUsage.cacheHitRate', { percent: formatRatePercent(summary.cacheReadInputTokenRate) });
    }
    if (summary.cacheState === 'unsupported_or_local') return t('shell.tokenUsage.cacheUnsupportedLocal');
    if (summary.cacheState === 'not_reported' || summary.cacheState === 'unknown') {
      return t('shell.tokenUsage.cacheNotReported');
    }
    return t('shell.tokenUsage.cacheHitRate', { percent: formatRatePercent(summary.cacheReadInputTokenRate ?? 0) });
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
    const base = 'inline-flex rounded-full px-3 py-1 text-xs font-semibold ring-1 ring-inset';
    if (status === 'estimated') return `${base} bg-emerald-50 text-emerald-700 ring-emerald-100`;
    if (status === 'local_no_api_bill') return `${base} bg-sky-50 text-sky-700 ring-sky-100`;
    if (status === 'mixed') return `${base} bg-slate-100 text-slate-700 ring-slate-200`;
    return `${base} bg-amber-50 text-amber-700 ring-amber-100`;
  };

  return {
    cacheSubline,
    formatCompactInteger,
    formatCost,
    formatInteger,
    formatPercent,
    formatProgressWidth,
    formatRatePercent,
    formatStatus,
    formatTokenDetail,
    formatUnitPrice,
    formatUnitPriceAmount,
    statusClass,
    tokenCell,
    trimLabel,
  };
};
