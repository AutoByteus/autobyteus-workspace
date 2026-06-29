import { defineStore } from 'pinia';
import { getApolloClient } from '~/utils/apolloClient';
import {
  GET_TOKEN_USAGE_STATISTICS,
  GET_TOKEN_USAGE_TASK_STATISTICS,
} from '~/graphql/queries/token_usage_statistics_queries';
import type {
  TokenUsageCostSummaryAggregate,
  TokenUsageCreatedTimeSource,
  TokenUsageRuntimeModelStatisticsRow,
  TokenUsageTaskMemberStatisticsRow,
  TokenUsageTaskStatisticsRow,
} from '~/types/tokenUsageStatistics';
import type { TokenUsageApiCostStatus, TokenUsageCacheState } from '~/types/tokenUsageMeter';

interface TokenUsageStatisticsState {
  taskRows: TokenUsageTaskStatisticsRow[];
  modelRows: TokenUsageRuntimeModelStatisticsRow[];
  loading: boolean;
  error: string | null;
}

type QueryVariables = {
  startTime: string;
  endTime: string;
};

type AggregatePayload = Partial<TokenUsageCostSummaryAggregate> & {
  apiCostStatus?: string | null;
  cacheState?: string | null;
};

type TaskMemberPayload = Omit<TokenUsageTaskMemberStatisticsRow, 'aggregate'> & {
  aggregate?: AggregatePayload | null;
};

type TaskRowPayload = Omit<TokenUsageTaskStatisticsRow, 'aggregate' | 'members' | 'rowKind' | 'createdTimeSource'> & {
  rowKind?: string | null;
  createdTimeSource?: string | null;
  aggregate?: AggregatePayload | null;
  members?: TaskMemberPayload[] | null;
};

type ModelRowPayload = {
  runtimeKind?: string | null;
  llmModel?: string | null;
  aggregate?: AggregatePayload | null;
};

type TaskStatisticsQueryResult = {
  tokenUsageTaskStatisticsInPeriod?: {
    rows?: TaskRowPayload[] | null;
  } | null;
};

type ModelStatisticsQueryResult = {
  usageStatisticsInPeriod?: ModelRowPayload[] | null;
};

const normalizeStatus = (status?: string | null): TokenUsageApiCostStatus => {
  if (
    status === 'estimated' ||
    status === 'price_missing' ||
    status === 'partial_price_missing' ||
    status === 'mixed' ||
    status === 'local_no_api_bill'
  ) {
    return status;
  }
  return 'price_missing';
};

const normalizeCacheState = (cacheState?: string | null): TokenUsageCacheState => {
  if (
    cacheState === 'positive' ||
    cacheState === 'zero_reported' ||
    cacheState === 'not_reported' ||
    cacheState === 'unsupported_or_local' ||
    cacheState === 'unknown'
  ) {
    return cacheState;
  }
  return 'unknown';
};

const normalizeArray = (value?: string[] | null): string[] => Array.isArray(value) ? value : [];
const nullableNumber = (value: unknown): number | null => typeof value === 'number' && Number.isFinite(value) ? value : null;
const numberOrZero = (value: unknown): number => nullableNumber(value) ?? 0;
const nullableString = (value: unknown): string | null => typeof value === 'string' && value.trim() ? value : null;

const normalizeAggregate = (payload?: AggregatePayload | null): TokenUsageCostSummaryAggregate => ({
  grossInputTokens: numberOrZero(payload?.grossInputTokens),
  standardInputTokens: numberOrZero(payload?.standardInputTokens),
  cacheMissInputTokens: numberOrZero(payload?.cacheMissInputTokens),
  cacheReadInputTokens: numberOrZero(payload?.cacheReadInputTokens),
  cacheCreationInputTokens: numberOrZero(payload?.cacheCreationInputTokens),
  cacheCreation5mInputTokens: numberOrZero(payload?.cacheCreation5mInputTokens),
  cacheCreation1hInputTokens: numberOrZero(payload?.cacheCreation1hInputTokens),
  outputTokens: numberOrZero(payload?.outputTokens),
  reasoningOutputTokens: numberOrZero(payload?.reasoningOutputTokens),
  billableOutputTokens: numberOrZero(payload?.billableOutputTokens),
  totalTokens: numberOrZero(payload?.totalTokens),
  cacheReadInputTokenRate: nullableNumber(payload?.cacheReadInputTokenRate),
  standardInputTokenRate: nullableNumber(payload?.standardInputTokenRate),
  cacheCreationInputTokenRate: nullableNumber(payload?.cacheCreationInputTokenRate),
  cacheState: normalizeCacheState(payload?.cacheState),
  estimatedApiInputCost: nullableNumber(payload?.estimatedApiInputCost),
  estimatedApiStandardInputCost: nullableNumber(payload?.estimatedApiStandardInputCost),
  estimatedApiCacheReadInputCost: nullableNumber(payload?.estimatedApiCacheReadInputCost),
  estimatedApiCacheCreationInputCost: nullableNumber(payload?.estimatedApiCacheCreationInputCost),
  estimatedApiCacheCreation5mInputCost: nullableNumber(payload?.estimatedApiCacheCreation5mInputCost),
  estimatedApiCacheCreation1hInputCost: nullableNumber(payload?.estimatedApiCacheCreation1hInputCost),
  estimatedApiOutputCost: nullableNumber(payload?.estimatedApiOutputCost),
  estimatedApiReasoningOutputCost: nullableNumber(payload?.estimatedApiReasoningOutputCost),
  estimatedApiTotalCost: nullableNumber(payload?.estimatedApiTotalCost),
  currency: nullableString(payload?.currency),
  apiCostStatus: normalizeStatus(payload?.apiCostStatus),
  missingPriceDimensions: normalizeArray(payload?.missingPriceDimensions),
  pricingPolicyKey: nullableString(payload?.pricingPolicyKey),
  selectedPricingTierId: nullableString(payload?.selectedPricingTierId),
  usageReportCount: numberOrZero(payload?.usageReportCount),
  updatedAt: nullableString(payload?.updatedAt),
  observedRuntimeKinds: normalizeArray(payload?.observedRuntimeKinds),
  observedModelIdentifiers: normalizeArray(payload?.observedModelIdentifiers),
  observedModelProviders: normalizeArray(payload?.observedModelProviders),
});

