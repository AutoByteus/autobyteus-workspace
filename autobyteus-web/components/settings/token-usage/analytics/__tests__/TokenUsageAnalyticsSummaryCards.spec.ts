import { mount } from '@vue/test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import TokenUsageAnalyticsSummaryCards from '../TokenUsageAnalyticsSummaryCards.vue';
import { aggregate, analyticsResult } from './tokenUsageAnalyticsTestFixtures';

const messages: Record<string, string> = {
  'settings.components.settings.TokenUsageAnalytics.summary': 'Analytics summary',
  'settings.components.settings.TokenUsageAnalytics.fullCoverageShort': 'Full coverage',
  'settings.components.settings.TokenUsageAnalytics.partialCoverage': 'Partial coverage',
  'settings.components.settings.TokenUsageAnalytics.unavailableCoverage': 'Analytics unavailable',
  'settings.components.settings.TokenUsageAnalytics.trackingSince': 'Tracking since {{date}}',
  'settings.components.settings.TokenUsageAnalytics.unavailableDetail': 'Tracking began {{date}}',
  'settings.components.settings.TokenUsageAnalytics.totalTokens': 'Total tokens',
  'settings.components.settings.TokenUsageAnalytics.uncachedInput': 'Uncached input',
  'settings.components.settings.TokenUsageAnalytics.cachedInput': 'Cached input',
  'settings.components.settings.TokenUsageAnalytics.uncachedInputDefinition': 'Standard/cache-miss-rate input; excludes cached reads and cache writes.',
  'settings.components.settings.TokenUsageAnalytics.cacheReads': 'Input served from cache reads.',
  'settings.components.settings.TokenUsageAnalytics.generatedTokens': 'Generated output tokens.',
  'settings.components.settings.TokenUsageAnalytics.output': 'Output',
  'settings.components.settings.TokenUsageAnalytics.estimatedApiCost': 'Estimated API cost',
  'settings.components.settings.TokenUsageAnalytics.cacheHitRate': 'Cache hit rate',
  'settings.components.settings.TokenUsageAnalytics.cacheRateDefinition': 'Cached-read input divided by total accounting input.',
  'settings.components.settings.TokenUsageAnalytics.cachedOfInput': '{{cached}} of {{input}} total input cached',
  'settings.components.settings.TokenUsageAnalytics.cacheNotReported': 'Not reported',
  'settings.components.settings.TokenUsageAnalytics.cacheUnsupported': 'Not supported',
  'settings.components.settings.TokenUsageAnalytics.cacheUnknown': 'Unknown',
  'settings.components.settings.TokenUsageAnalytics.exactTokens': '{{value}} exact',
  'settings.components.settings.TokenUsageAnalytics.notAvailable': 'Not available',
  'settings.components.settings.TokenUsageAnalytics.mixed': 'Mixed currencies',
  'settings.components.settings.TokenUsageAnalytics.localNoBill': 'Local · no API bill',
  'settings.components.settings.TokenUsageAnalytics.qualityCOMPLETE': 'Complete estimate',
  'settings.components.settings.TokenUsageAnalytics.qualityPARTIAL': 'Partial estimate',
  'settings.components.settings.TokenUsageAnalytics.partialPricing': 'Some usage is unpriced; cost totals are partial.',
  'settings.components.settings.TokenUsageAnalytics.missingPricing': 'Pricing is unavailable for this usage.',
  'settings.components.settings.TokenUsageAnalytics.mixedCurrencies': 'Multiple currencies cannot be combined.',
  'settings.components.settings.TokenUsageAnalytics.localUsage': 'Selected usage is local with no API bill.',
  'settings.components.settings.TokenUsageAnalytics.notInvoice': 'Estimated API cost; not a provider invoice or quota statement.',
};

const { localeSlot } = vi.hoisted(() => ({ localeSlot: { value: 'en' } }));

vi.mock('~/composables/useLocalization', () => ({
  useLocalization: () => ({
    resolvedLocale: localeSlot,
    t: (key: string, params?: Record<string, string | number>) => Object.entries(params ?? {}).reduce(
      (text, [name, value]) => text.replace(`{{${name}}}`, String(value)).replace(`{${name}}`, String(value)),
      messages[key] ?? key,
    ),
  }),
}));

