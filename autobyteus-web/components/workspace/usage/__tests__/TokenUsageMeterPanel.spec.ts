import { beforeEach, describe, expect, it, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import TokenUsageMeterPanel from '../TokenUsageMeterPanel.vue';

const summary = {
  runId: 'run-1',
  rootTeamRunId: null,
  teamRunPath: null,
  memberAgentRunId: null,
  memberPath: null,
  memberRouteKey: null,
  agentDefinitionId: null,
  workspaceId: null,
  grossInputTokens: 1000,
  standardInputTokens: 700,
  cacheMissInputTokens: 700,
  cacheReadInputTokens: 300,
  cacheCreationInputTokens: 0,
  cacheCreation5mInputTokens: 0,
  cacheCreation1hInputTokens: 0,
  outputTokens: 120,
  billableOutputTokens: 153,
  totalTokens: 1153,
  cacheReadInputTokenRate: 0.3,
  standardInputTokenRate: 0.7,
  cacheCreationInputTokenRate: 0,
  cacheState: 'positive',
  reasoningOutputTokens: 33,
  estimatedApiInputCost: 0.002,
  estimatedApiStandardInputCost: 0.0014,
  estimatedApiCacheReadInputCost: 0.0006,
  estimatedApiCacheCreationInputCost: null,
  estimatedApiCacheCreation5mInputCost: null,
  estimatedApiCacheCreation1hInputCost: null,
  estimatedApiOutputCost: 0.0012,
  estimatedApiReasoningOutputCost: 0.00033,
  estimatedApiTotalCost: 0.0032,
  currency: 'USD',
  apiCostStatus: 'estimated',
  missingPriceDimensions: [],
  pricingPolicyKey: 'catalog:openai:gpt-test',
  selectedPricingTierId: null,
  latestPromptTokens: 1000,
  effectiveContextWindowTokens: 128000,
  contextWindowUsagePercent: 0.78125,
  latestModelProvider: 'OPENAI',
  latestModelIdentifier: 'gpt-test',
  latestRuntimeKind: 'autobyteus',
  usageReportCount: 1,
  updatedAt: '2026-06-25T00:00:00.000Z',
};

let currentSummary = summary;

vi.mock('~/stores/agentSelectionStore', () => ({
  useAgentSelectionStore: () => ({ selectedType: 'agent' }),
}));

vi.mock('~/stores/activeContextStore', () => ({
  useActiveContextStore: () => ({ activeAgentContext: { state: { runId: 'run-1' } } }),
}));

vi.mock('~/stores/agentTeamContextsStore', () => ({
  useAgentTeamContextsStore: () => ({ activeTeamContext: null }),
}));

vi.mock('~/stores/tokenUsageMeterStore', () => ({
  useTokenUsageMeterStore: () => ({
    getRunSummary: () => currentSummary,
    getTeamSummary: () => null,
    fetchAgentRunSummary: vi.fn().mockResolvedValue(currentSummary),
    fetchTeamRunSummary: vi.fn().mockResolvedValue(null),
  }),
}));

const messages: Record<string, string> = {
  'shell.tokenUsage.title': 'Token Meter',
  'shell.tokenUsage.subtitle': 'Live server-accounted usage and estimated API price.',
  'shell.tokenUsage.currentPrompt': 'Current prompt',
  'shell.tokenUsage.contextTokens': 'context tokens',
  'shell.tokenUsage.grossInput': 'Gross input',
  'shell.tokenUsage.output': 'Output',
  'shell.tokenUsage.totalEstimate': 'Total estimate',
  'shell.tokenUsage.tokensLabel': 'Tokens',
  'shell.tokenUsage.tokenShortLabel': 'tok',
  'shell.tokenUsage.costLabel': 'Cost',
  'shell.tokenUsage.estimateLabel': 'Estimate',
  'shell.tokenUsage.thinkingTokensIncluded': 'Thinking {tokens} tokens',
  'shell.tokenUsage.thinkingTokensTooltip': 'Included in output tokens and estimated output cost.',
  'shell.tokenUsage.cacheHitRate': 'Cache hit {percent}',
  'shell.tokenUsage.cacheUnsupportedLocal': 'Local runtime; no provider cache bill',
  'shell.tokenUsage.cacheNotReported': 'Usage reports no cache details',
  'shell.tokenUsage.inputBreakdown': 'Input breakdown',
  'shell.tokenUsage.uncachedInput': 'Uncached input',
  'shell.tokenUsage.cacheHits': 'Cache hits',
  'shell.tokenUsage.cacheWrites': 'Cache writes',
  'shell.tokenUsage.totalInputCost': 'Total input cost',
  'shell.tokenUsage.pricingDetails': 'Pricing details',
  'shell.tokenUsage.priceStatus': 'Price status',
  'shell.tokenUsage.priceStatusComplete': 'Estimated',
  'shell.tokenUsage.priceStatusPartial': 'Partial estimate',
  'shell.tokenUsage.priceStatusMissing': 'Price missing',
  'shell.tokenUsage.priceStatusLocal': 'Local/no API bill',
  'shell.tokenUsage.priceStatusMixed': 'Mixed',
  'shell.tokenUsage.latestModel': 'Latest model:',
  'shell.tokenUsage.runtime': 'Runtime:',
  'shell.tokenUsage.usageReports': 'Usage reports',
  'shell.tokenUsage.usageReportsTooltip': 'Server usage reports received for this summary.',
  'shell.tokenUsage.usageReportsValue': '{count} reports',
  'shell.tokenUsage.missingPriceDimensions': 'Missing price dimensions',
  'shell.tokenUsage.unknown': 'unknown',
  'shell.tokenUsage.unpriced': 'price missing',
};

const translate = (key: string, params?: Record<string, unknown>) => {
  const template = messages[key] ?? key;
  return Object.entries(params ?? {}).reduce(
    (text, [param, value]) => text.replace(`{${param}}`, String(value)),
    template,
  );
};

vi.mock('~/composables/useLocalization', () => ({
  useLocalization: () => ({
    t: translate,
  }),
}));

describe('TokenUsageMeterPanel', () => {
  beforeEach(() => {
    currentSummary = summary;
  });

  it('renders the approved Token Meter hierarchy with server-owned component values', () => {
    const wrapper = mount(TokenUsageMeterPanel, {
      global: {
        mocks: {
          $t: translate,
        },
      },
    });

    const text = wrapper.text();
    expect(text).toContain('Current prompt');
    expect(text).toContain('Gross input');
    expect(text).toContain('Output');
    expect(text).toContain('Total estimate');
    expect(text).toContain('Input breakdown');
    expect(text).toContain('Uncached input');
    expect(text).toContain('Cache hits');
    expect(text).toContain('Pricing details');
    expect(text).toContain('Usage reports');
    expect(text).toContain('Tokens');
    expect(text).toContain('$0.0020');
    expect(text).toContain('$0.0012');
    expect(text).toContain('$0.0032');
    expect(text).toContain('Thinking 33 tokens');
    expect(text).toContain('Estimated');
    expect(text).toContain('1 reports');
    expect(text).not.toContain('Events');

    expect(wrapper.find('[title="Included in output tokens and estimated output cost."]').exists()).toBe(true);
  });

  it('omits the thinking-token subline when no reasoning tokens are present', () => {
    currentSummary = {
      ...summary,
      reasoningOutputTokens: 0,
      estimatedApiReasoningOutputCost: null,
    };

    const wrapper = mount(TokenUsageMeterPanel);

    expect(wrapper.text()).not.toContain('Thinking');
  });
});
