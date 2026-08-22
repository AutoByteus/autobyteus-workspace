import { mount } from '@vue/test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import TokenUsagePaceChart from '../TokenUsagePaceChart.vue';
import { buildTokenUsagePacePoints } from '~/utils/tokenUsageAnalyticsPresentation';
import { analyticsResult, bucket } from './tokenUsageAnalyticsTestFixtures';

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
    'settings.components.settings.TokenUsageAnalytics.current': 'Current',
    'settings.components.settings.TokenUsageAnalytics.prior': 'Prior',
    'settings.components.settings.TokenUsageAnalytics.tokens': 'Tokens',
    'settings.components.settings.TokenUsageAnalytics.exactPaceData': 'Exact pace data',
    'settings.components.settings.TokenUsageAnalytics.series': 'Series',
    'settings.components.settings.TokenUsageAnalytics.elapsedDays': 'Elapsed days',
    'settings.components.settings.TokenUsageAnalytics.costQuality': 'Cost quality',
    'settings.components.settings.TokenUsageAnalytics.capturedApiCostStatus': 'Captured API cost status',
    'settings.components.settings.TokenUsageAnalytics.currency': 'Currency',
    'settings.components.settings.TokenUsageAnalytics.notAvailable': 'Not available',
    'settings.components.settings.TokenUsageAnalytics.qualityCOMPLETE': 'Complete estimate',
  }[key] ?? key) }),
}));

const selected = [
  bucket('2026-01-31', '2026-02-01'), bucket('2026-02-01', '2026-03-01'),
  bucket('2026-03-01', '2026-04-01'), bucket('2026-04-01', '2026-05-01'),
  bucket('2026-05-01', '2026-06-01'), bucket('2026-06-01', '2026-07-01'),
  bucket('2026-07-01', '2026-08-01'), bucket('2026-08-01', '2026-09-01'),
];
const prior = [
  bucket('2025-07-02', '2025-08-01'), bucket('2025-08-01', '2025-09-01'),
  bucket('2025-09-01', '2025-10-01'), bucket('2025-10-01', '2025-11-01'),
  bucket('2025-11-01', '2025-12-01'), bucket('2025-12-01', '2026-01-01'),
  bucket('2026-01-01', '2026-01-31'),
];

describe('TokenUsagePaceChart', () => {
  beforeEach(() => { chartConfigs.length = 0; });

  it('aligns differing bucket counts by elapsed calendar position and exposes exact point evidence', async () => {
    const result = analyticsResult({ trendBuckets: selected, comparisonBuckets: prior });
    const wrapper = mount(TokenUsagePaceChart, { props: { result, metric: 'TOKENS' } });
    await vi.waitFor(() => expect(chartConfigs).toHaveLength(1));

    const [currentDataset, priorDataset] = chartConfigs[0].data.datasets;
    expect(currentDataset.data).toHaveLength(8);
    expect(priorDataset.data).toHaveLength(7);
    expect(currentDataset.data.at(-1).x).toBe(213);
    expect(priorDataset.data.at(-1).x).toBe(213);
    expect(chartConfigs[0].options.scales.x.type).toBe('linear');
    expect(currentDataset.label).toContain('Jan 31, 2026');
    expect(wrapper.findAll('tbody tr')).toHaveLength(15);
    expect(wrapper.text()).toContain('Captured API cost status');
    expect(wrapper.text()).toContain('estimated');
  });

  it('keeps a safely capped shorter previous month at its actual elapsed endpoint', () => {
    const current = buildTokenUsagePacePoints([bucket('2026-03-01', '2026-04-01')], '2026-03-01T00:00:00.000Z', 'TOKENS');
    const shorterPrior = buildTokenUsagePacePoints([bucket('2026-02-01', '2026-03-01')], '2026-02-01T00:00:00.000Z', 'TOKENS');

    expect(current.at(-1)?.x).toBe(31);
    expect(shorterPrior.at(-1)?.x).toBe(28);
  });
});
