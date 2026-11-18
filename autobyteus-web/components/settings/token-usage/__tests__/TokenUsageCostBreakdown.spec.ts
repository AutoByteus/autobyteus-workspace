import { describe, expect, it } from 'vitest';
import { mount } from '@vue/test-utils';
import TokenUsageCostBreakdown from '../TokenUsageCostBreakdown.vue';
import type { TokenUsageCostSummaryAggregate } from '~/types/tokenUsageRunStatistics';

const buildAggregate = (overrides: Partial<TokenUsageCostSummaryAggregate> = {}): TokenUsageCostSummaryAggregate => ({
  grossInputTokens: 0,
  standardInputTokens: 1_000,
  cacheMissInputTokens: 1_000,
  cacheReadInputTokens: 2_000,
  cacheCreationInputTokens: 0,
  cacheCreation5mInputTokens: 0,
  cacheCreation1hInputTokens: 0,
  outputTokens: 100,
  reasoningOutputTokens: 0,
  billableOutputTokens: 100,
  totalTokens: 0,
  cacheReadInputTokenRate: null,
  standardInputTokenRate: null,
  cacheCreationInputTokenRate: null,
  cacheState: 'positive',
  estimatedApiInputCost: null,
  estimatedApiStandardInputCost: 1,
  estimatedApiCacheReadInputCost: 0.2,
  estimatedApiCacheCreationInputCost: null,
  estimatedApiCacheCreation5mInputCost: null,
  estimatedApiCacheCreation1hInputCost: null,
  estimatedApiOutputCost: 0.5,
  estimatedApiReasoningOutputCost: null,
  estimatedApiTotalCost: null,
  currency: 'USD',
  apiCostStatus: 'estimated',
  missingPriceDimensions: [],
  pricingPolicyKey: 'catalog:test:claude',
  selectedPricingTierId: null,
  usageReportCount: 2,
  updatedAt: '2041-07-01T11:05:00.000Z',
  observedRuntimeKinds: ['claude_agent_sdk'],
  observedModelIdentifiers: ['claude-test'],
  observedModelProviders: ['ANTHROPIC'],
  ...overrides,
});

const inputRows = (aggregate: TokenUsageCostSummaryAggregate): string[][] => {
  const wrapper = mount(TokenUsageCostBreakdown, { props: { aggregate } });
  const inputTable = wrapper.findAll('table')[0]!;
  return inputTable.findAll('tbody tr').map((row) => row.findAll('td').map((cell) => cell.text()));
};

describe('TokenUsageCostBreakdown', () => {
  it('renders 5-minute and 1-hour cache-write rows with their tokens and costs', () => {
    const rows = inputRows(buildAggregate({
      cacheCreationInputTokens: 12_000,
      cacheCreation5mInputTokens: 2_000,
      cacheCreation1hInputTokens: 10_000,
      estimatedApiCacheCreationInputCost: 3.5,
      estimatedApiCacheCreation5mInputCost: 0.5,
      estimatedApiCacheCreation1hInputCost: 3,
      grossInputTokens: 15_000,
      estimatedApiInputCost: 4.7,
    }));

    expect(rows.map((row) => row[0])).toEqual([
      'Uncached / full-price input',
      'Cache hits / discounted input',
      'Cache write 5m',
      'Cache write 1h',
      'Total input cost',
    ]);
    expect(rows[2]![1]).toBe('2,000');
    expect(rows[2]![2]).toContain('0.50');
    expect(rows[3]![1]).toBe('10,000');
    expect(rows[3]![2]).toContain('3.00');
  });

  it('keeps one Cache writes row for writes without a split', () => {
    const rows = inputRows(buildAggregate({
      cacheCreationInputTokens: 4_000,
      estimatedApiCacheCreationInputCost: 1.25,
    }));

    expect(rows.map((row) => row[0])).toEqual([
      'Uncached / full-price input',
      'Cache hits / discounted input',
      'Cache writes',
      'Total input cost',
    ]);
    expect(rows[2]![1]).toBe('4,000');
    expect(rows[2]![2]).toContain('1.25');
  });

  it('shows writes outside the split as Cache writes priced without the split costs', () => {
    const rows = inputRows(buildAggregate({
      cacheCreationInputTokens: 13_000,
      cacheCreation1hInputTokens: 10_000,
      estimatedApiCacheCreationInputCost: 4,
      estimatedApiCacheCreation1hInputCost: 3,
    }));

    expect(rows.map((row) => row[0])).toEqual([
      'Uncached / full-price input',
      'Cache hits / discounted input',
      'Cache writes',
      'Cache write 1h',
      'Total input cost',
    ]);
    expect(rows[2]![1]).toBe('3,000');
    expect(rows[2]![2]).toContain('1.00');
  });
});
