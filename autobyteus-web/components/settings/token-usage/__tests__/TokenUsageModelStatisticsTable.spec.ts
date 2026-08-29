import { describe, expect, it, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import TokenUsageModelStatisticsTable from '../TokenUsageModelStatisticsTable.vue';
import type { TokenUsageCostSummaryAggregate, TokenUsageRuntimeModelStatisticsRow } from '~/types/tokenUsageRunStatistics';

const messages: Record<string, string> = {
  'settings.components.settings.TokenUsageStatistics.runtime': 'Runtime',
  'settings.components.settings.TokenUsageStatistics.llm_model': 'LLM Model',
  'settings.components.settings.TokenUsageStatistics.inputTokens': 'Input Tokens',
  'settings.components.settings.TokenUsageStatistics.cachedInput': 'Cached Input',
  'settings.components.settings.TokenUsageStatistics.outputTokens': 'Output Tokens',
  'settings.components.settings.TokenUsageStatistics.thinkingTokens': 'Thinking Tokens',
  'settings.components.settings.TokenUsageStatistics.inputCost': 'Input Cost',
  'settings.components.settings.TokenUsageStatistics.outputCost': 'Output Cost',
  'settings.components.settings.TokenUsageStatistics.thinkingCost': 'Thinking Cost',
  'settings.components.settings.TokenUsageStatistics.total_cost': 'Total Cost',
  'settings.components.settings.TokenUsageStatistics.runtimeModel': 'Runtime / model',
  'settings.components.settings.TokenUsageStatistics.cacheHitWithCached': 'cache hit {percent} · {cached} cached',
  'settings.components.settings.TokenUsageStatistics.noCacheData': 'no cache data',
  'settings.components.settings.TokenUsageStatistics.includedDiagnostic': 'included / diagnostic',
  'shell.tokenUsage.unknown': 'unknown',
  'shell.tokenUsage.unpriced': 'price missing',
  'shell.tokenUsage.partialEstimateSuffix': 'partial est.',
  'shell.tokenUsage.mixedEstimateSuffix': 'mixed est.',
  'shell.tokenUsage.priceStatusLocal': 'Local/no API bill',
  'shell.tokenUsage.cacheUnsupportedLocal': 'Local runtime; no provider cache bill',
  'shell.tokenUsage.unpricedCostChartNote': 'Unpriced costs are omitted from the chart.',
};

const translate = (key: string, params?: Record<string, string | number>) => {
  const template = messages[key] ?? key;
  return Object.entries(params ?? {}).reduce(
    (text, [name, value]) => text.replace(`{${name}}`, String(value)).replace(`{{${name}}}`, String(value)),
    template,
  );
};

vi.mock('~/composables/useLocalization', () => ({
  useLocalization: () => ({ t: translate, resolvedLocale: { value: 'en' } }),
}));

const aggregate = (overrides: Partial<TokenUsageCostSummaryAggregate> = {}): TokenUsageCostSummaryAggregate => ({
  grossInputTokens: 300,
  standardInputTokens: 240,
  cacheMissInputTokens: 240,
  cacheReadInputTokens: 60,
  cacheCreationInputTokens: 0,
  cacheCreation5mInputTokens: 0,
  cacheCreation1hInputTokens: 0,
  outputTokens: 30,
  reasoningOutputTokens: 6,
  billableOutputTokens: 30,
  totalTokens: 330,
  cacheReadInputTokenRate: 0.2,
  standardInputTokenRate: 0.8,
  cacheCreationInputTokenRate: 0,
  cacheState: 'positive',
  estimatedApiInputCost: 3.0,
  estimatedApiStandardInputCost: 2.4,
  estimatedApiCacheReadInputCost: 0.6,
  estimatedApiCacheCreationInputCost: 0,
  estimatedApiCacheCreation5mInputCost: 0,
  estimatedApiCacheCreation1hInputCost: 0,
  estimatedApiOutputCost: 0.3,
  estimatedApiReasoningOutputCost: 0.06,
  estimatedApiTotalCost: 3.3,
  currency: 'USD',
  apiCostStatus: 'mixed',
  missingPriceDimensions: [],
  pricingPolicyKey: null,
  selectedPricingTierId: null,
  usageReportCount: 2,
  updatedAt: null,
  observedRuntimeKinds: ['codex_app_server'],
  observedModelIdentifiers: ['gpt-shared'],
  observedModelProviders: ['OPENAI'],
  ...overrides,
});

const rows: TokenUsageRuntimeModelStatisticsRow[] = [{
  rowId: 'runtime-model:codex_app_server:gpt-shared',
  runtimeKind: 'codex_app_server',
  llmModel: 'gpt-shared',
  modelDisplayName: 'gpt-shared',
  aggregate: aggregate(),
}, {
  rowId: 'runtime-model:autobyteus:gpt-shared',
  runtimeKind: 'autobyteus',
  llmModel: 'gpt-shared',
  modelDisplayName: 'Autobyteus:gpt-shared',
  aggregate: aggregate({
    grossInputTokens: 60,
    standardInputTokens: 60,
    cacheReadInputTokens: 0,
    outputTokens: 8,
    reasoningOutputTokens: 3,
    totalTokens: 68,
    cacheReadInputTokenRate: 0,
    cacheState: 'not_reported',
    estimatedApiInputCost: 0.6,
    estimatedApiOutputCost: 0.08,
    estimatedApiReasoningOutputCost: 0.03,
    estimatedApiTotalCost: 0.68,
    apiCostStatus: 'estimated',
    observedRuntimeKinds: ['autobyteus'],
  }),
}, {
  rowId: 'runtime-model:Unknown:gpt-old',
  runtimeKind: 'Unknown',
  llmModel: 'gpt-old',
  modelDisplayName: 'gpt-old',
  aggregate: aggregate({
    grossInputTokens: 20,
    standardInputTokens: 20,
    cacheReadInputTokens: 0,
    outputTokens: 5,
    reasoningOutputTokens: 0,
    totalTokens: 25,
    cacheReadInputTokenRate: null,
    cacheState: 'unknown',
    estimatedApiInputCost: null,
    estimatedApiOutputCost: null,
    estimatedApiReasoningOutputCost: null,
    estimatedApiTotalCost: null,
    currency: null,
    apiCostStatus: 'price_missing',
    observedRuntimeKinds: [],
    observedModelIdentifiers: ['gpt-old'],
  }),
}];

describe('TokenUsageModelStatisticsTable', () => {
  it('renders runtime/model diagnostics as separate rows with runtime and fallback visibility', () => {
    const wrapper = mount(TokenUsageModelStatisticsTable, { props: { rows } });

    expect(wrapper.text()).toContain('Runtime');
    expect(wrapper.text()).toMatch(/Llm model/i);
    expect(wrapper.text()).toContain('Codex');
    expect(wrapper.text()).toContain('Autobyteus');
    expect(wrapper.text()).toContain('Unknown');
    expect(wrapper.text()).toContain('Autobyteus:gpt-shared');
    expect(wrapper.text()).toContain('cache hit 20.0%');
    expect(wrapper.text()).toContain('no cache data');
    expect(wrapper.text()).toMatch(/Included diagnostic|included \/ diagnostic/i);
    expect(wrapper.text()).toContain('mixed est.');
    expect(wrapper.text()).toContain('price missing');
    expect(wrapper.find('canvas').exists()).toBe(false);
  });
});
