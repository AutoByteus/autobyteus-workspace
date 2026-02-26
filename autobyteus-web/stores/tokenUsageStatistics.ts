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
  promptCost: number;
  assistantCost: number;
  totalCost: number;
}

interface TokenUsageStatisticsState {
  statistics: TokenUsageStatistic[];
  loading: boolean;
  error: string | null;
}

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
          throw new Error(errors.map(e => e.message).join(', '));
        }

        if (data?.usageStatisticsInPeriod) {
          this.statistics = data.usageStatisticsInPeriod.map((stat) => ({
            llmModel: stat.llmModel,
            promptTokens: stat.promptTokens,
            assistantTokens: stat.assistantTokens,
            promptCost: stat.promptCost,
            assistantCost: stat.assistantCost,
            totalCost: stat.totalCost
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
    getTotalCost: (state): number => 
      state.statistics.reduce((sum, stat) => sum + stat.totalCost, 0),
    getModelCosts: (state): Record<string, number> => 
      state.statistics.reduce((acc, stat) => {
        acc[stat.llmModel] = (acc[stat.llmModel] || 0) + stat.totalCost;
        return acc;
      }, {} as Record<string, number>)
  }
});
