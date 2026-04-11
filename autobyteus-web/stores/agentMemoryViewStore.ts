import { defineStore } from 'pinia';
import { getApolloClient } from '~/utils/apolloClient';
import { GET_RUN_MEMORY_VIEW } from '~/graphql/queries/agentMemoryViewQueries';
import type { RunMemoryView } from '~/types/memory';

type GetRunMemoryViewQuery = {
  getRunMemoryView?: RunMemoryView | null;
};

type GetRunMemoryViewQueryVariables = {
  runId: string;
  includeWorkingContext?: boolean;
  includeEpisodic?: boolean;
  includeSemantic?: boolean;
  includeRawTraces?: boolean;
  includeArchive?: boolean;
  rawTraceLimit?: number;
};

interface AgentMemoryViewState {
  selectedRunId: string | null;
  memoryView: RunMemoryView | null;
  loading: boolean;
  error: string | null;
  rawTraceLimit: number;
  includeRawTraces: boolean;
  requestId: number;
}

export const useAgentMemoryViewStore = defineStore('agentMemoryViewStore', {
  state: (): AgentMemoryViewState => ({
    selectedRunId: null,
    memoryView: null,
    loading: false,
    error: null,
    rawTraceLimit: 500,
    includeRawTraces: false,
    requestId: 0,
  }),

  actions: {
    async fetchMemoryView(runId?: string): Promise<RunMemoryView | null> {
      const resolvedRunId = runId || this.selectedRunId;
      if (!resolvedRunId) {
        return null;
      }

      this.loading = true;
      this.error = null;
      const currentRequestId = ++this.requestId;

      try {
        const client = getApolloClient();
        const { data, errors } = await client.query<
          GetRunMemoryViewQuery,
          GetRunMemoryViewQueryVariables
        >({
          query: GET_RUN_MEMORY_VIEW,
          variables: {
            runId: resolvedRunId,
            includeWorkingContext: true,
            includeEpisodic: true,
            includeSemantic: true,
            includeRawTraces: this.includeRawTraces,
            includeArchive: false,
            rawTraceLimit: this.rawTraceLimit,
          },
          fetchPolicy: 'network-only',
        });

        if (errors && errors.length > 0) {
          throw new Error(errors.map((e: { message: string }) => e.message).join(', '));
        }

        if (currentRequestId !== this.requestId) {
          return null;
        }

        const payload = data?.getRunMemoryView as RunMemoryView | undefined;
        if (!payload) {
          return null;
        }

        this.memoryView = payload;
        return payload;
      } catch (error: any) {
        if (currentRequestId === this.requestId) {
          this.error = error?.message || 'Failed to fetch memory view.';
        }
        return null;
      } finally {
        if (currentRequestId === this.requestId) {
          this.loading = false;
        }
      }
    },

    async setSelectedRunId(runId: string | null) {
      this.selectedRunId = runId;
      if (runId) {
        await this.fetchMemoryView(runId);
      }
    },

    async setIncludeRawTraces(value: boolean) {
      if (this.includeRawTraces === value) {
        return;
      }
      this.includeRawTraces = value;
      if (value && this.selectedRunId) {
        await this.fetchMemoryView(this.selectedRunId);
      }
    },

    async setRawTraceLimit(limit: number) {
      this.rawTraceLimit = limit;
      if (this.includeRawTraces && this.selectedRunId) {
        await this.fetchMemoryView(this.selectedRunId);
      }
    },

    clearSelection() {
      this.selectedRunId = null;
      this.memoryView = null;
      this.error = null;
      this.includeRawTraces = false;
    },
  },
});
