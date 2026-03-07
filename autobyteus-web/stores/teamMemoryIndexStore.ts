import { defineStore } from 'pinia';
import { getApolloClient } from '~/utils/apolloClient';
import { LIST_TEAM_RUN_MEMORY_SNAPSHOTS } from '~/graphql/queries/teamMemoryQueries';
import type { TeamRunMemorySnapshotPage, TeamRunMemorySnapshotSummary } from '~/types/memory';

type ListTeamRunMemorySnapshotsQuery = {
  listTeamRunMemorySnapshots?: TeamRunMemorySnapshotPage | null;
};

type ListTeamRunMemorySnapshotsQueryVariables = {
  search?: string | null;
  page?: number;
  pageSize?: number;
};

interface TeamMemoryIndexState {
  entries: TeamRunMemorySnapshotSummary[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  search: string;
  loading: boolean;
  error: string | null;
  requestId: number;
  expandedTeamRunIds: Record<string, boolean>;
}

export const useTeamMemoryIndexStore = defineStore('teamMemoryIndexStore', {
  state: (): TeamMemoryIndexState => ({
    entries: [],
    total: 0,
    page: 1,
    pageSize: 20,
    totalPages: 1,
    search: '',
    loading: false,
    error: null,
    requestId: 0,
    expandedTeamRunIds: {},
  }),

  actions: {
    async fetchIndex(): Promise<TeamRunMemorySnapshotPage | null> {
      this.loading = true;
      this.error = null;
      const currentRequestId = ++this.requestId;

      try {
        const client = getApolloClient();
        const { data, errors } = await client.query<
          ListTeamRunMemorySnapshotsQuery,
          ListTeamRunMemorySnapshotsQueryVariables
        >({
          query: LIST_TEAM_RUN_MEMORY_SNAPSHOTS,
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

        const payload = data?.listTeamRunMemorySnapshots as TeamRunMemorySnapshotPage | undefined;
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
          this.error = error?.message || 'Failed to fetch team memory index.';
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

    toggleExpandedTeam(teamRunId: string) {
      this.expandedTeamRunIds[teamRunId] = !this.expandedTeamRunIds[teamRunId];
    },

    isTeamExpanded(teamRunId: string): boolean {
      return this.expandedTeamRunIds[teamRunId] ?? false;
    },

    expandTeam(teamRunId: string) {
      this.expandedTeamRunIds[teamRunId] = true;
    },

    reset() {
      this.entries = [];
      this.total = 0;
      this.page = 1;
      this.pageSize = 20;
      this.totalPages = 1;
      this.search = '';
      this.loading = false;
      this.error = null;
      this.requestId = 0;
      this.expandedTeamRunIds = {};
    },
  },
});
