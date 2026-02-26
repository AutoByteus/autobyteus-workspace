import { defineStore } from 'pinia';
import { getApolloClient } from '~/utils/apolloClient';
import { LIST_RUN_MEMORY_SNAPSHOTS } from '~/graphql/queries/agentMemoryIndexQueries';
import type { MemorySnapshotPage, MemorySnapshotSummary } from '~/types/memory';

type ListRunMemorySnapshotsQuery = {
  listRunMemorySnapshots?: MemorySnapshotPage;
};

type ListRunMemorySnapshotsQueryVariables = {
  search?: string | null;
  page?: number;
  pageSize?: number;
};

interface AgentMemoryIndexState {
  entries: MemorySnapshotSummary[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  search: string;
  loading: boolean;
  error: string | null;
  requestId: number;
}

export const useAgentMemoryIndexStore = defineStore('agentMemoryIndexStore', {
  state: (): AgentMemoryIndexState => ({
    entries: [],
    total: 0,
    page: 1,
    pageSize: 50,
    totalPages: 1,
    search: '',
    loading: false,
    error: null,
    requestId: 0,
  }),

  actions: {
    async fetchIndex(): Promise<MemorySnapshotPage | null> {
      this.loading = true;
      this.error = null;
      const currentRequestId = ++this.requestId;

      try {
        const client = getApolloClient();
        const { data, errors } = await client.query<
          ListRunMemorySnapshotsQuery,
          ListRunMemorySnapshotsQueryVariables
        >({
          query: LIST_RUN_MEMORY_SNAPSHOTS,
          variables: {
            search: this.search || null,
            page: this.page,
            pageSize: this.pageSize,
          },
          fetchPolicy: 'network-only',
        });

        if (errors && errors.length > 0) {
          throw new Error(errors.map((e: { message: string }) => e.message).join(', '));
        }

        if (currentRequestId !== this.requestId) {
          return null;
        }

        const payload = data?.listRunMemorySnapshots as MemorySnapshotPage | undefined;
        if (!payload) {
          this.entries = [];
          this.total = 0;
          this.totalPages = 1;
          return null;
        }

        this.entries = payload.entries || [];
        this.total = payload.total ?? 0;
        this.page = payload.page ?? this.page;
        this.pageSize = payload.pageSize ?? this.pageSize;
        this.totalPages = payload.totalPages ?? 1;

        return payload;
      } catch (error: any) {
        if (currentRequestId === this.requestId) {
          this.error = error?.message || 'Failed to fetch memory index.';
        }
        return null;
      } finally {
        if (currentRequestId === this.requestId) {
          this.loading = false;
        }
      }
    },

    async setSearch(query: string) {
      this.search = query;
      this.page = 1;
      await this.fetchIndex();
    },

    async setPage(page: number) {
      this.page = Math.max(1, page);
      await this.fetchIndex();
    },

    async nextPage() {
      if (this.page < this.totalPages) {
        this.page += 1;
        await this.fetchIndex();
      }
    },

    async previousPage() {
      if (this.page > 1) {
        this.page -= 1;
        await this.fetchIndex();
      }
    },

    reset() {
      this.entries = [];
      this.total = 0;
      this.page = 1;
      this.pageSize = 50;
      this.totalPages = 1;
      this.search = '';
      this.loading = false;
      this.error = null;
      this.requestId = 0;
    },
  },
});