const normalizeCreatedTimeSource = (value?: string | null): TokenUsageCreatedTimeSource => {
  if (value === 'RUN_HISTORY') return value;
  return 'FIRST_USAGE_OBSERVED';
};

const normalizeTaskMember = (member: TaskMemberPayload): TokenUsageTaskMemberStatisticsRow => ({
  rowId: member.rowId,
  memberRouteKey: member.memberRouteKey ?? null,
  memberAgentRunId: member.memberAgentRunId ?? null,
  memberName: member.memberName,
  memberPath: normalizeArray(member.memberPath),
  models: normalizeArray(member.models),
  runtimeKinds: normalizeArray(member.runtimeKinds),
  aggregate: normalizeAggregate(member.aggregate),
});

const normalizeTaskRow = (row: TaskRowPayload): TokenUsageTaskStatisticsRow => ({
  rowId: row.rowId,
  rowKind: row.rowKind === 'TEAM_RUN' ? 'TEAM_RUN' : 'AGENT_RUN',
  runId: row.runId ?? null,
  rootTeamRunId: row.rootTeamRunId ?? null,
  displayName: row.displayName,
  summary: row.summary ?? null,
  createdAt: row.createdAt,
  createdTimeSource: normalizeCreatedTimeSource(row.createdTimeSource),
  models: normalizeArray(row.models),
  runtimeKinds: normalizeArray(row.runtimeKinds),
  aggregate: normalizeAggregate(row.aggregate),
  members: (row.members ?? []).map(normalizeTaskMember),
});

const normalizeModelRow = (row: ModelRowPayload): TokenUsageRuntimeModelStatisticsRow => ({
  rowId: `runtime-model:${row.runtimeKind ?? 'Unknown'}:${row.llmModel ?? 'Unknown'}`,
  runtimeKind: row.runtimeKind ?? 'Unknown',
  llmModel: row.llmModel ?? 'Unknown',
  aggregate: normalizeAggregate(row.aggregate),
});

export const useTokenUsageStatisticsStore = defineStore('tokenUsageStatistics', {
  state: (): TokenUsageStatisticsState => ({
    taskRows: [],
    modelRows: [],
    loading: false,
    error: null,
  }),

  actions: {
    async fetchStatistics(startTime: string, endTime: string): Promise<void> {
      this.loading = true;
      this.error = null;
      try {
        const client = getApolloClient();
        const variables = { startTime, endTime };
        const [taskResult, modelResult] = await Promise.all([
          client.query<TaskStatisticsQueryResult, QueryVariables>({
            query: GET_TOKEN_USAGE_TASK_STATISTICS,
            variables,
            fetchPolicy: 'network-only',
          }),
          client.query<ModelStatisticsQueryResult, QueryVariables>({
            query: GET_TOKEN_USAGE_STATISTICS,
            variables,
            fetchPolicy: 'network-only',
          }),
        ]);

        const errors = [...(taskResult.errors ?? []), ...(modelResult.errors ?? [])];
        if (errors.length > 0) {
          throw new Error(errors.map((error: { message: string }) => error.message).join(', '));
        }

        this.taskRows = (taskResult.data?.tokenUsageTaskStatisticsInPeriod?.rows ?? []).map(normalizeTaskRow);
        this.modelRows = (modelResult.data?.usageStatisticsInPeriod ?? []).map(normalizeModelRow);
      } catch (error: unknown) {
        this.error = error instanceof Error ? error.message : 'An unknown error occurred';
        console.error('Failed to fetch token usage statistics:', error);
        throw error;
      } finally {
        this.loading = false;
      }
    },
  },

  getters: {
    getTaskRows: (state): TokenUsageTaskStatisticsRow[] => state.taskRows,
    getModelRows: (state): TokenUsageRuntimeModelStatisticsRow[] => state.modelRows,
    isLoading: (state): boolean => state.loading,
    getError: (state): string | null => state.error,
  },
});