describe('TokenUsageAnalyticsSummaryCards', () => {
  beforeEach(() => { localeSlot.value = 'en'; });

  it('renders six equal peers in the approved order with Total emphasized by typography only', () => {
    const result = analyticsResult({
      appliedRange: { preset: 'THIS_MONTH', startTime: '2026-08-01T00:00:00.000Z', endTimeExclusive: '2026-08-30T00:00:00.000Z', granularity: 'DAY' },
      selectedAggregate: aggregate({
        usageReportCount: 3,
        totalTokens: 152_000,
        grossInputTokens: 115_000,
        standardInputTokens: 99_000,
        cacheReadInputTokens: 16_000,
        outputTokens: 37_000,
        estimatedApiTotalCost: 1.2346,
        currency: 'USD',
        apiCostStatus: 'estimated',
        cacheState: 'positive',
        cacheReadInputTokenRate: 16_000 / 115_000,
      }),
      selectedCostQuality: { kind: 'COMPLETE', currency: 'USD', missingPriceDimensions: [] },
    } as any);
    const wrapper = mount(TokenUsageAnalyticsSummaryCards, { props: { result, metric: 'TOKENS' } });
    const cards = wrapper.findAll('[data-summary-id]');

    expect(cards).toHaveLength(6);
    expect(cards.map((card) => card.attributes('data-summary-id'))).toEqual([
      'total', 'uncached', 'cached', 'output', 'cost', 'cache-rate',
    ]);
    expect(cards.map((card) => card.find('p').text())).toEqual([
      'Total tokens', 'Uncached input', 'Cached input', 'Output', 'Estimated API cost', 'Cache hit rate',
    ]);
    expect(cards.every((card) => card.classes().includes('min-w-0'))).toBe(true);
    expect(cards[0]!.text()).toContain('152K');
    expect(cards[0]!.text()).toContain('152,000 exact');
    expect(cards[0]!.findAll('p')[1]!.classes()).toEqual(expect.arrayContaining(['text-4xl', 'text-blue-700']));
    expect(cards[1]!.findAll('p')[1]!.classes()).toContain('text-2xl');
    expect(cards[4]!.text()).toContain('$1.23');
    expect(wrapper.text()).toContain('Standard/cache-miss-rate input; excludes cached reads and cache writes.');
    expect(wrapper.text()).not.toMatch(/ratio|prior|comparison|driver|export csv/i);
  });

  it.each([
    ['not_reported', 'Not reported'],
    ['unsupported_or_local', 'Not supported'],
    ['unknown', 'Unknown'],
  ])('does not invent a zero cache rate for %s', (cacheState, expected) => {
    const result = analyticsResult({
      selectedAggregate: aggregate({ usageReportCount: 1, totalTokens: 10, cacheState: cacheState as any, cacheReadInputTokenRate: null }),
    } as any);
    const wrapper = mount(TokenUsageAnalyticsSummaryCards, { props: { result, metric: 'TOKENS' } });
    const cacheCard = wrapper.get('[data-summary-id="cache-rate"]');

    expect(cacheCard.text()).toContain(expected);
    expect(cacheCard.text()).not.toContain('0%');
  });

  it('uses the active locale for comma-decimal currency and exact evidence', () => {
    localeSlot.value = 'de-DE';
    const result = analyticsResult({
      selectedAggregate: aggregate({
        usageReportCount: 1,
        totalTokens: 152_000,
        estimatedApiTotalCost: 1.2346,
        currency: 'USD',
        apiCostStatus: 'estimated',
      }),
      selectedCostQuality: { kind: 'COMPLETE', currency: 'USD', missingPriceDimensions: [] },
    } as any);
    const wrapper = mount(TokenUsageAnalyticsSummaryCards, { props: { result, metric: 'TOKENS' } });

    expect(wrapper.get('[data-summary-id="total"]').text()).toContain('152.000 exact');
    expect(wrapper.get('[data-summary-id="cost"]').text()).toMatch(/1,23\s*\$/);
  });
});
