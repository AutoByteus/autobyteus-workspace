import type { TokenUsageAnalyticsResult } from '~/types/tokenUsageAnalytics';

type TokenUsageAnalyticsCostQuality = TokenUsageAnalyticsResult['selectedCostQuality'];

/** Merge server-derived bucket qualities with the same precedence as the analytics provider. */
export const mergeTokenUsageAnalyticsCostQualities = (
  qualities: readonly TokenUsageAnalyticsCostQuality[],
): TokenUsageAnalyticsCostQuality => {
  const contributing = qualities.filter((quality) => quality.kind !== 'NO_USAGE');
  if (contributing.length === 0) return { kind: 'NO_USAGE', currency: null, missingPriceDimensions: [] };

  const pricedCurrencies = new Set(contributing
    .filter((quality) => ['COMPLETE', 'PARTIAL'].includes(quality.kind) && quality.currency)
    .map((quality) => quality.currency!));
  const reportedCurrencies = new Set(contributing
    .map((quality) => quality.currency)
    .filter((currency): currency is string => Boolean(currency)));
  const missingPriceDimensions = [...new Set(contributing
    .flatMap((quality) => quality.missingPriceDimensions))].sort();
  if (pricedCurrencies.size > 1 || contributing.some((quality) => quality.kind === 'MIXED_CURRENCY')) {
    return { kind: 'MIXED_CURRENCY', currency: null, missingPriceDimensions };
  }
  if (contributing.every((quality) => quality.kind === 'LOCAL')) {
    return { kind: 'LOCAL', currency: null, missingPriceDimensions: [] };
  }

  const known = contributing.some((quality) => ['COMPLETE', 'PARTIAL'].includes(quality.kind));
  const incomplete = contributing.some((quality) => ['MISSING', 'PARTIAL'].includes(quality.kind));
  const currency = [...pricedCurrencies][0] ?? (reportedCurrencies.size === 1 ? [...reportedCurrencies][0]! : null);
  return {
    kind: !known && incomplete ? 'MISSING' : known && incomplete ? 'PARTIAL' : 'COMPLETE',
    currency,
    missingPriceDimensions,
  };
};

export const formatTokenUsageAnalyticsCost = (input: {
  value: number | null | undefined;
  currency: string | null | undefined;
  qualityKind: string;
  localLabel: string;
  unpricedLabel: string;
  currencyUnavailableLabel: string;
  locale?: string;
}): string => {
  if (input.qualityKind === 'LOCAL') return input.localLabel;
  if (input.value == null || ['MISSING', 'NO_USAGE', 'MIXED_CURRENCY'].includes(input.qualityKind)) return input.unpricedLabel;
  if (!input.currency) {
    return `${new Intl.NumberFormat(input.locale, { maximumFractionDigits: 4 }).format(input.value)} · ${input.currencyUnavailableLabel}`;
  }
  return new Intl.NumberFormat(input.locale, {
    style: 'currency',
    currency: input.currency,
    maximumFractionDigits: 4,
  }).format(input.value);
};
