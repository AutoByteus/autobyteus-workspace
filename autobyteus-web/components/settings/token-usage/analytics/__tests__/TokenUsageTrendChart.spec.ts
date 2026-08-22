import { mount } from '@vue/test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import TokenUsageTrendChart from '../TokenUsageTrendChart.vue';
import { aggregate, analyticsResult, bucket } from './tokenUsageAnalyticsTestFixtures';

const { chartConfigs } = vi.hoisted(() => ({ chartConfigs: [] as any[] }));
vi.mock('chart.js', () => ({
  registerables: [],
  Chart: class {
    static register() {}
    constructor(_canvas: unknown, config: unknown) { chartConfigs.push(config); }
    destroy() {}
  },
}));
vi.mock('~/composables/useLocalization', () => ({
  useLocalization: () => ({ t: (key: string) => ({
    'settings.components.settings.TokenUsageAnalytics.usageOverTime': 'Usage over time',
    'settings.components.settings.TokenUsageAnalytics.tokens': 'Tokens',
    'settings.components.settings.TokenUsageAnalytics.estimatedCost': 'Estimated cost',
    'settings.components.settings.TokenUsageAnalytics.trendChartAria': 'Token usage over time chart',
    'settings.components.settings.TokenUsageAnalytics.exactBucketData': 'Exact bucket data',
    'settings.components.settings.TokenUsageAnalytics.costQuality': 'Cost quality',
    'settings.components.settings.TokenUsageAnalytics.capturedApiCostStatus': 'Captured API cost status',
    'settings.components.settings.TokenUsageAnalytics.currency': 'Currency',
    'settings.components.settings.TokenUsageAnalytics.qualityCOMPLETE': 'Complete estimate',
    'settings.components.settings.TokenUsageAnalytics.notAvailable': 'Not available',
    'settings.components.settings.TokenUsageAnalytics.costChartUnavailable': 'Multiple currencies cannot be combined.',
  }[key] ?? key) }),
}));

describe('TokenUsageTrendChart', () => {
  beforeEach(() => { chartConfigs.length = 0; });

  it('exposes a keyboard-reachable named canvas plus exact dated/status/currency table evidence', async () => {
    const result = analyticsResult({
      appliedRange: { preset: 'CUSTOM', startTime: '2026-08-01T00:00:00.000Z', endTimeExclusive: '2026-08-03T00:00:00.000Z', granularity: 'DAY' },
      trendBuckets: [bucket('2026-08-01', '2026-08-02', 10), bucket('2026-08-02', '2026-08-03', 20)],
    } as any);
    const wrapper = mount(TokenUsageTrendChart, { props: { result, metric: 'TOKENS' } });
    await vi.waitFor(() => expect(chartConfigs).toHaveLength(1));

    expect(wrapper.get('canvas').attributes()).toMatchObject({
      role: 'img', tabindex: '0', 'aria-label': 'Token usage over time chart',
    });
    expect(wrapper.text()).toContain('Exact bucket data');
    expect(wrapper.text()).toContain('Complete estimate');
    expect(wrapper.text()).toContain('estimated');
    expect(wrapper.text()).toContain('USD');
    const tooltip = chartConfigs[0].options.plugins.tooltip.callbacks;
    expect(tooltip.afterLabel({ dataIndex: 0 })).toEqual(expect.arrayContaining([
      'Cost quality: Complete estimate',
      'Captured API cost status: estimated',
      'Currency: USD',
    ]));
  });

  it('does not plot a false combined monetary series for mixed currencies', () => {
    const result = analyticsResult({
      selectedAggregate: aggregate({ totalTokens: 30, estimatedApiTotalCost: null, currency: null, apiCostStatus: 'mixed', usageReportCount: 2 }),
      selectedCostQuality: { kind: 'MIXED_CURRENCY', currency: null, missingPriceDimensions: [] },
      trendBuckets: [bucket('2026-08-01', '2026-08-02', 10), bucket('2026-08-02', '2026-08-03', 20)],
    } as any);
    const wrapper = mount(TokenUsageTrendChart, { props: { result, metric: 'COST' } });

    expect(wrapper.text()).toContain('Multiple currencies cannot be combined.');
    expect(wrapper.find('canvas').exists()).toBe(false);
    expect(chartConfigs).toHaveLength(0);
  });
});
