import { mount } from '@vue/test-utils';
import { describe, expect, it, vi } from 'vitest';
import TokenUsageBreakdown from '../TokenUsageBreakdown.vue';
import { aggregate, analyticsResult } from './tokenUsageAnalyticsTestFixtures';

const messages: Record<string, string> = {
  'settings.components.settings.TokenUsageAnalytics.detailedUsage': 'Detailed usage',
  'settings.components.settings.TokenUsageAnalytics.detailedUsageHelp': 'Usage by the selected grouping. Open a row for exact token and cost evidence.',
  'settings.components.settings.TokenUsageAnalytics.groupBy': 'Group by',
  'settings.components.settings.TokenUsageAnalytics.runtimeModel': 'Runtime + model',
  'settings.components.settings.TokenUsageAnalytics.runtime': 'Runtime',
  'settings.components.settings.TokenUsageAnalytics.provider': 'Provider',
  'settings.components.settings.TokenUsageAnalytics.model': 'Model',
  'settings.components.settings.TokenUsageAnalytics.tokens': 'Tokens',
  'settings.components.settings.TokenUsageAnalytics.estimatedApiCost': 'Estimated API cost',
  'settings.components.settings.TokenUsageAnalytics.share': 'Share',
  'settings.components.settings.TokenUsageAnalytics.details': 'Details',
  'settings.components.settings.TokenUsageAnalytics.hideDetails': 'Hide',
  'settings.components.settings.TokenUsageAnalytics.notAvailable': 'Not available',
  'settings.components.settings.TokenUsageAnalytics.localNoBill': 'Local · no API bill',
  'settings.components.settings.TokenUsageAnalytics.unpriced': 'Unpriced',
  'settings.components.settings.TokenUsageAnalytics.currencyUnavailable': 'Currency unavailable',
  'settings.components.settings.TokenUsageAnalytics.qualityCOMPLETE': 'Complete estimate',
  'settings.components.settings.TokenUsageAnalytics.qualityPARTIAL': 'Partial estimate',
  'settings.components.settings.TokenUsageAnalytics.qualityLOCAL': 'Local · no API bill',
  'settings.components.settings.TokenUsageAnalytics.uncachedInput': 'Uncached input',
  'settings.components.settings.TokenUsageAnalytics.cachedInput': 'Cached input',
  'settings.components.settings.TokenUsageAnalytics.cacheWrite': 'Cache write',
  'settings.components.settings.TokenUsageAnalytics.grossInput': 'Total input',
  'settings.components.settings.TokenUsageAnalytics.output': 'Output',
  'settings.components.settings.TokenUsageAnalytics.reasoningIncluded': 'Thinking included',
  'settings.components.settings.TokenUsageAnalytics.costEvidence': 'Cost status: {{status}} · Currency: {{currency}}',
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

const rows = [
  {
    rowKey: 'openai', identityKey: 'identity-openai', providerKey: 'provider-openai', modelKey: 'model-gpt',
    runtimeKind: 'codex_app_server', modelProvider: 'openai', providerName: 'OpenAI', providerDisplayName: 'OpenAI',
    modelIdentifier: 'gpt', modelValue: 'gpt', modelDisplayName: 'gpt',
    aggregate: aggregate({
      totalTokens: 75, grossInputTokens: 60, standardInputTokens: 50, cacheReadInputTokens: 10,
      cacheCreationInputTokens: 2, outputTokens: 15, reasoningOutputTokens: 5,
      estimatedApiTotalCost: 0.75, currency: 'USD', apiCostStatus: 'estimated',
    }),
    costQuality: { kind: 'COMPLETE', currency: 'USD', missingPriceDimensions: [] },
  },
  {
    rowKey: 'local', identityKey: 'identity-local', providerKey: 'provider-local', modelKey: 'model-local',
    runtimeKind: 'autobyteus', modelProvider: 'ollama', providerName: 'Ollama', providerDisplayName: 'Local',
    modelIdentifier: 'qwen', modelValue: 'qwen', modelDisplayName: 'qwen',
    aggregate: aggregate({ totalTokens: 25, grossInputTokens: 20, standardInputTokens: 20, outputTokens: 5, estimatedApiTotalCost: 0, currency: null, apiCostStatus: 'local_no_api_bill' }),
    costQuality: { kind: 'LOCAL', currency: null, missingPriceDimensions: [] },
  },
];

describe('TokenUsageBreakdown', () => {
  it('keeps Detailed usage visible and discloses exact accounting, cost status, and currency evidence', async () => {
    const result = analyticsResult({
      selectedAggregate: aggregate({ totalTokens: 100, estimatedApiTotalCost: 0.75, currency: 'USD', apiCostStatus: 'mixed' }),
      breakdownRows: rows,
    } as any);
    const wrapper = mount(TokenUsageBreakdown, { props: { result, metric: 'TOKENS', grouping: 'RUNTIME_MODEL' } });

    expect(wrapper.text()).toContain('Detailed usage');
    expect(wrapper.text()).toContain('75%');
    expect(wrapper.text()).toContain('25%');
    expect(wrapper.text()).toContain('Local · no API bill');
    expect(wrapper.text()).not.toContain('$0.00');
    expect(wrapper.find('.overflow-x-auto').exists()).toBe(true);
    expect(wrapper.get('table').classes()).toContain('min-w-[720px]');

    const firstDetails = wrapper.findAll('button').find((button) => button.text().includes('Details'))!;
    expect(firstDetails.attributes('aria-expanded')).toBe('false');
    await firstDetails.trigger('click');
    expect(firstDetails.attributes('aria-expanded')).toBe('true');
    expect(wrapper.text()).toContain('Uncached input');
    expect(wrapper.text()).toContain('Cached input');
    expect(wrapper.text()).toContain('Cache write');
    expect(wrapper.text()).toContain('Total input');
    expect(wrapper.text()).toContain('Thinking included');
    expect(wrapper.text()).toContain('Cost status: estimated · Currency: USD');
  });

  it('groups rows client-side without a request and merges partial cost truthfully', () => {
    const secondOpenAi = {
      ...rows[0],
      rowKey: 'openai-2',
      identityKey: 'identity-openai-2',
      modelKey: 'model-gpt-mini',
      modelDisplayName: 'gpt-mini',
      aggregate: aggregate({
        totalTokens: 25, grossInputTokens: 20, standardInputTokens: 18, cacheReadInputTokens: 2,
        outputTokens: 5, reasoningOutputTokens: 1, estimatedApiTotalCost: 0.2, currency: 'USD',
        apiCostStatus: 'partial_price_missing',
      }),
      costQuality: { kind: 'PARTIAL', currency: 'USD', missingPriceDimensions: ['output'] },
    };
    const result = analyticsResult({
      selectedAggregate: aggregate({ totalTokens: 100, estimatedApiTotalCost: 0.95, currency: 'USD', apiCostStatus: 'partial_price_missing' }),
      selectedCostQuality: { kind: 'PARTIAL', currency: 'USD', missingPriceDimensions: ['output'] },
      breakdownRows: [rows[0], secondOpenAi],
    } as any);
    const wrapper = mount(TokenUsageBreakdown, { props: { result, metric: 'COST', grouping: 'PROVIDER' } });

    expect(wrapper.findAll('tbody > tr')).toHaveLength(1);
    expect(wrapper.text()).toContain('OpenAI');
    expect(wrapper.text()).toContain('100');
    expect(wrapper.text()).toContain('$0.95');
    expect(wrapper.text()).toContain('Partial estimate');
    expect(wrapper.text()).toContain('100%');
    expect(wrapper.emitted('update:grouping')).toBeUndefined();
  });

  it('marks local cost share unavailable instead of implying a comparable zero', () => {
    const result = analyticsResult({
      selectedAggregate: aggregate({ totalTokens: 100, estimatedApiTotalCost: 0.75, currency: 'USD', apiCostStatus: 'mixed' }),
      selectedCostQuality: { kind: 'PARTIAL', currency: 'USD', missingPriceDimensions: [] },
      breakdownRows: rows,
    } as any);
    const wrapper = mount(TokenUsageBreakdown, { props: { result, metric: 'COST', grouping: 'RUNTIME_MODEL' } });

    expect(wrapper.text()).toContain('Not available');
    expect(wrapper.text()).toContain('Local · no API bill');
  });
});
