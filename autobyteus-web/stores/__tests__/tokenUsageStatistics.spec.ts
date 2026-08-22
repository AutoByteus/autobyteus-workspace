import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { getApolloClient } from '~/utils/apolloClient';
import { useTokenUsageRunStatisticsStore } from '../tokenUsageRunStatistics';

vi.mock('~/utils/apolloClient', () => ({
  getApolloClient: vi.fn(),
}));

const aggregate = (overrides: Record<string, unknown> = {}) => ({
  grossInputTokens: 160,
  standardInputTokens: 120,
  cacheMissInputTokens: 120,
  cacheReadInputTokens: 40,
  cacheCreationInputTokens: 0,
  cacheCreation5mInputTokens: 0,
  cacheCreation1hInputTokens: 0,
  outputTokens: 18,
  reasoningOutputTokens: 5,
  billableOutputTokens: 18,
  totalTokens: 178,
  cacheReadInputTokenRate: 0.25,
  standardInputTokenRate: 0.75,
  cacheCreationInputTokenRate: 0,
  cacheState: 'positive',
  estimatedApiInputCost: 1.6,
  estimatedApiStandardInputCost: 1.2,
  estimatedApiCacheReadInputCost: 0.4,
  estimatedApiCacheCreationInputCost: 0,
  estimatedApiCacheCreation5mInputCost: 0,
  estimatedApiCacheCreation1hInputCost: 0,
  estimatedApiOutputCost: 0.18,
  estimatedApiReasoningOutputCost: 0.05,
  estimatedApiTotalCost: 1.78,
  currency: 'USD',
  apiCostStatus: 'estimated',
  missingPriceDimensions: [],
  pricingPolicyKey: 'catalog:test:gpt-shared',
  selectedPricingTierId: null,
  usageReportCount: 2,
  updatedAt: '2041-07-01T11:05:00.000Z',
  observedRuntimeKinds: ['autobyteus', 'codex_app_server'],
  observedModelIdentifiers: ['gpt-shared'],
  observedModelProviders: ['OPENAI'],
  ...overrides,
});

describe('tokenUsageStatistics store', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
  });

  it('fetches task and model statistics without a range-mode variable and normalizes rows', async () => {
    const queryMock = vi.fn()
      .mockResolvedValueOnce({
        data: {
          tokenUsageTaskStatisticsInPeriod: {
            rows: [{
              rowId: 'team:team-newer',
              rowKind: 'TEAM_RUN',
              runId: null,
              rootTeamRunId: 'team-newer',
              taskId: null,
              displayName: 'Software Engineering Team',
              summary: 'investigate token costs',
              createdAt: '2041-07-01T11:00:00.000Z',
              createdTimeSource: 'RUN_HISTORY',
              models: ['gpt-shared'],
              runtimeKinds: ['autobyteus', 'codex_app_server'],
              aggregate: aggregate({
                grossInputTokens: 3_136_827_911,
                outputTokens: 30,
                totalTokens: 3_136_827_941,
              }),
              children: [{
                rowId: 'team:team-newer:member:designer',
                rowKind: 'MEMBER_RUN',
                runId: 'member-designer',
                rootTeamRunId: 'team-newer',
                taskId: null,
                displayName: 'designer',
                summary: null,
                createdAt: '2041-07-01T11:01:00.000Z',
                createdTimeSource: 'FIRST_USAGE_OBSERVED',
                models: ['gpt-shared'],
                runtimeKinds: ['codex_app_server'],
                aggregate: aggregate({ grossInputTokens: 40, outputTokens: 5, estimatedApiTotalCost: 0.4, usageReportCount: 1 }),
                children: [],
              }],
            }],
          },
        },
      })
      .mockResolvedValueOnce({
        data: {
          usageStatisticsInPeriod: [{
            runtimeKind: 'codex_app_server',
            llmModel: 'gpt-shared',
            aggregate: aggregate({
              grossInputTokens: 300,
              outputTokens: 30,
              apiCostStatus: 'mixed',
              missingPriceDimensions: ['cache_creation_price'],
            }),
          }, {
            runtimeKind: null,
            llmModel: null,
            aggregate: aggregate({
              grossInputTokens: 20,
              outputTokens: 5,
              cacheState: 'not_a_real_state',
              apiCostStatus: 'unexpected_status',
              estimatedApiTotalCost: null,
              currency: null,
            }),
          }],
        },
      });
    vi.mocked(getApolloClient).mockReturnValue({ query: queryMock } as any);

    const store = useTokenUsageRunStatisticsStore();
    await store.fetchStatistics('2041-07-01', '2041-07-02');

    expect(queryMock).toHaveBeenCalledTimes(2);
    for (const call of queryMock.mock.calls) {
      expect(call[0].variables).toEqual({ startTime: '2041-07-01', endTime: '2041-07-02' });
      expect(call[0].variables).not.toHaveProperty('rangeMode');
      expect(call[0].fetchPolicy).toBe('network-only');
    }

    expect(store.getTaskRows).toHaveLength(1);
    expect(store.getTaskRows[0]).toMatchObject({
      rowId: 'team:team-newer',
      rowKind: 'TEAM_RUN',
      rootTeamRunId: 'team-newer',
      displayName: 'Software Engineering Team',
      createdTimeSource: 'RUN_HISTORY',
      runtimeKinds: ['autobyteus', 'codex_app_server'],
      aggregate: expect.objectContaining({
        grossInputTokens: 3_136_827_911,
        outputTokens: 30,
        totalTokens: 3_136_827_941,
        cacheReadInputTokenRate: 0.25,
        apiCostStatus: 'estimated',
      }),
    });
    expect(store.getTaskRows[0]!.children[0]).toMatchObject({
      rowId: 'team:team-newer:member:designer',
      rowKind: 'MEMBER_RUN',
      runId: 'member-designer',
      rootTeamRunId: 'team-newer',
      displayName: 'designer',
      aggregate: expect.objectContaining({ estimatedApiTotalCost: 0.4, usageReportCount: 1 }),
    });

    expect(store.getModelRows.map((row) => row.rowId)).toEqual([
      'runtime-model:codex_app_server:gpt-shared',
      'runtime-model:Unknown:Unknown',
    ]);
    expect(store.getModelRows[0]).toMatchObject({
      runtimeKind: 'codex_app_server',
      llmModel: 'gpt-shared',
      aggregate: expect.objectContaining({
        apiCostStatus: 'mixed',
        missingPriceDimensions: ['cache_creation_price'],
      }),
    });
    expect(store.getModelRows[1]).toMatchObject({
      runtimeKind: 'Unknown',
      llmModel: 'Unknown',
      aggregate: expect.objectContaining({
        cacheState: 'unknown',
        apiCostStatus: 'price_missing',
      }),
    });
    expect(store.getError).toBeNull();
    expect(store.isLoading).toBe(false);
  });

  it('stores GraphQL errors and leaves loading state clean', async () => {
    const queryMock = vi.fn()
      .mockResolvedValueOnce({ data: { tokenUsageTaskStatisticsInPeriod: { rows: [] } }, errors: [{ message: 'task query failed' }] })
      .mockResolvedValueOnce({ data: { usageStatisticsInPeriod: [] } });
    vi.mocked(getApolloClient).mockReturnValue({ query: queryMock } as any);

    const store = useTokenUsageRunStatisticsStore();
    await expect(store.fetchStatistics('2041-07-01', '2041-07-02')).rejects.toThrow('task query failed');

    expect(store.getError).toBe('task query failed');
    expect(store.isLoading).toBe(false);
  });
});
