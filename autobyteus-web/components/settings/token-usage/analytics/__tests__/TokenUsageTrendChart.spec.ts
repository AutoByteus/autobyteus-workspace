import { mount } from '@vue/test-utils';
import { describe, expect, it, vi } from 'vitest';
import TokenUsageTrendChart from '../TokenUsageTrendChart.vue';
import { aggregate, analyticsResult, bucket } from './tokenUsageAnalyticsTestFixtures';

const messages: Record<string, string> = {
  'settings.components.settings.TokenUsageAnalytics.usageOverTime': 'Usage over time',
  'settings.components.settings.TokenUsageAnalytics.dailyPointsExact': 'Daily points · exact buckets remain available',
  'settings.components.settings.TokenUsageAnalytics.tokens': 'Tokens',
  'settings.components.settings.TokenUsageAnalytics.cost': 'Cost',
  'settings.components.settings.TokenUsageAnalytics.costCurrency': 'Cost ({{currency}})',
  'settings.components.settings.TokenUsageAnalytics.dateUtc': 'Date (UTC)',
  'settings.components.settings.TokenUsageAnalytics.exactBucketData': 'Exact bucket data',
  'settings.components.settings.TokenUsageAnalytics.costQuality': 'Cost quality',
  'settings.components.settings.TokenUsageAnalytics.capturedApiCostStatus': 'Captured API cost status',
  'settings.components.settings.TokenUsageAnalytics.currency': 'Currency',
  'settings.components.settings.TokenUsageAnalytics.qualityCOMPLETE': 'Complete estimate',
  'settings.components.settings.TokenUsageAnalytics.qualityMISSING': 'Price missing',
  'settings.components.settings.TokenUsageAnalytics.notAvailable': 'Not available',
  'settings.components.settings.TokenUsageAnalytics.localNoBill': 'Local · no API bill',
  'settings.components.settings.TokenUsageAnalytics.unpriced': 'Unpriced',
  'settings.components.settings.TokenUsageAnalytics.currencyUnavailable': 'Currency unavailable',
  'settings.components.settings.TokenUsageAnalytics.costChartUnavailable': 'A combined cost chart is unavailable.',
};

vi.mock('~/composables/useLocalization', () => ({
  useLocalization: () => ({
    resolvedLocale: { value: 'en' },
    t: (key: string, params?: Record<string, string | number>) => Object.entries(params ?? {}).reduce(
      (text, [name, value]) => text.replace(`{{${name}}}`, String(value)).replace(`{${name}}`, String(value)),
      messages[key] ?? key,
    ),
  }),
}));

describe('TokenUsageTrendChart', () => {
  it('renders an open-top point line with explicit axes and complete exact bucket evidence', () => {
    const result = analyticsResult({
      appliedRange: { preset: 'CUSTOM', startTime: '2026-08-01T00:00:00.000Z', endTimeExclusive: '2026-08-04T00:00:00.000Z', granularity: 'DAY' },
      trendBuckets: [
        bucket('2026-08-01', '2026-08-02', 10),
        bucket('2026-08-02', '2026-08-03', 20),
        bucket('2026-08-03', '2026-08-04', 15),
      ],
    } as any);
    const wrapper = mount(TokenUsageTrendChart, { props: { result, metric: 'TOKENS' } });

    const chart = wrapper.get('[data-testid="daily-line-chart"]');
    expect(chart.attributes('role')).toBe('img');
    expect(chart.attributes('tabindex')).toBe('0');
    expect(chart.attributes('aria-label')).toContain('Usage over time. Tokens. Date (UTC).');
    expect(chart.attributes('aria-label')).toContain('Aug 1, 2026: 10');
    expect(chart.attributes('aria-label')).toContain('Aug 2, 2026: 20');
    expect(chart.attributes('aria-label')).toContain('Aug 3, 2026: 15');
    expect(wrapper.findAll('[data-point-marker]')).toHaveLength(3);
    expect(wrapper.findAll('[data-series="daily"]')).toHaveLength(1);
    expect(wrapper.findAll('[data-guide="midpoint"]')).toHaveLength(1);
    expect(wrapper.get('[data-axis-x="true"]').attributes('data-axis-y')).toBe('true');
    expect(wrapper.find('.line-plot').classes()).not.toContain('border-t');
    expect(wrapper.text()).toContain('Exact bucket data');
    expect(wrapper.text()).toContain('Complete estimate');
    expect(wrapper.text()).toContain('estimated');
    expect(wrapper.text()).toContain('USD');
  });

  it('does not plot a false combined monetary series for mixed currencies', () => {
    const result = analyticsResult({
      selectedAggregate: aggregate({ totalTokens: 30, estimatedApiTotalCost: null, currency: null, apiCostStatus: 'mixed', usageReportCount: 2 }),
      selectedCostQuality: { kind: 'MIXED_CURRENCY', currency: null, missingPriceDimensions: [] },
      trendBuckets: [bucket('2026-08-01', '2026-08-02', 10), bucket('2026-08-02', '2026-08-03', 20)],
    } as any);
    const wrapper = mount(TokenUsageTrendChart, { props: { result, metric: 'COST' } });

    expect(wrapper.text()).toContain('A combined cost chart is unavailable.');
    expect(wrapper.find('[data-testid="daily-line-chart"]').exists()).toBe(false);
    expect(wrapper.findAll('[data-point-marker]')).toHaveLength(0);
    expect(wrapper.text()).toContain('Exact bucket data');
  });

  it('breaks a partial cost line around unpriced buckets instead of plotting them as zero', () => {
    const missing = bucket('2026-08-02', '2026-08-03', 20);
    missing.aggregate.estimatedApiTotalCost = null;
    missing.aggregate.apiCostStatus = 'price_missing';
    missing.costQuality = { kind: 'MISSING', currency: null, missingPriceDimensions: ['output'] };
    const result = analyticsResult({
      selectedAggregate: aggregate({ totalTokens: 45, estimatedApiTotalCost: 0.25, currency: 'USD', apiCostStatus: 'partial_price_missing', usageReportCount: 3 }),
      selectedCostQuality: { kind: 'PARTIAL', currency: 'USD', missingPriceDimensions: ['output'] },
      trendBuckets: [bucket('2026-08-01', '2026-08-02', 10), missing, bucket('2026-08-03', '2026-08-04', 15)],
    } as any);
    const wrapper = mount(TokenUsageTrendChart, { props: { result, metric: 'COST' } });

    expect(wrapper.findAll('[data-point-marker]')).toHaveLength(2);
    expect(wrapper.findAll('[data-series="daily"]')).toHaveLength(2);
    expect(wrapper.get('[role="img"]').attributes('aria-label')).toContain('Aug 2, 2026: Unpriced');
    expect(wrapper.text()).toContain('Price missing');
  });
});
