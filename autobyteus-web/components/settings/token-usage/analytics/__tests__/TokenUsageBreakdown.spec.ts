import { mount } from '@vue/test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import TokenUsageBreakdown from '../TokenUsageBreakdown.vue';
import { aggregate, analyticsResult } from './tokenUsageAnalyticsTestFixtures';

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
    'settings.components.settings.TokenUsageAnalytics.share': 'Share',
    'settings.components.settings.TokenUsageAnalytics.costQuality': 'Cost quality',
    'settings.components.settings.TokenUsageAnalytics.capturedApiCostStatus': 'Captured API cost status',
    'settings.components.settings.TokenUsageAnalytics.currency': 'Currency',
    'settings.components.settings.TokenUsageAnalytics.notAvailable': 'Not available',
    'settings.components.settings.TokenUsageAnalytics.notComparable': 'Not comparable',
    'settings.components.settings.TokenUsageAnalytics.localNoBill': 'Local · no API bill',
    'settings.components.settings.TokenUsageAnalytics.unpriced': 'Unpriced',
    'settings.components.settings.TokenUsageAnalytics.currencyUnavailable': 'Currency unavailable',
    'settings.components.settings.TokenUsageAnalytics.qualityCOMPLETE': 'Complete estimate',
    'settings.components.settings.TokenUsageAnalytics.qualityLOCAL': 'Local · no API bill',
    'settings.components.settings.TokenUsageAnalytics.tokens': 'Tokens',
  }[key] ?? key) }),
}));

const rows = [
  {
    rowKey: 'openai', identityKey: 'identity-openai', providerKey: 'provider-openai', modelKey: 'model-gpt',
    runtimeKind: 'codex_app_server', modelProvider: 'openai', providerName: 'OpenAI', providerDisplayName: 'OpenAI',
    modelIdentifier: 'gpt', modelValue: 'gpt', modelDisplayName: 'gpt',
    aggregate: aggregate({ totalTokens: 75, grossInputTokens: 60, outputTokens: 15, estimatedApiTotalCost: 0.75, currency: 'USD', apiCostStatus: 'estimated' }),
    costQuality: { kind: 'COMPLETE', currency: 'USD', missingPriceDimensions: [] },
  },
  {
    rowKey: 'local', identityKey: 'identity-local', providerKey: 'provider-local', modelKey: 'model-local',
    runtimeKind: 'autobyteus', modelProvider: 'ollama', providerName: 'Ollama', providerDisplayName: 'Ollama',
    modelIdentifier: 'qwen', modelValue: 'qwen', modelDisplayName: 'qwen',
    aggregate: aggregate({ totalTokens: 25, grossInputTokens: 20, outputTokens: 5, estimatedApiTotalCost: 0, currency: null, apiCostStatus: 'local_no_api_bill' }),
    costQuality: { kind: 'LOCAL', currency: null, missingPriceDimensions: [] },
  },
];

describe('TokenUsageBreakdown', () => {
  beforeEach(() => { chartConfigs.length = 0; });

  it('shows exact token share and never invents USD for local no-bill cost', async () => {
    const result = analyticsResult({
      selectedAggregate: aggregate({ totalTokens: 100, estimatedApiTotalCost: 0.75, currency: 'USD', apiCostStatus: 'mixed' }),
      breakdownRows: rows,
    } as any);
    const wrapper = mount(TokenUsageBreakdown, { props: { result, metric: 'TOKENS', grouping: 'RUNTIME_MODEL' } });
    await vi.waitFor(() => expect(chartConfigs).toHaveLength(1));

    const text = wrapper.text();
    expect(text).toContain('75%');
    expect(text).toContain('25%');
    expect(text).toContain('Local · no API bill');
    expect(text).not.toContain('$0.00');
    expect(text).toContain('Captured API cost status');
    expect(text).toContain('local_no_api_bill');
  });

  it('marks local cost share not comparable and includes share/quality/status/currency in tooltip evidence', async () => {
    const result = analyticsResult({
      selectedAggregate: aggregate({ totalTokens: 100, estimatedApiTotalCost: 0.75, currency: 'USD', apiCostStatus: 'mixed' }),
      selectedCostQuality: { kind: 'PARTIAL', currency: 'USD', missingPriceDimensions: [] },
      breakdownRows: rows,
    } as any);
    const wrapper = mount(TokenUsageBreakdown, { props: { result, metric: 'COST', grouping: 'RUNTIME_MODEL' } });
    await vi.waitFor(() => expect(chartConfigs).toHaveLength(1));

    expect(wrapper.text()).toContain('Not comparable');
    const evidence = chartConfigs[0].options.plugins.tooltip.callbacks.afterLabel({ dataIndex: 0 });
    expect(evidence).toEqual(expect.arrayContaining([
      expect.stringContaining('Share:'),
      expect.stringContaining('Cost quality:'),
      expect.stringContaining('Captured API cost status:'),
      expect.stringContaining('Currency:'),
    ]));
  });
});
