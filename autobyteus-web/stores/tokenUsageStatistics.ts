import { defineStore } from 'pinia';
import { getApolloClient } from '~/utils/apolloClient'
import { GET_TOKEN_USAGE_STATISTICS } from '~/graphql/queries/token_usage_statistics_queries';
import type {
  GetUsageStatisticsInPeriodQuery,
  GetUsageStatisticsInPeriodQueryVariables
} from '~/generated/graphql';

interface TokenUsageStatistic {
  llmModel: string;
  promptTokens: number;
  assistantTokens: number;
  reasoningTokens: number;
  promptCost: number | null;
  assistantCost: number | null;
  reasoningCost: number | null;
  totalCost: number | null;
  currency: string | null;
  apiCostStatus: TokenUsageCostStatus;
}

interface TokenUsageStatisticsState {
  statistics: TokenUsageStatistic[];
  loading: boolean;
  error: string | null;
}

type UsageStatisticsRow = {
  llmModel: string;
  promptTokens: number;
  assistantTokens: number;
  reasoningTokens?: number | null;
  promptCost?: number | null;
  assistantCost?: number | null;
  reasoningCost?: number | null;
  totalCost?: number | null;
  currency?: string | null;
  apiCostStatus?: string | null;
};

type TokenUsageCostStatus = 'estimated' | 'price_missing' | 'partial_price_missing' | 'mixed';

export type TokenUsageCostAggregate = {
  amount: number | null;
  currency: string | null;
  status: TokenUsageCostStatus;
};

const normalizeStatus = (status?: string | null): TokenUsageCostStatus => {
  if (status === 'estimated' || status === 'price_missing' || status === 'partial_price_missing' || status === 'mixed') {
    return status;
  }
  return 'price_missing';
};

const mergeStatus = (
  current: TokenUsageCostStatus,
  next: TokenUsageCostStatus,
  priorCount: number,
): TokenUsageCostStatus => {
  if (priorCount === 0) return next;
  return current === next ? current : 'mixed';
};

const aggregateCosts = (
  statistics: TokenUsageStatistic[],
  selectAmount: (stat: TokenUsageStatistic) => number | null,
): TokenUsageCostAggregate => {
  let amount: number | null = null;
  let currency: string | null = null;
  let status: TokenUsageCostStatus = 'price_missing';
  let count = 0;

  for (const stat of statistics) {
    const rowAmount = selectAmount(stat);
    if (stat.currency) {
      if (currency && currency !== stat.currency) {
        return { amount: null, currency: null, status: 'mixed' };
      }
      currency = stat.currency;
    }
    amount = amount === null && rowAmount === null ? null : (amount ?? 0) + (rowAmount ?? 0);
    status = mergeStatus(status, stat.apiCostStatus, count);
    count += 1;
  }

  return { amount, currency, status };
};

export const useTokenUsageStatisticsStore = defineStore('tokenUsageStatistics', {
  state: (): TokenUsageStatisticsState => ({
    statistics: [],
    loading: false,
    error: null
  }),

  actions: {
    async fetchStatistics(startTime: string, endTime: string): Promise<TokenUsageStatistic[]> {
      this.loading = true;
      this.error = null;
      try {
        const client = getApolloClient()
        const { data, errors } = await client.query<
          GetUsageStatisticsInPeriodQuery,
          GetUsageStatisticsInPeriodQueryVariables
        >({
          query: GET_TOKEN_USAGE_STATISTICS,
          variables: {
            startTime,
            endTime,
          },
          fetchPolicy: 'network-only',
        });

        if (errors && errors.length > 0) {
          throw new Error(errors.map((e: { message: string }) => e.message).join(', '));
        }

        if (data?.usageStatisticsInPeriod) {
          this.statistics = (data.usageStatisticsInPeriod as UsageStatisticsRow[]).map((stat: UsageStatisticsRow) => ({
            llmModel: stat.llmModel,
            promptTokens: stat.promptTokens,
            assistantTokens: stat.assistantTokens,
            reasoningTokens: stat.reasoningTokens ?? 0,
            promptCost: stat.promptCost ?? null,
            assistantCost: stat.assistantCost ?? null,
            reasoningCost: stat.reasoningCost ?? null,
            totalCost: stat.totalCost ?? null,
            currency: stat.currency ?? null,
            apiCostStatus: normalizeStatus(stat.apiCostStatus)
          }));
        } else {
          this.statistics = [];
        }

        return this.statistics;
      } catch (error: any) {
        this.error = error instanceof Error ? error.message : 'An unknown error occurred';
        console.error('Failed to fetch token usage statistics:', error);
        throw error;
      } finally {
        this.loading = false;
      }
    }
  },

  getters: {
    getStatistics: (state): TokenUsageStatistic[] => state.statistics,
    isLoading: (state): boolean => state.loading,
    getError: (state): string | null => state.error,
    getTotalCost: (state): TokenUsageCostAggregate =>
      aggregateCosts(state.statistics, (stat) => stat.totalCost),
    getModelCosts: (state): Record<string, TokenUsageCostAggregate> =>
      state.statistics.reduce((acc, stat) => {
        const current = acc[stat.llmModel];
        acc[stat.llmModel] = aggregateCosts(
          current
            ? [{
                llmModel: stat.llmModel,
                promptTokens: 0,
                assistantTokens: 0,
                reasoningTokens: 0,
                promptCost: null,
                assistantCost: null,
                reasoningCost: null,
                totalCost: current.amount,
                currency: current.currency,
                apiCostStatus: current.status,
              }, stat]
            : [stat],
          (entry) => entry.totalCost,
        );
        return acc;
      }, {} as Record<string, TokenUsageCostAggregate>)
  }
});
