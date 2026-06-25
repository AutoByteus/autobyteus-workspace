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
  inputTokens: 1000,
  outputTokens: 120,
  totalTokens: 1153,
  reasoningOutputTokens: 33,
  estimatedApiInputCost: 0.002,
  estimatedApiOutputCost: 0.0012,
  estimatedApiReasoningOutputCost: 0.00033,
  estimatedApiTotalCost: 0.0032,
  currency: 'USD',
  apiCostStatus: 'estimated',
  latestContextInputTokens: null,
  effectiveContextBudgetTokens: null,
  contextPressurePercent: null,
  latestModelProvider: 'OPENAI',
  latestModelIdentifier: 'gpt-test',
  latestRuntimeKind: 'autobyteus',
  eventCount: 1,
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

vi.mock('~/composables/useLocalization', () => ({
  useLocalization: () => ({
    t: (key: string, params?: Record<string, unknown>) => {
      const messages: Record<string, string> = {
        'shell.tokenUsage.title': 'Token Meter',
        'shell.tokenUsage.subtitle': 'Live server-accounted usage and estimated API price.',
        'shell.tokenUsage.input': 'Input',
        'shell.tokenUsage.output': 'Output',
        'shell.tokenUsage.total': 'Total',
        'shell.tokenUsage.tokensLabel': 'Tokens',
        'shell.tokenUsage.costLabel': 'Cost',
        'shell.tokenUsage.estimateLabel': 'Estimate',
        'shell.tokenUsage.thinkingTokensIncluded': `Thinking ${params?.tokens} tokens`,
        'shell.tokenUsage.thinkingTokensTooltip': 'Included in output tokens and estimated output cost.',
        'shell.tokenUsage.priceStatus': 'Price status',
        'shell.tokenUsage.latestModel': 'Latest model:',
        'shell.tokenUsage.runtime': 'Runtime:',
        'shell.tokenUsage.events': 'Events:',
        'shell.tokenUsage.unknown': 'unknown',
        'shell.tokenUsage.unpriced': 'unpriced',
      };
      return messages[key] ?? key;
    },
  }),
}));

describe('TokenUsageMeterPanel', () => {
  beforeEach(() => {
    currentSummary = summary;
  });

  it('renders compact token cards with accessible price labels and an expandable thinking-token tip', async () => {
    const wrapper = mount(TokenUsageMeterPanel, {
      global: {
        mocks: {
          $t: (key: string) => ({
            'shell.tokenUsage.title': 'Token Meter',
            'shell.tokenUsage.subtitle': 'Live server-accounted usage and estimated API price.',
            'shell.tokenUsage.input': 'Input',
            'shell.tokenUsage.output': 'Output',
            'shell.tokenUsage.total': 'Total',
            'shell.tokenUsage.tokensLabel': 'Tokens',
            'shell.tokenUsage.costLabel': 'Cost',
            'shell.tokenUsage.estimateLabel': 'Estimate',
            'shell.tokenUsage.priceStatus': 'Price status',
            'shell.tokenUsage.latestModel': 'Latest model:',
            'shell.tokenUsage.runtime': 'Runtime:',
            'shell.tokenUsage.events': 'Events:',
          } as Record<string, string>)[key] ?? key,
        },
      },
    });

    const text = wrapper.text();
    expect(text).toContain('Input');
    expect(text).toContain('Output');
    expect(text).toContain('Total');
    expect(text).toContain('Tokens');
    expect(text).toContain('$0.002');
    expect(text).toContain('$0.0012');
    expect(text).toContain('$0.0032');
    expect(text).toContain('Thinking 33 tokens');
    expect(text).toContain('Included in output tokens and estimated output cost.');

    const priceLabels = wrapper.findAll('[aria-label]').map((node) => node.attributes('aria-label'));
    expect(priceLabels).toContain('Cost: $0.0020');
    expect(priceLabels).toContain('Cost: $0.0012');
    expect(priceLabels).toContain('Estimate: $0.0032');
    expect(priceLabels).toContain('Thinking 33 tokens. Included in output tokens and estimated output cost.');

    const thinkingDetails = wrapper.find('details');
    const thinkingSummary = wrapper.find('summary');
    expect(thinkingDetails.exists()).toBe(true);
    expect(thinkingDetails.element.open).toBe(false);
    expect(thinkingSummary.text()).toBe('Thinking 33 tokens');
    expect(thinkingSummary.find('svg[aria-hidden="true"]').exists()).toBe(true);
    expect(thinkingSummary.find('svg').classes()).toContain('group-open:rotate-180');
    await thinkingSummary.trigger('click');

    expect(thinkingDetails.element.open).toBe(true);
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
